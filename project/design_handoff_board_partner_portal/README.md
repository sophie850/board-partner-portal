# Handoff: BOARD Partner Portal

## Overview

The **BOARD Partner Portal** is a two-sided operational system for **BOARD Monaco 2027** (Grimaldi Forum, 22–24 March 2027):

- A **Partner Portal** where each commercial partner manages their participation — tasks, forms, requests, information, an event-services shop, orders, files, marketing collateral and team.
- An **Organiser Portal** where the BOARD team configures each partner's experience, reviews submissions, manages orders and suppliers, sends reminders, and reports.

The defining principle: **every partner sees a different portal**, determined by what they purchased. Not every partner is an exhibitor. Exhibition-specific functionality appears only for partners with exhibition space.

This bundle contains a **complete, working interactive prototype** of that system, plus the data model it runs on.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — a working prototype that demonstrates intended layout, behaviour and business logic. **They are not production code to copy.**

The task is to **rebuild this application for real** in the target stack (the brief specifies Next.js + TypeScript + React + Tailwind + PostgreSQL/Supabase), using that environment's established patterns.

**Critically — three things in the prototype are simulations and must NOT be carried across:**

| Prototype does this | Production must do this |
|---|---|
| Stores all data in `localStorage` (`board_portal_db_v2`) | PostgreSQL with real tables and row-level security |
| Gates roles/visibility **client-side** in `visibleModules()` and render flags | Server-enforced authorisation + Postgres RLS. A partner must not be able to read another partner's row by any means. |
| "Sends" webhooks/emails by writing local log records | Real outbound HMAC-signed HTTPS webhooks with retries; real transactional email provider |

The prototype's client-side gating is **illustrative of intent only**. Treat every visibility rule as a server-side authorisation requirement.

---

## Fidelity

**High-fidelity.** Final colours, typography, spacing, interactions, copy and business logic. Recreate the UI faithfully using the BOARD design system (see *Design System* below).

The **logic** is also high-fidelity and is the more valuable half of this handoff: `data.js` is effectively the schema, and the resolver functions encode the personalisation rules precisely.

---

## Start Here: The Data Model

`data.js` is the **source of truth for the schema**. Each exported seed array maps to a table. Read it first.

### Tables (from `data.js` seed arrays)

| Prototype array | Table | Notes |
|---|---|---|
| `event` (single object) | `events` | Every event-scoped record carries `eventId` so the event can be duplicated |
| `organiserUsers` | `organiser_users` | + `organiser_permissions` (per-area booleans) |
| `partners` | `partner_organisations` | Includes structured `billing` (entity, address, city, postcode, country, vat) |
| `partnerUsers` | `partner_users` + `partner_memberships` | `role: 'lead' \| 'user'`; `permissions: 'all' \| {tasks, forms, requests, shop, orders, profile, team}` |
| `participations` | `event_participations` | **The central join.** Holds per-partner overrides — see below |
| `entitlements` | `entitlements` | Reusable keys (`has_exhibition_space`, `can_order_av`, …). Organiser can create new keys without code changes |
| `contentCategories` / `contentPages` | `content_categories` / `content_pages` (+ `content_visibility_rules`) | Pages hold a `blocks[]` array (block-based editor) |
| `taskTemplates` | `task_templates` (+ `partner_tasks` for state) | Task state lives in `participation.taskState[taskId]` |
| `forms` (with `fields[]`) | `forms` + `form_fields` | Field-level visibility + conditional logic |
| — (`participation.formState`) | `form_submissions` + `form_submission_versions` | Includes resubmission history |
| `requestTypes` / `requests` | `request_types` / `requests` (+ `request_comments`) | Threaded, with file attachments |
| `suppliers` | `suppliers` + `supplier_webhook_endpoints` | Zapier URL, routing key, webhook secret (**never expose to client**) |
| `shopCategories` / `products` | `shop_categories` / `products` (+ `product_variants`, `product_questions`, `product_visibility_rules`) | |
| `participation.priceOverrides` | `partner_price_overrides` | |
| `orders` / `supplierOrders` | `orders` + `order_items` / `supplier_orders` + `supplier_order_items` | |
| `webhookEvents` | `webhook_events` + `webhook_delivery_attempts` | Idempotency key, HMAC signature, attempts, response codes |
| `files` | `files` | Same visibility rules as content |
| `notifications` | `notifications` | |
| `emailTemplates` / `sentEmails` | `email_templates` / (email log) | |
| `auditLog` | `audit_log` | |

