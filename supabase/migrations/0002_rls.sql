-- ============================================================
-- BOARD Partner Portal — access control
--
-- Posture for the current phase (no authentication yet):
--
--   1. Every privilege is REVOKED from the browser-facing roles.
--   2. Row-level security is ENABLED with NO permissive policies.
--
-- Either one alone would deny access; together they mean the public
-- site has no route to the database whatsoever. All application
-- access runs server-side under the secret key, whose role holds
-- BYPASSRLS and its own grants, and which is never sent to a client.
--
-- Why the blanket revoke rather than column-level revokes: in
-- Postgres a column-level REVOKE is a no-op while the role still
-- holds table-level SELECT, so `revoke select (webhook_secret)`
-- silently does nothing. Revoking everything is unambiguous and
-- easy to verify. Supabase's default grants to anon/authenticated
-- are applied when a table is created, so running this after
-- 0001_init.sql removes them.
--
-- When magic-link auth lands, the follow-up migration should grant
-- deliberately rather than restoring the blanket defaults:
--
--   * Partner-facing reads go through security_invoker VIEWS that
--     simply do not select event_participations.internal_notes or
--     suppliers.webhook_secret. Grant on the view, never the base
--     table, so a sensitive column cannot leak through `select *`.
--   * Policies key on auth.uid() so scoping is enforced by the
--     database, not by application code.
--
-- Acceptance test #18 — a partner cannot reach another partner's
-- data by any means — is proven at that point. The brief calls it
-- the single most important security requirement.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Remove every browser-facing privilege
-- ------------------------------------------------------------

do $$
begin
  -- These roles exist in Supabase. Guard so the migration also runs
  -- against a plain Postgres (local verification, CI).
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
    revoke all on all functions in schema public from anon;
    revoke usage on schema public from anon;
    alter default privileges in schema public revoke all on tables from anon;
    alter default privileges in schema public revoke all on sequences from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
    revoke all on all functions in schema public from authenticated;
    revoke usage on schema public from authenticated;
    alter default privileges in schema public revoke all on tables from authenticated;
    alter default privileges in schema public revoke all on sequences from authenticated;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Enable row-level security, with no policies
-- ------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'events',
    'organiser_users',
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
    'audit_log'
  ]
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end;
$$;

-- Note: FORCE ROW LEVEL SECURITY is deliberately NOT set. It would
-- also subject the table owner to policies, which breaks migrations
-- and maintenance run as the owner. BYPASSRLS roles (the secret key)
-- are unaffected either way; the browser roles are already denied by
-- both the revoke above and the absence of policies.
