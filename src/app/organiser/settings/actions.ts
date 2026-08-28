'use server';

import { getSession, guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { CURRENCIES } from '@/data/seed';
import { requireSupabase } from '@/lib/db/client';
import { getDb, mintId } from '@/lib/db/store';
import { runReminders } from '@/lib/reminders';
import { storageKeyFrom } from '@/lib/storage';
import type { EventSender, Id, OrganiserPermissions, Terminology } from '@/lib/types';

/* ============================================================
   Event settings

   Terminology is the reason most of this exists: an organiser who
   calls their partners "Sponsors" should see that word everywhere,
   without anybody editing code. It is stored on the event and read
   through `terms()`, which defaults every key — so a partial object
   here cannot take a page down.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

const PROFILE_FIELDS = {
  name: 'name',
  shortName: 'short_name',
  venue: 'venue',
  city: 'city',
  startDate: 'start_date',
  endDate: 'end_date',
  timezone: 'timezone',
  tagline: 'tagline',
} as const;

export async function saveEventProfile(
  patch: Partial<Record<keyof typeof PROFILE_FIELDS, string>>,
): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const db = await getDb();
    const row: Record<string, string | null> = {};

    for (const [key, column] of Object.entries(PROFILE_FIELDS)) {
      const value = patch[key as keyof typeof PROFILE_FIELDS];
      if (value === undefined) continue;
      // Dates are a real column type; an empty string is not a date,
      // and Postgres would reject it rather than read it as "unset".
      row[column] =
        (key === 'startDate' || key === 'endDate') && !value.trim() ? null : value;
    }

    if (!Object.keys(row).length) return { ok: true };

    const { error } = await requireSupabase()
      .from('events')
      .update(row)
      .eq('id', db.event.id);

    if (error) return { ok: false, error: error.message };

    // Terminology and the event name appear in the shell on every
    // page, so the whole app is revalidated rather than one route.
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function saveCurrency(code: string): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  const currency = CURRENCIES.find((c) => c.code === code);
  if (!currency) return { ok: false, error: 'Unknown currency.' };

  try {
    const db = await getDb();
    const { error } = await requireSupabase()
      .from('events')
      // The symbol travels with the code: they are never chosen
      // separately, and letting them drift apart would put "£" in
      // front of euro figures.
      .update({ currency: currency.code, currency_symbol: currency.symbol })
      .eq('id', db.event.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function saveTerminology(patch: Partial<Terminology>): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const db = await getDb();
    const merged = { ...(db.event.terminology ?? {}), ...patch };

    const { error } = await requireSupabase()
      .from('events')
      .update({ terminology: merged })
      .eq('id', db.event.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function saveSender(patch: Partial<EventSender>): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  if (patch.logo && !storageKeyFrom(patch.logo)) {
    return { ok: false, error: 'That logo was not stored correctly. Upload it again.' };
  }

  try {
    const db = await getDb();
    const merged = { ...(db.event.sender ?? {}), ...patch };

    const { error } = await requireSupabase()
      .from('events')
      .update({ sender: merged })
      .eq('id', db.event.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

/* ---------------------------------------------------------------
   Email templates
   --------------------------------------------------------------- */

export async function saveEmailTemplate(
  id: Id,
  patch: { name?: string; subject?: string; body?: string; enabled?: boolean },
): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const row: Record<string, string | boolean> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.subject !== undefined) row.subject = patch.subject;
    if (patch.body !== undefined) row.body = patch.body;
    if (patch.enabled !== undefined) row.enabled = patch.enabled;

    if (!Object.keys(row).length) return { ok: true };

    const { error } = await requireSupabase()
      .from('email_templates')
      .update(row)
      .eq('id', id);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

export async function createEmailTemplate(name: string): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  if (!name.trim()) return { ok: false, error: 'Give the template a name.' };

  try {
    const db = await getDb();
    const { error } = await requireSupabase().from('email_templates').insert({
      id: mintId('em'),
      event_id: db.event.id,
      name: name.trim(),
      subject: '',
      body: '',
      // Off until somebody has written it — an enabled empty
      // template would send blank emails.
      enabled: false,
      category: 'reminder',
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create it.' };
  }
}

export async function deleteEmailTemplate(id: Id): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase().from('email_templates').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete it.' };
  }
}

/* ---------------------------------------------------------------
   The BOARD team
   --------------------------------------------------------------- */

export async function setOrganiserPermission(
  userId: Id,
  area: keyof OrganiserPermissions,
  granted: boolean,
): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const db = await getDb();
    const user = db.organiserUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'That person is not on the team.' };

    if (user.role === 'super_admin') {
      return { ok: false, error: 'A super admin always has access to everything.' };
    }

    const permissions = { ...(user.permissions ?? {}), [area]: granted };

    const { error } = await requireSupabase()
      .from('organiser_users')
      .update({ permissions })
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

