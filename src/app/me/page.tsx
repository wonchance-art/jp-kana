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
  q: string;               // Kanji 검색
  from?: string;           // YYYY-MM-DD
  to?: string;             // YYYY-MM-DD
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

  // 서버에서 집계 가능한 필터만 적용해서 가져오기 (정오답/기간)
  async function fetchAttempts() {
    if (!session?.user) return;
    setLoading(true);

    // 1) count (정확한 페이지 수를 위해 분리)
    let countQuery = supabase
      .from('attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id);

    if (filters.correctness === 'correct') countQuery = countQuery.eq('correct', true);
    if (filters.correctness === 'wrong')   countQuery = countQuery.eq('correct', false);
    if (filters.from) countQuery = countQuery.gte('created_at', `${filters.from}T00:00:00`);
    if (filters.to)   countQuery = countQuery.lte('created_at', `${filters.to}T23:59:59`);

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
      .range(fromIdx, toIdx);

    if (filters.correctness === 'correct') pageQuery = pageQuery.eq('correct', true);
    if (filters.correctness === 'wrong')   pageQuery = pageQuery.eq('correct', false);
    if (filters.from) pageQuery = pageQuery.gte('created_at', `${filters.from}T00:00:00`);
    if (filters.to)   pageQuery = pageQuery.lte('created_at', `${filters.to}T23:59:59`);

    const { data } = await pageQuery;

    setLoading(false);

    // 3) words 평탄화 (Supabase 조인 결과가 배열로 오는 경우 대비)
    const normalized: AttemptRow[] = (data ?? []).map((r: {
      id: string;
      word_id: string;
      input: string;
      correct: boolean;
      created_at: string;
      words?: { kanji: string; readings: string[] }[] | null;
    }) => ({
      id: r.id,
      word_id: r.word_id,
      input: r.input,
      correct: r.correct,
      created_at: r.created_at,
      words: Array.isArray(r.words) ? (r.words[0] ?? null) : (r.words ?? null),
    }));

    // 4) 클라이언트 검색(q: Kanji)
    let filtered = normalized;
    if (filters.q.trim()) {
      const q = filters.q.trim();
      filtered = filtered.filter(r => (r.words?.kanji ?? '').includes(q));
    }

    setRows(filtered);
  }

  // 필터/페이지 변경 시 refetch
  useEffect(() => {
    void fetchAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, page, filters.correctness, filters.from, filters.to]);

  // q 입력은 적용 버튼으로만 필터 반영 (서버 호출 줄이기 위함)
  function applySearch() {
    setPage(1);
    void fetchAttempts();
  }
  function resetFilters() {
    setFilters({ correctness: 'all', q: '', from: undefined, to: undefined });
    setPage(1);
    qInputRef.current?.focus();
    void fetchAttempts();
  }

  // ───────── 통계 계산 (최근 500건 기준)
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
        .limit(500);
      setStatLoading(false);

    const normalized: AttemptRow[] = (data ?? []).map((r: {
        id: string;
        word_id: string;
        input: string;
        correct: boolean;
        created_at: string;
        words?: { kanji: string; readings: string[] }[] | null;
    }) => ({
        id: r.id,
        word_id: r.word_id,
        input: r.input,
        correct: r.correct,
        created_at: r.created_at,
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

    // 현재 연속 정답 (최근 시점부터)
    let streak = 0;
    for (const r of rows) {
      if (r.correct) streak++;
      else break;
    }

    // 최근 7일 일별 건수(간략: correct/total)
    const days: Record<string, { total: number; correct: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
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

    // Kanji별 성과
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
      .filter(x => x.total >= 3) // 3회 이상 학습한 단어만
      .sort((a, b) => a.acc - b.acc) // 낮은 정확도 순
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">정오답</label>
            <select
              className="rounded-lg border px-3 py-2"
              value={filters.correctness}
              onChange={(e) => { setPage(1); setFilters({ ...filters, correctness: e.target.value as Filters['correctness'] }); }}
            >
              <option value="all">전체</option>
              <option value="correct">정답만</option>
              <option value="wrong">오답만</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">시작일</label>
            <input
              type="date"
              className="rounded-lg border px-3 py-2"
              value={filters.from ?? ''}
              onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value || undefined }); }}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">종료일</label>
            <input
              type="date"
              className="rounded-lg border px-3 py-2"
              value={filters.to ?? ''}
              onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value || undefined }); }}
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-slate-500 mb-1">Kanji 검색</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-lg border px-2">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  ref={qInputRef}
                  className="w-full px-2 py-2 outline-none"
                  placeholder="예: 花"
                  value={filters.q}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={applySearch}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
                title="검색 적용"
              >
                <Filter className="w-4 h-4" /> 적용
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
              title="필터 초기화"
            >
              <RefreshCw className="w-4 h-4" /> 초기화
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"
              title="CSV 내보내기"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>
      </section>

      {/* Attempts table */}
      <section className="rounded-2xl border bg-white p-2 shadow-sm">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            조건에 맞는 기록이 없습니다.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const date = new Date(r.created_at).toLocaleString();
              const kanji = r.words?.kanji ?? '(unknown)';
              const readings = r.words?.readings?.join(', ') ?? '';
              return (
                <li key={r.id} className="py-3 px-3">
                  <div className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
                    <div className={`text-xs rounded-full px-2 py-1 w-fit ${
                      r.correct
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {r.correct ? '정답' : '오답'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium">{kanji}</div>
                      <div className="text-xs text-slate-500 truncate">
                        정답: {readings} {r.correct ? '' : <> / 입력: <b>{r.input}</b></>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">{date}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Pagination */}
      <Pagination
        page={page}
        setPage={setPage}
        pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      />

      {/* Top hard Kanjis */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
        <div className="font-semibold">어려운 Kanji Top 5 (최근 500 시도)</div>
        {stats.topHard.length === 0 ? (
          <div className="text-sm text-slate-500">데이터가 충분하지 않습니다.</div>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2">
            {stats.topHard.map((x) => (
              <li key={x.kanji} className="rounded-xl border p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{x.kanji}</div>
                  <div className="text-xs text-slate-500">정답: {(x.readings ?? []).join(', ')}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">
                    정확도 <b>{Math.round(x.acc * 100)}%</b>
                  </div>
                  <div className="text-xs text-slate-500">
                    {x.correct}/{x.total}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
      <button
        type="button"
        onClick={prev}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        disabled={page <= 1}
      >
        이전
      </button>
      <div className="text-sm text-slate-600">
        {page} / {pageCount}
      </div>
      <button
        type="button"
        onClick={next}
        className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
        disabled={page >= pageCount}
      >
        다음
      </button>
    </div>
  );
}