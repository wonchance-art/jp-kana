// src/lib/supabaseServer.ts
import { createClient } from '@supabase/supabase-js';

// Allow running in environments where only the public URL is defined (e.g. Vercel preview)
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not defined.');
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);