### `event_participations` — the personalisation record

```js
{
  id, eventId, partnerId, reference,          // e.g. 'BP-001'
  addedEntitlements: [],  removedEntitlements: [],
  moduleOverrides: {},                        // { shop: false } hides a module
  priceOverrides: [{ productId, price }],
  formDueDates: {}, taskDueDates: {},         // per-partner deadline overrides
  taskState: {}, formState: {},               // completion / submission state
  inventory: [],                              // purchased line items ("Package")
  requestedFiles: [],                         // files the organiser needs from them
  contract: { name, dataUrl },                // signed PDF
  partnerNotes: '', internalNotes: '',        // partner-visible vs private
  leadUserId, passAllocation, marketing: {}
}
```

`JSONB` is appropriate for: `taskState`, `formState`, `moduleOverrides`, form field `condition`, product `options`, and stored webhook payload snapshots. **Everything else should be properly normalised** — do not store the app as unvalidated JSON.

---

## Business Rules (the important part)

### 1. Precedence model

```
partner override  →  event default
```

Package templates were **removed** during design — they added indirection without value. Entitlements are toggled **directly per partner**. Keep the resolution order above; the schema still supports adding templates later.

Implemented in `data.js`:
- `entitlementSet(part)` — the partner's effective entitlement set
- `hasEnt(part, key)`
- `ruleMatches(rule, part)` — shared visibility check for form fields, products, content and files
- `resolveTasks(db, part)` / `resolveForms(db, part)` — merge template + per-partner state + deadline overrides

### 2. Visibility rules (ANY-of semantics)

A rule is `{ type: 'all' | 'entitlement' | 'partner' | 'except', keys: [...], partners: [...] }`.

For `entitlement`, `keys` is a **set** and matching is **ANY-of** — the partner needs at least one. This is used identically for shop products, content pages, files, **and individual form fields** — which is how two partners receive the same form but see different fields.

Gating is editable from **both directions**: on the item (product/page/field/task) and from the entitlement's own screen (a reverse editor listing everything it unlocks).

### 3. Tasks are the canonical action list — and de-duplication matters

A task may link to: a form, a request, a shop product/category, a content page, a **file upload**, an **external URL**, a simple **acknowledgement**, or a manual **checklist** item. Where linked, the task **auto-completes** when the action completes (e.g. its form is submitted/approved). Organisers can reopen a task.

**De-duplication rule (must be preserved):** a form that has a linked outstanding task is *represented by that task*. Therefore:
- Nav badge counts for Tasks / Forms / Requests are **disjoint and sum exactly** to the parent "Actions" badge.
- **Reminders** only fire for forms with **no** linked task — so a partner never receives two emails for one unit of work.

### 4. Deadlines

Resolution: **partner override → event default → none**. A form/task with no resolved date displays "Date to be confirmed" and is **never** flagged overdue. Every deadline is overridable per partner (organiser config → Deadlines, faceted by Forms/Tasks).

### 5. Order workflow (the payoff flow)

Checkout creates **one parent order** plus **one Supplier Order per supplier** — a single cart can span suppliers.

Per-item `approvalMode`:

- **`auto`** — Supplier Order → `confirmed` immediately → fire `supplier_order.confirmed`
- **`manual`** — Supplier Order → `under_review`; organiser confirms / requests info / adjusts / rejects; webhook fires **only on confirm**
- **`quote`** — Supplier Order → `quote_requested` → fire `supplier_order.quote_requested`; organiser records a quote → `quoted`; **partner accepts or declines**; on accept → `confirmed` + `supplier_order.confirmed`, on decline → `cancelled` + `supplier_order.cancelled`

**No payment is collected.** Never show a "paid" state. Confirmation copy must say: the order has been submitted, payment has not been taken, it may require confirmation, and an invoice will follow.

Checkout collects: legal billing entity, billing address, VAT/tax number, invoice contact name + email, PO number, internal reference, billing notes, terms acceptance.

