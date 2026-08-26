'use server';

import { getSession, guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb, mintId } from '@/lib/db/store';
import type { Refusal } from '@/lib/auth/session';
import type { Id, PartnerPermissions } from '@/lib/types';

/* ============================================================
   The partner's own team

   The Lead decides who else from their organisation can see and do
   what. Nothing here touches other partners — every write is scoped
   to this organisation, checked against the database rather than
   against whatever id the browser sent.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

const MODULES: Array<keyof PartnerPermissions> = [
  'tasks',
  'forms',
  'requests',
  'shop',
  'orders',
  'profile',
  'team',
];

/** Nothing granted — what a newly invited colleague starts with. */
function noPermissions(): PartnerPermissions {
  return {
    tasks: false,
    forms: false,
    requests: false,
    shop: false,
    orders: false,
    profile: false,
    team: false,
  };
}

/**
 * Changing the team is the Lead's alone.
 *
 * The `team` permission lets a colleague *see* who is on the team;
 * granting access, handing over the lead role and removing people
 * stay with the Lead, or with the BOARD team acting for them.
 * Otherwise anyone given sight of the page could grant themselves
 * everything else.
 */
async function requireLead(partnerId: Id): Promise<Refusal | null> {
  const session = await getSession();

  // No sign-in configured, or an organiser acting for the partner.
  if (!session || session.kind === 'organiser') return null;

  if (session.partnerId !== partnerId || session.user.role !== 'lead') {
    return { ok: false, error: 'Only the Partner Lead can change who has access.' };
  }

  return null;
}

/** Confirm a user belongs to this partner before touching them. */
async function belongsToPartner(userId: Id, partnerId: Id): Promise<boolean> {
  const { data } = await requireSupabase()
    .from('partner_users')
    .select('partner_id')
    .eq('id', userId)
    .single();

  return data?.partner_id === partnerId;
}

export async function inviteColleague(
  partnerId: Id,
  name: string,
  email: string,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'team');
  if (refused) return refused;

  const notLead = await requireLead(partnerId);
  if (notLead) return notLead;

  if (!name.trim()) return { ok: false, error: 'Enter their name.' };
  if (!email.trim() || !email.includes('@')) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  try {
    const client = requireSupabase();

    // Email is unique across the whole table, so a clash is more
    // usefully explained than surfaced as a constraint violation.
    const { data: existing } = await client
      .from('partner_users')
      .select('id, partner_id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error:
          existing.partner_id === partnerId
            ? 'They are already on your team.'
            : 'That email address is already in use.',
      };
    }

    const { error } = await client.from('partner_users').insert({
      id: mintId('pu'),
      partner_id: partnerId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      telephone: '',
      role: 'user',
      permissions: noPermissions(),
      invited_at: new Date().toISOString(),
      // Not accepted until they sign in. Magic-link sign-in is not
      // built yet, so nothing is emailed — the record is honest
      // about that rather than claiming an invitation was sent.
      accepted_at: null,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}/team`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not add them.' };
  }
}

export async function setPermission(
  partnerId: Id,
  userId: Id,
  module: keyof PartnerPermissions,
  granted: boolean,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'team');
  if (refused) return refused;

  const notLead = await requireLead(partnerId);
  if (notLead) return notLead;

  if (!MODULES.includes(module)) return { ok: false, error: 'Unknown area.' };

  try {
    if (!(await belongsToPartner(userId, partnerId))) {
      return { ok: false, error: 'That person is not on your team.' };
    }

    const db = await getDb();
    const user = db.partnerUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'That person is not on your team.' };

    if (user.role === 'lead') {
      return { ok: false, error: 'The Lead always has full access.' };
    }

    const current =
      user.permissions === 'all' ? noPermissions() : { ...user.permissions };
    current[module] = granted;

    const { error } = await requireSupabase()
      .from('partner_users')
      .update({ permissions: current })
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}/team`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

/**
 * Hand the Lead role over.
 *
 * There is exactly one Lead: the outgoing one becomes an ordinary
 * user with full permissions, so nobody loses access by being
 * replaced.
 */
export async function makeLead(partnerId: Id, userId: Id): Promise<Result> {
  const refused = await guardPartner(partnerId, 'team');
  if (refused) return refused;

  const notLead = await requireLead(partnerId);
  if (notLead) return notLead;

  try {
    if (!(await belongsToPartner(userId, partnerId))) {
      return { ok: false, error: 'That person is not on your team.' };
    }

    const db = await getDb();
    const part = db.participations.find((p) => p.partnerId === partnerId);
    const client = requireSupabase();

    const previous = db.partnerUsers.find(
      (u) => u.partnerId === partnerId && u.role === 'lead',
    );

    if (previous && previous.id !== userId) {
      await client
        .from('partner_users')
        .update({
          role: 'user',
          permissions: {
            tasks: true,
            forms: true,
            requests: true,
            shop: true,
            orders: true,
            profile: true,
            team: true,
          },
        })
        .eq('id', previous.id);
    }

    const { error } = await client
      .from('partner_users')
      .update({ role: 'lead', permissions: 'all' })
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    // The participation points at its Lead, so it moves too.
    if (part) {
      await client
        .from('event_participations')
        .update({ lead_user_id: userId })
        .eq('id', part.id);
    }

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/partners');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not change the Lead.' };
  }
}

export async function removeColleague(partnerId: Id, userId: Id): Promise<Result> {
  const refused = await guardPartner(partnerId, 'team');
  if (refused) return refused;

  const notLead = await requireLead(partnerId);
  if (notLead) return notLead;

  try {
    if (!(await belongsToPartner(userId, partnerId))) {
      return { ok: false, error: 'That person is not on your team.' };
    }

    const db = await getDb();
    const user = db.partnerUsers.find((u) => u.id === userId);

    if (user?.role === 'lead') {
      // Removing the Lead would leave the organisation with nobody
      // able to grant access back.
      return {
        ok: false,
        error: 'Make somebody else the Lead before removing this person.',
      };
    }

    const { error } = await requireSupabase()
      .from('partner_users')
      .delete()
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}/team`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove them.' };
  }
}
