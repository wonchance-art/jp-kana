'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail } from 'lucide-react';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setLoading(false);
    if (error) setMsg(error.message);
    else setSent(true);
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <LogIn className="w-6 h-6 text-slate-600" />
        Sign in
      </h1>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        {sent ? (
          <p className="text-sm text-slate-600">
            메일을 확인해 주세요. 받은 편지함에서 매직 링크를 누르면 로그인됩니다.
          </p>
        ) : (
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2 bg-white">
              <Mail className="w-4 h-4 text-slate-500" />
              <input
                className="w-full outline-none"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button
              className="w-full rounded-xl px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            {msg && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {msg}
            </div>}
          </form>
        )}
      </div>
    </div>
  );
}