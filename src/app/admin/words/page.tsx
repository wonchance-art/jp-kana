'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Word = { id: string; kanji: string; readings: string[]; created_at: string };

export default function AdminWordsPage() {
  const [kanji, setKanji] = useState('');
  const [readings, setReadings] = useState(''); // 쉼표: はな,か
  const [list, setList] = useState<Word[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function fetchWords() {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .returns<Word[]>();
    if (error) setMsg(error.message);
    setList(data ?? []);
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null); setOk(null);
    const k = kanji.trim();
    const arr = readings.split(',').map(s => s.trim()).filter(Boolean);
    if (!k || arr.length === 0) { setMsg('한자와 읽기를 입력하세요.'); return; }
    setLoading(true);
    const { error } = await supabase.from('words').insert({ kanji: k, readings: arr });
    setLoading(false);
    if (error) setMsg(error.message);
    else { setOk('등록되었습니다.'); setKanji(''); setReadings(''); fetchWords(); }
  }

  useEffect(() => { fetchWords(); }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">관리자: 단어 등록</h1>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <form onSubmit={addWord} className="space-y-3">
          <input
            className="w-full rounded-xl border px-4 py-2"
            placeholder="한자 (예: 花)"
            value={kanji}
            onChange={(e) => setKanji(e.target.value)}
          />
          <input
            className="w-full rounded-xl border px-4 py-2"
            placeholder="읽기(쉼표로 구분, 예: はな,か)"
            value={readings}
            onChange={(e) => setReadings(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800" disabled={loading}>
              {loading ? '추가 중…' : '추가'}
            </button>
            <button type="button" onClick={fetchWords} className="rounded-xl px-4 py-2 border bg-white hover:bg-slate-50">
              새로고침
            </button>
          </div>
        </form>

        {msg && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{msg}</div>}
        {ok &&  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div>}
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <ul className="divide-y">
          {list.map(w => (
            <li key={w.id} className="py-3">
              <div className="flex items-center justify-between">
                <div><b>{w.kanji}</b> <span className="text-slate-500">[{w.readings.join(', ')}]</span></div>
                <time className="text-xs text-slate-400">{new Date(w.created_at).toLocaleDateString()}</time>
              </div>
            </li>
          ))}
          {list.length === 0 && <li className="py-3 text-slate-500 text-sm">아직 등록된 단어가 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}