import 'server-only';

import { cache } from 'react';

import { seed } from '@/data/seed';
import type { Db, FormField, Id, InventoryItem, RequestedFile } from '@/lib/types';

import { supabase, supabaseConfigured } from './client';
import {
  rowToAuditEntry,
  rowToContentCategory,
  rowToContentPage,
  rowToEmailTemplate,
  rowToEntitlement,
  rowToEvent,
  rowToFile,
  rowToForm,
  rowToFormField,
  rowToInventory,
  rowToNotification,
  rowToOrder,
  rowToOrderItem,
  rowToOrganiserUser,
  rowToParticipation,
  rowToPartner,
  rowToPartnerUser,
  rowToProduct,
  rowToRequest,
  rowToRequestComment,
  rowToRequestType,
  rowToRequestedFile,
  rowToSentEmail,
  rowToShopCategory,
  rowToSupplier,
  rowToSupplierOrder,
  rowToSupplierOrderItem,
  rowToTaskTemplate,
  rowToWebhookAttempt,
  rowToWebhookEvent,
} from './mappers';

/* ============================================================
   The read model

   The whole event is loaded as one `Db` object and handed to the
   resolvers, which is how the prototype worked and what every
   screen expects. At this event's scale — a handful of partners,
   dozens of config rows — that is a few hundred kilobytes and one
   round of parallel queries, which is cheaper than the dozens of
   scoped queries the alternative needs.

   When partner counts reach the hundreds, split this: keep the
   config tables loaded wholesale (they are small and shared) and
   fetch participations, orders and requests per partner. The
   resolvers already take `Db`, so only this file changes.
   ============================================================ */

/** Set when Supabase is unreachable, so the UI can say so plainly. */
export class DataUnavailableError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DataUnavailableError';
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  rows.forEach((r) => {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  });
  return out;
}

/**
 * Read the whole event.
 *
 * Cached per request via React `cache()`, so several server
 * components on one page share a single set of queries.
 */
