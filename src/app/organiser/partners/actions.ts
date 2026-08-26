'use server';

import { actorName, guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { inventoryToRow, requestedFileToRow } from '@/lib/db/mappers';
import { getDb, mintId } from '@/lib/db/store';
import { nextReference } from '@/lib/resolvers';
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

/* ---------------------------------------------------------------
   Adding a partner
   --------------------------------------------------------------- */

export type CreateResult =
  | { ok: true; partnerId: Id; reference: string }
  | { ok: false; error: string };

export interface NewPartnerInput {
  name: string;
  sector: string;
  country: string;
  leadName: string;
  leadEmail: string;
}

/**
 * Add a partner to this event.
 *
 * "A partner" is three rows, not one:
 *
 *   * the **organisation**, which is event-independent — the same
 *     company coming back for 2028 should be the same record;
 *   * a **participation**, which is what puts them in this event and
 *     carries everything configurable about them;
 *   * a **Partner Lead**, because a participation with nobody able
 *     to sign in is one the partner cannot reach.
 *
 * Created in that order, since each references the one before.
 *
 * supabase-js has no transaction across statements, so a failure
 * part-way is undone by hand below. Without that, a half-created
 * partner leaves an organisation row that the Partners list — which
 * is driven by participations — would never show, and which nothing
 * in the interface could then reach or remove.
 */
export async function createPartner(input: NewPartnerInput): Promise<CreateResult> {
  const refused = await guardOrganiser('partners');
  if (refused) return refused;

  const name = input.name.trim();
  const sector = input.sector.trim();
  const country = input.country.trim();
  const leadName = input.leadName.trim();
  const leadEmail = input.leadEmail.trim().toLowerCase();

  if (!name) return { ok: false, error: 'Enter the organisation’s name.' };
  if (!leadName) return { ok: false, error: 'Enter the name of their main contact.' };
  if (!leadEmail || !leadEmail.includes('@')) {
    return { ok: false, error: 'Enter a valid email address for their main contact.' };
  }

  /*
   * Everything below is inside the try. Building the client and
   * loading the event can both fail — a missing key after a bad
   * deploy, a database briefly unreachable — and that has to come
   * back as a message the organiser can read rather than an
   * unhandled rejection that renders a stack trace.
   */
  try {
    const client = requireSupabase();
    const db = await getDb();

    /*
     * Reuse an organisation that already exists rather than creating
     * a second one with the same name — they may have taken part in
     * a previous event, and partner_organisations is not scoped to
     * one. Matching on name is loose, but it is what an organiser
     * has to hand, and the alternative is silent duplicates.
     */
    const existingOrg = db.partners.find(
      (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (existingOrg && db.participations.some((p) => p.partnerId === existingOrg.id)) {
      return {
        ok: false,
        error: `${existingOrg.name} is already taking part in this event.`,
      };
    }

    // Checked before writing anything, so the common mistake does not
    // cost a rollback. The unique constraint is still the real guard.
    if (db.partnerUsers.some((u) => u.email.toLowerCase() === leadEmail)) {
      return {
        ok: false,
        error: 'That email address already belongs to somebody on another partner’s team.',
      };
    }

    const partnerId = existingOrg?.id ?? mintId('part');
    const leadId = mintId('pu');
    const createdOrg = !existingOrg;

    /* ---- 1. the organisation ---- */

    if (createdOrg) {
      const { error } = await client.from('partner_organisations').insert({
        id: partnerId,
        name,
        sector,
        country,
        billing: {},
        logo: '',
      });
      if (error) return { ok: false, error: error.message };
    } else {
      /*
       * Reusing a record from a previous event. Anything the
       * organiser typed would otherwise be silently discarded, so
       * fill in what is blank — without overwriting details somebody
       * has already curated.
       */
      const patch: Record<string, string> = {};
      if (sector && !existingOrg.sector) patch.sector = sector;
      if (country && !existingOrg.country) patch.country = country;

      if (Object.keys(patch).length) {
        await client.from('partner_organisations').update(patch).eq('id', partnerId);
      }
    }

    /* ---- 2. the Partner Lead ---- */

    const { error: userError } = await client.from('partner_users').insert({
      id: leadId,
      partner_id: partnerId,
      name: leadName,
      email: leadEmail,
      telephone: '',
      role: 'lead',
      permissions: 'all',
      invited_at: new Date().toISOString(),
      // Not accepted until they actually sign in.
      accepted_at: null,
    });

    if (userError) {
      if (createdOrg) {
        await client.from('partner_organisations').delete().eq('id', partnerId);
      }
      return {
        ok: false,
        error: userError.message.includes('duplicate')
          ? 'That email address is already in use.'
          : userError.message,
      };
    }

    /* ---- 3. the participation ---- */

    const reference = nextReference(db.participations.map((p) => p.reference));

    const { error: partError } = await client.from('event_participations').insert({
      id: mintId('ep'),
      event_id: db.event.id,
      partner_id: partnerId,
      reference,
      stand_ref: null,
      // Everything else is configured next. A partner starts with no
      // entitlements, which means they see what applies to everybody
      // and nothing gated — the safe default.
      added_entitlements: [],
      removed_entitlements: [],
      module_overrides: {},
      form_due_dates: {},
      task_due_dates: {},
      task_state: {},
      form_state: {},
      partner_notes: '',
      internal_notes: '',
      lead_user_id: leadId,
      pass_allocation: 0,
      marketing: {},
      suspended: false,
    });

    if (partError) {
      await client.from('partner_users').delete().eq('id', leadId);
      if (createdOrg) {
        await client.from('partner_organisations').delete().eq('id', partnerId);
      }
      return { ok: false, error: partError.message };
    }

    await client.from('audit_log').insert({
      id: mintId('a'),
      event_id: db.event.id,
      partner_id: partnerId,
      actor: await actorName(),
      body: `${name} added to the event as ${reference}, with ${leadName} as Partner Lead.`,
      created_at: new Date().toISOString(),
    });

    revalidatePath('/organiser/partners');
    revalidatePath('/organiser');

    return { ok: true, partnerId, reference };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not add the partner.',
    };
  }
}
