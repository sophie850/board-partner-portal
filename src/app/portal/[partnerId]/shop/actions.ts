'use server';

import { guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb, getDbOrError } from '@/lib/db/store';
import { priceFor, productVisible } from '@/lib/resolvers';
import { deliverPendingFor } from '@/lib/webhooks';
import type { ApprovalMode, Id, OrderBilling, SupplierOrderStatus } from '@/lib/types';

/* ============================================================
   Checkout

   One cart becomes ONE parent order plus ONE supplier order per
   supplier, because a partner shops from a single catalogue but each
   supplier only ever sees their own lines.

   No payment is taken. There is no paid state anywhere in this file,
   and the confirmation copy says so explicitly.
   ============================================================ */

export interface CartLine {
  productId: Id;
  qty: number;
  options: Record<string, string>;
  answers: Record<string, string>;
}

export type CheckoutResult =
  | { ok: true; orderId: Id; reference: string }
  | { ok: false; error: string };

/**
 * The status a supplier order opens in, from the items it contains.
 *
 * A supplier order can hold items with different approval modes, so
 * the most cautious one wins: a cart with anything quote-required
 * cannot auto-confirm, and one needing review cannot skip it. The
 * alternative — splitting a supplier's lines across several orders —
 * would send them two emails for one delivery.
 */
function statusFor(modes: ApprovalMode[]): {
  status: SupplierOrderStatus;
  approvalMode: ApprovalMode;
} {
  if (modes.includes('quote')) return { status: 'quote_requested', approvalMode: 'quote' };
  if (modes.includes('manual')) return { status: 'under_review', approvalMode: 'manual' };
  return { status: 'confirmed', approvalMode: 'auto' };
}

