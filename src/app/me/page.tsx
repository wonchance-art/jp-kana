'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Download, Filter, RefreshCw, Search, User } from 'lucide-react';

// DB rows
type AttemptRow = {
  id: string;
  word_id: string;
  input: string;
  correct: boolean;
  created_at: string;
  words: { kanji: string; readings: string[] } | null;
};

type Filters = {
  correctness: 'all' | 'correct' | 'wrong';
  q: string;
  from?: string;
  to?: string;
};

const PAGE_SIZE = 20;

export default function MePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState<Filters>({
    correctness: 'all',
    q: '',
    from: undefined,
    to: undefined,
  });

  const qInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  // 서버에서 집계 가능한 필터만 적용해서 가져오기
  async function fetchAttempts() {
    if (!session?.user) return;
    setLoading(true);

    // 1) count
    let countQuery = supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (filters.correctness === 'correct') countQuery = countQuery.eq('correct', true);
    if (filters.correctness === 'wrong') countQuery = countQuery.eq('correct', false);
    if (filters.from) countQuery = countQuery.gte('created_at', `${filters.from}T00:00:00`);
    if (filters.to) countQuery = countQuery.lte('created_at', `${filters.to}T23:59:59`);

    const { count } = await countQuery;
    setTotal(count ?? 0);

    // 2) 페이지 데이터
    const fromIdx = (page - 1) * PAGE_SIZE;
    const toIdx = fromIdx + PAGE_SIZE - 1;

    let pageQuery = supabase
      .from('attempts')
      .select('id, word_id, input, correct, created_at, words (kanji, readings)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx)
      .returns<
        Array<
          Omit<AttemptRow, 'words'> & {
            words: { kanji: string; readings: string[] }[] | null;
          }
        >
      >();

    if (filters.correctness === 'correct') pageQuery = pageQuery.eq('correct', true);
    if (filters.correctness === 'wrong') pageQuery = pageQuery.eq('correct', false);
    if (filters.from) pageQuery = pageQuery.gte('created_at', `${filters.from}T00:00:00`);
    if (filters.to) pageQuery = pageQuery.lte('created_at', `${filters.to}T23:59:59`);

    const { data } = await pageQuery;
    setLoading(false);

    // 3) words 평탄화
    const normalized: AttemptRow[] = (data ?? []).map(r => ({
      ...r,
      words: Array.isArray(r.words) ? (r.words[0] ?? null) : (r.words ?? null),
    }));

    // 4) 클라이언트 검색(q)
    let filtered = normalized;
    if (filters.q.trim()) {
      const q = filters.q.trim();
      filtered = filtered.filter(r => (r.words?.kanji ?? '').includes(q));
    }

    setRows(filtered);
  }

  // 필터/페이지 변경 시 refetch
  useEffect(() => {
    fetchAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, page, filters.correctness, filters.from, filters.to]);

  function applySearch() {
    setPage(1);
    fetchAttempts();
  }
  function resetFilters() {
    setFilters({ correctness: 'all', q: '', from: undefined, to: undefined });
    setPage(1);
    qInputRef.current?.focus();
  }

  // ───────── 통계 (최근 500건)
  const [statLoading, setStatLoading] = useState(false);
  const [statRows, setStatRows] = useState<AttemptRow[]>([]);
  useEffect(() => {
    (async () => {
      if (!session?.user) return;
      setStatLoading(true);
      const { data } = await supabase
        .from('attempts')
        .select('id, word_id, input, correct, created_at, words (kanji, readings)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(500)
        .returns<
          Array<
            Omit<AttemptRow, 'words'> & {
              words: { kanji: string; readings: string[] }[] | null;
            }
          >
        >();
      setStatLoading(false);

      const normalized: AttemptRow[] = (data ?? []).map(r => ({
        ...r,
        words: Array.isArray(r.words) ? (r.words[0] ?? null) : (r.words ?? null),
      }));

      setStatRows(normalized);
    })();
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    const rows = statRows;
    const total = rows.length;
    const correct = rows.filter(r => r.correct).length;
    const accuracy = total ? Math.round((correct / total) * 100) : 0;

    let streak = 0;
    for (const r of rows) {
      if (r.correct) streak++;
      else break;
    }

    const days: Record<string, { total: number; correct: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = { total: 0, correct: 0 };
    }
    for (const r of rows) {
      const key = r.created_at.slice(0, 10);
      if (days[key]) {
        days[key].total++;
        if (r.correct) days[key].correct++;
      }
    }
    const recent7 = Object.entries(days)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, ...v }));

    const byKanji = new Map<string, { total: number; correct: number; readings: string[] }>();
    for (const r of rows) {
      const k = r.words?.kanji ?? '(unknown)';
      const cur = byKanji.get(k) ?? { total: 0, correct: 0, readings: r.words?.readings ?? [] };
      cur.total++;
      if (r.correct) cur.correct++;
      byKanji.set(k, cur);
    }
    const topHard = Array.from(byKanji.entries())
      .map(([kanji, v]) => ({ kanji, ...v, acc: v.total ? v.correct / v.total : 0 }))
      .filter(x => x.total >= 3)
      .sort((a, b) => a.acc - b.acc)
      .slice(0, 5);

    return { total, correct, accuracy, streak, recent7, topHard };
  }, [statRows]);

  // CSV 내보내기
  function exportCSV() {
    const header = ['date', 'kanji', 'readings', 'input', 'correct'];
    const lines = rows.map(r => {
      const date = new Date(r.created_at).toISOString();
      const kanji = r.words?.kanji ?? '';
      const readings = (r.words?.readings ?? []).join('/');
      return [date, kanji, readings, r.input, String(r.correct)];
    });
    const csv = [header, ...lines].map(cols =>
      cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attempts.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!session) {
    return (
      <main className="max-w-xl mx-auto p-6">
        <p>로그인이 필요합니다.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-6 h-6 text-slate-600" />
          <div className="font-semibold">내 학습 기록</div>
        </div>
        <div className="text-sm text-slate-500">{session.user.email}</div>
      </header>

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-4">
        <KPI title="전체 시도" value={stats.total} />
        <KPI title="정확도" value={`${stats.accuracy}%`} />
        <KPI title="연속 정답" value={`${stats.streak}`} />
        <KPI title="최근 7일 정답/전체" value={
          statLoading ? '...' :
          `${stats.recent7.at(-1)?.correct ?? 0}/${stats.recent7.at(-1)?.total ?? 0}`
        } />
      </section>

      {/* Filters */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        {/* ...필터 UI 동일 (생략) */}
      </section>

      {/* Attempts table */}
      <section className="rounded-2xl border bg-white p-2 shadow-sm">
        {/* ...테이블 렌더링 동일 (생략) */}
      </section>

      <Pagination
        page={page}
        setPage={setPage}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      />

      {/* Top hard Kanjis */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        {/* ...Top Hard 출력 동일 (생략) */}
      </section>
    </main>
  );
}

/* ───────────────── Components ───────────────── */

function KPI({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Pagination({
  page, setPage, pageCount,
}: { page: number; setPage: (n: number) => void; pageCount: number }) {
  const prev = () => setPage(Math.max(1, page - 1));
  const next = () => setPage(Math.min(pageCount, page + 1));
  return (
    <div className="flex items-center justify-center gap-2">
      <button onClick={prev} disabled={page <= 1}>이전</button>
      <div>{page} / {pageCount}</div>
      <button onClick={next} disabled={page >= pageCount}>다음</button>
    </div>
  );
}