'use client';

import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  PageTitle,
  Select,

  TextInput,
} from '@/components/ui/primitives';
import type { Entitlement, FieldType, FormDef, FormField, Partner, VisibilityRule } from '@/lib/types';

import type { FormInput } from '@/app/organiser/forms/actions';

/* ============================================================
   The form builder
   ============================================================ */

const FIELD_TYPES: Array<{ type: FieldType; label: string }> = [
  { type: 'short_text', label: 'Short text' },
  { type: 'long_text', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'email', label: 'Email' },
  { type: 'telephone', label: 'Telephone' },
  { type: 'url', label: 'Website' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'single_select', label: 'Choose one' },
  { type: 'multi_select', label: 'Choose several' },
  { type: 'yes_no', label: 'Yes / no' },
  { type: 'contact', label: 'Contact' },
  { type: 'acknowledgement', label: 'Acknowledgement' },
  { type: 'document_upload', label: 'Document upload' },
  { type: 'image_upload', label: 'Image upload' },
  { type: 'section_heading', label: 'Section heading' },
  { type: 'guidance', label: 'Guidance text' },
];

const TYPE_LABEL = new Map(FIELD_TYPES.map((t) => [t.type, t.label]));

const HAS_OPTIONS = new Set<FieldType>(['single_select', 'multi_select', 'radio', 'checkboxes']);

/** Types whose answer can drive another field's condition. */
const CAN_DRIVE_CONDITION = new Set<FieldType>([
  'yes_no',
  'single_select',
  'radio',
]);

