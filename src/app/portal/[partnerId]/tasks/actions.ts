'use server';

import { revalidatePath } from 'next/cache';

import { actorName, guardPartner } from '@/lib/auth/session';
import { requireSupabase } from '@/lib/db/client';
import { getDbOrError, mintId } from '@/lib/db/store';
import { markComplete, markDeclined, markNotComplete } from '@/lib/taskCompletion';
import { taskApplies } from '@/lib/resolvers';
import type { Id, TaskLinkType } from '@/lib/types';

/* ============================================================
   Answering a task the portal cannot see

   Most tasks finish themselves: submit the form, acknowledge the
   page, place the order. Three kinds cannot, because nothing
   observable happens inside the portal —

     checklist  "Confirm your stand build contractor", done on the
                phone with a contractor;
     url        we can see the click, not what happened at the other
                end of it;
     ack        a confirmation with no page behind it, where the tick
                is the whole task;
     shop       partners order in waves, so the first order is not
                the last one — only they know when they have ordered
                everything they want.

   For those the partner says so, and this records it.

   Declining is the other half. Some tasks are an opportunity with a
   closing date rather than an obligation — "Order essential AV" is
   only work if you want AV. A partner who does not should be able to
   say so and stop hearing about it, and that answer belongs on the
   record: "they said no" and "they never dealt with it" are
   different things for an organiser to know.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

/**
 * The kinds a partner may tick.
 *
 * Deliberately a list rather than "anything without a link".
 * A form task must never be tickable — that would let somebody mark
 * a health and safety declaration done without submitting one.
 */
const SELF_REPORTED = new Set<TaskLinkType>(['checklist', 'url', 'ack', 'shop']);

/**
 * An acknowledgement stands once given.
 *
 * The others are self-reported progress and correcting a mis-tick
 * should be easy — a partner who said they had finished ordering and
 * then needs one more thing should not have to ring anybody. An
 * acknowledgement is a record of somebody confirming something,
 * which is not a preference; the same rule content pages follow.
 */
const REVERSIBLE = new Set<TaskLinkType>(['checklist', 'url', 'shop']);

/**
 * Which tasks a partner may decline.
 *
 * Anything the organiser marked optional, and anything from the shop
 * — an opportunity by nature, whether or not an answer is wanted.
 * Never a required form or a page that has to be read: those are not
 * offers, and declining is not an answer to them.
 */
function mayDecline(task: { required: boolean; link?: { type: TaskLinkType } | null }): boolean {
  return !task.required || task.link?.type === 'shop';
}

export type TaskAnswer = 'done' | 'declined' | 'open';

export async function setTaskState(
  partnerId: Id,
  taskId: Id,
  answer: TaskAnswer,
): Promise<Result> {
  const refused = await guardPartner(partnerId, 'tasks');
  if (refused) return refused;

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) return { ok: false, error: 'That participation no longer exists.' };

  const task = db.taskTemplates.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: 'That task no longer exists.' };

  // The action is a public endpoint, so it re-checks what the page
  // checked: a task this partner was never assigned is not one they
  // can complete.
  if (!taskApplies(db, task, part)) {
    return { ok: false, error: 'That task is not part of your participation.' };
  }

  const kind = task.link?.type;

  if (answer === 'declined' && !mayDecline(task)) {
    return {
      ok: false,
      error: 'This one is required. If it does not apply to you, tell your BOARD contact.',
    };
  }

  /*
   * An upload task finishes when the files arrive. If the organiser
   * requested none, nothing ever will — so rather than leave the
   * partner with a task they cannot finish, they may close it.
   */
  const nothingToUpload =
    kind === 'upload' && (part.requestedFiles ?? []).length === 0;

  if (answer === 'done' && !nothingToUpload && (!kind || !SELF_REPORTED.has(kind))) {
    return {
      ok: false,
      error: 'This one completes on its own once the work behind it is done.',
    };
  }

  /*
   * Reopening. A declined task can always be reopened — somebody who
   * said they did not need AV in January may well want it in March,
   * and making that hard would only generate an email to Anna. A
   * ticked one depends on what it was.
   */
  if (answer === 'open') {
    const wasDeclined = Boolean(part.taskState?.[taskId]?.declined);
    if (!wasDeclined && !nothingToUpload && (!kind || !REVERSIBLE.has(kind))) {
      return { ok: false, error: 'An acknowledgement cannot be withdrawn once given.' };
    }
  }

  try {
    const by = await actorName('Partner');

    if (answer === 'done') await markComplete(part.id, [taskId], by);
    else if (answer === 'declined') await markDeclined(part.id, taskId, by);
    else await markNotComplete(part.id, taskId);

    const said =
      answer === 'done'
        ? `Marked “${task.title}” as done.`
        : answer === 'declined'
          ? `Answered “not needed” on “${task.title}”.`
          : `Reopened “${task.title}”.`;

    await requireSupabase().from('audit_log').insert({
      id: mintId('a'),
      event_id: db.event.id,
      partner_id: partnerId,
      actor: by,
      body: said,
      created_at: new Date().toISOString(),
    });

    revalidatePath(`/portal/${partnerId}`, 'layout');
    revalidatePath('/organiser/partners');
    revalidatePath('/organiser/tasks');

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not update the task.',
    };
  }
}
