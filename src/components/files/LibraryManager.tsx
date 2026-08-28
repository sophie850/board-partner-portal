'use client';

import { Check, Download, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import { VisibilityEditor } from '@/components/ui/VisibilityEditor';
import {
  Button,
  Callout,
  Help,
  Label,
  StatusPill,
  TextInput,
} from '@/components/ui/primitives';
import type { Entitlement, FileAsset, Partner, VisibilityRule } from '@/lib/types';

import { deleteFile, saveFile } from '@/app/organiser/files/actions';

/* ============================================================
   The file library

   Everything the BOARD team gives partners: logo packs, floor
   plans, stand build specs, artwork templates. Each one carries a
   visibility rule, and that is what makes the library worth having
   — a partner opens Files and sees the four documents that apply
   to them, not the forty that exist.

   Uploading is optional. A file can be a link out to somewhere
   else entirely, which is how anything too large to sit in the
   bucket gets listed alongside the rest.
   ============================================================ */

/**
 * A file, with who it reaches already in words.
 *
 * The sentence is written server-side by the same module that
 * decides visibility, so the row and the rule cannot disagree.
 */
export interface LibraryRow extends FileAsset {
  reach: string;
}

/** Human size from the byte count the upload reports. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function LibraryManager({
  files,
  entitlements,
  partners,
}: {
  files: LibraryRow[];
  entitlements: Entitlement[];
  partners: Partner[];
}) {
  const [adding, setAdding] = useState(false);

  // Offered as suggestions when naming the next one, so a library
  // does not drift into "Floor plan", "Floorplans" and "floor plans".
  const kinds = Array.from(new Set(files.map((f) => f.kind).filter(Boolean))).sort();

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand"
        >
          <Plus size={16} /> Add a file
        </button>
      </div>

      {adding && (
        <div className="mb-4">
          <FileCard
            file={null}
            kinds={kinds}
            entitlements={entitlements}
            partners={partners}
            startOpen
            onDone={() => setAdding(false)}
          />
        </div>
      )}

      <div className="flex flex-col gap-[10px]">
        {files.map((f) => (
          <FileCard
            key={f.id}
            file={f}
            kinds={kinds}
            entitlements={entitlements}
            partners={partners}
          />
        ))}
      </div>
    </>
  );
}

function FileCard({
  file,
  kinds,
  entitlements,
  partners,
  startOpen,
  onDone,
}: {
  file: LibraryRow | null;
  kinds: string[];
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

  const [name, setName] = useState(file?.name ?? '');
  const [kind, setKind] = useState(file?.kind ?? '');
  const [size, setSize] = useState(file?.size ?? '');
  const [url, setUrl] = useState(file?.url ?? '');
  const [visibility, setVisibility] = useState<VisibilityRule>(
    file?.visibility ?? { type: 'all' },
  );

  const uid = file?.id ?? 'new';

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveFile({
        id: file?.id,
        name,
        kind,
        size,
        url: url || null,
        visibility,
      });

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
    if (!file) return;
    if (
      !window.confirm(
        `Delete “${file.name}”? It disappears from every partner's Files screen, and the stored copy is removed with it.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await deleteFile(file.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line-2 bg-panel">
      {file && (
        <div className="flex flex-wrap items-center gap-4 px-[18px] py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[10px]">
              <span className="text-[14.5px] text-ink">{file.name}</span>
              {!file.url && <StatusPill tone="warn">No file attached</StatusPill>}
            </div>
            <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
              <span>{file.kind || 'Uncategorised'}</span>
              {file.size && (
                <>
                  <span aria-hidden>·</span>
                  <span>{file.size}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{file.reach}</span>
            </div>
          </div>

          {file.url && (
            <a
              href={file.url}
              className="inline-flex shrink-0 items-center gap-[6px] text-[12px] text-accent no-underline hover:underline"
            >
              <Download size={13} /> Open
            </a>
          )}

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
        <div className={file ? 'border-t border-line px-[18px] py-4' : 'px-[18px] py-4'}>
          {error && (
            <Callout tone="warn" className="mb-4">
              {error}
            </Callout>
          )}

          <FileUpload
            purpose="document"
            folder="library"
            label={file?.url ? 'Replace the file' : 'Upload the file'}
            onUploaded={(f) => {
              setError(null);
              setUrl(f.url);
              setSize(formatBytes(f.size));
              // Only when there is nothing to overwrite — an
              // organiser who renamed it to something readable
              // should not lose that by uploading a new version.
              if (!name.trim()) setName(f.name);
            }}
          />

          <div className="mt-4 grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <div>
              <Label htmlFor={`file-name-${uid}`} required>
                Name partners see
              </Label>
              <TextInput
                id={`file-name-${uid}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Exhibition floor plan.pdf"
              />
            </div>
            <div>
              <Label htmlFor={`file-kind-${uid}`} required>
                Kind
              </Label>
              <TextInput
                id={`file-kind-${uid}`}
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                list={`file-kinds-${uid}`}
                placeholder="Floor plans"
              />
              <datalist id={`file-kinds-${uid}`}>
                {kinds.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor={`file-size-${uid}`}>Size</Label>
              <TextInput
                id={`file-size-${uid}`}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder="2.6 MB"
              />
              <Help>Filled in from the upload. Shown next to the name.</Help>
            </div>
            <div>
              <Label htmlFor={`file-url-${uid}`}>Link</Label>
              <TextInput
                id={`file-url-${uid}`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/api/files/… or https://…"
              />
              <Help>Set by the upload. Point it elsewhere for anything hosted off-portal.</Help>
            </div>
          </div>

          <div className="mt-5">
            <Label htmlFor={`file-visibility-${uid}`}>Visibility</Label>
            <VisibilityEditor
              id={`file-visibility-${uid}`}
              noun="file"
              value={visibility}
              onChange={setVisibility}
              entitlements={entitlements}
              partners={partners}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : file ? 'Save changes' : 'Add to the library'}
            </Button>
            {saved && (
              <span className="flex items-center gap-[6px] text-[12px] text-accent">
                <Check size={13} /> Saved
              </span>
            )}
            <div className="flex-1" />
            {file ? (
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
