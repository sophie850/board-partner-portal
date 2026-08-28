'use client';

import { clsx } from 'clsx';

import { FieldError, Help, Select } from '@/components/ui/primitives';
import type { Entitlement, Partner, VisibilityRule } from '@/lib/types';

/* ============================================================
   Visibility

   The one rule shape the whole portal runs on: content pages,
   library files, products, tasks and form fields all ask the same
   question — who is this for?

   Entitlement matching is ANY-of. That is the part people get
   wrong, so the hint says it in words rather than leaving it to be
   discovered when the wrong partner sees the wrong floor plan.

   `noun` is only used in the hints, so a file says "the file" and a
   page says "the page". It changes nothing about the rule. Callers
   with something more specific to say can override either hint
   outright — a form is "sent to" partners, not "shown to" them.
   ============================================================ */

export function VisibilityEditor({
  id = 'visibility',
  noun = 'page',
  value,
  onChange,
  entitlements,
  partners,
  compact,
  emptyHint,
  anyHint,
}: {
  /** Ties the control to its <Label htmlFor>. */
  id?: string;
  /** What is being gated, in the hints. */
  noun?: string;
  value: VisibilityRule;
  onChange: (v: VisibilityRule) => void;
  entitlements: Entitlement[];
  partners: Partner[];
  /** Tighter, for use inside a row rather than a page. */
  compact?: boolean;
  /** Replaces "no entitlements selected…" when the default is wrong. */
  emptyHint?: string;
  /** Replaces the ANY-of sentence when the default is wrong. */
  anyHint?: string;
}) {
  const type = value.type ?? 'all';
  const keys = Array.isArray(value.keys) ? value.keys : value.key ? [value.key] : [];
  const selectedPartners = value.partners ?? [];

  function setType(next: string) {
    if (next === 'all') onChange({ type: 'all' });
    else if (next === 'entitlement') onChange({ type: 'entitlement', keys: [] });
    else onChange({ type: 'partner', partners: [] });
  }

  function toggleKey(key: string) {
    const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
    onChange({ type: 'entitlement', keys: next });
  }

  function togglePartner(partnerId: string) {
    const next = selectedPartners.includes(partnerId)
      ? selectedPartners.filter((p) => p !== partnerId)
      : [...selectedPartners, partnerId];
    onChange({ type: 'partner', partners: next });
  }

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
        <div className={compact ? 'mt-2' : 'mt-3'}>
          <div className="flex flex-wrap gap-2">
            {entitlements.map((e) => {
              const on = keys.includes(e.key);
              return (
                <button
                  key={e.key}
                  onClick={() => toggleKey(e.key)}
                  aria-pressed={on}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] transition-colors',
                    on
                      ? 'border-accent-line bg-accent-fill text-accent'
                      : 'border-line-3 bg-transparent text-ink-3 hover:text-ink',
                  )}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          <Help>
            {keys.length === 0
              ? (emptyHint ??
                `No entitlements selected — the ${noun} would be visible to everyone. Pick at least one.`)
              : keys.length === 1
                ? 'Shown to partners holding this entitlement.'
                : (anyHint ??
                  'Shown to partners holding any one of these — they do not need all of them.')}
          </Help>
        </div>
      )}

      {type === 'partner' && (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          <div className="flex flex-wrap gap-2">
            {partners.map((p) => {
              const on = selectedPartners.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePartner(p.id)}
                  aria-pressed={on}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] transition-colors',
                    on
                      ? 'border-accent-line bg-accent-fill text-accent'
                      : 'border-line-3 bg-transparent text-ink-3 hover:text-ink',
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selectedPartners.length === 0 && (
            <FieldError>Choose at least one partner, or this {noun} reaches nobody.</FieldError>
          )}
        </div>
      )}
    </>
  );
}
