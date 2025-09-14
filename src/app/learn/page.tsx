'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Word = { id: string; kanji: string; readings: string[] };

export default function LearnPage() {
  const [word, setWord] = useState<Word | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<string | null>(null);

  async function loadLatest() {
    setResult(null);
    setInput('');
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (!error && data) setWord(data as any);
  }

  function check() {
    if (!word) return;
    const mine = input.trim();
    const ok = word.readings.includes(mine);
    setResult(ok ? '✅ 정답!' : `❌ 오답. 정답: ${word.readings.join(', ')}`);
  }

  useEffect(() => { loadLatest(); }, []);

  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">학습</h1>
      {!word ? (
        <p>문제를 불러오는 중…</p>
      ) : (
        <>
          <div className="text-5xl text-center py-6">{word.kanji}</div>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="ひらがなで入力"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="border rounded px-3 py-2" onClick={check}>확인</button>
            <button className="border rounded px-3 py-2" onClick={loadLatest}>다음</button>
          </div>
          {result && <p>{result}</p>}
        </>
      )}
    </main>
  );
}