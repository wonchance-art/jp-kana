'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    // words 개수 배지
    supabase.from('words').select('*', { count: 'exact', head: true }).then(({ count }) => {
      setCount(count ?? 0);
    });
  }, []);

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Learn Kanji readings, the clean way.
        </h1>
        <p className="text-slate-600 max-w-2xl mx-auto">
          관리자 등록 → 실전 입력 → 즉시 채점. 군더더기 없이 ‘읽기’에 집중하세요.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/learn" className="rounded-xl px-5 py-2.5 bg-slate-900 text-white shadow hover:bg-slate-800">
            Start Learning
          </Link>
          <Link href="/admin/words" className="rounded-xl px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50">
            Add Words
          </Link>
        </div>
        <div className="text-sm text-slate-500">
          {typeof count === 'number' ? <>Current words: <b>{count}</b></> : 'Loading…'}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card title="Minimal" desc="필수 기능만 담아 집중력↑" />
        <Card title="Fast feedback" desc="정답/오답 즉시 확인" />
        <Card title="Extendable" desc="SRS/오답우선/게이미피케이션 확장" />
      </section>

      <section className="rounded-2xl border bg-white p-6">
        {session ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">Signed in as <b>{session.user.email}</b></p>
            <button
              onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
              className="text-sm underline"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">로그인하면 Admin 기능 사용 가능</p>
            <Link href="/auth/signin" className="text-sm underline">Sign in</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-slate-600 text-sm mt-1">{desc}</div>
    </div>
  );
}