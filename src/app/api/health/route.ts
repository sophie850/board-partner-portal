import { NextResponse } from 'next/server';

import { isSupabaseConfigured, supabase } from '@/lib/db/client';
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

export async function GET() {
  const configured = isSupabaseConfigured();
  const checks: Record<string, unknown> = {
    supabaseUrl: env('SUPABASE_URL') ?? 'not set',
    supabaseSecretKey: fingerprint(env('SUPABASE_SECRET_KEY')),
    publicSupabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL') ?? 'not set',
    publishableKey: fingerprint(env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')),
    portalPassphrase: env('PORTAL_PASSPHRASE') ? 'set' : 'not set — site is open',
    supabaseConfigured: configured,
    dataSource: configured ? 'supabase' : 'bundled fixtures',
  };

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
  ];

  const client = supabase();
  const failures: Array<{ table: string; error: string }> = [];
  const counts: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await client!
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) failures.push({ table, error: error.message });
      else counts[table] = count ?? 0;
    } catch (e) {
      failures.push({ table, error: e instanceof Error ? e.message : 'unknown error' });
    }
  }

  checks.tablesOk = Object.keys(counts).length;
  checks.tablesFailed = failures.length;
  checks.rowCounts = counts;

  if (failures.length) {
    checks.failures = failures;
    checks.verdict = `${failures.length} table(s) could not be read. See failures.`;
    return NextResponse.json(checks, { status: 503 });
  }

  if (!counts.events) {
    checks.verdict = 'Connected, but no event row. Run supabase/SEED_SUPABASE.sql.';
    return NextResponse.json(checks, { status: 503 });
  }

  checks.verdict = 'OK — connected to Supabase and the event is seeded.';
  return NextResponse.json(checks, { status: 200 });
}
