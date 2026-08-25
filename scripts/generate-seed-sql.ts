/* ============================================================
   Generate the seed as SQL.

   The environment this was built in cannot reach Supabase, so the
   seed ships as a file to paste into the SQL editor rather than a
   script that connects. It is generated from the same typed fixtures
   the application uses, so the two cannot drift.

   Run: npm run seed:sql
   ============================================================ */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { seed } from '../src/data/seed';
import {
  auditEntryToRow,
  contentCategoryToRow,
  contentPageToRow,
  emailTemplateToRow,
  entitlementToRow,
  eventToRow,
  fileToRow,
  formFieldToRow,
  formToRow,
  inventoryToRow,
  notificationToRow,
  orderItemToRow,
  orderToRow,
  organiserUserToRow,
  participationToRow,
  partnerToRow,
  partnerUserToRow,
  productToRow,
  requestCommentToRow,
  requestToRow,
  requestTypeToRow,
  requestedFileToRow,
  shopCategoryToRow,
  supplierOrderItemToRow,
  supplierOrderToRow,
  supplierToRow,
  taskTemplateToRow,
  webhookAttemptToRow,
  webhookEventToRow,
} from '../src/lib/db/mappers';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

/** Quote a value for SQL. Everything is parameterless, so this must be exact. */
function lit(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';

  if (Array.isArray(v)) {
    // A JS array maps to a Postgres text[] for plain strings, and to
    // JSONB anywhere the column is JSONB — handled by the caller
    // passing objects through `jsonLit`.
    if (v.every((x) => typeof x === 'string')) {
      if (!v.length) return `'{}'`;
      const inner = v.map((x) => `"${String(x).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      return `'{${inner.join(',')}}'`;
    }
    return jsonLit(v);
  }

  if (typeof v === 'object') return jsonLit(v);

  return `'${String(v).replace(/'/g, "''")}'`;
}

function jsonLit(v: unknown): string {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

/**
 * JSONB columns, per table.
 *
 * Must be per-table, not a flat set: `options` is JSONB on products
 * but text[] on form_fields, and `files` is text[] everywhere it
 * appears. Getting this wrong produces SQL that only fails at run
 * time, so it is spelled out against the schema.
 */
const JSONB_COLUMNS: Record<string, string[]> = {
  events: ['sender', 'terminology'],
  organiser_users: ['permissions'],
  suppliers: [],
  products: ['options', 'questions', 'visibility'],
  forms: ['assign'],
  form_fields: ['visibility', 'condition'],
  request_types: ['fields'],
  content_pages: ['blocks', 'visibility'],
  files: ['visibility'],
  task_templates: [],
  partner_organisations: ['billing'],
  partner_users: ['permissions'],
  event_participations: [
    'module_overrides',
    'form_due_dates',
    'task_due_dates',
    'task_state',
    'form_state',
    'marketing',
  ],
  partner_inventory: ['refs'],
  partner_requested_files: [],
  orders: ['billing'],
  order_items: ['options', 'answers'],
  supplier_orders: ['quote'],
  supplier_order_items: [],
  requests: ['values'],
  request_comments: [],
  webhook_events: ['payload'],
  webhook_delivery_attempts: [],
  notifications: ['target'],
  email_templates: [],
  audit_log: [],
};

function insert(table: string, rows: Row[]): string {
  if (!rows.length) return `-- ${table}: nothing to seed\n`;

  const jsonbCols = new Set(JSONB_COLUMNS[table] ?? []);
  const cols = Object.keys(rows[0]);
  const values = rows
    .map((r) => {
      const cells = cols.map((c) => {
        const v = r[c];
        // A JSONB column takes JSON for every value, including bare
        // strings — partner_users.permissions is the string "all".
        if (jsonbCols.has(c)) return v === null || v === undefined ? 'null' : jsonLit(v);
        return lit(v);
      });
      return `  (${cells.join(', ')})`;
    })
    .join(',\n');

  return (
    `insert into ${table} (${cols.map((c) => `"${c}"`).join(', ')}) values\n` +
    `${values}\n` +
    `on conflict (id) do nothing;\n`
  );
}

/* ---------------------------------------------------------------
   Build
   --------------------------------------------------------------- */

const db = seed();
const eventId = db.event.id;
const out: string[] = [];

out.push(`-- ============================================================
-- BOARD Partner Portal — seed data
--
-- Generated from src/data/seed.ts by scripts/generate-seed-sql.ts.
-- Do not edit by hand: regenerate with \`npm run seed:sql\`.
--
-- Run AFTER the schema (APPLY_TO_SUPABASE.sql). Safe to re-run:
-- every insert is "on conflict do nothing", so it will not
-- overwrite work already done in the portal.
--
-- Three partners prove the personalisation system works. Each holds
-- a different set of entitlements, so each sees a different portal:
--   Helvetica Systems  BP-001  exhibition space, stand A12
--   Northwind Advisory BP-002  meetings + branding, no stand
--   Meridian Partners  BP-003  bespoke: stand C04, content, rooftop
-- ============================================================

begin;
`);

out.push('\n-- ---- event ----');
out.push(insert('events', [eventToRow(db.event)]));

out.push('\n-- ---- organiser users ----');
out.push(insert('organiser_users', db.organiserUsers.map(organiserUserToRow)));

out.push('\n-- ---- entitlements: the master vocabulary ----');
out.push(
  `insert into entitlements ("key", "event_id", "label") values\n` +
    db.entitlements
      .map((e) => {
        const r = entitlementToRow(e, eventId);
        return `  (${lit(r.key)}, ${lit(r.event_id)}, ${lit(r.label)})`;
      })
      .join(',\n') +
    `\non conflict (key) do nothing;\n`,
);

out.push('\n-- ---- suppliers (webhook secrets never leave the server) ----');
out.push(insert('suppliers', db.suppliers.map(supplierToRow)));

out.push('\n-- ---- shop ----');
out.push(
  insert(
    'shop_categories',
    db.shopCategories.map((c, i) => shopCategoryToRow(c, eventId, i)),
  ),
);
out.push(insert('products', db.products.map(productToRow)));

out.push('\n-- ---- forms ----');
out.push(insert('forms', db.forms.map(formToRow)));
out.push(
  insert(
    'form_fields',
    db.forms.flatMap((f) => f.fields.map((fld, i) => formFieldToRow(fld, f.id, i))),
  ),
);

out.push('\n-- ---- request types ----');
out.push(insert('request_types', db.requestTypes.map(requestTypeToRow)));

out.push('\n-- ---- content ----');
out.push(
  insert(
    'content_categories',
    db.contentCategories.map((c, i) => contentCategoryToRow(c, eventId, i)),
  ),
);
out.push(insert('content_pages', db.contentPages.map(contentPageToRow)));

out.push('\n-- ---- files: the BOARD library ----');
out.push(insert('files', db.files.map(fileToRow)));

out.push('\n-- ---- task templates ----');
out.push(insert('task_templates', db.taskTemplates.map(taskTemplateToRow)));

out.push('\n-- ---- partners ----');
out.push(insert('partner_organisations', db.partners.map(partnerToRow)));
out.push(insert('partner_users', db.partnerUsers.map(partnerUserToRow)));

out.push('\n-- ---- participation: the personalisation records ----');
out.push(insert('event_participations', db.participations.map(participationToRow)));
out.push(
  insert(
    'partner_inventory',
    db.participations.flatMap((p) =>
      (p.inventory ?? []).map((i, idx) => inventoryToRow(i, p.id, idx)),
    ),
  ),
);
out.push(
  insert(
    'partner_requested_files',
    db.participations.flatMap((p) =>
      (p.requestedFiles ?? []).map((f, idx) => requestedFileToRow(f, p.id, idx)),
    ),
  ),
);

const overrides = db.participations.flatMap((p) =>
  (p.priceOverrides ?? []).map((o) => ({
    participation_id: p.id,
    product_id: o.productId,
    price: o.price,
  })),
);
if (overrides.length) {
  out.push(
    `insert into partner_price_overrides ("participation_id", "product_id", "price") values\n` +
      overrides
        .map((o) => `  (${lit(o.participation_id)}, ${lit(o.product_id)}, ${lit(o.price)})`)
        .join(',\n') +
      `\non conflict (participation_id, product_id) do nothing;\n`,
  );
}

out.push('\n-- ---- orders ----');
out.push(insert('orders', db.orders.map(orderToRow)));
out.push(
  insert(
    'order_items',
    db.orders.flatMap((o) => o.items.map((it, i) => orderItemToRow(it, o.id, i))),
  ),
);
out.push(insert('supplier_orders', db.supplierOrders.map(supplierOrderToRow)));
out.push(
  insert(
    'supplier_order_items',
    db.supplierOrders.flatMap((so) =>
      so.items.map((it, i) => supplierOrderItemToRow(it, so.id, i)),
    ),
  ),
);

out.push('\n-- ---- requests ----');
out.push(insert('requests', db.requests.map(requestToRow)));
out.push(
  insert(
    'request_comments',
    db.requests.flatMap((r) => r.comments.map((c, i) => requestCommentToRow(c, r.id, i))),
  ),
);

out.push('\n-- ---- webhook log ----');
// The seeded failed delivery references a supplier order that does
// not exist as a row; supplier_order_id is deliberately not a
// foreign key so the log survives order deletion.
out.push(insert('webhook_events', db.webhookEvents.map(webhookEventToRow)));
out.push(
  insert(
    'webhook_delivery_attempts',
    db.webhookEvents.flatMap((w) =>
      w.attempts.map((a, i) => webhookAttemptToRow(a, w.id, i)),
    ),
  ),
);

out.push('\n-- ---- notifications, email, audit ----');
out.push(insert('notifications', db.notifications.map(notificationToRow)));
out.push(
  insert(
    'email_templates',
    db.emailTemplates.map((t) => emailTemplateToRow(t, eventId)),
  ),
);
out.push(insert('audit_log', db.auditLog.map((a) => auditEntryToRow(a, eventId))));

out.push(`
commit;

-- ============================================================
-- Verify: every count below should be non-zero.
-- ============================================================
select
  (select count(*) from events)               as events,
  (select count(*) from entitlements)         as entitlements,
  (select count(*) from suppliers)            as suppliers,
  (select count(*) from products)             as products,
  (select count(*) from forms)                as forms,
  (select count(*) from form_fields)          as form_fields,
  (select count(*) from content_pages)        as content_pages,
  (select count(*) from task_templates)       as tasks,
  (select count(*) from partner_organisations) as partners,
  (select count(*) from event_participations) as participations;
`);

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'supabase', 'SEED_SUPABASE.sql');
writeFileSync(target, out.join('\n'), 'utf8');

console.log(`Wrote ${target}`);