Partners cannot silently edit a submitted order — they request changes via comment/support.

**All monetary values display exc. tax, rounded to the nearest euro.**

### 6. Webhooks

Events: `supplier_order.quote_requested`, `.confirmed`, `.updated`, `.cancelled`. One payload **per Supplier Order**, even when one checkout spans several suppliers. The exact payload shape is in `makeWebhook()` in the prototype and matches the brief's example.

Requires: unique idempotency key per event, HMAC signature header using the supplier's secret, delivery timestamp/status/response code, safely-truncated response body logging, retry count, automatic retry for temporary failures, manual resend, and failed-delivery warnings on the organiser dashboard.

**Webhook secrets must never reach the client or a partner user.**

### 7. Terminology

`event.terminology` holds editable singulars (`partner`, `task`, `request`, `participation`, `partnerPortal`). **Plurals are inferred** from the singular (`-y`→`-ies`, `-s/-x/-z/-ch/-sh`→`-es`, else `+s`). The prototype applies these across nav, headings **and body copy**. In production, implement as a proper i18n/terminology layer rather than the prototype's DOM text sweep.

Use **"Partner Portal"** in the UI. Never "exhibitor" as a universal term (acceptable only in specific content, e.g. "Exhibition stand rules", or an entitlement key).

### 8. Currency

`event.currency` + `event.currencySymbol` drive a single `money()` helper. Changing the event currency must reformat **every** price across shop, cart, orders, reporting and participation.

---

## Screens / Views

### Authentication

**Sign in** — split screen. Left: full-bleed BOARD gradient (`board-bg-2.png`, 50% opacity + `linear-gradient(120deg, rgba(0,0,0,0.82), rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7))` scrim), wordmark top-left, eyebrow "PARTNER PORTAL" (11px, 0.2em tracking, aqua `#31F9E5`), H1 "TAKE YOUR SEAT AT THE TABLE" (34px/300/uppercase, max 16ch), supporting paragraph (14px `#9AA1AD`), footer line "Grimaldi Forum, Monaco · 22–24 March 2027". Right: 460px form panel on `#050608`.

**Magic link, passwordless.** Enter email → "Check your inbox" state (mail icon in a 46px rounded tile, 15-minute expiry note) → link click authenticates. The prototype resolves matching accounts from seed data and renders them as clickable stand-ins for the emailed link; **production must send a real signed, expiring magic link.**

Session persists; sign-out clears it. The brand panel is **exempt from light theme** (stays dark in both modes).

Also required in production: organiser invitations, partner invitations, password reset (if password auth is offered alongside), session persistence, role-based route protection, database-level access control.

### Partner Portal

Nav order: Dashboard · Timeline · **Actions** (Tasks / Forms / Requests, grouped, expanded by default, with a combined badge) · My participation · Information · Shop · Orders · Files & assets · Promote · Team.

