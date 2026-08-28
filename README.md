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

Migrations, in order, each verified against PostgreSQL 16:

| File | What it does |
|---|---|
| `supabase/migrations/0001_init.sql` | 31 tables |
| `supabase/migrations/0002_rls.sql` | Revokes browser-role privileges, enables RLS |
| `supabase/migrations/0003_storage.sql` | The `board-assets` bucket (Supabase only — it uses the `storage` schema, so it fails on a plain Postgres) |
| `supabase/migrations/0004_auth.sql` | `auth_tokens`, for sign-in links |
| `supabase/migrations/0005_acknowledgements.sql` | `ack_state` on the participation, for content acknowledgements |
| `supabase/APPLY_TO_SUPABASE.sql` | The schema combined, to paste into the SQL editor |
| `supabase/SEED_SUPABASE.sql` | Seed data — generated, do not hand-edit |

Run the schema, then the seed. Both are safe to re-run: every migration is written to be
idempotent, and the seed is `on conflict do nothing`, so neither overwrites work done in
the portal.

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

### Why there are no per-user RLS policies

Worth being plain about, because "add RLS policies" sounds like the obvious next step and is
not.

Row-level security scopes rows to a *database* identity. This application never gives the
database one: every query runs server-side under the secret key, and the browser holds no
Supabase client at all — the publishable key is read by `/api/health` for diagnostics and
nothing else. Policies keyed on `auth.uid()` would therefore match nothing, and adding
permissive policies would only widen what a leaked publishable key can reach.

So the enforcement point is `src/lib/auth/session.ts`, which is checked on every route and in
every server action, and the correct RLS posture is the one already in place: enabled
everywhere, no policies, nothing granted. Deny-all is doing real work here — it is what makes
a leaked browser key worthless.

Database-enforced policies become worth having the moment a browser talks to Supabase
directly — Realtime subscriptions, or client-side queries. That needs Supabase Auth as the
identity provider, so that `auth.uid()` is real: `auth.admin.generateLink()` server-side,
emailed through the existing sender, with partner reads going through `security_invoker` views
that omit `event_participations.internal_notes` and `suppliers.webhook_secret`. Until then it
would be ceremony rather than security.

That is the point at which acceptance test #18 — a partner cannot reach another
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
| `AUTH_SECRET` | Signs the session cookie. Any long random string — `openssl rand -base64 32`. **Setting this turns sign-in on.** |
| `RESEND_API_KEY` | Delivers sign-in links. Without it nothing is emailed. |
| `SITE_URL` | Where sign-in links point. Netlify usually sets `URL` for you; set this if links come out wrong. |
| `PORTAL_PASSPHRASE` | The shared passphrase, used only when `AUTH_SECRET` is unset. |
| `AUTH_DEV_SHOW_LINK` | Set to `1` to show sign-in links on screen. **Turns sign-in off in all but name — see below.** |

`/api/health` reports which of these are set and which is holding the door.

## Signing in

Sign-in is by emailed link. No passwords, so nothing to reset or reuse from elsewhere.

A link is single-use and expires in 20 minutes. Only its SHA-256 hash is stored, so a copy of
`auth_tokens` is not a set of working links. The form answers the same way whether or not the
address belongs to anybody — otherwise it would be a way of finding out who BOARD works with.

A session is a signed, HttpOnly cookie: signed, not encrypted, because it holds an id and an
email the holder already knows, and what matters is that they cannot change them. There is no
sessions table — the signed-in user is re-read from the database on every request, so removing
somebody from a team ends their access at once rather than whenever their cookie expires.

**Two mechanisms, only ever one in force.** `AUTH_SECRET` set means real sign-in.
`AUTH_SECRET` unset falls back to `PORTAL_PASSPHRASE`, one shared secret with no identity.
Sign-in supersedes the passphrase rather than stacking on it — two walls in front of one door
is a nuisance, not twice the security. With neither set the site is open.

### Getting into a fresh deployment

Sign-in with no email provider locks everybody out. Two ways through:

1. Set `RESEND_API_KEY` and a sender address under **Event settings → Email**. This is the
   real answer.
2. Ask for a link anyway and read it from the Netlify function log — it is written there
   whenever no provider is configured.

`AUTH_DEV_SHOW_LINK=1` prints the link on the page instead. It means anyone who can guess a
BOARD or partner email address can sign in as them, so it is off by default, the sign-in
screen says so in orange when it is on, and `/api/health` returns a warning. Do not leave it
set in front of real data.

### Who can reach what

* A **partner user** reaches only their own organisation's portal, and only the modules their
  Partner Lead granted them. Changing who has access is the Lead's alone.
* An **organiser** reaches the organiser portal and can open any partner's portal to support
  them — the shell says plainly that is what is happening.
* A **team member** is limited to the areas ticked against them under **Event settings → The
  BOARD team**. A **super admin** reaches everything.

Nav items are hidden for what you cannot reach, but hiding is presentation. The checks that
decide live in `src/lib/auth/session.ts` and run on every route *and* in every server action —
an action is a public endpoint, and being reachable only from a page you have already loaded
is not a control.

---

## What is not built yet

Screens that exist but are placeholders, in rough priority order:

Every screen in both portals is now built. What remains is infrastructure:

* **Event duplication** — cloning a configured event for the following year.
* **Webhook retries** — deliveries are sent and logged, and can be resent by hand, but there
  is no automatic backoff for a supplier who is briefly down.
* **Per-user RLS policies** — see *Why there are no per-user RLS policies* above. Not an
  oversight; it needs a browser-side Supabase client to be worth anything.
* **Organiser invitations** — organiser accounts are added directly in the database. Partner
  colleagues can be invited from the portal, though no invitation email is sent yet.
