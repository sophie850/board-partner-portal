# BOARD Partner Portal

A two-sided operational system for **BOARD Monaco 2027** (Grimaldi Forum, 22–24 March 2027).

- **Partner Portal** — each commercial partner manages their participation: tasks, forms,
  requests, information, an event-services shop, orders, files, marketing collateral and team.
- **Organiser Portal** — the BOARD team configures each partner's experience, reviews
  submissions, manages orders and suppliers, sends reminders and reports.

The defining principle: **every partner sees a different portal**, determined by what they
purchased. Not every partner is an exhibitor, and exhibition-specific functionality only
appears for partners with exhibition space.

Rebuilt from the Claude Design prototype — see [`docs/DESIGN_HANDOFF.md`](docs/DESIGN_HANDOFF.md)
and the original prototype under `project/`.

---

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Supabase (PostgreSQL)

---

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

**Without Supabase credentials the app runs against the bundled fixtures** in
`src/data/seed.ts`, so you can develop the interface with no database. Set `SUPABASE_URL` and
`SUPABASE_SECRET_KEY` to run against the real thing.

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run seed:sql` | Regenerate `supabase/SEED_SUPABASE.sql` from the typed fixtures |

---

## Database

Two migrations, both verified against PostgreSQL 16:

| File | What it does |
|---|---|
| `supabase/migrations/0001_init.sql` | 31 tables |
| `supabase/migrations/0002_rls.sql` | Revokes browser-role privileges, enables RLS |
| `supabase/APPLY_TO_SUPABASE.sql` | The two combined, to paste into the SQL editor |
| `supabase/SEED_SUPABASE.sql` | Seed data — generated, do not hand-edit |

Run the schema, then the seed. Both are safe to re-run: the seed is `on conflict do nothing`,
so it never overwrites work done in the portal.

### Access control

**Row-level security is enabled on every table with no policies**, and every privilege is
revoked from the `anon` and `authenticated` roles. In that state Postgres returns no rows and
rejects every write, so the browser key reaches nothing. All access runs server-side under the
secret key, which holds `BYPASSRLS` and is never sent to a client.

To verify, using the *publishable* key — the one a browser holds:

```bash
curl -s "$SUPABASE_URL/rest/v1/partner_organisations?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```

An empty array or a permission error is correct. Any partner row coming back means something
is wrong — stop and fix it.

When magic-link auth lands, grant deliberately rather than restoring Supabase's blanket
defaults: partner reads should go through `security_invoker` views that omit
`event_participations.internal_notes` and `suppliers.webhook_secret`, with policies keyed on
`auth.uid()`. That is the point at which acceptance test #18 — a partner cannot reach another
partner's data by any means — is actually proven.

---

## Architecture

```
src/
  app/
    organiser/          The BOARD team's portal
    portal/[partnerId]/ The partner's portal
    unlock/             Interim passphrase screen
  components/
    content/            Block renderer and the block editor
    forms/              Form builder
    shell/              Header, nav, theme
    ui/                 Primitives carrying the brand rules
  data/seed.ts          Seed data — also the source for the SQL seed
  lib/
    db/                 Supabase client, row mappers, read model
    resolvers.ts        The personalisation engine
    types.ts            The domain model
```

### The personalisation engine

`src/lib/resolvers.ts` decides what each partner sees. The rules worth knowing:

- **Precedence** is partner override → event default.
- **Visibility rules** are ANY-of: `{ type: 'entitlement', keys: [...] }` matches a partner
  holding *at least one* key. One rule shape serves products, pages, files, tasks and
  individual form fields — which is how two partners get the same form and see different
  questions.
- **Deadlines** resolve partner override → event default → none. Anything with no resolved
  date shows "Date to be confirmed" and is **never** flagged overdue.
- **De-duplication**: a form with an outstanding linked task is *represented by that task*.
  Nav badges for Tasks / Forms / Requests are disjoint and sum exactly to the Actions badge,
  and reminders only fire for forms with no linked task — so a partner never gets two emails
  for one piece of work.
- **Money** displays exc. tax, rounded to the nearest unit, driven by the event currency.
- **Terminology** is editable as singulars; plurals are inferred.

These run on the server. Client-side use is presentation only — every visibility rule is also
an authorisation requirement.

---

## Deployment

Netlify, via `netlify.toml` and `@netlify/plugin-nextjs`. Connect the repo under
**Add new site → Import from Git**, then set these under **Site configuration → Environment
variables**:

| Variable | Notes |
|---|---|
| `SUPABASE_URL` | |
| `SUPABASE_SECRET_KEY` | **Server-only.** Never prefix `NEXT_PUBLIC_` — that ships it to the browser. |
| `NEXT_PUBLIC_SUPABASE_URL` | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe to expose. |
| `PORTAL_PASSPHRASE` | The interim access gate. Leave unset to disable it and leave the site public. |

### The access gate

A single shared passphrase in front of the whole site, standing in for authentication. It runs
as a proxy so every route is covered, including server actions. The passphrase is never stored
in the cookie — only a SHA-256 digest — and comparisons are timing-safe.

It is **not** authentication: one shared secret, no identity, nothing audited to a person. It
should be replaced by magic links, not extended.

---

## What is not built yet

Screens that exist but are placeholders, in rough priority order:

**Organiser** — Partners (list, Summary, Configure), Entitlements with the reverse editor,
Tasks, Products, Suppliers, Orders and the webhook log, Requests, Reporting, Event settings.

**Partner** — Forms (filling and submission), Requests, Timeline, Shop, Cart and checkout,
Orders, Files, Promote, Team.

**Infrastructure** — magic-link authentication and RLS policies, real outbound HMAC-signed
webhooks with retries and manual resend, a transactional email provider, file storage for
uploads and cover images, and event duplication.

Each placeholder says what will be there rather than showing a dead route.
