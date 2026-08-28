'use server';

import { actorName, guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb } from '@/lib/db/store';
import { storageKeyFrom } from '@/lib/storage';
import {
  allRequestedFilesIn,
  completeLinkedTasks,
  reopenLinkedTasks,
} from '@/lib/taskCompletion';
import type { Id } from '@/lib/types';

/* ============================================================
   Files a partner owes the organiser

   Each slot is created by the BOARD team ("Stand plan", "Insurance
   certificate"). The partner fills it; only the slots the organiser
   asked for exist, so there is no free-for-all upload area to sift
   through later.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

export async function attachRequestedFile(
  partnerId: Id,
  requestedFileId: Id,
  name: string,
  url: string,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'files');
  if (refused) return refused;

  const by = await actorName('Partner');

  // The URL must be one this app serves. Accepting an arbitrary URL
  // would let a partner point an organiser at anything at all.
  if (!storageKeyFrom(url)) {
    return { ok: false, error: 'That file was not stored correctly. Try uploading it again.' };
  }

  try {
    const { error } = await requireSupabase()
      .from('partner_requested_files')
      .update({
        file_name: name,
        file_url: url,
        uploaded_at: new Date().toISOString(),
        uploaded_by: by,
      })
      .eq('id', requestedFileId);

    if (error) return { ok: false, error: error.message };

    /*
     * Only once everything asked for has arrived. Completing on the
     * first file would clear the task while two more are outstanding
     * — and stop them being chased.
     *
     * Re-read rather than trusting the copy loaded before the write,
     * or the file just attached would not be counted.
     */
    const db = await getDb();
    const part = db.participations.find((p) => p.partnerId === partnerId);
    if (part && (await allRequestedFilesIn(part.id))) {
      await completeLinkedTasks(part.id, 'upload', by);
    }

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/partners');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not attach the file.' };
  }
}

/**
 * Clear a slot so a different file can be provided.
 *
 * The stored object is left in place: an organiser may already have
 * been sent the link, and orphaning a few files costs less than
 * breaking a reference somebody is relying on.
 */
export async function clearRequestedFile(
  partnerId: Id,
  requestedFileId: Id,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'files');
  if (refused) return refused;

  try {
    const db = await getDb();
    const part = db.participations.find((p) => p.partnerId === partnerId);

    const slot = part?.requestedFiles?.find((f) => f.id === requestedFileId);
    if (!slot) return { ok: false, error: 'That file request no longer exists.' };

    const { error } = await requireSupabase()
      .from('partner_requested_files')
      .update({ file_name: null, file_url: null, uploaded_at: null, uploaded_by: null })
      .eq('id', requestedFileId);

    if (error) return { ok: false, error: error.message };

    /*
     * Withdrawing a required file leaves the set incomplete again, so
     * the task goes back to outstanding. Otherwise a partner could
     * clear their insurance certificate and the portal would go on
     * saying they had provided everything.
     */
    if (part && slot.required && !(await allRequestedFilesIn(part.id))) {
      await reopenLinkedTasks(part.id, 'upload');
    }

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/partners');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not clear the file.' };
  }
}
