'use client';

import { clsx } from 'clsx';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout, Help, Label, TextInput } from '@/components/ui/primitives';

import {
  createEntitlement,
  deleteEntitlement,
  saveEntitlement,
  setGating,
  type GatedSurface,
} from '@/app/organiser/entitlements/actions';

/* ============================================================
   Entitlements

   The master vocabulary. Each row can be expanded into a reverse
   editor: pick a surface, then tick the items this entitlement
   should unlock — editing gating from the entitlement's side rather
   than opening thirty items one at a time.
   ============================================================ */

export interface GatedItem {
  id: string;
  label: string;
  /** Extra context, e.g. which form a field belongs to. */
  note?: string;
  attached: boolean;
}

export interface EntitlementRow {
  key: string;
  label: string;
  /** How many partners hold it. */
  partners: number;
  surfaces: Record<GatedSurface, GatedItem[]>;
}

const SURFACE_LABEL: Record<GatedSurface, string> = {
  products: 'Shop products',
  content_pages: 'Information pages',
  form_fields: 'Form fields',
  task_templates: 'Tasks',
  files: 'Files',
};

const SURFACE_ORDER: GatedSurface[] = [
  'products',
  'content_pages',
  'form_fields',
  'task_templates',
  'files',
];

export function EntitlementList({ rows }: { rows: EntitlementRow[] }) {
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createEntitlement(newLabel);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewLabel('');
      setCreating(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-6 flex justify-end">
        {creating ? (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-line-3 bg-panel px-[18px] py-4">
            <Label htmlFor="new-ent">New entitlement</Label>
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                id="new-ent"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Hospitality activation"
                autoFocus
                className="min-w-[240px] flex-1"
              />
              <Button size="sm" onClick={create} disabled={pending || !newLabel.trim()}>
                {pending ? 'Creating…' : 'Create'}
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  setCreating(false);
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
            <Help>
              The key is generated from the label and never changes, because rules and records
              refer to it.
            </Help>
            {error && <Callout tone="warn">{error}</Callout>}
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand"
          >
            <Plus size={16} /> New entitlement
          </button>
        )}
      </div>

      <div className="flex flex-col gap-[10px]">
        {rows.map((row) => (
          <Row key={row.key} row={row} />
        ))}
      </div>
    </>
  );
}

function Row({ row }: { row: EntitlementRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [surface, setSurface] = useState<GatedSurface | null>(null);
  const [label, setLabel] = useState(row.label);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalGated = SURFACE_ORDER.reduce(
    (sum, s) => sum + row.surfaces[s].filter((i) => i.attached).length,
    0,
  );

  const unused = row.partners === 0 && totalGated === 0;

  function rename() {
    setError(null);
    startTransition(async () => {
      const result = await saveEntitlement(row.key, label);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (
      !window.confirm(
        `Delete "${row.label}"? It is not in use anywhere, so nothing changes for any partner.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await deleteEntitlement(row.key);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggle(s: GatedSurface, itemId: string, attached: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setGating(s, itemId, row.key, attached);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line-2 bg-panel">
      <div className="flex flex-wrap items-center gap-4 px-[18px] py-4">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="min-w-[200px] flex-1 py-2 text-[13.5px]"
                aria-label={`Rename ${row.label}`}
              />
              <Button size="sm" onClick={rename} disabled={pending}>
                Save
              </Button>
              <Button
                size="sm"
                variant="quiet"
                onClick={() => {
                  setLabel(row.label);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="cursor-pointer border-none bg-transparent p-0 text-left text-[14.5px] text-ink hover:text-accent"
              >
                {row.label}
              </button>
              <div className="mt-[3px] font-mono text-[11px] text-ink-4">{row.key}</div>
            </>
          )}
        </div>

        <div className="shrink-0 text-right text-[11.5px] text-ink-4">
          <div>
            {row.partners} {row.partners === 1 ? 'partner' : 'partners'}
          </div>
          <div className="mt-[2px]">
            unlocks {totalGated} {totalGated === 1 ? 'item' : 'items'}
          </div>
        </div>

        {unused && (
          <button
            onClick={remove}
            disabled={pending}
            aria-label={`Delete ${row.label}`}
            title="Not used anywhere — safe to delete"
            className="flex h-[29px] w-[29px] shrink-0 cursor-pointer items-center justify-center rounded-pill border border-line-4 bg-transparent text-ink-4 hover:border-warn-line hover:text-warn"
          >
            <Trash2 size={13} />
          </button>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex shrink-0 cursor-pointer items-center gap-2 rounded-pill border border-line-4 px-[14px] py-[6px] text-[12px] text-ink-2 hover:border-line-5 hover:text-ink"
        >
          What it unlocks
          <ChevronDown
            size={13}
            className="transition-transform"
            style={{ transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      </div>

      {error && (
        <div className="px-[18px] pb-3">
          <Callout tone="warn">{error}</Callout>
        </div>
      )}

      {open && (
        <div className="border-t border-line px-[18px] py-4">
          {/* Pick a surface first — showing every item across all five
              at once was unreadable. */}
          <div className="mb-4 flex flex-wrap gap-2">
            {SURFACE_ORDER.map((s) => {
              const items = row.surfaces[s];
              const attached = items.filter((i) => i.attached).length;
              return (
                <button
                  key={s}
                  onClick={() => setSurface(surface === s ? null : s)}
                  aria-pressed={surface === s}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[14px] py-[7px] text-[12.5px] transition-colors',
                    surface === s
                      ? 'border-accent-line bg-accent-fill text-accent'
                      : 'border-line-3 text-ink-3 hover:text-ink',
                  )}
                >
                  {SURFACE_LABEL[s]}
                  <span className="ml-2 text-ink-4">
                    {attached}/{items.length}
                  </span>
                </button>
              );
            })}
          </div>

          {surface === null ? (
            <p className="text-[12.5px] text-ink-4">
              Choose a surface above to see what this entitlement gates there.
            </p>
          ) : row.surfaces[surface].length === 0 ? (
            <p className="text-[12.5px] text-ink-4">
              Nothing on this surface yet.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-[6px]">
                {row.surfaces[surface].map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-line-2 bg-inset px-[13px] py-[9px]"
                  >
                    <input
                      type="checkbox"
                      checked={item.attached}
                      disabled={pending}
                      onChange={(e) => toggle(surface, item.id, e.target.checked)}
                      className="h-4 w-4 shrink-0 accent-[var(--bp-blue)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{item.label}</span>
                      {item.note && (
                        <span className="block text-[11.5px] text-ink-4">{item.note}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <Help>
                Ticking adds this entitlement to the item&rsquo;s rule alongside any others.
                Unticking removes only this one — an item left with no entitlements is open
                to everyone.
              </Help>
            </>
          )}
        </div>
      )}
    </div>
  );
}
