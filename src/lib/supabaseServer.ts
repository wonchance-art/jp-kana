// src/lib/supabaseServer.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Lazily instantiate the Supabase admin client so builds don't fail when env vars are absent.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) is not defined.');
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined.');
  }

  if (!cachedAdminClient) {
    cachedAdminClient = createClient(supabaseUrl, serviceRoleKey);
  }

  return cachedAdminClient;
}
