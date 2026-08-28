'use server';

import { revalidatePath } from 'next/cache';

import { actorName, guardPartner } from '@/lib/auth/session';
import { requireSupabase } from '@/lib/db/client';
import { getDbOrError } from '@/lib/db/store';
import { contentVisible } from '@/lib/resolvers';
import { completeLinkedTasks } from '@/lib/taskCompletion';
import type { Id } from '@/lib/types';

/* ============================================================
   Acknowledging a content page

   Some pages have to be read before a partner can be said to have
   read them — stand build rules, health and safety, the terms they
   are working under. Marking a page `requireAck` is how an organiser
   says so; this is how a partner answers.

   An acknowledgement is a record of a person confirming, at a time.
   Not a checkbox that can be quietly unticked: once given it stands,
   which is the only thing that makes it worth having.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

export async function acknowledgePage(partnerId: Id, pageId: Id): Promise<Result> {
  const refused = await guardPartner(partnerId, 'information');
  if (refused) return refused;

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) return { ok: false, error: 'That participation no longer exists.' };

  const page = db.contentPages.find((p) => p.id === pageId);
  if (!page) return { ok: false, error: 'That page no longer exists.' };

  // A page this partner cannot see is not one they can acknowledge —
  // the action is a public endpoint and must apply the same rule the
  // page did.
  if (!contentVisible(db, page, part)) {
    return { ok: false, error: 'That page is not available to you.' };
  }

  if (!page.requireAck) {
    return { ok: false, error: 'That page does not need to be acknowledged.' };
  }

  // Already done. Not an error — a double click should be quiet.
  if (part.ackState?.[pageId]) return { ok: true };

  try {
    const client = requireSupabase();
    const by = await actorName('Partner');

    /*
     * Read-modify-write on the JSONB, matching how task and form
     * state are handled. Re-read rather than trusting the cached
     * copy, so acknowledging one page cannot discard another
     * acknowledged in a different tab a moment ago.
     */
    const { data, error } = await client
      .from('event_participations')
      .select('ack_state')
      .eq('id', part.id)
      .single();

    if (error) return { ok: false, error: error.message };

    const ackState = (data?.ack_state ?? {}) as Record<string, unknown>;
    ackState[pageId] = { at: new Date().toISOString(), by };

    const { error: writeError } = await client
      .from('event_participations')
      .update({ ack_state: ackState })
      .eq('id', part.id);

    if (writeError) return { ok: false, error: writeError.message };

    /*
     * Both kinds of task can point at a page: 'content' ("Read a
     * page") and 'ack' ("Acknowledge"). Acknowledging finishes
     * either. Matching only one of them is why the seeded stand
     * rules task stayed outstanding after the partner had read it.
     */
    await completeLinkedTasks(part.id, 'content', by, [pageId]);
    await completeLinkedTasks(part.id, 'ack', by, [pageId]);

    await client.from('audit_log').insert({
      id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      event_id: db.event.id,
      partner_id: partnerId,
      actor: by,
      body: `Acknowledged “${page.title}”.`,
      created_at: new Date().toISOString(),
    });

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/partners');

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not record your acknowledgement.',
    };
  }
}
