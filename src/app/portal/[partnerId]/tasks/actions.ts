'use server';

import { revalidatePath } from 'next/cache';

import { actorName, guardPartner } from '@/lib/auth/session';
import { requireSupabase } from '@/lib/db/client';
import { getDbOrError, mintId } from '@/lib/db/store';
import { markComplete, markNotComplete } from '@/lib/taskCompletion';
import { taskApplies } from '@/lib/resolvers';
import type { Id, TaskLinkType } from '@/lib/types';

/* ============================================================
   Ticking off a task the portal cannot see

   Most tasks finish themselves: submit the form, acknowledge the
   page, place the order. Three kinds cannot, because nothing
   observable happens inside the portal —

     checklist  "Confirm your stand build contractor", done on the
                phone with a contractor;
     url        we can see the click, not what happened at the other
                end of it;
     ack        a confirmation with no page behind it, where the tick
                is the whole task.

   For those the partner says so, and this records it.
   ============================================================ */

type Result = { ok: true } | { ok: false; error: string };

/**
 * The kinds a partner may tick.
 *
 * Deliberately a list rather than "anything without a link".
 * A form task must never be tickable — that would let somebody mark
 * a health and safety declaration done without submitting one.
 */
const SELF_REPORTED = new Set<TaskLinkType>(['checklist', 'url', 'ack']);

/**
 * An acknowledgement stands once given.
 *
 * The other two are self-reported progress and correcting a
 * mis-tick should be easy. An acknowledgement is a record of
 * somebody confirming something, which is not a preference — the
 * same rule content pages follow.
 */
const REVERSIBLE = new Set<TaskLinkType>(['checklist', 'url']);

export async function setTaskDone(
  partnerId: Id,
  taskId: Id,
  done: boolean,
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
  if (!kind || !SELF_REPORTED.has(kind)) {
    return {
      ok: false,
      error: 'This one completes on its own once the work behind it is done.',
    };
  }

  if (!done && !REVERSIBLE.has(kind)) {
    return { ok: false, error: 'An acknowledgement cannot be withdrawn once given.' };
  }

  try {
    const by = await actorName('Partner');

    if (done) {
      await markComplete(part.id, [taskId], by);
    } else {
      await markNotComplete(part.id, taskId);
    }

    await requireSupabase().from('audit_log').insert({
      id: mintId('a'),
      event_id: db.event.id,
      partner_id: partnerId,
      actor: by,
      body: done
        ? `Marked “${task.title}” as done.`
        : `Reopened “${task.title}”.`,
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
