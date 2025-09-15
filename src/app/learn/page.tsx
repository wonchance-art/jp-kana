'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BookOpen, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { normalizeKana } from '@/lib/kana';
import type { Session } from '@supabase/supabase-js';
import { Toast } from '@/components/Toast';

type Word = { id: string; kanji: string; readings: string[]; created_at: string };
type AttemptInsert = {
  user_id: string;
  word_id: string;
  input: string;
  correct: boolean;
};
type AttemptRow = { word_id: string; correct: boolean };

// 가중 랜덤: weights가 클수록 선택 확률↑
function pickWeighted<T>(items: T[], weights: number[]) {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function isIMEComposing(e: React.KeyboardEvent<HTMLInputElement>): boolean {
  const anyE = e as unknown as { isComposing?: boolean; nativeEvent?: { isComposing?: boolean } };
  return Boolean(anyE?.isComposing || anyE?.nativeEvent?.isComposing);
}

export default function LearnPage() {
  const [word, setWord] = useState<Word | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [session, setSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 입력창 자동 포커스
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [word]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  // 키보드 UX (Enter=채점, Esc=다음). IME 조합중엔 건드리지 않음
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isIMEComposing(e)) return;

    const metaSubmit = (e.metaKey || e.ctrlKey) && e.key === 'Enter';
    if (e.key === 'Enter' || metaSubmit) {
      e.preventDefault();
      void check();          // ← 즉시 채점
    } else if (e.key === 'Escape') {
      e.preventDefault();
      void loadNext();       // ← 다음 문제
    }
  };

  // 후보 단어 가져오기 + (로그인 시) 최근 시도 불러와 오답 우선 가중치 적용
  async function loadNext() {
    setResult(null);
    setInput('');
    setMsg(null);
    setLoading(true);

    // 1) 후보 단어 100개
    const { data: words, error: werr } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<Word[]>();

    if (werr || !words?.length) {
      setLoading(false);
      setWord(null);
      setMsg(werr?.message ?? '등록된 단어가 없습니다.');
      return;
    }

    let chosen: Word = words[0];

    // 2) (로그인 시) 최근 시도 200건으로 오답 비율 기반 가중치
    if (session?.user) {
      const { data: tries } = await supabase
        .from('attempts')
        .select('word_id, correct')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(200)
        .returns<AttemptRow[]>();

      if (tries?.length) {
        const stats = new Map<string, { total: number; wrong: number }>();
        for (const t of tries) {
          const s = stats.get(t.word_id) ?? { total: 0, wrong: 0 };
          s.total++;
          if (!t.correct) s.wrong++;
          stats.set(t.word_id, s);
        }
        const weights = words.map((w) => {
          const s = stats.get(w.id);
          if (!s) return 1; // 시도 기록 없으면 기본 가중치
          const ratio = s.wrong / Math.max(1, s.total); // 0~1
          return 1 + ratio * 4; // 1~5 범위로 가중 (오답 많을수록↑)
        });
        chosen = pickWeighted(words, weights);
      } else {
        // 기록이 없다면 최신 100개 중 랜덤
        chosen = words[Math.floor(Math.random() * words.length)];
      }
    } else {
      // 비로그인: 최신 100개 중 랜덤
      chosen = words[Math.floor(Math.random() * words.length)];
    }

    setWord(chosen);
    setLoading(false);
  }

  useEffect(() => { void loadNext(); }, [session?.user?.id]); // 로그인 바뀌면 새로 로드

  // 정답 판정 + attempts 로그 저장
  async function check() {
    if (!word) return;

    const mine = normalizeKana(input);
    const ok = word.readings.map(normalizeKana).includes(mine);

    setResult(ok ? 'correct' : 'wrong');

    // 로그인 상태면 시도 기록 저장 (실패해도 학습 흐름은 유지)
    if (session?.user) {
      const payload: AttemptInsert = {
        user_id: session.user.id,
        word_id: word.id,
        input: mine,
        correct: ok,
      };
      const { error } = await supabase.from('attempts').insert(payload);
      if (error) {
        console.error('attempts insert error:', error.message);
        showToast('기록 저장 실패');
      } else {
        showToast('기록 저장 완료');
      }
    }

    // 정답이면 잠깐 보여주고 다음 문제 자동 이동
    if (ok) {
      setTimeout(() => { void loadNext(); }, 800);
    }
  }

  // 단어 읽기들(정규화 버전) 메모이즈 → 결과 영역에서 재계산 최소화
  const normalizedReadings = useMemo(
    () => (word ? word.readings.map(normalizeKana) : []),
    [word]
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600" /> 학습
        </h1>
        <button
          type="button"
          onClick={() => void loadNext()}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border bg-white hover:bg-slate-50 disabled:opacity-50"
          disabled={loading}
          title="다음 문제"
        >
          <RefreshCw className="w-4 h-4" />
          다음
        </button>
      </header>

      <div className="rounded-3xl border bg-white p-8 shadow-sm">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-14 w-24 mx-auto rounded bg-slate-100" />
            <div className="mt-6 h-10 w-full rounded bg-slate-100" />
          </div>
        ) : !word ? (
          <p className="text-slate-600">{msg ?? '등록된 단어가 없거나 불러올 수 없습니다.'}</p>
        ) : (
          <>
            <div className="text-6xl text-center py-6 font-semibold tracking-tight">
              {word.kanji}
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                className="w-full rounded-xl border px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                placeholder="ひらがなで入力"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-label="읽기 입력"
              />
              <button
                type="button"
                onClick={() => void check()}
                className="rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                disabled={!word || loading || input.length === 0}
              >
                확인
              </button>
            </div>

            {result && (
              <div
                aria-live="polite"
                className={`mt-4 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${
                  result === 'correct'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {result === 'correct'
                  ? (<><CheckCircle2 className="w-4 h-4" /> 정답!</>)
                  : (<><XCircle className="w-4 h-4" /> 오답. 정답: {normalizedReadings.join(', ')}</>)
                }
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast text={toast} />}
    </div>
  );
}