export const getDb = cache(async (): Promise<Db> => {
  const client = supabase();

  // No project configured: fall back to the in-process fixtures so
  // the app runs for local development and preview builds.
  if (!client) return seed();

  const table = async (name: string, order?: string): Promise<Row[]> => {
    let q = client.from(name).select('*');
    if (order) q = q.order(order, { ascending: true });
    const { data, error } = await q;
    if (error) {
      throw new DataUnavailableError(
        `Could not read "${name}" from Supabase: ${error.message}`,
        error,
      );
    }
    return data ?? [];
  };

  const [
    events,
    organiserUsers,
    entitlements,
    suppliers,
    shopCategories,
    products,
    formRows,
    formFieldRows,
    requestTypes,
    contentCategories,
    contentPages,
    files,
    taskTemplates,
    partners,
    partnerUsers,
    participationRows,
    inventoryRows,
    requestedFileRows,
    priceOverrideRows,
    orderRows,
    orderItemRows,
    supplierOrderRows,
    supplierOrderItemRows,
    requestRows,
    requestCommentRows,
    webhookRows,
    webhookAttemptRows,
    notifications,
    emailTemplates,
    sentEmails,
    auditLog,
  ] = await Promise.all([
    table('events'),
    table('organiser_users'),
    table('entitlements'),
    table('suppliers'),
    table('shop_categories', 'position'),
    table('products'),
    table('forms'),
    table('form_fields', 'position'),
    table('request_types'),
    table('content_categories', 'position'),
    table('content_pages'),
    table('files'),
    table('task_templates'),
    table('partner_organisations'),
    table('partner_users'),
    table('event_participations'),
    table('partner_inventory', 'position'),
    table('partner_requested_files', 'position'),
    table('partner_price_overrides'),
    table('orders'),
    table('order_items', 'position'),
    table('supplier_orders'),
    table('supplier_order_items', 'position'),
    table('requests'),
    table('request_comments', 'created_at'),
    table('webhook_events'),
    table('webhook_delivery_attempts', 'attempted_at'),
    table('notifications'),
    table('email_templates'),
    table('sent_emails'),
    table('audit_log'),
  ]);

  if (!events.length) {
    // Reaching here means the query succeeded but returned nothing.
    // With RLS enabled and no policies, that is exactly what a
    // non-privileged key sees — so the usual cause is the
    // publishable key having been set as SUPABASE_SECRET_KEY, not a
    // missing seed. Name both, since the fix differs.
    throw new DataUnavailableError(
      'Connected to Supabase but read no event. Either SUPABASE_SECRET_KEY is not the ' +
        'secret key (a publishable key returns zero rows, because row-level security is ' +
        'enabled with no policies), or the seed has not been run. Check /api/health: if ' +
        'every row count is 0, it is the key; if the tables are empty, run ' +
        'supabase/SEED_SUPABASE.sql.',
    );
  }

  // ---- stitch child collections onto their parents ----

  const fieldsByForm = groupBy(formFieldRows, (r) => r.form_id);
  const forms = formRows.map((r) =>
    rowToForm(r, (fieldsByForm.get(r.id) ?? []).map<FormField>(rowToFormField)),
  );

  const invByPart = groupBy(inventoryRows, (r) => r.participation_id);
  const reqFilesByPart = groupBy(requestedFileRows, (r) => r.participation_id);
  const overridesByPart = groupBy(priceOverrideRows, (r) => r.participation_id);

  const participations = participationRows.map((r) =>
    rowToParticipation(
      r,
      (invByPart.get(r.id) ?? []).map<InventoryItem>(rowToInventory),
      (reqFilesByPart.get(r.id) ?? []).map<RequestedFile>(rowToRequestedFile),
      (overridesByPart.get(r.id) ?? []).map((o) => ({
        productId: o.product_id,
        price: Number(o.price),
      })),
    ),
  );

  const itemsByOrder = groupBy(orderItemRows, (r) => r.order_id);
  const orders = orderRows.map((r) =>
    rowToOrder(r, (itemsByOrder.get(r.id) ?? []).map(rowToOrderItem)),
  );

  const itemsBySupplierOrder = groupBy(supplierOrderItemRows, (r) => r.supplier_order_id);
  const supplierOrders = supplierOrderRows.map((r) =>
    rowToSupplierOrder(r, (itemsBySupplierOrder.get(r.id) ?? []).map(rowToSupplierOrderItem)),
  );

  const commentsByRequest = groupBy(requestCommentRows, (r) => r.request_id);
  const requests = requestRows.map((r) =>
    rowToRequest(r, (commentsByRequest.get(r.id) ?? []).map(rowToRequestComment)),
  );

  const attemptsByWebhook = groupBy(webhookAttemptRows, (r) => r.webhook_event_id);
  const webhookEvents = webhookRows.map((r) =>
    rowToWebhookEvent(r, (attemptsByWebhook.get(r.id) ?? []).map(rowToWebhookAttempt)),
  );

  return {
    version: 1,
    event: rowToEvent(events[0]),
    entitlements: entitlements.map(rowToEntitlement),
    suppliers: suppliers.map(rowToSupplier),
    shopCategories: shopCategories.map(rowToShopCategory),
    products: products.map(rowToProduct),
    forms,
    requestTypes: requestTypes.map(rowToRequestType),
    contentCategories: contentCategories.map(rowToContentCategory),
    contentPages: contentPages.map(rowToContentPage),
    files: files.map(rowToFile),
    taskTemplates: taskTemplates.map(rowToTaskTemplate),
    // Removed during design; retained so legacy records still resolve.
    packageTemplates: [],
    partners: partners.map(rowToPartner),
    partnerUsers: partnerUsers.map(rowToPartnerUser),
    participations,
    orders,
    supplierOrders,
    webhookEvents,
    requests,
    notifications: notifications.map(rowToNotification),
    emailTemplates: emailTemplates.map(rowToEmailTemplate),
    sentEmails: sentEmails.map(rowToSentEmail),
    auditLog: auditLog
      .map(rowToAuditEntry)
      .sort((a, b) => (a.at < b.at ? 1 : -1)),
    organiserUsers: organiserUsers.map(rowToOrganiserUser),
    orgAuditSeenAt: null,
  };
});

/* ---------------------------------------------------------------
   Id minting
   --------------------------------------------------------------- */

/**
 * Mint an id in the prefix convention the seed already uses
 * ('pg_venue', 'f_profile'). Random suffix rather than a counter, so
 * two organisers creating a page at once cannot collide.
 */
export function mintId(prefix: string): Id {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

export { supabaseConfigured };
