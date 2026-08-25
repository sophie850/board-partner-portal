import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

/* ============================================================
   Supabase — server-side only

   The secret key bypasses row-level security, so it must never
   reach a browser. The `server-only` import above turns any
   accidental import from a client component into a build error
   rather than a leak.
   ============================================================ */

/** Whether a Supabase project is configured for this deployment. */
export function isSupabaseConfigured(): boolean {
  return Boolean(env('SUPABASE_URL') && env('SUPABASE_SECRET_KEY'));
}

let cached: SupabaseClient | null = null;

/**
 * The privileged client. Returns null when Supabase is not
 * configured, so local development can fall back to the file-backed
 * store without needing a project.
 */
export function supabase(): SupabaseClient | null {
  const url = env('SUPABASE_URL');
  const secret = env('SUPABASE_SECRET_KEY');
  if (!url || !secret) return null;
  if (cached) return cached;

  cached = createClient(url, secret, {
    auth: {
      // No user session on the server: never persist or refresh.
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'x-application-name': 'board-partner-portal' },
    },
  });

  return cached;
}

/** Throws rather than silently degrading, for write paths. */
export function requireSupabase(): SupabaseClient {
  const client = supabase();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.',
    );
  }
  return client;
}
