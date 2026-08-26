'use server';

import { guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { formFieldToRow, formToRow } from '@/lib/db/mappers';
import { mintId } from '@/lib/db/store';
import type { FormDef, FormField, Id, VisibilityRule } from '@/lib/types';

/* ============================================================
   Forms — write operations
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface FormInput {
  id?: Id;
  title: string;
  category: string;
  description: string;
  /** Blank means the deadline is set per partner. */
  dueDate: string | null;
  assign: VisibilityRule;
  allowResubmit: boolean;
  fields: FormField[];
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateForms(id?: Id) {
  revalidatePath('/organiser/forms');
  if (id) {
    revalidatePath(`/organiser/forms/${id}`);
    revalidatePath(`/organiser/forms/${id}/edit`);
  }
  revalidatePath('/portal', 'layout');
}

/** Duplicate keys would make answers ambiguous, so they are rejected. */
function validate(input: FormInput): string | null {
  if (!input.title.trim()) return 'Give the form a title before saving.';

  const keys = input.fields.map((f) => f.key.trim()).filter(Boolean);
  if (keys.length !== input.fields.length) {
    return 'Every field needs a key. Give each new field a label first.';
  }

  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) return `Two fields share the key "${key}". Field keys must be unique.`;
    seen.add(key);
  }

  // A condition pointing at a later field can never resolve, because
  // the answer it depends on has not been given yet.
  const position = new Map(input.fields.map((f, i) => [f.key, i]));
  for (const [i, field] of input.fields.entries()) {
    if (!field.condition) continue;
    const target = position.get(field.condition.field);
    if (target === undefined) {
      return `"${field.label}" is conditional on a field that no longer exists.`;
    }
    if (target >= i) {
      return `"${field.label}" is conditional on a field that comes after it. Move it earlier.`;
    }
  }

  return null;
}

export async function saveForm(input: FormInput): Promise<ActionResult> {
  const refused = await guardOrganiser('forms');
  if (refused) return refused;

  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const id = input.id ?? mintId('f');

  const form: FormDef = {
    id,
    eventId: EVENT_ID,
    title: input.title.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    dueDate: input.dueDate || null,
    assign: input.assign,
    allowResubmit: input.allowResubmit,
    fields: input.fields,
  };

  try {
    const client = requireSupabase();

    const { error: formError } = await client
      .from('forms')
      .upsert(formToRow(form), { onConflict: 'id' });
    if (formError) return { ok: false, error: formError.message };

    const rows = input.fields.map((f, i) => formFieldToRow(f, id, i));

    // Upsert first, then remove what is gone. Doing it in this order
    // means a failure mid-save never leaves the form with no fields —
    // the worst case is a stale field left behind, not lost work.
    if (rows.length) {
      const { error: fieldError } = await client
        .from('form_fields')
        .upsert(rows, { onConflict: 'id' });
      if (fieldError) return { ok: false, error: fieldError.message };
    }

    const keepIds = rows.map((r) => r.id as string);
    let removal = client.from('form_fields').delete().eq('form_id', id);
    if (keepIds.length) {
      removal = removal.not('id', 'in', `(${keepIds.map((k) => `"${k}"`).join(',')})`);
    }
    const { error: deleteError } = await removal;
    if (deleteError) return { ok: false, error: deleteError.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the form.' };
  }

  revalidateForms(id);
  return { ok: true, id };
}

/**
 * Deleting a form takes its fields with it (ON DELETE CASCADE), but
 * submitted answers live in participation.form_state and survive, so
 * a delete cannot destroy what partners have already sent.
 */
export async function deleteForm(id: Id): Promise<ActionResult> {
  const refused = await guardOrganiser('forms');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase().from('forms').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the form.' };
  }

  revalidateForms();
  return { ok: true, id };
}

/* ---------------------------------------------------------------
   Review
   --------------------------------------------------------------- */

export type ReviewDecision = 'approved' | 'changes_required' | 'rejected';

/**
 * Record an organiser's decision on one partner's submission.
 *
 * Submission state lives on the participation row as JSONB, so this
 * reads, patches and writes back that one partner's record.
 */
export async function reviewSubmission(
  participationId: Id,
  formId: Id,
  decision: ReviewDecision,
  feedback: string,
  reviewer: string,
): Promise<ActionResult> {
  const refused = await guardOrganiser('forms');
  if (refused) return refused;

  if (decision === 'changes_required' && !feedback.trim()) {
    return {
      ok: false,
      error: 'Say what needs changing — the partner sees this message and nothing else.',
    };
  }

  try {
    const client = requireSupabase();

    const { data, error } = await client
      .from('event_participations')
      .select('form_state')
      .eq('id', participationId)
      .single();

    if (error) return { ok: false, error: error.message };

    const formState = (data?.form_state ?? {}) as Record<string, Record<string, unknown>>;
    const existing = formState[formId] ?? {};

    formState[formId] = {
      ...existing,
      status: decision,
      feedback: feedback.trim(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: reviewer,
    };

    const { error: writeError } = await client
      .from('event_participations')
      .update({ form_state: formState })
      .eq('id', participationId);

    if (writeError) return { ok: false, error: writeError.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not record the review.' };
  }

  revalidateForms(formId);
  return { ok: true, id: formId };
}
