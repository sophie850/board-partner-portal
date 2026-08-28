'use server';

import { guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb } from '@/lib/db/store';
import { storageKeyFrom } from '@/lib/storage';
import type { Id, MarketingSettings } from '@/lib/types';

/* ============================================================
   Marketing settings

   Stored on the participation, because the same organisation
   promoting a different event says something different. Everything
   here is the partner's own choice — the BOARD lockup, dates and
   tagline are fixed in the graphic and are not settings.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

/** Only these keys are written. Anything else the client sends is dropped. */
const ALLOWED = [
  'format',
  'bg',
  'eyebrow',
  'headline',
  'sub',
  'detail',
  'caption',
  'logoOverride',
] as const;

export async function saveMarketing(
  partnerId: Id,
  patch: Partial<MarketingSettings>,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'promote');
  if (refused) return refused;

  try {
    const db = await getDb();
    const part = db.participations.find((p) => p.partnerId === partnerId);
    if (!part) return { ok: false, error: 'That participation no longer exists.' };

    const clean: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (!(key in patch)) continue;
      const value = patch[key];

      if (key === 'logoOverride') {
        // A logo is a stored file, not an arbitrary URL. An empty
        // string is meaningful — it means "no logo at all", as
        // distinct from "use the company logo", which is the key
        // being absent.
        if (value !== '' && !storageKeyFrom(String(value))) {
          return { ok: false, error: 'That logo was not stored correctly. Upload it again.' };
        }
      }

      clean[key] = typeof value === 'string' ? value.slice(0, 4000) : value;
    }

    const merged = { ...(part.marketing ?? {}), ...clean };

    const { error } = await requireSupabase()
      .from('event_participations')
      .update({ marketing: merged })
      .eq('id', part.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}/promote`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}

/**
 * Go back to the company logo.
 *
 * Removing the key entirely is what means "use the company logo" —
 * setting it to empty would mean "no logo", which is a different
 * thing the partner can also choose.
 */
export async function revertToCompanyLogo(partnerId: Id): Promise<Result> {
  const refused = await guardPartner(partnerId, 'promote');
  if (refused) return refused;

  try {
    const db = await getDb();
    const part = db.participations.find((p) => p.partnerId === partnerId);
    if (!part) return { ok: false, error: 'That participation no longer exists.' };

    const marketing = { ...(part.marketing ?? {}) };
    delete marketing.logoOverride;

    const { error } = await requireSupabase()
      .from('event_participations')
      .update({ marketing })
      .eq('id', part.id);

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}/promote`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }
}
