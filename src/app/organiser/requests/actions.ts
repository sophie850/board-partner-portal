'use server';

import { actorName, guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { mintId } from '@/lib/db/store';
import type { Id, RequestStatus } from '@/lib/types';

/* ============================================================
   The organiser's side of a request

   Statuses here are decisions a partner will read, so each one that
   asks something of the partner requires a message explaining what.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

/** Decisions that close the conversation. */
const FINAL = new Set<RequestStatus>(['approved', 'rejected', 'closed']);

/** Decisions the partner cannot be left to guess at. */
const NEEDS_MESSAGE = new Set<RequestStatus>(['more_info', 'rejected']);

export async function setRequestStatus(
  requestId: Id,
  status: RequestStatus,
  message: string,
): Promise<Result> {
  const refused = await guardOrganiser('requests');
  if (refused) return refused;

  // The name on the message comes from the session. A decision a
  // partner reads must be attributable to whoever actually made it.
  const actor = await actorName();

  if (NEEDS_MESSAGE.has(status) && !message.trim()) {
    return {
      ok: false,
      error:
        status === 'more_info'
          ? 'Say what you need from the partner — they see this message.'
          : 'Give a reason — the partner sees this message.',
    };
  }

  try {
    const client = requireSupabase();
    const now = new Date().toISOString();

    const { error } = await client
      .from('requests')
      .update({
        status,
        // Stamped once a decision is reached, so response time is
        // measurable. Moving a request back into review clears it.
        response_at: FINAL.has(status) ? now : null,
      })
      .eq('id', requestId);

    if (error) return { ok: false, error: error.message };

    if (message.trim()) {
      await client.from('request_comments').insert({
        id: mintId('rc'),
        request_id: requestId,
        author: actor,
        role: 'organiser',
        body: message.trim(),
        files: [],
        created_at: now,
      });
    }

    revalidatePath('/organiser/requests');
    revalidatePath('/organiser');
    revalidatePath('/portal', 'layout');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update the request.' };
  }
}

/** Hand a request to a different person on the BOARD team. */
export async function assignRequest(requestId: Id, owner: string): Promise<Result> {
  const refused = await guardOrganiser('requests');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase()
      .from('requests')
      .update({ owner: owner.trim() })
      .eq('id', requestId);

    if (error) return { ok: false, error: error.message };

    revalidatePath('/organiser/requests');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reassign it.' };
  }
}