/* ---------------------------------------------------------------
   Adding somebody to the BOARD team
   --------------------------------------------------------------- */

/**
 * Create a BOARD account.
 *
 * Reaching Event settings at all now means being a super admin —
 * see SUPER_ADMIN_ONLY in permissions.ts — so the guard below is
 * the real control, and a team member cannot get this far.
 *
 * The role check that follows is therefore redundant today, and
 * kept deliberately. The two rules are independent: this one says
 * who may mint a super admin, and it must go on holding if the area
 * rule is ever relaxed. Without it, whoever could reach this page
 * could make themselves a super admin at their own address and sign
 * in as it.
 *
 * New accounts start with no permissions at all. Granting them is a
 * separate, deliberate act, and least privilege is the right
 * default for an account that may have been created in a hurry.
 */
export async function createOrganiserUser(input: {
  name: string;
  title: string;
  email: string;
  role: 'super_admin' | 'team';
}): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name) return { ok: false, error: 'Give them a name.' };
  if (!email) return { ok: false, error: 'An email address is how they sign in.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: `“${email}” does not look like an email address.` };
  }

  try {
    const db = await getDb();

    if (input.role === 'super_admin') {
      const session = await getSession();
      if (session?.kind !== 'organiser' || session.user.role !== 'super_admin') {
        return { ok: false, error: 'Only a super admin can create another super admin.' };
      }
    }

    /*
     * The column is unique, so the database would refuse this anyway
     * — but with a constraint-violation message. Checking first is
     * what turns that into a sentence worth reading, and it catches
     * a partner user on the same address too, which the database
     * has no reason to mind but sign-in very much does:
     * `findRecipient` resolves organisers first, so the partner
     * would quietly lose access to their own portal.
     */
    if (db.organiserUsers.some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: `${email} is already on the BOARD team.` };
    }
    if (db.partnerUsers.some((u) => u.email.toLowerCase() === email)) {
      return {
        ok: false,
        error: `${email} belongs to a partner contact. One address cannot be both.`,
      };
    }

    const { error } = await requireSupabase().from('organiser_users').insert({
      id: mintId('ou'),
      name,
      title: input.title.trim(),
      email,
      role: input.role,
      // Least privilege: nothing until somebody ticks it.
      permissions: input.role === 'super_admin' ? null : {},
      created_at: new Date().toISOString(),
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not create the account.',
    };
  }
}

/**
 * Remove a BOARD account.
 *
 * Super admins only, and never the last one — an event with nobody
 * who can reach Event settings is unrecoverable from inside the
 * app. Removing yourself is allowed but confirmed in the UI, since
 * there are legitimate reasons to and no way to undo it here.
 */
export async function removeOrganiserUser(userId: Id): Promise<Result> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const session = await getSession();
    if (session?.kind !== 'organiser' || session.user.role !== 'super_admin') {
      return { ok: false, error: 'Only a super admin can remove a BOARD account.' };
    }

    const db = await getDb();
    const user = db.organiserUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'That account no longer exists.' };

    if (user.role === 'super_admin') {
      const supers = db.organiserUsers.filter((u) => u.role === 'super_admin').length;
      if (supers <= 1) {
        return {
          ok: false,
          error:
            'This is the only super admin. Removing it would leave nobody able to reach ' +
            'Event settings. Create another one first.',
        };
      }
    }

    const { error } = await requireSupabase()
      .from('organiser_users')
      .delete()
      .eq('id', userId);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not remove the account.' };
  }
}

/* ---------------------------------------------------------------
   Running the reminders by hand
   --------------------------------------------------------------- */

export type ReminderResult =
  | { ok: true; summary: string; notes: string[] }
  | { ok: false; error: string };

/**
 * Do now what the schedule does at 08:00.
 *
 * Not a test mode — it is the same code, sending the same real
 * email. It is safe to press because of the dedupe claim: anything
 * already sent is already claimed, so a curious second press sends
 * nothing and says so.
 *
 * Calls the runner directly rather than the cron route. The route
 * exists because a scheduler holds no cookie; an organiser already
 * signed in and past the Settings guard does not need to prove
 * themselves twice with a shared secret.
 */
export async function runRemindersNow(): Promise<ReminderResult> {
  const refused = await guardOrganiser('settings');
  if (refused) return refused;

  try {
    const run = await runReminders();

    const parts = [
      `${run.scanned} ${run.scanned === 1 ? 'deadline' : 'deadlines'} checked`,
      `${run.sent} sent`,
    ];
    if (run.duplicate) parts.push(`${run.duplicate} already sent`);
    if (run.skipped) parts.push(`${run.skipped} skipped`);
    if (run.failed) parts.push(`${run.failed} failed`);

    return { ok: true, summary: `${parts.join(', ')}.`, notes: run.notes };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'The reminder run could not be completed.',
    };
  }
}
