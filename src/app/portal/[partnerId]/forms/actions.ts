'use server';

import { actorName, guardPartner } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { getDb } from '@/lib/db/store';
import { validateForm, visibleFields } from '@/lib/resolvers';
import type { FormSubmission, FormValues, Id } from '@/lib/types';

/* ============================================================
   Form submission

   Submission state lives on the participation row as JSONB, keyed by
   form id, so one partner's answers are read, patched and written
   back as a unit.
   ============================================================ */

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

async function loadState(participationId: Id) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('event_participations')
    .select('form_state')
    .eq('id', participationId)
    .single();

  if (error) throw new Error(error.message);
  return { client, formState: (data?.form_state ?? {}) as Record<string, FormSubmission> };
}

function revalidatePartner(partnerId: Id) {
  revalidatePath(`/portal/${partnerId}`, 'layout');
  revalidatePath('/organiser/forms', 'layout');
  revalidatePath('/organiser');
}

/** Save without validating — a draft is allowed to be incomplete. */
export async function saveDraft(
  partnerId: Id,
  participationId: Id,
  formId: Id,
  values: FormValues,
): Promise<SubmitResult> {
  const refused = await guardPartner(partnerId, 'forms');
  if (refused) return refused;

  try {
    const { client, formState } = await loadState(participationId);
    const existing = formState[formId] ?? { status: 'not_started' };

    // A draft must not overwrite a decision the organiser has made.
    // Once changes are requested, saving keeps that status until the
    // partner actually resubmits.
    const status =
      existing.status === 'changes_required' ? 'changes_required' : 'in_progress';

    formState[formId] = { ...existing, status, values };

    const { error } = await client
      .from('event_participations')
      .update({ form_state: formState })
      .eq('id', participationId);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save your draft.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/**
 * Submit for review.
 *
 * Validation runs server-side against the fields this partner can
 * actually see — a required field hidden by an entitlement rule or
 * an unmet condition must never block them, and a client that skips
 * the check must not get past this.
 */
export async function submitForm(
  partnerId: Id,
  participationId: Id,
  formId: Id,
  values: FormValues,
): Promise<SubmitResult> {
  const refused = await guardPartner(partnerId, 'forms');
  if (refused) return refused;

  // Who submitted it is taken from the session, so a submission is
  // always attributable to whoever actually pressed the button.
  const submittedBy = await actorName('Partner');

  const db = await getDb();
  const form = db.forms.find((f) => f.id === formId);
  const part = db.participations.find((p) => p.id === participationId);

  if (!form || !part) return { ok: false, error: 'That form is no longer available.' };

  const fieldErrors = validateForm(db, form, part, values);
  if (Object.keys(fieldErrors).length) {
    const count = Object.keys(fieldErrors).length;
    return {
      ok: false,
      error: `${count} ${count === 1 ? 'answer needs' : 'answers need'} attention before you can submit.`,
      fieldErrors,
    };
  }

  // Store only what this partner was actually shown, so a stale
  // answer to a since-hidden field cannot travel with the submission.
  const visible = new Set(visibleFields(db, form, part, values).map((f) => f.key));
  const cleaned: FormValues = {};
  Object.entries(values).forEach(([k, v]) => {
    if (visible.has(k)) cleaned[k] = v;
  });

  try {
    const { client, formState } = await loadState(participationId);
    const existing = formState[formId] ?? { status: 'not_started' };

    // Resubmission snapshots the previous answers, so the organiser
    // can see what changed rather than only the latest version.
    const history = existing.history ?? [];
    if (existing.submittedAt && existing.values) {
      history.push({
        at: existing.submittedAt,
        by: existing.submittedBy ?? '—',
        values: existing.values,
        status: existing.status,
        feedback: existing.feedback,
      });
    }

    formState[formId] = {
      status: 'submitted',
      values: cleaned,
      submittedAt: new Date().toISOString(),
      submittedBy,
      history,
      // The previous round's feedback no longer applies.
      feedback: undefined,
    };

    const { error } = await client
      .from('event_participations')
      .update({ form_state: formState })
      .eq('id', participationId);

    if (error) return { ok: false, error: error.message };

    // A form with a linked task completes that task automatically,
    // so the partner never has to tick something off twice.
    await completeLinkedTask(participationId, formId, submittedBy);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not submit the form.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/**
 * Reopen an approved or submitted form, where the form allows it.
 * Status returns to in_progress with the answers pre-filled; the
 * prior version is snapshotted when it is submitted again.
 */
export async function reopenForm(
  partnerId: Id,
  participationId: Id,
  formId: Id,
): Promise<SubmitResult> {
  const refused = await guardPartner(partnerId, 'forms');
  if (refused) return refused;

  const db = await getDb();
  const form = db.forms.find((f) => f.id === formId);

  if (!form?.allowResubmit) {
    return { ok: false, error: 'This form cannot be amended once submitted.' };
  }

  try {
    const { client, formState } = await loadState(participationId);
    const existing = formState[formId];
    if (!existing) return { ok: false, error: 'There is nothing to amend yet.' };

    formState[formId] = { ...existing, status: 'in_progress' };

    const { error } = await client
      .from('event_participations')
      .update({ form_state: formState })
      .eq('id', participationId);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not reopen the form.' };
  }

  revalidatePartner(partnerId);
  return { ok: true };
}

/* ---------------------------------------------------------------
   Task auto-completion
   --------------------------------------------------------------- */

async function completeLinkedTask(participationId: Id, formId: Id, by: string) {
  const db = await getDb();
  const linked = db.taskTemplates.find(
    (t) => t.link?.type === 'form' && t.link.target === formId,
  );
  if (!linked) return;

  const client = requireSupabase();
  const { data, error } = await client
    .from('event_participations')
    .select('task_state')
    .eq('id', participationId)
    .single();

  if (error) return;

  const taskState = (data?.task_state ?? {}) as Record<string, Record<string, unknown>>;
  if (taskState[linked.id]?.completed) return;

  taskState[linked.id] = {
    ...(taskState[linked.id] ?? {}),
    completed: true,
    completedAt: new Date().toISOString(),
    completedBy: by,
  };

  await client
    .from('event_participations')
    .update({ task_state: taskState })
    .eq('id', participationId);
}
