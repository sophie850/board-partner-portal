'use server';

import { revalidatePath } from 'next/cache';

import { CURRENCIES } from '@/data/seed';
import { requireSupabase } from '@/lib/db/client';
import { getDb, mintId } from '@/lib/db/store';
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
