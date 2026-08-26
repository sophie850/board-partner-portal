'use server';

import { actorName, getSession, guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb, getDbOrError, mintId } from '@/lib/db/store';
import { validateFields } from '@/lib/resolvers';
import type { FormValues, Id } from '@/lib/types';

/* ============================================================
   Partner requests

   A request is a conversation, not a form submission: the partner
   asks for something, the BOARD team answers, and either side may
   add to the thread until it is closed.
   ============================================================ */

type Result = { ok: true; requestId: Id } | { ok: false; error: string };

/** Sequential and readable: REQ-2027-00007. */
function reference(year: number, seq: number): string {
  return `REQ-${year}-${String(seq).padStart(5, '0')}`;
}

export async function submitRequest(
  partnerId: Id,
  participationId: Id,
  typeId: Id,
  values: FormValues,
  files: string[],
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'requests');
  if (refused) return refused;

  // Who raised it comes from the session, never from the browser.
  const submittedBy = await actorName('Partner');

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  const part = db.participations.find((p) => p.id === participationId);
  if (!part) return { ok: false, error: 'That participation no longer exists.' };

  const type = db.requestTypes.find((t) => t.id === typeId);
  if (!type) return { ok: false, error: 'That request type is no longer available.' };

  /*
   * Validated again here. The browser already checked, but a server
   * action is a public endpoint — the client-side pass is a courtesy
   * to the person typing, not the thing that enforces the rule.
   */
  const errors = validateFields(db, type.fields, part, values);
  if (Object.keys(errors).length) {
    return { ok: false, error: 'Some required answers are missing.' };
  }

  try {
    const client = requireSupabase();

    const { count } = await client.from('requests').select('*', { count: 'exact', head: true });

    const id = mintId('req');
    const now = new Date().toISOString();

    const { error } = await client.from('requests').insert({
      id,
      event_id: db.event.id,
      participation_id: participationId,
      type_id: typeId,
      reference: reference(new Date().getFullYear(), (count ?? 0) + 1),
      status: 'submitted',
      // Who at BOARD picks this up. The type carries the default;
      // an organiser can reassign it later.
      owner: type.ownerDefault,
      submitted_by: submittedBy,
      submitted_at: now,
      response_at: null,
      values,
      files,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/requests');
    revalidatePath('/organiser');

    return { ok: true, requestId: id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not send your request.' };
  }
}

/**
 * Add to the thread. Used by both sides.
 *
 * Who is speaking, and in what role, is taken from the session — not
 * from the caller. Accepting those as arguments would let a partner
 * post a message in their own thread styled as a reply from the
 * BOARD team, which is a more convincing forgery than it sounds.
 */
export async function addComment(
  requestId: Id,
  body: string,
  files: string[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!body.trim()) return { ok: false, error: 'Write a message first.' };

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  const request = db.requests.find((r) => r.id === requestId);
  if (!request) return { ok: false, error: 'That request no longer exists.' };

  const part = db.participations.find((p) => p.id === request.participationId);
  if (!part) return { ok: false, error: 'That request no longer exists.' };

  // Scoped to the partner the request belongs to, so a request id
  // from another partner is refused rather than answered.
  const refused = await guardPartner(part.partnerId, 'requests');
  if (refused) return refused;

  const session = await getSession();
  const role: 'partner' | 'organiser' =
    session?.kind === 'partner' ? 'partner' : 'organiser';
  const author = await actorName(role === 'partner' ? 'Partner' : 'BOARD team');

  try {
    const client = requireSupabase();

    const { error } = await client.from('request_comments').insert({
      id: mintId('rc'),
      request_id: requestId,
      author,
      role,
      body: body.trim(),
      files,
      created_at: new Date().toISOString(),
    });

    if (error) return { ok: false, error: error.message };

    /*
     * A partner answering a "more information needed" request puts it
     * back in the organiser's queue. Without this it would sit in
     * `more_info` with an unread answer nobody is prompted to read.
     */
    if (role === 'partner') {
      const { data: current } = await client
        .from('requests')
        .select('status')
        .eq('id', requestId)
        .single();

      if (current?.status === 'more_info') {
        await client.from('requests').update({ status: 'under_review' }).eq('id', requestId);
      }
    }

    revalidatePath('/portal', 'layout');
    revalidatePath('/organiser/requests');

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not add your message.' };
  }
}
