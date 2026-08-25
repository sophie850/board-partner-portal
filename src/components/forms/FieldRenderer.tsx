'use client';

import { clsx } from 'clsx';
import { Check, Upload } from 'lucide-react';

import { FieldError, Help, Label } from '@/components/ui/primitives';
import type { ContactValue, FieldValue, FormField } from '@/lib/types';

/* ============================================================
   One form field, of any type

   The organiser decides which of these a partner sees, per partner
   and per answer. This component only renders — every visibility
   decision has already been made by the resolvers on the server.
   ============================================================ */

const CONTROL = clsx(
  'w-full rounded-md border border-line-4 bg-panel px-[13px] py-[11px]',
  'text-[14px] text-ink outline-none transition-colors',
  'placeholder:text-ink-4',
  'focus:border-accent-line focus:ring-2 focus:ring-accent-line',
  'disabled:opacity-50',
);

/** HTML input type per field type. */
const INPUT_TYPE: Record<string, string> = {
  email: 'email',
  telephone: 'tel',
  number: 'number',
  currency: 'number',
  date: 'date',
  time: 'time',
  url: 'url',
};

const UPLOAD_TYPES = new Set(['file_upload', 'image_upload', 'document_upload']);

export function FieldRenderer({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: FieldValue;
  error?: string;
  disabled?: boolean;
  onChange: (v: FieldValue) => void;
}) {
  const id = `field-${field.key}`;

  /* ---- presentation-only fields ---- */

  if (field.type === 'section_heading') {
    return (
      <div className="mt-2 border-b border-line-2 pb-2 text-[12px] tracking-[0.14em] text-accent uppercase">
        {field.label}
      </div>
    );
  }

  if (field.type === 'guidance') {
    return <p className="m-0 text-[13px] leading-relaxed text-ink-3">{field.label}</p>;
  }

  /* ---- acknowledgement: a checkbox whose label is the statement ---- */

  if (field.type === 'acknowledgement') {
    const checked = value === true;
    return (
      <div>
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className="flex w-full cursor-pointer items-start gap-3 border-none bg-transparent p-0 text-left disabled:cursor-not-allowed"
        >
          <span
            className={clsx(
              'mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border-[1.5px]',
              checked ? 'border-accent bg-accent text-inset' : 'border-line-5 bg-transparent',
            )}
          >
            {checked && <Check size={13} strokeWidth={3} />}
          </span>
          <span className="text-[13.5px] leading-snug text-ink-2">
            {field.label}
            {field.required && <span className="text-warn"> *</span>}
          </span>
        </button>
        {field.help && <Help>{field.help}</Help>}
        {error && <FieldError>{error}</FieldError>}
      </div>
    );
  }

  /* ---- everything else gets a label ---- */

  const labelled = (control: React.ReactNode) => (
    <div>
      <Label htmlFor={id} required={field.required}>
        {field.label}
      </Label>
      {control}
      {field.help && <Help>{field.help}</Help>}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );

  if (field.type === 'yes_no') {
    return labelled(
      <div className="flex gap-[10px]">
        {[
          { label: 'Yes', v: true },
          { label: 'No', v: false },
        ].map((opt) => {
          const on = value === opt.v;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChange(opt.v)}
              className={clsx(
                'cursor-pointer rounded-pill border px-6 py-[9px] text-[13px] transition-colors',
                on
                  ? 'border-accent bg-accent-fill text-ink'
                  : 'border-line-4 bg-transparent text-ink-3 hover:text-ink',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>,
    );
  }

  if (field.type === 'single_select') {
    return labelled(
      <select
        id={id}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(CONTROL, 'cursor-pointer')}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>,
    );
  }

  if (field.type === 'radio') {
    return labelled(
      <div className="flex flex-wrap gap-[9px]">
        {(field.options ?? []).map((o) => {
          const on = value === o;
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChange(o)}
              className={clsx(
                'flex cursor-pointer items-center gap-[9px] rounded-pill border px-[15px] py-2 text-[13px]',
                on
                  ? 'border-accent bg-accent-fill text-ink'
                  : 'border-line-4 bg-transparent text-ink-2 hover:text-ink',
              )}
            >
              <span
                className={clsx(
                  'inline-block h-3 w-3 rounded-pill border-[1.5px]',
                  on ? 'border-accent bg-accent' : 'border-line-4 bg-transparent',
                )}
              />
              {o}
            </button>
          );
        })}
      </div>,
    );
  }

  if (field.type === 'multi_select' || field.type === 'checkboxes') {
    const selected = Array.isArray(value) ? value : [];
    return labelled(
      <div className="flex flex-wrap gap-[9px]">
        {(field.options ?? []).map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((x) => x !== o) : [...selected, o])
              }
              className={clsx(
                'flex cursor-pointer items-center gap-[9px] rounded-sm border px-[15px] py-2 text-[13px]',
                on
                  ? 'border-accent bg-accent-fill text-ink'
                  : 'border-line-4 bg-transparent text-ink-2 hover:text-ink',
              )}
            >
              <span
                className={clsx(
                  'flex h-[14px] w-[14px] items-center justify-center rounded-xs border-[1.5px]',
                  on ? 'border-accent bg-accent text-inset' : 'border-line-4 bg-transparent',
                )}
              >
                {on && <Check size={10} strokeWidth={3} />}
              </span>
              {o}
            </button>
          );
        })}
      </div>,
    );
  }

  if (field.type === 'contact') {
    const c: ContactValue = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const patch = (p: Partial<ContactValue>) => onChange({ ...c, ...p });

    return labelled(
      <div className="grid grid-cols-2 gap-[9px] max-md:grid-cols-1">
        <input
          id={id}
          disabled={disabled}
          value={c.name ?? ''}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Full name"
          aria-label={`${field.label} — full name`}
          className={clsx(CONTROL, 'col-span-2 py-[10px] text-[13.5px] max-md:col-span-1')}
        />
        <input
          type="email"
          disabled={disabled}
          value={c.email ?? ''}
          onChange={(e) => patch({ email: e.target.value })}
          placeholder="Email"
          aria-label={`${field.label} — email`}
          className={clsx(CONTROL, 'py-[10px] text-[13.5px]')}
        />
        <input
          type="tel"
          disabled={disabled}
          value={c.phone ?? ''}
          onChange={(e) => patch({ phone: e.target.value })}
          placeholder="Telephone"
          aria-label={`${field.label} — telephone`}
          className={clsx(CONTROL, 'py-[10px] text-[13.5px]')}
        />
      </div>,
    );
  }

  if (UPLOAD_TYPES.has(field.type)) {
    const filename = typeof value === 'string' ? value : '';

    return labelled(
      <div>
        <label
          className={clsx(
            'flex w-full cursor-pointer items-center gap-[10px] rounded-md border border-dashed px-[13px] py-[13px] text-[13.5px]',
            filename ? 'border-accent text-ink' : 'border-line-5 text-ink-3',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          {filename ? <Check size={16} /> : <Upload size={16} />}
          <span className="min-w-0 truncate">{filename || 'Choose a file'}</span>
          <input
            id={id}
            type="file"
            disabled={disabled}
            accept={
              field.type === 'image_upload'
                ? 'image/*'
                : field.type === 'document_upload'
                  ? '.pdf,.doc,.docx'
                  : undefined
            }
            onChange={(e) => onChange(e.target.files?.[0]?.name ?? '')}
            className="hidden"
          />
        </label>
      </div>,
    );
  }

  if (field.type === 'long_text' || field.type === 'address') {
    return labelled(
      <textarea
        id={id}
        rows={3}
        disabled={disabled}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(CONTROL, 'resize-y')}
      />,
    );
  }

  /* ---- default: a single-line input, typed to the field ---- */

  return labelled(
    <input
      id={id}
      type={INPUT_TYPE[field.type] ?? 'text'}
      disabled={disabled || field.readonly}
      value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
      onChange={(e) => onChange(e.target.value)}
      className={CONTROL}
    />,
  );
}
