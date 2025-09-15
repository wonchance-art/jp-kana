'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Word = { id: string; kanji: string; readings: string[]; created_at: string };

export default function LearnPage() {
  const [word, setWord] = useState<Word | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadRandom() {
    setResult(null);
    setInput('');
    // 간단 랜덤: 최신 100개 중에서 클라이언트 랜덤 1개
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .returns<Word[]>();
    if (!error && data && data.length) {
      const pick = data[Math.floor(Math.random() * data.length)];
      setWord(pick);
    } else {
      setWord(null);
    }
  }

  function check() {
    if (!word) return;
    const mine = input.trim();
    const ok = word.readings.includes(mine);
    setResult(ok ? '✅ 정답!' : `❌ 오답. 정답: ${word.readings.join(', ')}`);
  }

  useEffect(() => { loadRandom(); }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">학습</h1>

      <div className="rounded-2xl border bg-white p-8 shadow-sm">
        {!word ? (
          <p className="text-slate-600">문제를 불러오는 중이거나, 등록된 단어가 없습니다.</p>
        ) : (
          <>
            <div className="text-6xl text-center py-6 font-semibold tracking-tight">{word.kanji}</div>
            <div className="flex gap-2">
              <input
                className="w-full rounded-xl border px-4 py-2"
                placeholder="ひらがなで入力"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button onClick={check} className="rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800">
                확인
              </button>
              <button onClick={loadRandom} className="rounded-xl px-4 py-2 border bg-white hover:bg-slate-50" disabled={loading}>
                다음
              </button>
            </div>
            {result && (
              <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3 text-sm">{result}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}