| Screen | Purpose / notes |
|---|---|
| **Dashboard** | Partner + event name/dates, participation summary, "Eight of 12 tasks completed" specific progress language, clickable stats (Outstanding → Tasks/due, Overdue → Tasks/overdue, Forms to do → Forms), upcoming deadlines (**upcoming only** — never past/overdue), light-touch timeline, quick links, support contact. First-run **setup checklist** (confirm contact, add billing, upload logo, complete first action) shown until the basics are done. |
| **Timeline** | Its own section. Aggregates the partner's real tasks + forms + fixed event milestones into one vertical timeline: big Ambit-Light day numeral, month/year, connected spine with status nodes, live status pills (Passed / Today / In N days / Date TBC), dimmed when done or past. |
| **My participation** | **One of the most important screens.** Stat strip (package value exc. tax, item count, delegate passes, next deadline); "Your package" as icon-led cards per line item (type icon + accent bar, stand-number chip for Dedicated Space, description, **clickable** related task/form chips, price, qty, "Next deadline · date"); derived **Extras** card summarising shop orders; signed agreement PDF; BOARD contact; editable structured billing address. |
| **Tasks** | Single ordered list. Filters: Due soon / Overdue / Completed / Optional + search. Each task supports title, description, category, due date, priority, required flag, module, assigned users, instructions, attachments, completion state/timestamp/by, organiser + partner notes. Action button label adapts to link type; upload tasks accept a file inline and complete on upload. |
| **Forms** | Actionable forms sort to the top (Changes required → In progress → Not started), then a **"Submitted & approved"** divider, then settled ones dimmed/tighter. Draft saving, validation, submission confirmation, submitted-by/timestamp, organiser feedback, "changes required" workflow, **resubmission** where `allowResubmit` (reopens pre-filled, snapshots prior version into history). Statuses: Not started · In progress · Submitted · Under review · Changes required · Approved · Rejected. |
| **Requests** | Reference number, type, configurable fields, files, threaded comments **with attachments**, status history, organiser owner, submitter, dates. Statuses: Draft · Submitted · Under review · More information required · Approved · Rejected · Closed. |
| **Information** | Searchable information centre with category nav and cover images. Pages are **block-based**: heading, text (inline `**bold**` / `_italic_` / `[links](url)`), image, bulleted list, quote, callout, divider, video embed, download, and a **Key dates timeline** block. Last-updated date, related tasks/forms, required acknowledgement. Card snippets strip markdown. Avoid one-giant-PDF as the primary experience. |
| **Shop** | Products grouped by category; every card carries a media strip (uploaded image, else a deterministic BOARD gradient by category). Product detail overlay with options, quantity limits, deadlines, required questions. Multi-supplier cart. |
| **Orders** | Reference, date, products, quantities, options, supplier, subtotal, tax, total, billing details, PO number, status, notes, files. Supplier-split breakdown; **Accept quote / Decline** on quoted supplier orders. |
| **Files & assets** | Clear separation: **files the partner must provide** (requested files, with upload) vs **the BOARD library** (logos, toolkits, floor plans, templates) vs **what they've already submitted**. Obeys the same visibility rules as content. |
| **Promote** | Generates co-branded marketing collateral: Social post (1080²), LinkedIn banner (1584×396), Story (1080×1920), Email badge. Partner logo + BOARD lockup, gradient/black background choice, auto-generated per-partner copy (role eyebrow, org name, context line explaining what BOARD is, venue/dates, `boardsummits.com`, "Take your seat at the table"), all editable, plus a ready-to-post caption with Copy. |
| **Team** | Partner Lead invites/removes colleagues, sees pending invitations, assigns **module permissions**, transfers the Lead role. Displays who completed/submitted each action. |

**Role gating:** a Partner User signed in with limited `permissions` sees only permitted modules (Dashboard / Timeline / Information / Files always on; others map to permission keys). A "Signed in as … · limited access" banner distinguishes a real user login from an organiser preview.

### Organiser Portal

Nav: Dashboard · Partners · Entitlements · Tasks · Forms · Content · Products · Suppliers · Orders & webhooks · Requests · Reporting · Event settings.

