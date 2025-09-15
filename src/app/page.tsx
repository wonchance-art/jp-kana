'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { BookOpen, Database, LogIn, ArrowRight, Sparkles } from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [wordsCount, setWordsCount] = useState<number | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // 로그인 세션
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    // 등록된 단어 개수 (count 전용 쿼리)
    supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => setWordsCount(count ?? 0));
  }, []);

  return (
    <div className="space-y-12">
      {/* 히어로 섹션 */}
      <section className="relative rounded-3xl border bg-white/70 p-8 shadow-sm backdrop-blur">
        <div className="absolute -top-3 -left-3 rounded-full bg-indigo-600 text-white px-3 py-1 text-xs flex items-center gap-1 shadow">
          <Sparkles className="w-3.5 h-3.5" />
          New
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Learn Kanji <span className="text-indigo-600">readings</span> faster.
        </h1>
        <p className="mt-3 text-slate-600 max-w-2xl">
          관리자 등록 → 실전 입력 → 즉시 채점. 군더더기 없이 <b>요미(읽기)</b>에 집중하세요.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/learn"
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3
                       bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium
                       shadow hover:opacity-95 transition"
          >
            <BookOpen className="w-5 h-5" />
            Start Learning
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/admin/words"
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3
                       border bg-white hover:bg-slate-50 transition shadow-sm"
          >
            <Database className="w-5 h-5 text-emerald-600" />
            Add Words
          </Link>
        </div>

        <div className="mt-4 text-sm text-slate-500">
          {typeof wordsCount === 'number' ? (
            <>Current words: <b>{wordsCount}</b></>
          ) : (
            <>Counting words…</>
          )}
        </div>
      </section>

      {/* 특징 카드 */}
      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard
          title="Minimal"
          desc="필수 기능 중심 설계로 집중력 유지"
          icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
        />
        <FeatureCard
          title="Fast feedback"
          desc="정답/오답 즉시 피드백으로 학습 효율↑"
          icon={<ArrowRight className="w-5 h-5 text-purple-600" />}
        />
        <FeatureCard
          title="Extendable"
          desc="SRS/오답 우선/게이미피케이션으로 확장"
          icon={<Database className="w-5 h-5 text-emerald-600" />}
        />
      </section>

      {/* 세션 영역 */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between">
        {session ? (
          <>
            <p className="text-sm">
              Signed in as <b>{session.user.email}</b>
            </p>
            <button
              disabled={signingOut}
              onClick={async () => { setSigningOut(true); await supabase.auth.signOut(); location.reload(); }}
              className="text-sm underline disabled:opacity-50"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">로그인하면 Admin 기능을 사용할 수 있어요.</p>
            <Link href="/auth/signin" className="inline-flex items-center gap-2 text-sm underline">
              <LogIn className="w-4 h-4" />
              Sign in
            </Link>
          </>
        )}
      </section>

      {/* 빠른 이동 */}
      <section className="grid gap-3 sm:grid-cols-3">
        <QuickLink href="/learn" title="학습 시작" desc="문제 보고 히라가나 입력" icon={<BookOpen className="w-5 h-5" />} />
        <QuickLink href="/admin/words" title="단어 등록" desc="한자/읽기 추가 & 목록" icon={<Database className="w-5 h-5" />} />
        <QuickLink href="/auth/signin" title="로그인" desc="이메일 매직 링크" icon={<LogIn className="w-5 h-5" />} />
      </section>
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <div className="text-slate-600 text-sm mt-1">{desc}</div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
  icon,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm hover:shadow transition"
    >
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
    </Link>
  );
}