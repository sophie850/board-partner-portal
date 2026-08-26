'use server';

import { guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { taskTemplateToRow } from '@/lib/db/mappers';
import { mintId } from '@/lib/db/store';
import type { Id, TaskLinkType, TaskPriority, TaskTemplate } from '@/lib/types';

/* ============================================================
   Task templates — write operations
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface TaskInput {
  id?: Id;
  title: string;
  description: string;
  category: string;
  module: string;
  priority: TaskPriority;
  required: boolean;
  /** Blank means the deadline is set per partner. */
  dueDate: string | null;
  /** Entitlement gating, ANY-of. Empty means everyone. */
  requires: string[];
  linkType: TaskLinkType;
  linkTarget: string | null;
  instructions: string;
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateTasks(id?: Id) {
  revalidatePath('/organiser/tasks');
  if (id) revalidatePath(`/organiser/tasks/${id}`);
  revalidatePath('/organiser');
  revalidatePath('/portal', 'layout');
}

/** Which link types need a target, and what a missing one breaks. */
const NEEDS_TARGET: Partial<Record<TaskLinkType, string>> = {
  form: 'Choose the form this task sends the partner to.',
  content: 'Choose the information page this task sends the partner to.',
  request: 'Choose the request type this task raises.',
  shop: 'Choose the shop category this task opens.',
  url: 'Enter the web address this task links to.',
};

export async function saveTask(input: TaskInput): Promise<ActionResult> {
  const refused = await guardOrganiser('tasks');
  if (refused) return refused;

  if (!input.title.trim()) return { ok: false, error: 'Give the task a title.' };

  const missing = NEEDS_TARGET[input.linkType];
  if (missing && !input.linkTarget?.trim()) return { ok: false, error: missing };

  if (input.linkType === 'url' && input.linkTarget) {
    if (!/^https?:\/\//i.test(input.linkTarget.trim())) {
      return { ok: false, error: 'A web address must start with http:// or https://.' };
    }
  }

  const id = input.id ?? mintId('tt');

  const task: TaskTemplate = {
    id,
    eventId: EVENT_ID,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    module: input.module,
    priority: input.priority,
    required: input.required,
    dueDate: input.dueDate || null,
    requires: input.requires.length === 0 ? null : input.requires,
    link: { type: input.linkType, target: input.linkTarget?.trim() || null },
    instructions: input.instructions.trim(),
  };

  try {
    const { error } = await requireSupabase()
      .from('task_templates')
      .upsert(taskTemplateToRow(task), { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the task.' };
  }

  revalidateTasks(id);
  return { ok: true, id };
}

/**
 * Deleting a template removes the task from every partner's list.
 *
 * Completion state lives in participation.task_state keyed by task
 * id, so it is orphaned rather than deleted — if the same id ever
 * returns, so does the history.
 */
export async function deleteTask(id: Id): Promise<ActionResult> {
  const refused = await guardOrganiser('tasks');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase().from('task_templates').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the task.' };
  }

  revalidateTasks();
  return { ok: true, id };
}

/**
 * Reopen a task the partner has completed.
 *
 * Used when a submission turns out to be wrong: the organiser puts
 * the work back on the partner's list rather than asking by email.
 */
export async function reopenTask(
  participationId: Id,
  taskId: Id,
): Promise<ActionResult> {
  const refused = await guardOrganiser('tasks');
  if (refused) return refused;

  try {
    const client = requireSupabase();

    const { data, error } = await client
      .from('event_participations')
      .select('task_state')
      .eq('id', participationId)
      .single();

    if (error) return { ok: false, error: error.message };

    const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;
    taskState[taskId] = {
      ...(taskState[taskId] ?? {}),
      completed: false,
      completedAt: null,
      completedBy: null,
    };

    const { error: writeError } = await client
      .from('event_participations')
      .update({ task_state: taskState })
      .eq('id', participationId);

    if (writeError) return { ok: false, error: writeError.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reopen the task.' };
  }

  revalidateTasks(taskId);
  return { ok: true, id: taskId };
}
