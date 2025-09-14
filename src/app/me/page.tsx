'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MePage() {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) return <main style={{padding:24}}>Checking session…</main>;
  if (!session) return <main style={{padding:24}}>Not signed in</main>;

  return (
    <main style={{padding:24}}>
      <p>Signed in as <b>{session.user?.email}</b></p>
      <button
        onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
        style={{marginTop:12}}
      >
        Sign out
      </button>
    </main>
  );
}