/** Derive a stable key from a label, so authors never see key fields. */
function keyFromLabel(label: string, taken: Set<string>): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'field';

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

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

  function addField(type: FieldType) {
    const taken = new Set(fields.map((f) => f.key));
    const label = TYPE_LABEL.get(type) ?? 'Field';
    setFields((fs) => [
      ...fs,
      {
        key: keyFromLabel(`${label} ${fs.length + 1}`, taken),
        label: '',
        type,
        required: type !== 'section_heading' && type !== 'guidance',
        options: HAS_OPTIONS.has(type) ? ['Option 1', 'Option 2'] : undefined,
      },
    ]);
  }

  function updateField(index: number, patch: Partial<FormField>) {
    setFields((fs) => fs.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function moveField(index: number, delta: number) {
    setFields((fs) => {
      const target = index + delta;
      if (target < 0 || target >= fs.length) return fs;
      const next = [...fs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeField(index: number) {
    const removed = fields[index];
    // A condition pointing at a deleted field can never resolve, so
    // clear those rather than leaving the form quietly broken.
    setFields((fs) =>
      fs
        .filter((_, i) => i !== index)
        .map((f) => (f.condition?.field === removed.key ? { ...f, condition: undefined } : f)),
    );
  }

  function save() {
    setError(null);

    // Labels are the source of truth; keys are derived on save so an
    // author never has to think about them, and renaming a label on
    // an existing field does not orphan its answers.
    const taken = new Set<string>();
    const prepared = fields.map((f) => {
      if (f.key && form?.fields.some((existing) => existing.key === f.key)) {
        taken.add(f.key);
        return f;
      }
      const key = keyFromLabel(f.label || f.type, taken);
      taken.add(key);
      return { ...f, key };
    });

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
        <RuleEditor
          id="form-assign"
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

      {fields.length === 0 && (
        <div className="mb-3 rounded-lg border border-dashed border-line-3 p-[14px] text-[13px] text-ink-4">
          No fields yet — add one below.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-[10px]">
        {fields.map((field, i) => (
          <FieldRow
            key={i}
            field={field}
            index={i}
            isFirst={i === 0}
            isLast={i === fields.length - 1}
            earlierFields={fields.slice(0, i)}
            entitlements={entitlements}
            partners={partners}
            onChange={(patch) => updateField(i, patch)}
            onMove={(d) => moveField(i, d)}
            onRemove={() => removeField(i)}
          />
        ))}
      </div>

      <Eyebrow className="mb-[9px]">Add a field</Eyebrow>
      <div className="mb-7 flex flex-wrap gap-[7px]">
        {FIELD_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => addField(type)}
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-pill border border-line-3 bg-chip px-[13px] py-[7px] text-[12.5px] text-ink-2 transition-colors hover:border-accent-line hover:text-ink"
          >
            <Plus size={12} /> {label}
          </button>
        ))}
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

/* ---------------------------------------------------------------
   One field
   --------------------------------------------------------------- */

function FieldRow({
  field,
  index,
  isFirst,
  isLast,
  earlierFields,
  entitlements,
  partners,
  onChange,
  onMove,
  onRemove,
}: {
  field: FormField;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  earlierFields: FormField[];
  entitlements: Entitlement[];
  partners: Partner[];
  onChange: (patch: Partial<FormField>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(field.visibility || field.condition),
  );

  const iconBtn =
    'flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line-3 bg-transparent text-ink-3 transition-colors hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed';

  const small =
    'w-full rounded-sm border border-line-3 bg-panel px-[10px] py-2 text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  const isPresentational = field.type === 'section_heading' || field.type === 'guidance';

  // Only an earlier field with a closed set of answers can drive a
  // condition — you cannot branch reliably on free text.
  const conditionSources = earlierFields.filter((f) => CAN_DRIVE_CONDITION.has(f.type));

  return (
    <div className="rounded-lg border border-line-2 bg-inset px-[14px] py-[13px]">
      <div className="flex items-center gap-[10px] max-md:flex-wrap">
        <span className="shrink-0 rounded-pill bg-accent-fill px-[9px] py-[3px] text-[10px] tracking-[0.04em] text-accent uppercase">
          {TYPE_LABEL.get(field.type) ?? field.type}
        </span>
        <input
          className={clsx(small, 'min-w-0 flex-1 max-md:order-3 max-md:w-full max-md:flex-none')}
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={
            field.type === 'guidance' ? 'Guidance text shown to the partner' : 'Question label'
          }
          aria-label={`Field ${index + 1} label`}
        />
        <button onClick={() => onMove(-1)} disabled={isFirst} className={iconBtn} aria-label="Move field up">
          <ArrowUp size={14} />
        </button>
        <button onClick={() => onMove(1)} disabled={isLast} className={iconBtn} aria-label="Move field down">
          <ArrowDown size={14} />
        </button>
        <button
          onClick={onRemove}
          aria-label="Remove field"
          className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-warn-line bg-transparent text-warn hover:bg-warn-fill"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-[10px] flex flex-wrap items-center gap-[14px]">
        {!isPresentational && (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!field.required}
              onChange={(v) => onChange({ required: v })}
              label={`Field ${index + 1} required`}
              small
            />
            <span className="text-[12px] text-ink-3">Required</span>
          </div>
        )}

        {HAS_OPTIONS.has(field.type) && (
          <input
            className={clsx(small, 'min-w-[220px] flex-1')}
            value={(field.options ?? []).join(', ')}
            onChange={(e) =>
              onChange({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
            }
            placeholder="Option 1, Option 2, …"
            aria-label={`Field ${index + 1} options`}
          />
        )}

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="ml-auto cursor-pointer text-[12px] text-ink-4 hover:text-ink"
        >
          {showAdvanced ? 'Hide' : 'Visibility & logic'}
        </button>
      </div>

      {showAdvanced && (
        <div className="mt-[10px] flex flex-col gap-4 border-t border-line pt-[12px]">
          {/* field-level visibility */}
          <div>
            <div className="mb-2 text-[11px] tracking-[0.04em] text-ink-4 uppercase">
              Show this field to
            </div>
            <RuleEditor
              id={`field-vis-${index}`}
              value={field.visibility ?? { type: 'all' }}
              onChange={(v) =>
                onChange({ visibility: v.type === 'all' ? undefined : v })
              }
              entitlements={entitlements}
              partners={partners}
              emptyHint="No entitlements selected — the field shows for everyone."
              anyHint="Shown to partners holding any one of these."
              compact
            />
          </div>

          {/* answer-based condition */}
          <div>
            <div className="mb-2 text-[11px] tracking-[0.04em] text-ink-4 uppercase">
              Conditional logic
            </div>
            {conditionSources.length === 0 ? (
              <div className="text-[12px] text-ink-4">
                Add a yes/no or choose-one field above this one to branch on its answer.
              </div>
            ) : (
              <ConditionEditor
                field={field}
                sources={conditionSources}
                onChange={onChange}
                index={index}
              />
            )}
          </div>

          {/* help text */}
          {!isPresentational && (
            <div>
              <div className="mb-2 text-[11px] tracking-[0.04em] text-ink-4 uppercase">
                Help text
              </div>
              <input
                className={small}
                value={field.help ?? ''}
                onChange={(e) => onChange({ help: e.target.value })}
                placeholder="Shown under the field, e.g. 60 words max."
                aria-label={`Field ${index + 1} help text`}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ConditionEditor({
  field,
  sources,
  onChange,
  index,
}: {
  field: FormField;
  sources: FormField[];
  onChange: (patch: Partial<FormField>) => void;
  index: number;
}) {
  const source = sources.find((s) => s.key === field.condition?.field);
  const values = source
    ? source.type === 'yes_no'
      ? [
          { value: 'true', label: 'Yes' },
          { value: 'false', label: 'No' },
        ]
      : (source.options ?? []).map((o) => ({ value: o, label: o }))
    : [];

  const control =
    'rounded-sm border border-line-3 bg-panel px-[9px] py-[6px] text-[12px] text-ink outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] text-ink-4">Show when</span>
      <select
        className={clsx(control, 'max-w-[200px] cursor-pointer')}
        value={field.condition?.field ?? ''}
        onChange={(e) => {
          const key = e.target.value;
          if (!key) return onChange({ condition: undefined });
          onChange({ condition: { field: key, equals: '' } });
        }}
        aria-label={`Field ${index + 1} condition source`}
      >
        <option value="">Always shown</option>
        {sources.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label || s.key}
          </option>
        ))}
      </select>

      {field.condition?.field && (
        <>
          <span className="text-[12px] text-ink-4">equals</span>
          <select
            className={clsx(control, 'cursor-pointer text-accent')}
            value={String(field.condition.equals ?? '')}
            onChange={(e) => {
              const raw = e.target.value;
              // yes/no answers are stored as real booleans, so the
              // condition has to compare against a boolean too.
              const parsed = raw === 'true' ? true : raw === 'false' ? false : raw;
              onChange({
                condition: { field: field.condition!.field, equals: parsed },
              });
            }}
            aria-label={`Field ${index + 1} condition value`}
          >
            <option value="">Choose…</option>
            {values.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Shared rule editor — assignment and field visibility
   --------------------------------------------------------------- */

function RuleEditor({
  id,
  value,
  onChange,
  entitlements,
  partners,
  emptyHint,
  anyHint,
  compact,
}: {
  id: string;
  value: VisibilityRule;
  onChange: (v: VisibilityRule) => void;
  entitlements: Entitlement[];
  partners: Partner[];
  emptyHint: string;
  anyHint: string;
  compact?: boolean;
}) {
  const type = value.type ?? 'all';
  const keys = Array.isArray(value.keys) ? value.keys : value.key ? [value.key] : [];
  const selectedPartners = value.partners ?? [];

  function setType(next: string) {
    if (next === 'all') onChange({ type: 'all' });
    else if (next === 'entitlement') onChange({ type: 'entitlement', keys: [] });
    else onChange({ type: 'partner', partners: [] });
  }

  const chip = (on: boolean) =>
    clsx(
      'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] transition-colors',
      on
        ? 'border-accent-line bg-accent-fill text-accent'
        : 'border-line-3 bg-transparent text-ink-3 hover:text-ink',
    );

  return (
    <>
      <Select
        id={id}
        value={type}
        onChange={(e) => setType(e.target.value)}
        className={compact ? 'py-2 text-[13px]' : undefined}
      >
        <option value="all">All partners</option>
        <option value="entitlement">Partners with an entitlement</option>
        <option value="partner">Specific partners only</option>
      </Select>

      {type === 'entitlement' && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {entitlements.map((e) => {
              const on = keys.includes(e.key);
              return (
                <button
                  key={e.key}
                  onClick={() =>
                    onChange({
                      type: 'entitlement',
                      keys: on ? keys.filter((k) => k !== e.key) : [...keys, e.key],
                    })
                  }
                  aria-pressed={on}
                  className={chip(on)}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          <Help>{keys.length === 0 ? emptyHint : keys.length === 1 ? 'Shown to partners holding this entitlement.' : anyHint}</Help>
        </div>
      )}

      {type === 'partner' && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {partners.map((p) => {
              const on = selectedPartners.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() =>
                    onChange({
                      type: 'partner',
                      partners: on
                        ? selectedPartners.filter((x) => x !== p.id)
                        : [...selectedPartners, p.id],
                    })
                  }
                  aria-pressed={on}
                  className={chip(on)}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selectedPartners.length === 0 && <Help>Choose at least one partner.</Help>}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Switch
   --------------------------------------------------------------- */

function Switch({
  checked,
  onChange,
  label,
  small,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  small?: boolean;
}) {
  const w = small ? 36 : 40;
  const knob = small ? 16 : 18;
  const offset = small ? 18 : 20;

  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative shrink-0 cursor-pointer rounded-pill border-none p-0 transition-colors',
        checked ? 'bg-brand' : 'bg-chip',
      )}
      style={{ width: w, height: small ? 20 : 22 }}
    >
      <span
        className="absolute top-[2px] rounded-pill bg-board-off-white transition-all"
        style={{ width: knob, height: knob, left: checked ? offset : 2 }}
      />
    </button>
  );
}

