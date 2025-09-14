'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CallbackPage() {
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    let mounted = true;

    // 매직 링크로 돌아오면 URL 해시에 토큰이 붙어옵니다.
    // supabase-js가 이때 세션을 localStorage에 저장합니다.
    // 바로 세션이 잡히는지 확인 후 안내하고 홈으로 이동합니다.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setMsg('Signed in! Redirecting…');
        setTimeout(() => { window.location.href = '/'; }, 700);
      } else {
        // 드물게 늦게 잡히는 경우 짧게 한 번 더 확인
        setTimeout(async () => {
          const again = await supabase.auth.getSession();
          if (again.data.session) {
            setMsg('Signed in! Redirecting…');
            setTimeout(() => { window.location.href = '/'; }, 700);
          } else {
            setMsg('Could not detect session. Please try signing in again.');
          }
        }, 700);
      }
    });

    return () => { mounted = false; };
  }, []);

  return <main style={{ padding: 24 }}>{msg}</main>;
}