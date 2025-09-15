'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, PlusCircle, RotateCcw, Pencil, Trash2, Save, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { Toast } from '@/components/Toast';

type Word = { id: string; kanji: string; readings: string[]; created_at: string };

// ✅ 관리자 허용 목록 (반드시 본인 이메일로 교체하세요)
const ADMIN_EMAILS: string[] = [
    'won_cy_@naver.com',
];

function isAdmin(email?: string | null) {
  if (!email) return false;
  if (ADMIN_EMAILS.length === 0) {
    // allow-list가 비어있다면 "임시 개발 모드"로 로그인만 되어있으면 통과
    return true;
  }
  return ADMIN_EMAILS.includes(email);
}

export default function AdminWordsPage() {
  const [session, setSession] = useState<Session | null>(null);

  // form states
  const [kanji, setKanji] = useState('');
  const [readings, setReadings] = useState(''); // 쉼표: はな,か

  // list states
  const [list, setList] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // 항목별 작업중 표시

  // inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKanji, setEditKanji] = useState('');
  const [editReadings, setEditReadings] = useState('');

  // feedback
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(t: string) {
    setToast(t);
    setTimeout(() => setToast(null), 1800);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  const canUse = useMemo(() => {
    if (!session?.user) return { ok: false, reason: '로그인이 필요합니다.' };
    if (!isAdmin(session.user.email)) return { ok: false, reason: '관리자만 접근할 수 있습니다.' };
    return { ok: true as const, reason: '' };
  }, [session?.user]);

  async function fetchWords() {
    setLoading(true);
    setMsg(null);
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .returns<Word[]>();
    setLoading(false);
    if (error) setMsg(error.message);
    setList(data ?? []);
  }

  useEffect(() => {
    if (canUse.ok) fetchWords();
  }, [canUse.ok]);

  // ─────────────────────────────────────────────
  // Create
  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setOk(null);

    const k = kanji.trim();
    const arr = readings.split(',').map(s => s.trim()).filter(Boolean);

    if (!k) { setMsg('한자를 입력하세요.'); return; }
    if (arr.length === 0) { setMsg('읽기를 하나 이상 입력하세요.'); return; }
    if (arr.some(r => /[,]/.test(r))) { setMsg('읽기에는 쉼표를 포함하지 마세요.'); return; }

    setLoading(true);
    // 낙관적 UI: 먼저 화면에 추가해 놓기
    const optimistic: Word = {
      id: `optimistic-${Date.now()}`,
      kanji: k,
      readings: arr,
      created_at: new Date().toISOString(),
    };
    setList(prev => [optimistic, ...prev]);

    const { data, error } = await supabase
      .from('words')
      .insert({ kanji: k, readings: arr })
      .select('*')
      .single<Word>();

    setLoading(false);

    if (error || !data) {
      // 롤백
      setList(prev => prev.filter(w => w.id !== optimistic.id));
      setMsg(error?.message ?? '추가 실패');
      showToast('추가 실패');
      return;
    }

    // 낙관 entry를 실제 row로 치환
    setList(prev => prev.map(w => (w.id === optimistic.id ? data : w)));
    setKanji('');
    setReadings('');
    setOk('등록되었습니다.');
    showToast('단어 추가 완료');
  }

  // ─────────────────────────────────────────────
  // Edit 준비
  function startEdit(w: Word) {
    setEditingId(w.id);
    setEditKanji(w.kanji);
    setEditReadings(w.readings.join(', '));
  }
  function cancelEdit() {
    setEditingId(null);
    setEditKanji('');
    setEditReadings('');
  }

  // Update
  async function saveEdit(id: string) {
    const k = editKanji.trim();
    const arr = editReadings.split(',').map(s => s.trim()).filter(Boolean);

    if (!k) { setMsg('한자를 입력하세요.'); return; }
    if (arr.length === 0) { setMsg('읽기를 하나 이상 입력하세요.'); return; }
    if (arr.some(r => /[,]/.test(r))) { setMsg('읽기에는 쉼표를 포함하지 마세요.'); return; }

    setBusyId(id);
    setMsg(null); setOk(null);

    // 낙관적 업데이트
    const old = list.find(w => w.id === id);
    setList(prev => prev.map(w => (w.id === id ? { ...w, kanji: k, readings: arr } : w)));

    const { error } = await supabase
      .from('words')
      .update({ kanji: k, readings: arr })
      .eq('id', id);

    setBusyId(null);

    if (error) {
      // 롤백
      if (old) setList(prev => prev.map(w => (w.id === id ? old : w)));
      setMsg(error.message);
      showToast('수정 실패');
      return;
    }
    setOk('수정되었습니다.');
    setEditingId(null);
    setEditKanji('');
    setEditReadings('');
    showToast('수정 완료');
  }

  // Delete
  async function remove(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    setBusyId(id);
    setMsg(null); setOk(null);

    // 낙관적 삭제
    const old = list;
    setList(prev => prev.filter(w => w.id !== id));

    const { error } = await supabase.from('words').delete().eq('id', id);

    setBusyId(null);
    if (error) {
      // 롤백
      setList(old);
      setMsg(error.message);
      showToast('삭제 실패');
      return;
    }
    setOk('삭제되었습니다.');
    showToast('삭제 완료');
  }

  if (!canUse.ok) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" /> 관리자: 단어 등록
        </h1>
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
          {canUse.reason}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-emerald-600" /> 관리자: 단어 등록
        </h1>
        <button
          type="button"
          onClick={fetchWords}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border bg-white hover:bg-slate-50 disabled:opacity-50"
          title="새로고침"
          disabled={loading}
        >
          <RotateCcw className="w-4 h-4" />
          새로고침
        </button>
      </header>

      {/* 추가 폼 */}
      <div className="rounded-3xl border bg-white p-6 shadow-sm space-y-3">
        <form onSubmit={addWord} className="grid gap-3 sm:grid-cols-3">
          <input
            className="sm:col-span-1 w-full rounded-xl border px-4 py-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            placeholder="한자 (예: 花)"
            value={kanji}
            onChange={(e) => setKanji(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <input
            className="sm:col-span-2 w-full rounded-xl border px-4 py-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            placeholder="읽기(쉼표로 구분, 예: はな,か)"
            value={readings}
            onChange={(e) => setReadings(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="sm:col-span-3 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            disabled={loading}
          >
            <PlusCircle className="w-4 h-4" />
            {loading ? '추가 중…' : '추가'}
          </button>
        </form>

        {msg && <Alert tone="error">{msg}</Alert>}
        {ok &&  <Alert tone="ok">{ok}</Alert>}
      </div>

      {/* 목록 */}
      <div className="rounded-3xl border bg-white p-2 shadow-sm">
        {loading && list.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">불러오는 중…</div>
        ) : (
          <ul className="divide-y">
            {list.map((w) => {
              const isEditing = editingId === w.id;
              return (
                <li key={w.id} className="py-3 px-2">
                  <div className="flex items-center justify-between gap-3">
                    {!isEditing ? (
                      <>
                        <div className="min-w-0">
                          <b className="mr-2 break-words">{w.kanji}</b>
                          <span className="text-slate-500 break-words">[{w.readings.join(', ')}]</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => startEdit(w)}
                            disabled={busyId === w.id}
                            title="수정"
                          >
                            <Pencil className="w-4 h-4" /> 수정
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-red-50 disabled:opacity-50"
                            onClick={() => remove(w.id)}
                            disabled={busyId === w.id}
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" /> 삭제
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid sm:grid-cols-3 gap-2 w-full">
                          <input
                            className="sm:col-span-1 w-full rounded-xl border px-3 py-1.5"
                            value={editKanji}
                            onChange={(e) => setEditKanji(e.target.value)}
                          />
                          <input
                            className="sm:col-span-2 w-full rounded-xl border px-3 py-1.5"
                            value={editReadings}
                            onChange={(e) => setEditReadings(e.target.value)}
                            placeholder="쉼표로 구분 (예: はな,か)"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-emerald-50 disabled:opacity-50"
                            onClick={() => saveEdit(w.id)}
                            disabled={busyId === w.id}
                            title="저장"
                          >
                            <Save className="w-4 h-4" /> 저장
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-sm hover:bg-slate-50 disabled:opacity-50"
                            onClick={cancelEdit}
                            disabled={busyId === w.id}
                            title="취소"
                          >
                            <X className="w-4 h-4" /> 취소
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="mt-1">
                    <time className="text-xs text-slate-400">
                      {new Date(w.created_at).toLocaleString()}
                    </time>
                  </div>
                </li>
              );
            })}
            {list.length === 0 && (
              <li className="py-6 text-center text-slate-500 text-sm">
                아직 등록된 단어가 없습니다.
              </li>
            )}
          </ul>
        )}
      </div>

      {toast && <Toast text={toast} />}
    </div>
  );
}

function Alert({ tone, children }: { tone: 'ok' | 'error'; children: React.ReactNode }) {
  const klass =
    tone === 'ok'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${klass}`}>{children}</div>
  );
}