'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Word = { id: string; kanji: string; readings: string[] };

export default function AdminWordsPage() {
  const [kanji, setKanji] = useState('');
  const [readings, setReadings] = useState(''); // 쉼표로 구분: はな,か
  const [list, setList] = useState<Word[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchWords() {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) setMsg(error.message);
    setList((data as any) || []);
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const k = kanji.trim();
    const arr = readings.split(',').map(s => s.trim()).filter(Boolean);
    if (!k || arr.length === 0) return setMsg('한자와 읽기를 입력하세요.');
    setLoading(true);
    const { error } = await supabase.from('words').insert({ kanji: k, readings: arr });
    setLoading(false);
    if (error) return setMsg(error.message);
    setKanji(''); setReadings('');
    fetchWords();
  }

  useEffect(() => { fetchWords(); }, []);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">관리자: 단어 등록</h1>

      <form onSubmit={addWord} className="space-y-2">
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="한자 (예: 花)"
          value={kanji}
          onChange={(e) => setKanji(e.target.value)}
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="읽기(쉼표로 구분, 예: はな,か)"
          value={readings}
          onChange={(e) => setReadings(e.target.value)}
        />
        <button className="border rounded px-3 py-2" disabled={loading}>
          {loading ? '추가 중…' : '추가'}
        </button>
        {msg && <p className="text-red-600">{msg}</p>}
      </form>

      <ul className="space-y-2">
        {list.map(w => (
          <li key={w.id} className="border rounded px-3 py-2">
            <b className="mr-2">{w.kanji}</b>
            <span>[{w.readings.join(', ')}]</span>
          </li>
        ))}
      </ul>
    </main>
  );
}