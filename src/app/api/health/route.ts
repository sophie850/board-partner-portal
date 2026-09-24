import { NextResponse } from 'next/server';

import { isSupabaseConfigured, supabase } from '@/lib/db/client';
import { emailProvider } from '@/lib/email';
import { env } from '@/lib/env';

/* ============================================================
   Configuration health check

   Reports whether the deployment is wired up correctly, without
   revealing any secret. Reachable without the passphrase, so it can
   be used to diagnose a site you cannot get into — which means it
   must never return data, only the shape of the problem.
   ============================================================ */

export const dynamic = 'force-dynamic';

/**
 * Enough to tell one key from another, nothing more.
 *
 * Length alone distinguishes a Supabase secret key from a
 * publishable one, which is the mistake worth catching. This
 * endpoint is reachable without the passphrase, so it deliberately
 * does not echo any part of a value.
 */
function fingerprint(value: string | undefined): string {
  if (!value) return 'not set';
  return `set (${value.length} chars)`;
}

/**
 * Everything a failure will admit to.
 *
 * `error.message` on its own is routinely empty. A project that is
 * paused, or a URL that resolves to nothing, fails underneath
 * PostgREST — there is no SQL error to report, so the message is
 * blank and the real cause sits on `cause`. This endpoint exists to
 * name a fault, and `"error": ""` names nothing.
 *
 * Nothing here can leak a key: it is the database's own account of
 * what went wrong, never the request that was made.
 */
function describe(error: unknown): string {
  if (!error) return 'unknown error';

  if (typeof error === 'string') return error;

  const e = error as {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    cause?: unknown;
  };

  const parts = [e.message, e.details, e.hint].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  // The cause is where "fetch failed" keeps the thing you need —
  // ENOTFOUND, a refused connection, a TLS failure.
  if (e.cause && e.cause !== error) {
    const cause = describe(e.cause);
    if (cause && cause !== 'unknown error' && !parts.includes(cause)) parts.push(cause);
  }

  if (e.code) parts.push(`[${e.code}]`);

  return parts.join(' — ') || '';
}

/**
 * Why one table could not be counted.
 *
 * The count is a HEAD request, which is cheap and returns no body —
 * so when it fails there is nothing to read the reason out of, and
 * the reason is the entire point of this endpoint. One ordinary
 * GET for a single row, only on the failing path, gets the words.
 */
async function explain(
  client: NonNullable<ReturnType<typeof supabase>>,
  table: string,
  headError: unknown,
): Promise<string> {
  const fromHead = describe(headError);
  if (fromHead) return fromHead;

  try {
    const { error } = await client.from(table).select('*').limit(1);
    return describe(error) || 'the request failed with no message';
  } catch (e) {
    return describe(e) || 'the request failed with no message';
  }
}

export async function GET() {
  const configured = isSupabaseConfigured();
  const checks: Record<string, unknown> = {
    supabaseUrl: env('SUPABASE_URL') ?? 'not set',
    supabaseSecretKey: fingerprint(env('SUPABASE_SECRET_KEY')),
    publicSupabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL') ?? 'not set',
    publishableKey: fingerprint(env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')),
    // Sign-in supersedes the passphrase, so say which one is
    // actually holding the door rather than listing both.
    accessControl: env('AUTH_SECRET')
      ? 'sign-in by email link'
      : env('PORTAL_PASSPHRASE')
        ? 'shared passphrase — no individual accounts'
        : 'none — the site is open to anyone with the URL',
    authSecret: fingerprint(env('AUTH_SECRET')),
    emailProvider: emailProvider() ?? 'not set — no sign-in links can be delivered',
    siteUrl: env('SITE_URL') ?? env('URL') ?? 'not set — links use the request host',
    cronSecret: env('CRON_SECRET')
      ? fingerprint(env('CRON_SECRET'))
      : 'not set — scheduled reminders will not run',
    supabaseConfigured: configured,
    dataSource: configured ? 'supabase' : 'bundled fixtures',
  };

  /*
   * Loud, because this flag turns sign-in off in all but name and is
   * easy to leave on after getting into a fresh deployment.
   */
  if (env('AUTH_DEV_SHOW_LINK') === '1') {
    checks.WARNING =
      'AUTH_DEV_SHOW_LINK is on: sign-in links are shown on screen to anyone who ' +
      'enters a known email address. Unset it before real partners use this.';
  }

  if (!configured) {
    checks.verdict =
      'Running on bundled fixtures. Set SUPABASE_URL and SUPABASE_SECRET_KEY to use the database.';
    return NextResponse.json(checks, { status: 200 });
  }

  // Touch each table the read model needs, so a single missing table
  // is named rather than surfacing as a generic failure.
  const tables = [
    'events',
    'entitlements',
    'suppliers',
    'shop_categories',
    'products',
    'forms',
    'form_fields',
    'request_types',
    'content_categories',
    'content_pages',
    'files',
    'task_templates',
    'partner_organisations',
    'partner_users',
    'event_participations',
    'partner_inventory',
    'partner_requested_files',
    'partner_price_overrides',
    'orders',
    'order_items',
    'supplier_orders',
    'supplier_order_items',
    'requests',
    'request_comments',
    'webhook_events',
    'webhook_delivery_attempts',
    'notifications',
    'email_templates',
    'sent_emails',
    'audit_log',
    'organiser_users',
    'auth_tokens',
  ];

  const client = supabase();
  const failures: Array<{ table: string; error: string }> = [];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await client!
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) failures.push({ table, error: await explain(client!, table, error) });
      else counts[table] = count ?? 0;
    } catch (e) {
      failures.push({ table, error: describe(e) || 'the request failed with no message' });
    }
  }

  checks.tablesOk = Object.keys(counts).length;
  checks.tablesFailed = failures.length;
  checks.rowCounts = counts;

  if (failures.length) {
    /*
     * Every table failing and one table failing are different
     * faults with different fixes, and thirty-two identical rows
     * bury that rather than showing it. Say which it is.
     */
    const total = failures.length === tables.length;

    checks.failures = total ? failures.slice(0, 3) : failures;
    checks.verdict = total
      ? `No table could be read — this is the project, not the schema. ` +
        `Usually it is paused (restore it in the Supabase dashboard), or SUPABASE_URL ` +
        `and SUPABASE_SECRET_KEY are wrong. While it lasts, every page of the portal ` +
        `shows "Something went wrong", including sign-in.`
      : `${failures.length} of ${tables.length} tables could not be read, so a migration ` +
        `is probably outstanding. See failures.`;

    return NextResponse.json(checks, { status: 503 });
  }

  if (!counts.events) {
    checks.verdict = 'Connected, but no event row. Run supabase/SEED_SUPABASE.sql.';
    return NextResponse.json(checks, { status: 503 });
  }

  if (env('AUTH_SECRET') && !emailProvider()) {
    checks.verdict =
      'Connected and seeded, but sign-in is on with no email provider — links cannot be ' +
      'delivered. Set RESEND_API_KEY, or read the link from the function log.';
    return NextResponse.json(checks, { status: 200 });
  }

  checks.verdict = 'OK — connected to Supabase and the event is seeded.';
  return NextResponse.json(checks, { status: 200 });
}
