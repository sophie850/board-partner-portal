'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { FieldRenderer } from '@/components/forms/FieldRenderer';
import { Button, Callout, Panel } from '@/components/ui/primitives';
import type {
  Entitlement,
  FieldValue,
  FormDef,
  FormSubmission,
  FormValues,
  Participation,
} from '@/lib/types';

import { reopenForm, saveDraft, submitForm } from '@/app/portal/[partnerId]/forms/actions';

/* ============================================================
   Filling in a form

   Conditional fields resolve as the partner types, so answering
   "yes" to "are you appointing a contractor?" reveals the
   contractor questions immediately.

   Entitlement-based visibility was already applied on the server —
   fields this partner may not see never reach the browser.
   ============================================================ */

export function FormFiller({
  partnerId,
  participation,
  form,
  submission,
  submittedBy,
  entitlementKeys,
}: {
  partnerId: string;
  participation: Participation;
  form: FormDef;
  submission: FormSubmission;
  submittedBy: string;
  entitlementKeys: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [values, setValues] = useState<FormValues>(submission.values ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: 'info' | 'warn'; text: string } | null>(null);

  const hasUploads = useMemo(
    () =>
      form.fields.some((f) =>
        ['file_upload', 'image_upload', 'document_upload'].includes(f.type),
      ),
    [form.fields],
  );

  const locked =
    submission.status === 'submitted' ||
    submission.status === 'under_review' ||
    submission.status === 'approved';

  /**
   * Conditions are evaluated here rather than on the server so the
   * form reacts as answers change. Entitlement rules are not — those
   * were resolved server-side and the fields are simply absent.
   */
  const visible = useMemo(
    () =>
      form.fields.filter((f) => {
        if (!f.condition) return true;
        return values[f.condition.field] === f.condition.equals;
      }),
    [form.fields, values],
  );

  function setValue(key: string, v: FieldValue) {
    setValues((prev) => ({ ...prev, [key]: v }));
    // Clear the error as soon as they start fixing it.
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function draft() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveDraft(partnerId, participation.id, form.id, values);
      if (!result.ok) setMessage({ tone: 'warn', text: result.error });
      else {
        setMessage({ tone: 'info', text: 'Draft saved. You can come back to this any time.' });
        router.refresh();
      }
    });
  }

  function submit() {
    setMessage(null);
    setErrors({});
    startTransition(async () => {
      const result = await submitForm(
        partnerId,
        participation.id,
        form.id,
        values,
        submittedBy,
      );
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: 'warn', text: result.error });
        return;
      }
      router.refresh();
    });
  }

  function amend() {
    setMessage(null);
    startTransition(async () => {
      const result = await reopenForm(partnerId, participation.id, form.id);
      if (!result.ok) setMessage({ tone: 'warn', text: result.error });
      else router.refresh();
    });
  }

  return (
    <>
      {submission.feedback && submission.status === 'changes_required' && (
        <Callout tone="warn" className="mb-6">
          <span className="text-warn">Changes requested:</span> {submission.feedback}
        </Callout>
      )}

      {locked && (
        <Panel className="mb-6 px-[18px] py-4">
          <div className="text-[13.5px] text-ink">
            {submission.status === 'approved'
              ? 'This form has been approved.'
              : 'This form has been submitted and is with the BOARD team.'}
          </div>
          <div className="mt-[3px] text-[12px] text-ink-4">
            You can read your answers below.
            {form.allowResubmit
              ? ' If something has changed, you can amend and resubmit.'
              : ' It cannot be amended — contact your BOARD contact if something has changed.'}
          </div>
          {form.allowResubmit && (
            <Button size="sm" variant="ghost" className="mt-3" onClick={amend} disabled={pending}>
              Amend and resubmit
            </Button>
          )}
        </Panel>
      )}

      {message && (
        <Callout tone={message.tone} className="mb-6">
          {message.text}
        </Callout>
      )}

      {/* Said once for the whole form rather than under every upload
          field, where it drowned out the questions. */}
      {!locked && hasUploads && (
        <Callout className="mb-6">
          File storage is not connected yet. File names are recorded so you can complete the
          form, but the files themselves are not uploaded — your BOARD contact will ask for
          them separately.
        </Callout>
      )}

      <div className="flex flex-col gap-5">
        {visible.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            error={errors[field.key]}
            disabled={locked || pending}
            uploadFolder="submissions"
            onChange={(v) => setValue(field.key, v)}
          />
        ))}
      </div>

      {!locked && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line-2 pt-5">
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Working…' : 'Submit'}
          </Button>
          <Button variant="ghost" onClick={draft} disabled={pending}>
            Save draft
          </Button>
          <span className="text-[12px] text-ink-4">
            Nothing is sent to the BOARD team until you submit.
          </span>
        </div>
      )}

      {/* Entitlements are why two partners see different questions —
          worth surfacing when previewing as a partner. */}
      {entitlementKeys.length > 0 && (
        <details className="mt-8 border-t border-line pt-4">
          <summary className="cursor-pointer text-[12px] text-ink-4">
            Why these questions?
          </summary>
          <p className="mt-2 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-4">
            This form is shown with the fields that apply to this partner&rsquo;s
            entitlements. Another partner may be asked different questions on the same form.
          </p>
        </details>
      )}
    </>
  );
}
