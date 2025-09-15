// src/lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,              // Vercel에 설정 필요
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Vercel에 설정 필요 (절대 클라이언트에서 쓰면 안 됨)
);