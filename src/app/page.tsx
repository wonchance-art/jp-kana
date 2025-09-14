'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
  }, []);

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">JP Kana Trainer</h1>
      <p className="text-gray-600">관리자가 단어를 등록하고, 학습자가 히라가나로 입력해 학습하는 미니 앱</p>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/auth/signin" className="border rounded-xl p-4 hover:bg-gray-50">
          <b>Sign in</b>
          <div className="text-sm text-gray-600">이메일 매직 링크로 로그인</div>
        </Link>

        <Link href="/learn" className="border rounded-xl p-4 hover:bg-gray-50">
          <b>Learn</b>
          <div className="text-sm text-gray-600">문제 보고 히라가나로 답하기</div>
        </Link>

        <Link href="/admin/words" className="border rounded-xl p-4 hover:bg-gray-50">
          <b>Admin · Words</b>
          <div className="text-sm text-gray-600">한자/읽기 등록 및 목록 보기</div>
        </Link>

        <Link href="/me" className="border rounded-xl p-4 hover:bg-gray-50">
          <b>My session</b>
          <div className="text-sm text-gray-600">로그인 상태 확인/Sign out</div>
        </Link>
      </section>

      <div className="text-sm text-gray-700">
        {session ? (
          <div>
            로그인됨: <b>{session.user.email}</b>{' '}
            <button
              onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
              className="ml-2 underline"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div>로그인되지 않음</div>
        )}
      </div>
    </main>
  );
}
