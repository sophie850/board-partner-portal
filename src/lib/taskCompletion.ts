import 'server-only';

import { requireSupabase } from '@/lib/db/client';
import { getDb } from '@/lib/db/store';
import type { Id, TaskLinkType } from '@/lib/types';

/* ============================================================
   Finishing a task

   A task is the portal's canonical unit of work — the nav badges,
   both dashboards, the partners list and the reminder emails all
   count them. So a task that cannot be completed is not a small
   problem: it drags a progress bar down forever and gets somebody
   chased every week for work they finished in January.

   The eight things a task can ask for split cleanly in two:

     * **The portal can see it happen.** A form is submitted, a page
       acknowledged, an order placed, a file provided, a request
       raised. These complete themselves, here, as a consequence of
       the act — never as a second thing to remember.

     * **The portal cannot.** "Confirm your stand build contractor"
       happens on the phone. Following a link tells us somebody
       clicked, not that they did the thing at the other end. For
       these the partner says so, and `setTaskDone` in the tasks
       actions is how.

   Both paths end in the same place: this file is the only thing in
   the partner portal that writes a completion.
   ============================================================ */

/**
 * Mark every task that was waiting on this act.
 *
 * `target` narrows it where a task points at something specific — a
 * particular form, a shop category, a request type. A task with no
 * target is satisfied by any act of that kind.
 *
 * Never throws, and never blocks what it follows: an order is placed
 * whether or not the task tied to it can be updated afterwards.
 */
export async function completeLinkedTasks(
  participationId: Id,
  type: TaskLinkType,
  by: string,
  /** Ids this act satisfies — a form id, or every category ordered from. */
  targets: Array<string | null | undefined> = [],
): Promise<void> {
  try {
    const db = await getDb();
    const hit = new Set(targets.filter(Boolean) as string[]);

    const linked = db.taskTemplates.filter((t) => {
      if (t.link?.type !== type) return false;
      // A task pointing at nothing in particular takes any act of
      // this kind; one pointing somewhere needs that thing.
      if (!t.link.target) return true;
      return hit.has(t.link.target);
    });

    if (!linked.length) return;

    await markComplete(
      participationId,
      linked.map((t) => t.id),
      by,
    );
  } catch (e) {
    // Logged, never rethrown. The act itself has already happened.
    console.error(`[tasks] could not complete tasks linked to ${type}:`, e);
  }
}

/**
 * Write the completions.
 *
 * Read-modify-write on the JSONB, matching how form and
 * acknowledgement state are handled — and re-read rather than
 * trusting a cached copy, so completing one task cannot discard
 * another finished in a different tab a moment ago.
 *
 * Already-complete tasks are left exactly as they are, so a
 * resubmitted form does not rewrite who finished it and when.
 */
export async function markComplete(
  participationId: Id,
  taskIds: Id[],
  by: string,
): Promise<void> {
  if (!taskIds.length) return;

  const client = requireSupabase();

  const { data, error } = await client
    .from('event_participations')
    .select('task_state')
    .eq('id', participationId)
    .single();

  if (error) return;

  const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;

  let changed = false;
  for (const id of taskIds) {
    if (taskState[id]?.completed) continue;
    taskState[id] = {
      ...(taskState[id] ?? {}),
      completed: true,
      completedAt: new Date().toISOString(),
      completedBy: by,
    };
    changed = true;
  }

  if (!changed) return;

  await client
    .from('event_participations')
    .update({ task_state: taskState })
    .eq('id', participationId);
}

/**
 * Record "not needed".
 *
 * `completed` is set alongside `declined` on purpose: a declined task
 * is resolved, and must drop out of every count, every badge and
 * every reminder exactly as a finished one does. Everything that
 * already reads `completed` keeps working untouched, and the flag
 * beside it is what lets the label — and an organiser — tell the two
 * apart.
 */
export async function markDeclined(
  participationId: Id,
  taskId: Id,
  by: string,
): Promise<void> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('event_participations')
    .select('task_state')
    .eq('id', participationId)
    .single();

  if (error) return;

  const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;
  const now = new Date().toISOString();

  taskState[taskId] = {
    ...(taskState[taskId] ?? {}),
    completed: true,
    completedAt: now,
    completedBy: by,
    declined: true,
    declinedAt: now,
  };

  await client
    .from('event_participations')
    .update({ task_state: taskState })
    .eq('id', participationId);
}

/**
 * Undo a self-reported completion, or a decline.
 *
 * Only reachable for the kinds the partner ticked themselves. A
 * completion the portal observed — a submitted form, an acknowledged
 * page — is a record of something that happened, and is not
 * reversible by unticking a box.
 */
export async function markNotComplete(participationId: Id, taskId: Id): Promise<void> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('event_participations')
    .select('task_state')
    .eq('id', participationId)
    .single();

  if (error) return;

  const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;
  if (!taskState[taskId]) return;

  taskState[taskId] = {
    ...taskState[taskId],
    completed: false,
    completedAt: undefined,
    completedBy: undefined,
    declined: false,
    declinedAt: undefined,
  };

  await client
    .from('event_participations')
    .update({ task_state: taskState })
    .eq('id', participationId);
}
