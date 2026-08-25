-- ============================================================
-- BOARD Partner Portal — run this in the Supabase SQL editor
--
-- Combined from supabase/migrations/0001_init.sql and 0002_rls.sql.
-- Safe to run on a fresh project. Verified against PostgreSQL 16.
--
-- After running, check the Table editor: you should see 31 tables,
-- each marked "RLS enabled". That is expected and correct — the
-- browser key is denied everything, and the application reaches the
-- database server-side under the secret key.
-- ============================================================

-- ============================================================
-- BOARD Partner Portal — initial schema
--
-- Derived from the prototype's data.js, which the handoff brief
-- names as the source of truth for the data model.
--
-- Conventions
--   * Text primary keys carry the semantic ids the application
--     already uses ('part_a', 'pg_venue'). New rows get ids minted
--     by the application with the same prefix convention.
--   * Every event-scoped row carries event_id, so an event can be
--     duplicated for a future edition (spec §9).
--   * JSONB is used only where the brief allows it: task/form state,
--     module overrides, field conditions, product options, content
--     blocks, and stored webhook payloads. Everything else is
--     normalised.
--   * Visibility rules are stored as JSONB on the gated entity so a
--     single resolver (ruleMatches) serves every surface, with GIN
--     indexes for the reverse lookup the entitlement editor needs
--     ("show me everything this entitlement unlocks").
--   * Row-level security is ENABLED with NO permissive policies.
--     Nothing is readable with the browser publishable key. All
--     access runs server-side under the secret key until magic-link
--     auth lands, at which point real policies are added in a later
--     migration. See 0003_rls.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Event
-- ------------------------------------------------------------

