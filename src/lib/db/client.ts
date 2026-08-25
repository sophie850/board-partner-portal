import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* ============================================================
   Supabase — server-side only

   The secret key bypasses row-level security, so it must never
   reach a browser. The `server-only` import above turns any
   accidental import from a client component into a build error
   rather than a leak.
   ============================================================ */

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

/** Whether a Supabase project is configured for this deployment. */
export const supabaseConfigured = Boolean(url && secret);

let cached: SupabaseClient | null = null;

/**
 * The privileged client. Returns null when Supabase is not
 * configured, so local development can fall back to the file-backed
 * store without needing a project.
 */
export function supabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (cached) return cached;

  cached = createClient(url!, secret!, {
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
