'use server';

import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { mintId } from '@/lib/db/store';
import type { ApprovalMode, Id } from '@/lib/types';

/* ============================================================
   Suppliers — write operations

   The webhook secret is write-only. It is never read back out to a
   client: the editor can set a new one or leave it alone, but it
   cannot display the current value. See the page component for the
   read side.
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface SupplierInput {
  id?: Id;
  name: string;
  category: string;
  contact: string;
  notifEmails: string[];
  webhookUrl: string;
  routingKey: string;
  /** Only when the organiser is deliberately replacing it. */
  newWebhookSecret?: string;
  active: boolean;
  approvalDefault: ApprovalMode;
  notes: string;
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateSuppliers() {
  revalidatePath('/organiser/suppliers');
  revalidatePath('/organiser/products');
  revalidatePath('/organiser/orders');
}

export async function saveSupplier(input: SupplierInput): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Give the supplier a name.' };

  const bad = input.notifEmails.find((e) => e && !e.includes('@'));
  if (bad) return { ok: false, error: `"${bad}" does not look like an email address.` };

  if (input.webhookUrl.trim() && !/^https:\/\//i.test(input.webhookUrl.trim())) {
    // Orders carry commercial detail; plain HTTP would put it on the
    // wire in clear.
    return { ok: false, error: 'The webhook URL must be https://.' };
  }

  const id = input.id ?? mintId('sup');

  const row: Record<string, unknown> = {
    id,
    event_id: EVENT_ID,
    name: input.name.trim(),
    category: input.category.trim(),
    contact: input.contact.trim(),
    notif_emails: input.notifEmails.filter(Boolean),
    webhook_url: input.webhookUrl.trim(),
    routing_key: input.routingKey.trim(),
    active: input.active,
    approval_default: input.approvalDefault,
    notes: input.notes.trim(),
  };

  // Only written when deliberately replaced, so saving other fields
  // never blanks the secret by omission.
  if (input.newWebhookSecret?.trim()) {
    row.webhook_secret = input.newWebhookSecret.trim();
  } else if (!input.id) {
    row.webhook_secret = '';
  }

  try {
    const { error } = await requireSupabase()
      .from('suppliers')
      .upsert(row, { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the supplier.' };
  }

  revalidateSuppliers();
  return { ok: true, id };
}

/** Generate a secret server-side so it is never weaker than intended. */
export async function rotateWebhookSecret(id: Id): Promise<
  { ok: true; secret: string } | { ok: false; error: string }
> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const secret =
    'whsec_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

  try {
    const { error } = await requireSupabase()
      .from('suppliers')
      .update({ webhook_secret: secret })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not rotate the secret.' };
  }

  revalidateSuppliers();
  // Returned once, so it can be copied into the supplier's system.
  // It is never readable again from the portal.
  return { ok: true, secret };
}

/**
 * Suppliers are referenced by products and orders, so deletion would
 * orphan records that must stay auditable. Deactivating hides them
 * from the shop while keeping the history intact.
 */
export async function setSupplierActive(id: Id, active: boolean): Promise<ActionResult> {
  try {
    const { error } = await requireSupabase()
      .from('suppliers')
      .update({ active })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update the supplier.' };
  }

  revalidateSuppliers();
  return { ok: true, id };
}
