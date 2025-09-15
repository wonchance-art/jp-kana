// src/lib/supabase.ts
'use client';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 선택: 타입 재노출(편의)
export type { Session, User } from '@supabase/supabase-js';