| Screen | Purpose / notes |
|---|---|
| **Dashboard** | **"Your team's outstanding actions"** queue first — forms to review, requests to answer, orders to approve, quotes to provide, failed webhooks — each click-through, sorted by urgency, capped at 8 with "+N more". Then 8 clickable stat cards, charts row (setup donut, task-status bars, order value by supplier), **aggregated** deadlines (grouped by task with "N partners · X overdue", not one row per partner), partners with no recent activity, failed webhook alerts. Drill-downs open a modal listing exactly which partners, each with a **Remind** button. Filters by package/entitlement/partner/status/deadline. **Empty-event state** when no partners exist: welcome panel, "Add your first partner", CSV import, 3-step setup guide. |
| **Partners** | Searchable list with progress. Three actions per partner: **Summary · Preview · Configure**. Bulk select → bulk reminder/export. **Import CSV** (name, sector, contact, email, phone; header auto-detected) and Export CSV. |
| **Partner → Summary** | The "sponsor on the phone" screen. Stats (tasks complete, overdue, forms, orders), **Overdue — needs chasing** with per-item Remind, **Coming up**, **Submissions** (click → review), **Requests**, **Orders**, **Files & uploads**, and a per-partner **Activity trail**. |
| **Partner → Configure** | Company details (name, sector dropdown, structured billing, VAT) · signed contract PDF upload · **Main contact & portal access** (edit lead name/email/phone, send/resend invite, invite status) · **Package** (unlimited inventory line items: type = Dedicated Space / Curated Introductions / Branding / Bespoke / Delegate Passes; Dedicated Space prompts for stand number; Delegate Passes uses a pass-type select that autofills its description — Associate Pass "Full show access", Service Pass "For service staff working on stands only"; price + quantity; linked tasks/forms chips; auto next-deadline) · derived **Extras** card from their shop orders with **View** buttons · entitlement toggles with source labels · **Deadlines** (faceted Forms/Tasks, per-item override + Reset) · price overrides · partner-facing and internal notes · requested files · preview/suspend. |
| **Entitlements** | The master vocabulary, explained in-page. Each row: editable label, key, live usage counts, remove-when-unused. **Expandable reverse editor** — pick a surface first (Shop products / Content pages / Form fields / Tasks, each with a count), then tick items to attach/detach that entitlement's gating. Multi-select. |
| **Tasks** | Create/edit task templates, assign by entitlement or individual partner, fixed or per-partner deadlines, link to forms/pages/products/requests, completion across all partners, filter overdue, send reminders, reopen, export. |
| **Forms** | **Form-first**: lists each form with a response summary ("2/3 responses", "1 to review" badge). Open a form → all responses, awaiting-review first, then a **Settled** divider with resolved ones dimmed. Builder: add/reorder fields, sections, instructions, validation, field-level visibility, **answer-based conditional logic** ("Show [field] when [earlier field] equals [value]"), optional default deadline (blank = per-partner), **Allow resubmission** toggle. Review: approve, request changes, comment, download files, export. |
| **Content** | Categories, block-based page editor with **Preview / Edit toggle**, cover images (gradient presets or upload), visibility rules, related tasks/forms, publish/unpublish, preview as a selected partner, last-updated. Plus the **BOARD file library** manager. |
| **Products** | Create products, assign supplier, variants/options, pricing, tax, deadlines, images/documents, product-specific questions, availability, stock, visibility rules (multi-select entitlements), price overrides, fixed-price vs quote-required, auto- vs manual-approval, archive. |
| **Suppliers** | Supplier ID, name, category, primary contact, notification emails, **Zapier webhook URL**, routing key, **masked webhook secret**, active flag, internal notes, default approval behaviour. |
| **Orders & webhooks** | Both the parent order and its Supplier Orders. Filter, review, change status, request info, comment, view supplier splits, export, download picking list, **manually resend webhook**, cancel, **webhook delivery log** (idempotency key, signature, payload viewer, attempts, response codes), invoice status as a manual field. |
| **Requests** | Inbox filtered by type/partner/owner/status; assign owner, comment, request more info, approve, reject, close, download files, export, full status history. |
| **Reporting** | Partner completion, outstanding/overdue tasks, form submission status, request status, orders by partner/supplier, order value by supplier, product quantities, webhook failures, partner activity — each with **CSV export**. |
| **Event settings** | Five collapsible sections: **Event profile** (name, venue, city, dates, currency dropdown, timezone, tagline) · **Terminology** (singulars; plurals inferred) · **Team & access** (organiser permissions) · **Email & notifications** (sender name/email/signature + logo, editable templates with tokens, dev outbox — click any sent email to read the exact delivered text) · **Event lifecycle** (Duplicate event — copies config, not partners/transactional data; Archive). |
| **Deadline calendar** | Month grid of every upcoming task and untasked form across all partners; prev/next/Today; today highlighted; colour-dotted by type; up to 3 per day with "+N more"; "N deadlines this month". |
| **Preview as partner** | Renders the exact partner portal for a selected organisation, with a persistent preview banner and "Back to organiser". |

### Reminders

Template-driven with a **review-before-send** step. Clicking **Remind** picks the right template for the scenario (overdue vs upcoming), opens a compose modal (switch template, edit subject/body, choose sender — generic or a named organiser), shows a **live preview** with tokens filled for a real recipient, then sends. For "all", tokens stay so each partner gets a personalised copy. Tokens: `[first_name] [contact_name] [partner] [task] [due] [event] [portal_link] [sender] [sender_email] [signature]`.

---

## Interactions & Behaviour

