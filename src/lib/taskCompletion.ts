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
 * Whether every file the organiser asked for has arrived.
 *
 * An upload task points at no particular slot — the editor offers no
 * target for one — so "provided a file" is not the same as "done".
 * A partner owing an insurance certificate, a method statement and a
 * logo has not finished by sending the logo, and completing on the
 * first arrival would drop the other two out of every reminder.
 *
 * Optional slots are ignored: they are the same kind of offer an
 * optional task is.
 *
 * Read straight from the database rather than through `getDb`, which
 * is cached for the length of a request — the guard at the top of
 * the action has already populated that cache, so the file just
 * written would not be counted and the task would complete one
 * upload late, every time.
 */
export async function allRequestedFilesIn(participationId: Id): Promise<boolean> {
  const { data, error } = await requireSupabase()
    .from('partner_requested_files')
    .select('required, file_name')
    .eq('participation_id', participationId);

  if (error || !data) return false;

  const needed = data.filter((row) => row.required);
  // Nothing required means nothing to wait for. This is reached only
  // after a file has been attached, so an optional-only set completes
  // on the first one — which is the right reading of "provide these
  // if you have them".
  if (!needed.length) return true;

  return needed.every((row) => Boolean(row.file_name));
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
 * Put tasks of a kind back to outstanding.
 *
 * The mirror of `completeLinkedTasks`, for when the thing that
 * satisfied them stops being true — a required file withdrawn, so
 * the set is no longer complete. Only touches tasks the portal
 * completed itself; a decline is the partner's answer and is theirs
 * to take back.
 */
export async function reopenLinkedTasks(
  participationId: Id,
  type: TaskLinkType,
): Promise<void> {
  try {
    const db = await getDb();
    const linked = db.taskTemplates.filter((t) => t.link?.type === type);
    if (!linked.length) return;

    const client = requireSupabase();
    const { data, error } = await client
      .from('event_participations')
      .select('task_state')
      .eq('id', participationId)
      .single();

    if (error) return;

    const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;

    let changed = false;
    for (const t of linked) {
      const state = taskState[t.id];
      if (!state?.completed || state.declined) continue;
      taskState[t.id] = {
        ...state,
        completed: false,
        completedAt: undefined,
        completedBy: undefined,
      };
      changed = true;
    }

    if (!changed) return;

    await client
      .from('event_participations')
      .update({ task_state: taskState })
      .eq('id', participationId);
  } catch (e) {
    console.error(`[tasks] could not reopen tasks linked to ${type}:`, e);
  }
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
