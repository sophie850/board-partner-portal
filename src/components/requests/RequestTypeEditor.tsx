'use client';

import { Check, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FieldListEditor } from '@/components/forms/FieldListEditor';
import {
  Button,
  Callout,
  Help,
  Label,
  Select,
  TextInput,
} from '@/components/ui/primitives';
import type { Entitlement, FormField, Partner, RequestType } from '@/lib/types';

import { deleteRequestType, saveRequestType } from '@/app/organiser/requests/types/actions';

/* ============================================================
   Request types

   The shape of a question a partner can raise. Same field editor
   the form builder uses, minus per-field visibility: a request is
   something a partner chooses to raise rather than something sent
   to them, so there is no rule deciding who sees which question.
   Every partner filling in "Report a problem" answers the same
   things.
   ============================================================ */

export interface TypeView extends RequestType {
  /** How many requests have been raised under it. */
  used: number;
}

export function RequestTypeList({
  types,
  owners,
  entitlements,
  partners,
}: {
  types: TypeView[];
  /** BOARD team members who can be a default owner. */
  owners: string[];
  entitlements: Entitlement[];
  partners: Partner[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand"
        >
          <Plus size={16} /> New request type
        </button>
      </div>

      {adding && (
        <div className="mb-4">
          <TypeCard
            type={null}
            owners={owners}
            entitlements={entitlements}
            partners={partners}
            startOpen
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-[10px]">
        {types.map((t) => (
          <TypeCard
            key={t.id}
            type={t}
            owners={owners}
            entitlements={entitlements}
            partners={partners}
          />
        ))}
      </div>
    </>
  );
}

function TypeCard({
  type,
  owners,
  entitlements,
  partners,
  startOpen,
  onDone,
}: {
  type: TypeView | null;
  owners: string[];
  entitlements: Entitlement[];
  partners: Partner[];
  startOpen?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(type?.name ?? '');
  const [ownerDefault, setOwnerDefault] = useState(type?.ownerDefault ?? '');
  const [fields, setFields] = useState<FormField[]>(type?.fields ?? []);

  const uid = type?.id ?? 'new';

  // An owner who has since left the team would otherwise vanish from
  // the list and be silently cleared on the next save.
  const ownerOptions = ownerDefault && !owners.includes(ownerDefault)
    ? [ownerDefault, ...owners]
    : owners;

  const answerable = fields.filter(
    (f) => f.type !== 'section_heading' && f.type !== 'guidance',
  ).length;

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveRequestType({ id: type?.id, name, ownerDefault, fields });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
      onDone?.();
      window.setTimeout(() => setSaved(false), 2500);
    });
  }

  function remove() {
    if (!type) return;
    if (!window.confirm(`Delete “${type.name}”? Partners will no longer be able to raise it.`))
      return;

    setError(null);
    startTransition(async () => {
      const result = await deleteRequestType(type.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line-2 bg-panel">
      {type && (
        <div className="flex flex-wrap items-center gap-4 px-[18px] py-4">
          <div className="min-w-0 flex-1">
            <div className="text-[14.5px] text-ink">{type.name}</div>
            <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
              <span>
                {type.fields.length} {type.fields.length === 1 ? 'field' : 'fields'}
              </span>
              <span aria-hidden>·</span>
              <span>{type.ownerDefault ? `Goes to ${type.ownerDefault}` : 'Unassigned'}</span>
              <span aria-hidden>·</span>
              <span>{type.used === 0 ? 'Never used' : `${type.used} raised`}</span>
            </div>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="shrink-0 cursor-pointer rounded-pill border border-line-4 px-[14px] py-[6px] text-[12px] text-ink-2 hover:border-line-5 hover:text-ink"
          >
            {open ? 'Close' : 'Edit'}
          </button>
        </div>
      )}

      {open && (
        <div className={type ? 'border-t border-line px-[18px] py-4' : 'px-[18px] py-4'}>
          {error && (
            <Callout tone="warn" className="mb-4">
              {error}
            </Callout>
          )}

          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <div>
              <Label htmlFor={`rt-name-${uid}`} required>
                Name
              </Label>
              <TextInput
                id={`rt-name-${uid}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Request additional passes"
              />
              <Help>What a partner picks from when raising a request.</Help>
            </div>
            <div>
              <Label htmlFor={`rt-owner-${uid}`}>Goes to</Label>
              <Select
                id={`rt-owner-${uid}`}
                value={ownerDefault}
                onChange={(e) => setOwnerDefault(e.target.value)}
              >
                <option value="">Nobody in particular</option>
                {ownerOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
              <Help>
                Who it lands with by default. Any request can be reassigned from the inbox.
              </Help>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-[10px] text-[11px] tracking-[0.05em] text-ink-4 uppercase">
              What the partner fills in
            </div>
            <FieldListEditor
              fields={fields}
              onChange={setFields}
              entitlements={entitlements}
              partners={partners}
              emptyText="No fields yet. A type with none is just a subject line — add what you need to know to act on it."
              // A request is raised by the partner, not sent to them,
              // so there is nobody to gate a field against.
              allowVisibility={false}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : type ? 'Save changes' : 'Create request type'}
            </Button>
            {saved && (
              <span className="flex items-center gap-[6px] text-[12px] text-accent">
                <Check size={13} /> Saved
              </span>
            )}
            <span className="text-[11.5px] text-ink-4">
              {answerable} {answerable === 1 ? 'question' : 'questions'} for the partner
            </span>
            <div className="flex-1" />
            {type ? (
              <Button size="sm" variant="quiet" onClick={remove} disabled={pending}>
                <Trash2 size={13} /> Delete
              </Button>
            ) : (
              <Button size="sm" variant="quiet" onClick={onDone} disabled={pending}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