- **Navigation**: sidebar; "Actions" group expands/collapses with a combined badge that splits into per-item badges.
- **Animations**: `bpFade` — `opacity 0 → 1`, `translateY(6px) → none`, `0.3s`, `var(--ease-emphasis)`. Nav drawer: `transform 0.26s cubic-bezier(0.2,0.7,0.2,1)`. Respect `prefers-reduced-motion`.
- **Modals**: dark scrim `rgba(0,0,0,0.66)`, inner card stops click propagation (clicks inside must not close), `Cancel`/backdrop closes. Near-full-width and top-aligned on mobile.
- **Destructive actions**: confirm first.
- **Autosave** on long forms; explicit Save on settings.
- **Sensitive completions** (e.g. marking promo work done) require an explicit checkbox + Save — not one click.
- **Responsive**: nav collapses to an off-canvas drawer below 1024px; dense multi-column grids stack below 720px; 4-up stat strips → 2-up (1-up below 460px); date inputs constrained; item rows wrap so name fields stay usable.
- **Light / dark theme**: toggle in the header, persisted. Light mode maps Rich Black grounds → warm off-white (`#E4E4D6` / `#F5F5EC` / `#FFFFFF` cards), off-white text → ink (`#1A1D22`), and **aqua → teal `#016972`** per the BOARD contrast rule. Solid brand fills keep light text. `color-scheme` must be set so native date pickers render correctly.
- **Empty states**: helpful, never blank. **Loading/error states** required.
- **Keyboard accessible**, visible focus states, accessible contrast.
- **Global search** (⌘K): partners, forms, tasks, orders, requests, products, pages, suppliers.

---

## Design System

**Use the BOARD design system — do not reinvent it.** Bundled under `_ds/` (tokens, fonts, components, gradients, logos).

- **Type**: **Ambit** only. **Never heavier than Regular (400)** — display/headlines in **Light (300)**, body in Regular. Hierarchy from size, uppercase tracking and colour, not weight.
- **Grounds**: dark-first. Rich Black `#000000` primary canvas; Off White `#F1F1E4` the light ground. One or two grounds per surface — don't checkerboard. **Every surface paints its own background.**
- **Palette**: Rich Black `#000000` · Off White `#F1F1E4` · Teal `#016972` · BOARD Blue `#1A4DE7` · aqua `#31F9E5` · amber `#C8763C`.
- **Contrast rule (authoritative)**: on dark grounds use cyan/aqua/amber/grey/off-white/white for text and lines — never black, teal or BOARD Blue. On light grounds use teal/BOARD Blue/cyan/ink/amber/grey/black — never aqua, off-white or white. Solid fills are exempt if the text on top complies.
- **Corners**: crisp 0–16px; the **pill (999px)** is the one signature curve — buttons, tags, price capsules.
- **Elevation**: hairline borders + soft accent glows on dark, not heavy shadows. One soft blue-tinted shadow in light sections.
- **Icons**: Lucide, monoline ~1.5–2px, sparing and functional. **No emoji.**
- **Copy**: British English. ALL-CAPS Ambit-Light headlines; short uppercase wide-tracked eyebrows; measured sentence-case body. Prices in € with thousands separators. No exclamation marks, no slang.

### Prototype UI values (as built)

| Token | Value |
|---|---|
| App canvas | `#000000` |
| Panel / card | `#0B0D11` |
| Inset field / sub-card | `#050608` |
| Chip / muted fill | `#14171D` |
| Primary text | `#F1F1E4` |
| Secondary text | `#C6CAD2` |
| Tertiary text | `#9AA1AD` |
| Muted / meta text | `#6B7280` |
| Accent (dark ground) | `#31F9E5` |
| Primary action | `#1A4DE7` |
| Warning / overdue | `#C8763C` |
| Info accent | `#9DB2F0` |
| Hairline borders | `rgba(241,241,228,0.06 → 0.20)` |
| Radii | 8 / 9 / 10 / 11 / 12 / 14px cards; 999px pills |
| Body / label sizes | 10.5 · 11 · 11.5 · 12 · 12.5 · 13 · 13.5 · 14 · 15px |
| Headings | H1 26–28px/300; section eyebrow 11px/0.12–0.2em uppercase |
| Gaps | 6 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 24px |
| Sidebar | 230px (264px drawer on mobile) |
| Content max-width | 1180px |

