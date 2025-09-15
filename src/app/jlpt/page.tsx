'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, RefreshCw, VolumeX } from 'lucide-react';

type WordRow = {
  id: string;
  kanji: string;
  kana: string | null;
  readings: string[];
  meaning: string | null;
  audio_url: string | null;
};

const LEVELS = ['N5','N4','N3','N2','N1'] as const;
type Level = typeof LEVELS[number];

// ▼ JLPT 매핑 테이블에서 select 한 행의 타입
type JLPTMapRow = {
  word_id: string;
  level: Level;
  words: WordRow | null;
};

export default function JLPTPage() {
  const [level, setLevel] = useState<Level>('N5');
  const [list, setList] = useState<WordRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    void loadLevel(level);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [level]);

  async function loadLevel(lv: Level) {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from('jlpt_map')
      .select('word_id, level, words (id, kanji, kana, readings, meaning, audio_url)')
      .eq('level', lv)
      .order('word_id', { ascending: true })
      .limit(200)
      .returns<JLPTMapRow[]>(); // ★ 결과 타입 지정

    setLoading(false);

    if (error) {
      setError(error.message);
      setList([]);
      return;
    }

    const rows = (data ?? [])
      .map((r) => r.words) // ★ any 제거
      .filter((w): w is WordRow => Boolean(w)); // 좁히기

    setList(rows);
  }

  async function fetchFromDict(kanji: string) {
    try {
      setFetching(kanji);
      await fetch(`/api/dict?q=${encodeURIComponent(kanji)}`, { cache: 'no-store' });
      await loadLevel(level);
    } finally {
      setFetching(null);
    }
  }

  function playAudioOrTTS(w: WordRow) {
    if (w.audio_url) {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        const a = new Audio(w.audio_url);
        audioRef.current = a;
        a.play().catch(() => ttsFallback(w));
        return;
      } catch {
        ttsFallback(w);
        return;
      }
    }
    ttsFallback(w);
  }

  function ttsFallback(w: WordRow) {
    const text = w.kana || w.kanji;
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">JLPT 학습</h1>
        <nav className="flex gap-2">
          {LEVELS.map(lv => (
            <button
              key={lv}
              onClick={() => setLevel(lv)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${level===lv ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
            >
              {lv}
            </button>
          ))}
        </nav>
      </header>

      <section className="rounded-2xl border bg-white p-2 shadow-sm">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">불러오는 중…</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-600">오류: {error}</div>
        ) : list.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            이 레벨에 등록된 단어가 없습니다.
          </div>
        ) : (
          <ul className="divide-y">
            {list.map(w => (
              <li key={w.id} className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xl font-semibold">
                      {w.kanji}
                      {w.kana ? <span className="text-slate-500 text-base ml-2">[{w.kana}]</span> : null}
                    </div>
                    {w.meaning && <div className="text-sm text-slate-700 mt-0.5">{w.meaning}</div>}
                    <div className="text-xs text-slate-500 mt-1">읽기: {w.readings?.join(', ')}</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => playAudioOrTTS(w)}
                      className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-slate-50"
                      title={w.audio_url ? '오디오 재생' : 'TTS 재생'}
                    >
                      <Play className="w-4 h-4" /> 듣기
                    </button>

                    {!w.audio_url && (
                      <button
                        onClick={() => fetchFromDict(w.kanji)}
                        className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                        disabled={fetching === w.kanji}
                        title="사전에서 가져오기/갱신"
                      >
                        <RefreshCw className={`w-4 h-4 ${fetching===w.kanji ? 'animate-spin' : ''}`} />
                        가져오기
                      </button>
                    )}
                  </div>
                </div>

                {!w.audio_url && typeof window !== 'undefined' && !('speechSynthesis' in window) && (
                  <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-flex items-center gap-1">
                    <VolumeX className="w-3 h-3" />
                    브라우저 TTS를 사용할 수 없습니다.
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}