create table if not exists events (
  id              text primary key,
  name            text not null,
  short_name      text not null default '',
  venue           text not null default '',
  city            text not null default '',
  start_date      date,
  end_date        date,
  currency        text not null default 'EUR',
  currency_symbol text not null default '€',
  timezone        text not null default 'Europe/Monaco',
  tagline         text not null default '',
  -- Default outbound sender identity (name, email, signature, logo).
  sender          jsonb not null default '{}'::jsonb,
  -- Editable singulars. Plurals are inferred in the application.
  terminology     jsonb not null default '{}'::jsonb,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column events.terminology is
  'Editable singulars only (partner, task, request, participation, partnerPortal). Plurals are inferred: -y to -ies, sibilants to -es, else +s.';

-- ------------------------------------------------------------
-- Organiser users
-- ------------------------------------------------------------

create table if not exists organiser_users (
  id          text primary key,
  name        text not null,
  title       text not null default '',
  email       text not null unique,
  role        text not null default 'team'
                check (role in ('super_admin', 'team')),
  -- Per-area booleans; null means full access for a super_admin.
  permissions jsonb,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Entitlements — the master vocabulary
-- ------------------------------------------------------------

create table if not exists entitlements (
  key        text primary key,
  event_id   text not null references events(id) on delete cascade,
  label      text not null,
  created_at timestamptz not null default now()
);

create index if not exists entitlements_event_idx on entitlements(event_id);

-- ------------------------------------------------------------
-- Suppliers
-- ------------------------------------------------------------

create table if not exists suppliers (
  id               text primary key,
  event_id         text not null references events(id) on delete cascade,
  name             text not null,
  category         text not null default '',
  contact          text not null default '',
  notif_emails     text[] not null default '{}',
  webhook_url      text not null default '',
  routing_key      text not null default '',
  -- NEVER expose to a client or a partner user. Server-side only.
  webhook_secret   text not null default '',
  active           boolean not null default true,
  approval_default text not null default 'auto'
                     check (approval_default in ('auto', 'manual', 'quote')),
  notes            text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists suppliers_event_idx on suppliers(event_id);

comment on column suppliers.webhook_secret is
  'HMAC signing secret. Must never be selected into a client payload.';

-- ------------------------------------------------------------
-- Shop
-- ------------------------------------------------------------

create table if not exists shop_categories (
  id       text primary key,
  event_id text not null references events(id) on delete cascade,
  name     text not null,
  position integer not null default 0
);

create index if not exists shop_categories_event_idx on shop_categories(event_id);

create table if not exists products (
  id             text primary key,
  event_id       text not null references events(id) on delete cascade,
  name           text not null,
  supplier_id    text references suppliers(id) on delete set null,
  category_id    text references shop_categories(id) on delete set null,
  description    text not null default '',
  unit           text not null default 'each',
  -- NULL means quote-required: never render a price for these.
  base_price     numeric(12, 2),
  tax_rate       numeric(5, 4) not null default 0.2,
  approval_mode  text not null default 'auto'
                   check (approval_mode in ('auto', 'manual', 'quote')),
  min_qty        integer not null default 1,
  max_qty        integer not null default 99,
  order_deadline date,
  lead_time_days integer not null default 0,
  active         boolean not null default true,
  image          text,
  -- [{ name, values: [] }]
  options        jsonb not null default '[]'::jsonb,
  -- [{ key, label, type, required }]
  questions      jsonb not null default '[]'::jsonb,
  visibility     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists products_event_idx on products(event_id);
create index if not exists products_supplier_idx on products(supplier_id);
create index if not exists products_category_idx on products(category_id);
-- Reverse lookup: which products does entitlement X unlock?
create index if not exists products_visibility_idx on products using gin (visibility);

-- ------------------------------------------------------------
-- Forms
-- ------------------------------------------------------------

create table if not exists forms (
  id             text primary key,
  event_id       text not null references events(id) on delete cascade,
  title          text not null,
  category       text not null default '',
  description    text not null default '',
  -- NULL means the deadline is set per partner.
  due_date       date,
  -- Who the form is assigned to; same rule shape as visibility.
  assign         jsonb not null default '{"type":"all"}'::jsonb,
  allow_resubmit boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists forms_event_idx on forms(event_id);
create index if not exists forms_assign_idx on forms using gin (assign);

create table if not exists form_fields (
  id         text primary key,
  form_id    text not null references forms(id) on delete cascade,
  key        text not null,
  label      text not null,
  type       text not null,
  required   boolean not null default false,
  help       text not null default '',
  readonly   boolean not null default false,
  options    text[] not null default '{}',
  -- Field-level gating: how two partners get the same form but
  -- see different fields.
  visibility jsonb not null default '{}'::jsonb,
  -- { field, equals } — show only when an earlier answer matches.
  condition  jsonb,
  position   integer not null default 0,
  unique (form_id, key)
);

create index if not exists form_fields_form_idx on form_fields(form_id, position);
create index if not exists form_fields_visibility_idx on form_fields using gin (visibility);

-- ------------------------------------------------------------
-- Request types
-- ------------------------------------------------------------

create table if not exists request_types (
  id            text primary key,
  event_id      text not null references events(id) on delete cascade,
  name          text not null,
  owner_default text not null default '',
  -- Configurable field list, edited as a unit.
  fields        jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists request_types_event_idx on request_types(event_id);

-- ------------------------------------------------------------
-- Content
-- ------------------------------------------------------------

create table if not exists content_categories (
  id       text primary key,
  event_id text not null references events(id) on delete cascade,
  name     text not null,
  position integer not null default 0
);

create index if not exists content_categories_event_idx on content_categories(event_id);

create table if not exists content_pages (
  id             text primary key,
  event_id       text not null references events(id) on delete cascade,
  category_id    text references content_categories(id) on delete set null,
  title          text not null,
  -- Plain-text snippet used on cards; markdown is stripped.
  body           text not null default '',
  -- Block-based body: heading, paragraph, image, list, quote,
  -- callout, divider, video, download, timeline.
  blocks         jsonb not null default '[]'::jsonb,
  cover          text,
  visibility     jsonb not null default '{"type":"all"}'::jsonb,
  require_ack    boolean not null default false,
  published      boolean not null default true,
  related_tasks  text[] not null default '{}',
  related_forms  text[] not null default '{}',
  updated        date not null default current_date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists content_pages_event_idx on content_pages(event_id);
create index if not exists content_pages_category_idx on content_pages(category_id);
create index if not exists content_pages_visibility_idx on content_pages using gin (visibility);

-- ------------------------------------------------------------
-- Files — the BOARD library
-- ------------------------------------------------------------

create table if not exists files (
  id         text primary key,
  event_id   text not null references events(id) on delete cascade,
  name       text not null,
  kind       text not null default '',
  size       text not null default '',
  url        text,
  visibility jsonb not null default '{"type":"all"}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists files_event_idx on files(event_id);
create index if not exists files_visibility_idx on files using gin (visibility);

-- ------------------------------------------------------------
-- Task templates
-- ------------------------------------------------------------

create table if not exists task_templates (
  id            text primary key,
  event_id      text not null references events(id) on delete cascade,
  title         text not null,
  description   text not null default '',
  category      text not null default '',
  module        text not null default '',
  priority      text not null default 'medium'
                  check (priority in ('high', 'medium', 'low')),
  required      boolean not null default true,
  -- NULL means the deadline is set per partner.
  due_date      date,
  -- Entitlement gating. Empty means the task applies to everyone.
  requires      text[] not null default '{}',
  -- Where the task sends the partner, and what auto-completes it.
  link_type     text not null default 'checklist'
                  check (link_type in ('form', 'request', 'shop', 'content',
                                       'upload', 'url', 'ack', 'checklist')),
  link_target   text,
  instructions  text not null default '',
  attachments   text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists task_templates_event_idx on task_templates(event_id);
create index if not exists task_templates_requires_idx on task_templates using gin (requires);

comment on column task_templates.link_type is
  'Where linked, the task auto-completes when the action completes. A form with a linked outstanding task is represented by that task: nav badges stay disjoint and reminders never double-fire.';

-- ------------------------------------------------------------
-- Partners
-- ------------------------------------------------------------

create table if not exists partner_organisations (
  id         text primary key,
  name       text not null,
  sector     text not null default '',
  -- Legacy flat address line, retained for display fallbacks.
  country    text not null default '',
  billing    jsonb not null default '{}'::jsonb,
  logo       text not null default '',
  logo_light text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists partner_users (
  id          text primary key,
  partner_id  text not null references partner_organisations(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  telephone   text not null default '',
  role        text not null default 'user' check (role in ('lead', 'user')),
  -- 'all' for the Lead, or per-module booleans for a Partner User.
  permissions jsonb not null default '"all"'::jsonb,
  invited_at  timestamptz,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists partner_users_partner_idx on partner_users(partner_id);

-- ------------------------------------------------------------
-- Participation — the central join and the personalisation record
-- ------------------------------------------------------------

create table if not exists event_participations (
  id                   text primary key,
  event_id             text not null references events(id) on delete cascade,
  partner_id           text not null references partner_organisations(id) on delete cascade,
  reference            text not null,
  stand_ref            text,
  -- Retained for migration only; entitlements are set directly.
  package_id           text,
  added_entitlements   text[] not null default '{}',
  removed_entitlements text[] not null default '{}',
  -- { shop: false } hides a module for this partner.
  module_overrides     jsonb not null default '{}'::jsonb,
  -- Per-partner deadline overrides, keyed by form / task id.
  form_due_dates       jsonb not null default '{}'::jsonb,
  task_due_dates       jsonb not null default '{}'::jsonb,
  -- Completion and submission state.
  task_state           jsonb not null default '{}'::jsonb,
  form_state           jsonb not null default '{}'::jsonb,
  contract_name        text,
  contract_url         text,
  -- Visible to the partner.
  partner_notes        text not null default '',
  -- Never shown to the partner.
  internal_notes       text not null default '',
  lead_user_id         text references partner_users(id) on delete set null,
  pass_allocation      integer not null default 0,
  marketing            jsonb not null default '{}'::jsonb,
  suspended            boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (event_id, partner_id)
);

create index if not exists participations_event_idx on event_participations(event_id);
create index if not exists participations_partner_idx on event_participations(partner_id);
create index if not exists participations_entitlements_idx
  on event_participations using gin (added_entitlements);

comment on table event_participations is
  'The personalisation record. Every per-partner override lives here. Precedence: partner override then event default.';

comment on column event_participations.internal_notes is
  'Organiser-private. Must never be selected into a partner-facing payload.';

-- Line items the partner purchased — their "Package".
create table if not exists partner_inventory (
  id               text primary key,
  participation_id text not null references event_participations(id) on delete cascade,
  type             text not null
                     check (type in ('Dedicated Space', 'Curated Introductions',
                                     'Branding', 'Bespoke', 'Delegate Passes')),
  name             text not null,
  description      text not null default '',
  cost             numeric(12, 2) not null default 0,
  quantity         integer not null default 1,
  -- Prompted for when the type is Dedicated Space.
  stand_number     text not null default '',
  -- Delegate Passes autofill their description from the pass type.
  pass_type        text,
  -- Linked tasks/forms: [{ kind: 'task'|'form', id }]
  refs             jsonb not null default '[]'::jsonb,
  position         integer not null default 0
);

create index if not exists partner_inventory_participation_idx
  on partner_inventory(participation_id, position);

-- Files the organiser needs *from* the partner.
create table if not exists partner_requested_files (
  id               text primary key,
  participation_id text not null references event_participations(id) on delete cascade,
  label            text not null,
  due              date,
  required         boolean not null default true,
  file_name        text,
  file_url         text,
  uploaded_at      timestamptz,
  uploaded_by      text,
  position         integer not null default 0
);

create index if not exists partner_requested_files_participation_idx
  on partner_requested_files(participation_id, position);

create table if not exists partner_price_overrides (
  participation_id text not null references event_participations(id) on delete cascade,
  product_id       text not null references products(id) on delete cascade,
  price            numeric(12, 2) not null,
  primary key (participation_id, product_id)
);

-- ------------------------------------------------------------
-- Orders
--
-- Checkout creates ONE parent order plus ONE supplier order per
-- supplier. No payment is ever collected: there is no paid state.
-- ------------------------------------------------------------

create table if not exists orders (
  id               text primary key,
  event_id         text not null references events(id) on delete cascade,
  participation_id text not null references event_participations(id) on delete cascade,
  reference        text not null unique,
  status           text not null default 'submitted'
                     check (status in ('draft', 'submitted', 'part_confirmed',
                                       'confirmed', 'cancelled')),
  submitted_at     timestamptz not null default now(),
  -- Legal entity, address, tax number, invoice contact, PO number,
  -- internal reference, notes. Collected at checkout.
  billing          jsonb not null default '{}'::jsonb,
  -- Manual field. The portal never generates invoices.
  invoice_status   text not null default '',
  created_at       timestamptz not null default now()
);

create index if not exists orders_event_idx on orders(event_id);
create index if not exists orders_participation_idx on orders(participation_id);

create table if not exists order_items (
  id         text primary key,
  order_id   text not null references orders(id) on delete cascade,
  product_id text references products(id) on delete set null,
  name       text not null,
  supplier_id text references suppliers(id) on delete set null,
  qty        integer not null default 1,
  -- NULL for quote-required items.
  unit_price numeric(12, 2),
  options    jsonb not null default '{}'::jsonb,
  answers    jsonb not null default '{}'::jsonb,
  position   integer not null default 0
);

create index if not exists order_items_order_idx on order_items(order_id, position);

create table if not exists supplier_orders (
  id            text primary key,
  order_id      text not null references orders(id) on delete cascade,
  supplier_id   text not null references suppliers(id) on delete restrict,
  reference     text not null unique,
  status        text not null default 'under_review'
                  check (status in ('under_review', 'quote_requested', 'quoted',
                                    'confirmed', 'cancelled', 'rejected')),
  approval_mode text not null default 'manual'
                  check (approval_mode in ('auto', 'manual', 'quote')),
  submitted_at  timestamptz not null default now(),
  confirmed_at  timestamptz,
  subtotal      numeric(12, 2) not null default 0,
  tax           numeric(12, 2) not null default 0,
  total         numeric(12, 2) not null default 0,
  -- { amount, note, at } once the organiser records a quote.
  quote         jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists supplier_orders_order_idx on supplier_orders(order_id);
create index if not exists supplier_orders_supplier_idx on supplier_orders(supplier_id);
create index if not exists supplier_orders_status_idx on supplier_orders(status);

create table if not exists supplier_order_items (
  id                text primary key,
  supplier_order_id text not null references supplier_orders(id) on delete cascade,
  product_id        text references products(id) on delete set null,
  name              text not null,
  qty               integer not null default 1,
  unit_price        numeric(12, 2),
  position          integer not null default 0
);

create index if not exists supplier_order_items_order_idx
  on supplier_order_items(supplier_order_id, position);

-- ------------------------------------------------------------
-- Requests
-- ------------------------------------------------------------

create table if not exists requests (
  id               text primary key,
  event_id         text not null references events(id) on delete cascade,
  participation_id text not null references event_participations(id) on delete cascade,
  type_id          text references request_types(id) on delete set null,
  reference        text not null unique,
  status           text not null default 'submitted'
                     check (status in ('draft', 'submitted', 'under_review',
                                       'more_info', 'approved', 'rejected', 'closed')),
  owner            text not null default '',
  submitted_by     text not null default '',
  submitted_at     timestamptz not null default now(),
  response_at      timestamptz,
  values           jsonb not null default '{}'::jsonb,
  files            text[] not null default '{}',
  created_at       timestamptz not null default now()
);

create index if not exists requests_event_idx on requests(event_id);
create index if not exists requests_participation_idx on requests(participation_id);
create index if not exists requests_status_idx on requests(status);

create table if not exists request_comments (
  id         text primary key,
  request_id text not null references requests(id) on delete cascade,
  author     text not null,
  role       text not null check (role in ('partner', 'organiser')),
  body       text not null,
  files      text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists request_comments_request_idx
  on request_comments(request_id, created_at);

-- ------------------------------------------------------------
-- Webhooks
--
-- One payload per supplier order, even when one checkout spans
-- several suppliers. Signed with the supplier's secret.
-- ------------------------------------------------------------

create table if not exists webhook_events (
  id                text primary key,
  event_type        text not null
                      check (event_type in ('supplier_order.quote_requested',
                                            'supplier_order.confirmed',
                                            'supplier_order.updated',
                                            'supplier_order.cancelled')),
  supplier_order_id text not null,
  supplier_id       text not null references suppliers(id) on delete cascade,
  -- Unique per event, so a retry is never double-processed.
  idempotency_key   text not null unique,
  signature         text not null default '',
  status            text not null default 'pending'
                      check (status in ('pending', 'delivered', 'failed')),
  retry_count       integer not null default 0,
  -- Snapshot of exactly what was sent.
  payload           jsonb not null default '{}'::jsonb,
  sent_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists webhook_events_supplier_idx on webhook_events(supplier_id);
create index if not exists webhook_events_status_idx on webhook_events(status);
create index if not exists webhook_events_order_idx on webhook_events(supplier_order_id);

create table if not exists webhook_delivery_attempts (
  id               text primary key,
  webhook_event_id text not null references webhook_events(id) on delete cascade,
  attempted_at     timestamptz not null default now(),
  response_code    integer,
  -- Truncated before storage.
  response_body    text not null default '',
  ok               boolean not null default false
);

create index if not exists webhook_attempts_event_idx
  on webhook_delivery_attempts(webhook_event_id, attempted_at);

-- ------------------------------------------------------------
-- Notifications, email, audit
-- ------------------------------------------------------------

create table if not exists notifications (
  id               text primary key,
  participation_id text references event_participations(id) on delete cascade,
  kind             text not null default '',
  body             text not null,
  read             boolean not null default false,
  -- Where clicking the notification should land.
  target           jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists notifications_participation_idx
  on notifications(participation_id, created_at desc);

create table if not exists email_templates (
  id         text primary key,
  event_id   text not null references events(id) on delete cascade,
  name       text not null,
  subject    text not null default '',
  body       text not null default '',
  category   text not null default '',
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists email_templates_event_idx on email_templates(event_id);

comment on column email_templates.body is
  'Supports tokens: [first_name] [contact_name] [partner] [task] [due] [event] [portal_link] [sender] [sender_email] [signature].';

create table if not exists sent_emails (
  id          text primary key,
  event_id    text not null references events(id) on delete cascade,
  template_id text references email_templates(id) on delete set null,
  partner_id  text references partner_organisations(id) on delete set null,
  to_email    text not null,
  to_name     text not null default '',
  from_email  text not null default '',
  from_name   text not null default '',
  subject     text not null default '',
  -- The exact delivered text, so the outbox shows what was sent.
  body        text not null default '',
  status      text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at     timestamptz not null default now()
);

create index if not exists sent_emails_event_idx on sent_emails(event_id, sent_at desc);
create index if not exists sent_emails_partner_idx on sent_emails(partner_id);

create table if not exists audit_log (
  id         text primary key,
  event_id   text not null references events(id) on delete cascade,
  partner_id text references partner_organisations(id) on delete set null,
  actor      text not null default 'System',
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_event_idx on audit_log(event_id, created_at desc);
create index if not exists audit_log_partner_idx on audit_log(partner_id, created_at desc);

-- ------------------------------------------------------------
-- updated_at maintenance
-- ------------------------------------------------------------

create or replace function set_updated_at() returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'events', 'products', 'forms', 'content_pages', 'task_templates',
    'partner_organisations', 'event_participations'
  ]
  loop
    execute format(
      'drop trigger if exists %I_set_updated_at on %I', t, t
    );
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t
    );
  end loop;
end;
$$;


-- ============================================================
-- 0002_rls.sql
-- ============================================================

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
