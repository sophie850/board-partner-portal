'use server';

import { guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { inventoryToRow, requestedFileToRow } from '@/lib/db/mappers';
import { mintId } from '@/lib/db/store';
import type { BillingDetails, Id, InventoryItem, RequestedFile } from '@/lib/types';

/* ============================================================
   Partner configuration — write operations

   Configuration spans three tables (the organisation, the
   participation, and its child collections), so the save is split by
   concern rather than one giant write: a failure in one section
   leaves the others intact and reports where it happened.
   ============================================================ */

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidatePartner(partnerId: Id) {
  revalidatePath(`/organiser/partners/${partnerId}`, 'layout');
  revalidatePath('/organiser/partners');
  revalidatePath('/organiser');
  revalidatePath(`/portal/${partnerId}`, 'layout');
}

/* ---------------------------------------------------------------
   Company details
   --------------------------------------------------------------- */

export async function savePartnerDetails(
  partnerId: Id,
  input: { name: string; sector: string; billing: BillingDetails },
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  if (!input.name.trim()) return { ok: false, error: 'The organisation needs a name.' };

  try {
    const { error } = await requireSupabase()
      .from('partner_organisations')
      .update({
        name: input.name.trim(),
        sector: input.sector.trim(),
        billing: input.billing,
      })
      .eq('id', partnerId);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the details.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/* ---------------------------------------------------------------
   Participation: entitlements, deadlines, notes
   --------------------------------------------------------------- */

export async function saveParticipation(
  partnerId: Id,
  participationId: Id,
  input: {
    addedEntitlements: string[];
    formDueDates: Record<string, string>;
    taskDueDates: Record<string, string>;
    partnerNotes: string;
    internalNotes: string;
    passAllocation: number;
    standRef: string | null;
  },
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase()
      .from('event_participations')
      .update({
        added_entitlements: input.addedEntitlements,
        // Entitlements are toggled directly, so nothing is ever in
        // the "removed" list — it exists for the package-template
        // model the design dropped, and is kept for migration only.
        removed_entitlements: [],
        // Blank dates are dropped rather than stored as empty
        // strings, so "no override" stays a real absence and the
        // resolver falls through to the event default.
        form_due_dates: stripEmpty(input.formDueDates),
        task_due_dates: stripEmpty(input.taskDueDates),
        partner_notes: input.partnerNotes,
        internal_notes: input.internalNotes,
        pass_allocation: input.passAllocation,
        stand_ref: input.standRef || null,
      })
      .eq('id', participationId);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save the configuration.',
    };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

function stripEmpty(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  Object.entries(map).forEach(([k, v]) => {
    if (v && v.trim()) out[k] = v;
  });
  return out;
}

/* ---------------------------------------------------------------
   Package
   --------------------------------------------------------------- */

export async function saveInventory(
  partnerId: Id,
  participationId: Id,
  items: InventoryItem[],
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  const named = items.filter((i) => i.name.trim() || i.passType);
  if (named.length !== items.length) {
    return { ok: false, error: 'Every package item needs a name before saving.' };
  }

  try {
    const client = requireSupabase();

    const rows = items.map((item, i) =>
      inventoryToRow({ ...item, id: item.id || mintId('inv') }, participationId, i),
    );

    // Upsert first, then prune what is gone — so a failure part way
    // leaves a stale row rather than an empty package.
    if (rows.length) {
      const { error } = await client
        .from('partner_inventory')
        .upsert(rows, { onConflict: 'id' });
      if (error) return { ok: false, error: error.message };
    }

    const keep = rows.map((r) => r.id as string);
    let removal = client
      .from('partner_inventory')
      .delete()
      .eq('participation_id', participationId);
    if (keep.length) {
      removal = removal.not('id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);
    }
    const { error: deleteError } = await removal;
    if (deleteError) return { ok: false, error: deleteError.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the package.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/* ---------------------------------------------------------------
   Requested files — what the organiser needs FROM the partner
   --------------------------------------------------------------- */

export async function saveRequestedFiles(
  partnerId: Id,
  participationId: Id,
  files: RequestedFile[],
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  if (files.some((f) => !f.label.trim())) {
    return { ok: false, error: 'Every requested file needs a label.' };
  }

  try {
    const client = requireSupabase();

    const rows = files.map((file, i) =>
      requestedFileToRow({ ...file, id: file.id || mintId('rf') }, participationId, i),
    );

    if (rows.length) {
      const { error } = await client
        .from('partner_requested_files')
        .upsert(rows, { onConflict: 'id' });
      if (error) return { ok: false, error: error.message };
    }

    const keep = rows.map((r) => r.id as string);
    let removal = client
      .from('partner_requested_files')
      .delete()
      .eq('participation_id', participationId);
    if (keep.length) {
      removal = removal.not('id', 'in', `(${keep.map((k) => `"${k}"`).join(',')})`);
    }
    const { error: deleteError } = await removal;
    if (deleteError) return { ok: false, error: deleteError.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the files.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/* ---------------------------------------------------------------
   Signed agreement
   --------------------------------------------------------------- */

export async function saveContract(
  partnerId: Id,
  participationId: Id,
  contract: { name: string; url: string } | null,
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase()
      .from('event_participations')
      .update({
        contract_name: contract?.name ?? null,
        contract_url: contract?.url ?? null,
      })
      .eq('id', participationId);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the contract.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/* ---------------------------------------------------------------
   Partner lead
   --------------------------------------------------------------- */

export async function saveLead(
  partnerId: Id,
  leadUserId: Id | null,
  input: { name: string; email: string; telephone: string },
): Promise<ActionResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) return { ok: false, error: 'The contact needs a name.' };
  if (!email || !email.includes('@')) return { ok: false, error: 'That email does not look right.' };

  try {
    const client = requireSupabase();

    if (leadUserId) {
      const { error } = await client
        .from('partner_users')
        .update({ name: input.name.trim(), email, telephone: input.telephone.trim() })
        .eq('id', leadUserId);
      if (error) return { ok: false, error: error.message };
    } else {
      const id = mintId('u');
      const { error } = await client.from('partner_users').insert({
        id,
        partner_id: partnerId,
        name: input.name.trim(),
        email,
        telephone: input.telephone.trim(),
        role: 'lead',
        permissions: 'all',
      });
      if (error) return { ok: false, error: error.message };

      const { error: linkError } = await client
        .from('event_participations')
        .update({ lead_user_id: id })
        .eq('partner_id', partnerId);
      if (linkError) return { ok: false, error: linkError.message };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the contact.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}