/** Sequential references, readable and stable: BO-2027-00019. */
function reference(prefix: string, year: number, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(5, '0')}`;
}

export async function checkout(
  partnerId: Id,
  participationId: Id,
  lines: CartLine[],
  billing: OrderBilling,
  termsAccepted: boolean,
): Promise<CheckoutResult> {
  const refused = await guardPartner(partnerId, 'shop');
  if (refused) return refused;

  if (!lines.length) return { ok: false, error: 'Your cart is empty.' };
  if (!termsAccepted) {
    return { ok: false, error: 'Please accept the terms before submitting your order.' };
  }
  if (!billing.legalEntity?.trim()) {
    return { ok: false, error: 'Enter the legal entity the invoice should be raised to.' };
  }
  if (!billing.invoiceContactEmail?.trim() || !billing.invoiceContactEmail.includes('@')) {
    return { ok: false, error: 'Enter an email address for the invoice contact.' };
  }

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;
  const part = db.participations.find((p) => p.id === participationId);
  if (!part) return { ok: false, error: 'That participation no longer exists.' };

  /*
   * Prices and eligibility are resolved here, on the server, from
   * the product and this partner's overrides — never from whatever
   * the browser submitted. A cart is client-side state and a client
   * could name any price it liked.
   */
  const resolved = [];
  for (const line of lines) {
    const product = db.products.find((p) => p.id === line.productId);
    if (!product) return { ok: false, error: 'A product in your cart is no longer available.' };

    if (!productVisible(db, product, part)) {
      return { ok: false, error: `"${product.name}" is not available to you.` };
    }

    const qty = Math.max(product.minQty, Math.min(product.maxQty, Math.round(line.qty)));

    const missing = product.questions.find(
      (q) => q.required && !String(line.answers?.[q.key] ?? '').trim(),
    );
    if (missing) {
      return { ok: false, error: `"${product.name}" needs an answer for ${missing.label}.` };
    }

    resolved.push({
      product,
      qty,
      unitPrice: priceFor(part, product),
      options: line.options ?? {},
      answers: line.answers ?? {},
    });
  }

  const now = new Date().toISOString();
  const year = new Date().getFullYear();

  try {
    const client = requireSupabase();

    // Sequence from what already exists, so references stay readable
    // and roughly sequential. Two simultaneous checkouts could in
    // principle collide; the unique constraint on reference would
    // reject the second, which is the safe direction.
    const { count: orderCount } = await client
      .from('orders')
      .select('*', { count: 'exact', head: true });
    const { count: supplierOrderCount } = await client
      .from('supplier_orders')
      .select('*', { count: 'exact', head: true });

    const orderId = `ord_${Date.now().toString(36)}`;
    const orderRef = reference('BO', year, (orderCount ?? 0) + 1);

    const { error: orderError } = await client.from('orders').insert({
      id: orderId,
      event_id: db.event.id,
      participation_id: participationId,
      reference: orderRef,
      status: 'submitted',
      submitted_at: now,
      billing,
      invoice_status: '',
    });
    if (orderError) return { ok: false, error: orderError.message };

    const { error: itemsError } = await client.from('order_items').insert(
      resolved.map((r, i) => ({
        id: `${orderId}__${i}`,
        order_id: orderId,
        product_id: r.product.id,
        name: r.product.name,
        supplier_id: r.product.supplierId,
        qty: r.qty,
        unit_price: r.unitPrice,
        options: r.options,
        answers: r.answers,
        position: i,
      })),
    );
    if (itemsError) return { ok: false, error: itemsError.message };

    // ---- split by supplier ----
    const bySupplier = new Map<Id, typeof resolved>();
    resolved.forEach((r) => {
      const list = bySupplier.get(r.product.supplierId) ?? [];
      list.push(r);
      bySupplier.set(r.product.supplierId, list);
    });

    let seq = supplierOrderCount ?? 0;
    const created: Id[] = [];

    for (const [supplierId, items] of bySupplier) {
      seq += 1;
      const supplierOrderId = `so_${Date.now().toString(36)}_${supplierId}`;
      const { status, approvalMode } = statusFor(items.map((i) => i.product.approvalMode));

      // Quote-required lines have no price yet, so they contribute
      // nothing to the total rather than counting as zero.
      const subtotal = items.reduce(
        (sum, i) => sum + (i.unitPrice ?? 0) * i.qty,
        0,
      );
      const tax = items.reduce(
        (sum, i) => sum + (i.unitPrice ?? 0) * i.qty * i.product.taxRate,
        0,
      );

      const { error: soError } = await client.from('supplier_orders').insert({
        id: supplierOrderId,
        order_id: orderId,
        supplier_id: supplierId,
        reference: reference('SO', year, seq),
        status,
        approval_mode: approvalMode,
        submitted_at: now,
        // Auto-confirmed orders are confirmed at submission; the
        // others are not confirmed at all yet.
        confirmed_at: status === 'confirmed' ? now : null,
        subtotal,
        tax,
        total: subtotal + tax,
        quote: null,
      });
      if (soError) return { ok: false, error: soError.message };

      const { error: soItemsError } = await client.from('supplier_order_items').insert(
        items.map((i, k) => ({
          id: `${supplierOrderId}__${k}`,
          supplier_order_id: supplierOrderId,
          product_id: i.product.id,
          name: i.product.name,
          qty: i.qty,
          unit_price: i.unitPrice,
          position: k,
        })),
      );
      if (soItemsError) return { ok: false, error: soItemsError.message };

      await recordPendingWebhook(supplierOrderId, supplierId, status);
      created.push(supplierOrderId);
    }

    /*
     * Deliver before returning rather than in the background: this
     * runs on a serverless function, and a promise left unawaited
     * is killed the moment the response is sent. Delivery never
     * throws — a supplier being unreachable is logged as a failed
     * attempt and the order still stands.
     */
    for (const supplierOrderId of created) {
      await deliverPendingFor(supplierOrderId);
    }

    await client.from('audit_log').insert({
      id: `a_${Date.now().toString(36)}`,
      event_id: db.event.id,
      partner_id: part.partnerId,
      actor: db.partners.find((p) => p.id === part.partnerId)?.name ?? 'Partner',
      body: `Order ${orderRef} submitted — ${bySupplier.size} supplier order(s).`,
      created_at: now,
    });

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/orders');
    revalidatePath('/organiser');

    return { ok: true, orderId, reference: orderRef };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not submit your order.',
    };
  }
}

/** Which supplier-order states owe the supplier a webhook. */
const WEBHOOK_FOR: Partial<Record<SupplierOrderStatus, string>> = {
  confirmed: 'supplier_order.confirmed',
  quote_requested: 'supplier_order.quote_requested',
  cancelled: 'supplier_order.cancelled',
};

/**
 * Queue the webhook owed to this supplier.
 *
 * Written as `pending` first and delivered separately, so an event
 * is never lost because the send failed — a failed delivery leaves a
 * row an organiser can resend, not a gap.
 */
async function recordPendingWebhook(
  supplierOrderId: Id,
  supplierId: Id,
  status: SupplierOrderStatus,
) {
  const eventType = WEBHOOK_FOR[status];

  // Nothing is owed for an order still awaiting organiser review —
  // the supplier only hears about it once it is confirmed.
  if (!eventType) return;

  const id = `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  await requireSupabase()
    .from('webhook_events')
    .insert({
      id,
      event_type: eventType,
      supplier_order_id: supplierOrderId,
      supplier_id: supplierId,
      // Unique per event, so a retry can never be double-processed.
      idempotency_key: `idem_${id}`,
      signature: '',
      status: 'pending',
      retry_count: 0,
      payload: { event_type: eventType, supplier_order: { id: supplierOrderId } },
      sent_at: null,
    });
}

/* ---------------------------------------------------------------
   Quotes
   --------------------------------------------------------------- */

export async function respondToQuote(
  partnerId: Id,
  supplierOrderId: Id,
  accept: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const refused = await guardPartner(partnerId, 'shop');
  if (refused) return refused;

  try {
    const client = requireSupabase();

    const { data: so, error } = await client
      .from('supplier_orders')
      .select('status, supplier_id')
      .eq('id', supplierOrderId)
      .single();

    if (error) return { ok: false, error: error.message };
    if (so?.status !== 'quoted') {
      return { ok: false, error: 'There is no quote awaiting your response on this order.' };
    }

    const now = new Date().toISOString();
    const { error: writeError } = await client
      .from('supplier_orders')
      .update({
        status: accept ? 'confirmed' : 'cancelled',
        confirmed_at: accept ? now : null,
      })
      .eq('id', supplierOrderId);

    if (writeError) return { ok: false, error: writeError.message };

    await recordPendingWebhook(
      supplierOrderId,
      so.supplier_id,
      accept ? 'confirmed' : 'cancelled',
    );
    await deliverPendingFor(supplierOrderId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not record your response.' };
  }

  revalidatePath(`/portal/${partnerId}`, 'layout');
  revalidatePath('/organiser/orders');
  return { ok: true };
}
