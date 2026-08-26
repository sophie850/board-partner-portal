'use server';

import { guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { deliver, deliverPendingFor } from '@/lib/webhooks';
import type { Id, SupplierOrderStatus, WebhookEventType } from '@/lib/types';

/* ============================================================
   Organiser actions on supplier orders

   Every transition here is one an organiser makes on a partner's
   behalf, so each one is recorded in the audit log with who did it
   — "the supplier order was cancelled" is not a useful thing to
   read three weeks later.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

/** Which states each transition is legitimately reachable from. */
const ALLOWED_FROM: Record<string, SupplierOrderStatus[]> = {
  approve: ['under_review'],
  reject: ['under_review'],
  quote: ['quote_requested', 'quoted'],
  cancel: ['under_review', 'quote_requested', 'quoted', 'confirmed'],
};

const WEBHOOK_FOR: Partial<Record<SupplierOrderStatus, WebhookEventType>> = {
  confirmed: 'supplier_order.confirmed',
  quote_requested: 'supplier_order.quote_requested',
  cancelled: 'supplier_order.cancelled',
};

async function audit(body: string) {
  const client = requireSupabase();
  const { data: event } = await client.from('events').select('id').limit(1).single();

  await client.from('audit_log').insert({
    id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    event_id: event?.id ?? null,
    partner_id: null,
    actor: 'BOARD team',
    body,
    created_at: new Date().toISOString(),
  });
}

async function queueWebhook(supplierOrderId: Id, supplierId: Id, status: SupplierOrderStatus) {
  const eventType = WEBHOOK_FOR[status];
  if (!eventType) return;

  const id = `evt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  await requireSupabase().from('webhook_events').insert({
    id,
    event_type: eventType,
    supplier_order_id: supplierOrderId,
    supplier_id: supplierId,
    idempotency_key: `idem_${id}`,
    signature: '',
    status: 'pending',
    retry_count: 0,
    payload: {},
    sent_at: null,
  });
}

interface LoadedOrder {
  id: Id;
  reference: string;
  status: SupplierOrderStatus;
  supplier_id: Id;
}

type Loaded = { order: LoadedOrder } | { error: string };

/** Read the order's current state, or explain why it cannot be acted on. */
async function load(
  supplierOrderId: Id,
  transition: keyof typeof ALLOWED_FROM,
): Promise<Loaded> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('supplier_orders')
    .select('id, reference, status, supplier_id')
    .eq('id', supplierOrderId)
    .single();

  if (error || !data) return { error: 'That supplier order no longer exists.' };

  const order = data as LoadedOrder;

  if (!ALLOWED_FROM[transition].includes(order.status)) {
    // Usually a stale tab: somebody else moved it on while this
    // screen was open. Saying what it is now is more useful than
    // saying the action is not allowed.
    return { error: `${order.reference} is already ${order.status.replace(/_/g, ' ')}.` };
  }

  return { order };
}

function done(): Result {
  revalidatePath('/organiser/orders');
  revalidatePath('/organiser');
  revalidatePath('/portal', 'layout');
  return { ok: true };
}

/* ---------------------------------------------------------------
   Transitions
   --------------------------------------------------------------- */

export async function approveSupplierOrder(supplierOrderId: Id): Promise<Result> {
  const refused = await guardOrganiser('orders');
  if (refused) return refused;

  try {
    const loaded = await load(supplierOrderId, 'approve');
    if ('error' in loaded) return { ok: false, error: loaded.error };

    const now = new Date().toISOString();
    const { error } = await requireSupabase()
      .from('supplier_orders')
      .update({ status: 'confirmed', confirmed_at: now })
      .eq('id', supplierOrderId);

    if (error) return { ok: false, error: error.message };

    await queueWebhook(supplierOrderId, loaded.order.supplier_id, 'confirmed');
    await deliverPendingFor(supplierOrderId);
    await audit(`${loaded.order.reference} approved and confirmed with the supplier.`);

    return done();
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function rejectSupplierOrder(
  supplierOrderId: Id,
  reason: string,
): Promise<Result> {
  const refused = await guardOrganiser('orders');
  if (refused) return refused;

  if (!reason.trim()) {
    // A partner sees this outcome, so it cannot be a bare status.
    return { ok: false, error: 'Give a reason — the partner will see this.' };
  }

  try {
    const loaded = await load(supplierOrderId, 'reject');
    if ('error' in loaded) return { ok: false, error: loaded.error };

    const { error } = await requireSupabase()
      .from('supplier_orders')
      .update({ status: 'rejected', confirmed_at: null })
      .eq('id', supplierOrderId);

    if (error) return { ok: false, error: error.message };

    // No webhook: the supplier never heard about this order, so
    // telling them it is rejected would be the first they know of it.
    await audit(`${loaded.order.reference} rejected — ${reason.trim()}`);

    return done();
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function recordQuote(
  supplierOrderId: Id,
  amount: number,
  note: string,
): Promise<Result> {
  const refused = await guardOrganiser('orders');
  if (refused) return refused;

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Enter the quoted amount, excluding tax.' };
  }

  try {
    const loaded = await load(supplierOrderId, 'quote');
    if ('error' in loaded) return { ok: false, error: loaded.error };

    const { error } = await requireSupabase()
      .from('supplier_orders')
      .update({
        status: 'quoted',
        quote: { amount, note: note.trim(), at: new Date().toISOString() },
        // The quote is what the order is now worth. Tax is added at
        // invoicing, so it is not guessed at here.
        subtotal: amount,
        total: amount,
      })
      .eq('id', supplierOrderId);

    if (error) return { ok: false, error: error.message };

    await audit(`Quote of ${amount} recorded against ${loaded.order.reference}.`);

    return done();
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

export async function cancelSupplierOrder(
  supplierOrderId: Id,
  reason: string,
): Promise<Result> {
  const refused = await guardOrganiser('orders');
  if (refused) return refused;

  if (!reason.trim()) {
    return { ok: false, error: 'Give a reason — the partner will see this.' };
  }

  try {
    const loaded = await load(supplierOrderId, 'cancel');
    if ('error' in loaded) return { ok: false, error: loaded.error };

    const { error } = await requireSupabase()
      .from('supplier_orders')
      .update({ status: 'cancelled', confirmed_at: null })
      .eq('id', supplierOrderId);

    if (error) return { ok: false, error: error.message };

    // Only tell the supplier if they were ever told about it.
    if (loaded.order.status === 'confirmed' || loaded.order.status === 'quote_requested') {
      await queueWebhook(supplierOrderId, loaded.order.supplier_id, 'cancelled');
      await deliverPendingFor(supplierOrderId);
    }

    await audit(`${loaded.order.reference} cancelled — ${reason.trim()}`);

    return done();
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

/* ---------------------------------------------------------------
   Webhooks
   --------------------------------------------------------------- */

/**
 * Send a webhook again by hand.
 *
 * The idempotency key is unchanged, so a supplier who already
 * processed it can recognise the repeat rather than duplicating the
 * order at their end.
 */
export async function resendWebhook(webhookEventId: Id): Promise<Result> {
  const refused = await guardOrganiser('orders');
  if (refused) return refused;

  try {
    const result = await deliver(webhookEventId);
    revalidatePath('/organiser/orders');

    if (!result.ok) {
      return {
        ok: false,
        error: result.status
          ? `The supplier's endpoint answered ${result.status}. ${result.body}`.trim()
          : result.body || 'Could not reach the supplier.',
      };
    }

    return { ok: true };
  } catch (e) {
    return { ok: false, error: message(e) };
  }
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong.';
}
