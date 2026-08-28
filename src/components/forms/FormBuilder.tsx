'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FieldListEditor, Switch, assignKeys } from '@/components/forms/FieldListEditor';
import { VisibilityEditor } from '@/components/ui/VisibilityEditor';
import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  PageTitle,
  TextInput,
} from '@/components/ui/primitives';
import type { Entitlement, FormDef, FormField, Partner, VisibilityRule } from '@/lib/types';

import type { FormInput } from '@/app/organiser/forms/actions';

/* ============================================================
   The form builder
   ============================================================ */

export function FormBuilder({
  form,
  entitlements,
  partners,
  onSave,
  onDelete,
}: {
  form: FormDef | null;
  entitlements: Entitlement[];
  partners: Partner[];
  onSave: (input: FormInput) => Promise<{ ok: boolean; id?: string; error?: string }>;
  onDelete?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(form?.title ?? '');
  const [category, setCategory] = useState(form?.category ?? '');
  const [description, setDescription] = useState(form?.description ?? '');
  const [dueDate, setDueDate] = useState(form?.dueDate ?? '');
  const [assign, setAssign] = useState<VisibilityRule>(form?.assign ?? { type: 'all' });
  const [allowResubmit, setAllowResubmit] = useState(form?.allowResubmit ?? false);
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);

    // Labels are the source of truth; keys are derived on save so an
    // author never has to think about them, and renaming a label on
    // an existing field does not orphan its answers.
    const prepared = assignKeys(fields, form?.fields ?? []);

    startTransition(async () => {
      const result = await onSave({
        id: form?.id,
        title,
        category,
        description,
        dueDate: dueDate || null,
        assign,
        allowResubmit,
        fields: prepared,
      });

      if (!result.ok) {
        setError(result.error ?? 'Could not save the form.');
        return;
      }
      router.push(`/organiser/forms/${result.id}`);
      router.refresh();
    });
  }

  function remove() {
    if (!form || !onDelete) return;
    const ok = window.confirm(
      `Delete "${form.title}"? Answers partners have already submitted are kept, but the form and its fields go.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await onDelete(form.id);
      if (!result.ok) {
        setError(result.error ?? 'Could not delete the form.');
        return;
      }
      router.push('/organiser/forms');
      router.refresh();
    });
  }

  return (
    <div className="animate-rise">
      <Eyebrow className="mb-2">Organiser · Forms</Eyebrow>
      <PageTitle className="mb-6">{form ? 'Edit form' : 'New form'}</PageTitle>

      {error && (
        <Callout tone="warn" className="mb-5">
          {error}
        </Callout>
      )}

      {/* ---- basics ---- */}
      <div className="mb-4 grid grid-cols-[2fr_1fr] gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor="form-title" required>
            Title
          </Label>
          <TextInput
            id="form-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Health &amp; safety declaration"
          />
        </div>
        <div>
          <Label htmlFor="form-due">Default deadline</Label>
          <TextInput
            id="form-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Help>
            Leave blank to set the date per partner. Overridable for any partner either way.
          </Help>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_2fr] gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor="form-category">Category</Label>
          <TextInput
            id="form-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Exhibition"
          />
        </div>
        <div>
          <Label htmlFor="form-desc">Description</Label>
          <TextInput
            id="form-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Required for all partners with a physical stand presence."
          />
        </div>
      </div>

      {/* ---- assignment ---- */}
      <div className="mb-4">
        <Label htmlFor="form-assign">Who gets this form</Label>
        <VisibilityEditor
          id="form-assign"
          noun="form"
          value={assign}
          onChange={setAssign}
          entitlements={entitlements}
          partners={partners}
          emptyHint="No entitlements selected — every partner would receive this form."
          anyHint="Sent to partners holding any one of these — they do not need all of them."
        />
      </div>

      {/* ---- resubmission ---- */}
      <div className="mb-7 flex items-center gap-4 rounded-xl border border-line-2 bg-panel px-4 py-[13px]">
        <div className="flex-1">
          <div className="text-[13.5px] text-ink">Allow resubmission</div>
          <div className="mt-[2px] text-[11.5px] text-ink-4">
            Partners can reopen and amend this form after it has been submitted or approved.
            The previous answers are kept as a version.
          </div>
        </div>
        <Switch checked={allowResubmit} onChange={setAllowResubmit} label="Allow resubmission" />
      </div>

      {/* ---- fields ---- */}
      <Eyebrow className="mb-[10px]">Fields</Eyebrow>

      <div className="mb-7">
        <FieldListEditor
          fields={fields}
          onChange={setFields}
          entitlements={entitlements}
          partners={partners}
        />
      </div>

      {/* ---- actions ---- */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line-2 pt-5">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Saving…' : form ? 'Save changes' : 'Create form'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push(form ? `/organiser/forms/${form.id}` : '/organiser/forms')}
          disabled={pending}
        >
          Cancel
        </Button>
        <div className="flex-1" />
        {form && onDelete && (
          <Button variant="danger" onClick={remove} disabled={pending}>
            <Trash2 size={14} /> Delete form
          </Button>
        )}
      </div>
    </div>
  );
}
