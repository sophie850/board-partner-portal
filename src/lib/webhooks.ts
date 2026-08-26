import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import { requireSupabase } from '@/lib/db/client';
import type { Id, WebhookEventType } from '@/lib/types';

/* ============================================================
   Outbound webhooks

   Suppliers receive a signed POST when an order that concerns them
   changes. The payload is built here, at delivery time, from the
   database rather than from whatever was stored when the event was
   queued — a resend three days later should describe the order as it
   is now, not as it was.

   The signature follows the usual scheme: HMAC-SHA256 over
   `timestamp.body`, so a captured request cannot be replayed with a
   fresh timestamp. Suppliers verify with the secret held against
   their record, which never leaves the server.
   ============================================================ */

/** Long enough for a slow supplier endpoint, short enough not to hang a request. */
const TIMEOUT_MS = 10_000;

/** Response bodies are stored for debugging, so they are truncated. */
const MAX_BODY = 500;

export interface DeliveryResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Sign a payload the way suppliers are told to verify it.
 *
 * Exported so the supplier-facing documentation and any test
 * endpoint sign identically — one implementation, not two that can
 * drift apart.
 */
export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** Constant-time comparison, for anything verifying a signature we sent. */
export function signatureMatches(expected: string, given: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(given, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ---------------------------------------------------------------
   Payload
   --------------------------------------------------------------- */

/**
 * Everything the supplier needs to fulfil, and nothing else.
 *
 * Deliberately absent: the partner's invoicing details, their price
 * overrides, and any other supplier's lines. A supplier is told what
 * to deliver and who to deliver it to — not what the partner paid.
 */
async function buildPayload(
  supplierOrderId: Id,
  eventType: WebhookEventType,
): Promise<Record<string, unknown> | null> {
  const client = requireSupabase();

  const { data: so } = await client
    .from('supplier_orders')
    .select('id, reference, status, approval_mode, submitted_at, confirmed_at, order_id, supplier_id')
    .eq('id', supplierOrderId)
    .single();

  if (!so) return null;

  const [{ data: items }, { data: order }] = await Promise.all([
    client
      .from('supplier_order_items')
      .select('product_id, name, qty, unit_price, position')
      .eq('supplier_order_id', supplierOrderId)
      .order('position'),
    client
      .from('orders')
      .select('id, reference, participation_id, submitted_at')
      .eq('id', so.order_id)
      .single(),
  ]);

  let partner: {
    name: string;
    reference: string;
    stand: string | null;
    contact: { name: string; email: string } | null;
  } | null = null;

  if (order?.participation_id) {
    const { data: part } = await client
      .from('event_participations')
      .select('partner_id, reference, stand_ref, lead_user_id')
      .eq('id', order.participation_id)
      .single();

    if (part?.partner_id) {
      const [{ data: org }, lead] = await Promise.all([
        client
          .from('partner_organisations')
          .select('name')
          .eq('id', part.partner_id)
          .single(),
        part.lead_user_id
          ? client
              .from('partner_users')
              .select('name, email')
              .eq('id', part.lead_user_id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      if (org) {
        partner = {
          name: org.name,
          reference: part.reference,
          // The stand is how a supplier finds them on site, so it
          // travels with the order rather than being looked up later.
          stand: part.stand_ref ?? null,
          contact: lead.data ? { name: lead.data.name, email: lead.data.email } : null,
        };
      }
    }
  }

  // The line-level options a partner chose live on the parent order,
  // so they are pulled across — a supplier delivering "Cocktail /
  // Round / 90cm" needs the configuration, not just the product name.
  const { data: parentItems } = await client
    .from('order_items')
    .select('product_id, options, answers')
    .eq('order_id', so.order_id);

  const spec = new Map(
    (parentItems ?? []).map((i) => [i.product_id, { options: i.options, answers: i.answers }]),
  );

  return {
    event_type: eventType,
    sent_at: new Date().toISOString(),
    supplier_order: {
      id: so.id,
      reference: so.reference,
      status: so.status,
      approval_mode: so.approval_mode,
      submitted_at: so.submitted_at,
      confirmed_at: so.confirmed_at,
      order_reference: order?.reference ?? null,
      partner,
      items: (items ?? []).map((i) => ({
        product_id: i.product_id,
        name: i.name,
        qty: i.qty,
        unit_price: i.unit_price,
        options: spec.get(i.product_id)?.options ?? {},
        answers: spec.get(i.product_id)?.answers ?? {},
      })),
    },
  };
}

/* ---------------------------------------------------------------
   Delivery
   --------------------------------------------------------------- */

/**
 * Send one queued webhook event and record what happened.
 *
 * Never throws: a supplier's endpoint being down is an ordinary
 * outcome, not an error in the order it describes. The failure is
 * written to the log and the caller carries on.
 */
export async function deliver(webhookEventId: Id): Promise<DeliveryResult> {
  const client = requireSupabase();

  const { data: evt } = await client
    .from('webhook_events')
    .select('id, event_type, supplier_order_id, supplier_id, idempotency_key, retry_count')
    .eq('id', webhookEventId)
    .single();

  if (!evt) return { ok: false, status: 0, body: 'Webhook event not found.' };

  const { data: supplier } = await client
    .from('suppliers')
    .select('webhook_url, webhook_secret, routing_key, name')
    .eq('id', evt.supplier_id)
    .single();

  if (!supplier?.webhook_url) {
    return await record(evt.id, evt.retry_count, {
      ok: false,
      status: 0,
      body: `${supplier?.name ?? 'This supplier'} has no webhook URL configured.`,
    });
  }

  const payload = await buildPayload(
    evt.supplier_order_id,
    evt.event_type as WebhookEventType,
  );
  if (!payload) {
    return await record(evt.id, evt.retry_count, {
      ok: false,
      status: 0,
      body: 'The supplier order this event refers to no longer exists.',
    });
  }

  if (supplier.routing_key) payload.routing_key = supplier.routing_key;

  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = supplier.webhook_secret
    ? `sha256=${sign(supplier.webhook_secret, timestamp, body)}`
    : '';

  let result: DeliveryResult;
  try {
    const response = await fetch(supplier.webhook_url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'BOARD-Partner-Portal/1.0',
        'x-board-event': String(evt.event_type),
        'x-board-timestamp': timestamp,
        'x-board-idempotency-key': evt.idempotency_key,
        ...(signature ? { 'x-board-signature': signature } : {}),
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = await response.text().catch(() => '');
    result = {
      ok: response.ok,
      status: response.status,
      body: text.slice(0, MAX_BODY),
    };
  } catch (e) {
    // A timeout or DNS failure has no status code. Zero distinguishes
    // "never reached them" from "they answered with an error".
    result = {
      ok: false,
      status: 0,
      body: (e instanceof Error ? e.message : 'Delivery failed.').slice(0, MAX_BODY),
    };
  }

  // The exact bytes that were signed, kept so a supplier disputing a
  // signature can be checked against what actually went out.
  await client
    .from('webhook_events')
    .update({ payload, signature })
    .eq('id', evt.id);

  return await record(evt.id, evt.retry_count, result);
}

/** Write the attempt and move the event to its resulting state. */
async function record(
  webhookEventId: Id,
  retryCount: number,
  result: DeliveryResult,
): Promise<DeliveryResult> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  await client.from('webhook_delivery_attempts').insert({
    id: `wa_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    webhook_event_id: webhookEventId,
    attempted_at: now,
    response_code: result.status || null,
    response_body: result.body,
    ok: result.ok,
  });

  await client
    .from('webhook_events')
    .update({
      status: result.ok ? 'delivered' : 'failed',
      // Counts deliveries beyond the first, so a first-time success
      // reads as zero retries rather than one.
      retry_count: retryCount + 1,
      sent_at: now,
    })
    .eq('id', webhookEventId);

  return result;
}

/**
 * Deliver everything still owed for one supplier order.
 *
 * Called after a status change. Runs sequentially: these are few,
 * and a supplier receiving `confirmed` before `quote_requested`
 * would be confusing.
 */
export async function deliverPendingFor(supplierOrderId: Id): Promise<void> {
  const client = requireSupabase();

  const { data: pending } = await client
    .from('webhook_events')
    .select('id')
    .eq('supplier_order_id', supplierOrderId)
    .eq('status', 'pending')
    .order('created_at');

  for (const evt of pending ?? []) {
    await deliver(evt.id);
  }
}