---

## Assets

- `_ds/` — the full BOARD design system: `tokens/*.css`, Ambit fonts, logos (wordmark + B mark), the nine `board-bg-1–9.png` fluted gradients, and the React component library (`_ds_bundle.js`, namespace `BOARDDesignSystem_086745`).
- `assets/board-bg-*.png` — gradient copies used for content covers, product media strips, promo backgrounds and the login hero.
- Icons: **Lucide** (substitution — confirm with the brand owner).

---

## Files

| File | What it is |
|---|---|
| `BOARD Partner Portal.dc.html` | The complete prototype — all screens, both portals, all interaction logic |
| `data.js` | **The schema + seed data.** Read first. Contains the resolver functions that encode the personalisation rules |
| `PortalFields.dc.html` | The configurable form-field renderer (all field types) |
| `support.js` | Prototype runtime (**not** needed in production) |
| `_ds/` | The BOARD design system |
| `assets/` | Gradient images used by the prototype |

The prototype opens directly in a browser. Sign in with `anna@boardsummits.example` (organiser) or `alex@helvetica.example` (partner).

---

## Seed Data (retain for the real seed script)

Three partners prove the personalisation system works:

- **Helvetica Systems** (BP-001, stand A12) — exhibition space, stand approval, H&S form, contractor form, venue/build info, access to carpet/lighting/furniture/power/AV. **No** content-session forms, **no** meetings tasks.
- **Northwind Advisory** (BP-002) — meetings package, branding inventory, company profile form, meetings participant form, artwork upload task, branding specs, selected production products. **No** stand construction rules, **no** carpet, **no** contractor forms, **no** move-in vehicle tasks.
- **Meridian Partners** (BP-003, stand C04) — exhibition space + content session + hosted function + branding; mixed standard and custom tasks; a form with fields visible only to them; a partner-specific product price; a private information page; a quote-required AV item.

Suppliers: **GES** (general services / stand build), **Aztec** (AV), **Popshap** (signage), plus electrical/lighting, furniture/carpet, catering and logistics.

Currency EUR. No lorem ipsum anywhere.

---

## Build Order (suggested)

1. Schema + migrations from `data.js`; seed script from the three demo partners.
2. Auth (magic link) + RLS + role-based route protection. **Verify a partner cannot read another partner's data by any means.**
3. Entitlements + visibility resolution (`ruleMatches`, `entitlementSet`) as server-side helpers.
4. Organiser portal: partners, config, entitlements.
5. Partner portal: dashboard, tasks, forms, requests, information.
6. Forms engine: field types, conditional logic, field-level visibility, submission/resubmission lifecycle.
7. Shop → cart → checkout → parent order + supplier order split.
8. Webhooks: HMAC signing, idempotency, retries, delivery log, manual resend.
9. Notifications, reminders, email templates.
10. Reporting + CSV exports.
11. Event duplication.

## Acceptance Tests

The brief's 22 acceptance tests all hold in the prototype except the two that require real infrastructure:

- **#18** (a partner cannot access another partner's data by changing a URL) — the prototype has no URLs or server, so this is **untested and must be proven in production via RLS**. Treat it as the single most important security requirement.
- **#15–17** (webhook fires / failure appears / manual resend) — demonstrated with simulated delivery; must be re-verified against real HTTPS delivery.

**#20–21** (duplicate event, then edit for a future edition) — the data model is fully event-scoped and ready, but the duplication action itself is a stub in the prototype. Implement per brief §9: copy config (settings, content, entitlements, task/form templates, request types, suppliers, shop, products, visibility rules, notification templates); **do not** copy partners, users, participations, completions, submissions, requests, orders, notifications or activity history. Prompt for new name, location, start/end dates, currency, timezone, whether to shift relative deadlines, and which config groups to copy.

## Out of Scope (per brief §15)

Online payment · full accounting · automated invoice generation · supplier login or self-service · inbound supplier API · CRM integration · native registration · badge printing · native meetings scheduling · contract management · multi-language translation · public marketplace · mobile app.

Architect so these can be added later.
