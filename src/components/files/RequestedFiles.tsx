'use client';

import { clsx } from 'clsx';
import { Check, FileText } from 'lucide-react';
import { useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import { Button, Callout, Panel, StatusPill } from '@/components/ui/primitives';

import {
  attachRequestedFile,
  clearRequestedFile,
} from '@/app/portal/[partnerId]/files/actions';

/* ============================================================
   The slots a partner has to fill

   One row per thing the BOARD team asked for. A slot is either
   empty, filled, or overdue — nothing else, because a partner
   reading this wants to know what is left to do.
   ============================================================ */

export interface RequestedSlot {
  id: string;
  label: string;
  dueLabel: string | null;
  overdue: boolean;
  required: boolean;
  file: { name: string; url: string; uploadedLabel: string; by: string } | null;
}

export function RequestedFiles({
  partnerId,
  slots,
}: {
  partnerId: string;
  slots: RequestedSlot[];
}) {
  return (
    <div className="flex flex-col gap-[10px]">
      {slots.map((slot) => (
        <Slot key={slot.id} partnerId={partnerId} slot={slot} />
      ))}
    </div>
  );
}

function Slot({ partnerId, slot }: { partnerId: string; slot: RequestedSlot }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [replacing, setReplacing] = useState(false);

  function attach(name: string, url: string) {
    setError(null);
    startTransition(async () => {
      const result = await attachRequestedFile(partnerId, slot.id, name, url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReplacing(false);
    });
  }

  function clear() {
    setError(null);
    startTransition(async () => {
      const result = await clearRequestedFile(partnerId, slot.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Panel className="px-[18px] py-[16px]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-ink">{slot.label}</span>
            {!slot.required && <StatusPill tone="muted">Optional</StatusPill>}
          </div>
          {slot.dueLabel && (
            <div
              className={clsx(
                'mt-[3px] text-[11.5px]',
                slot.overdue && !slot.file ? 'text-warn' : 'text-ink-4',
              )}
            >
              {slot.overdue && !slot.file ? 'Was due ' : 'Due '}
              {slot.dueLabel}
            </div>
          )}
        </div>

        {slot.file ? (
          <StatusPill tone="good">Provided</StatusPill>
        ) : slot.overdue ? (
          <StatusPill tone="warn">Overdue</StatusPill>
        ) : (
          <StatusPill tone="neutral">Needed</StatusPill>
        )}
      </div>

      {error && (
        <Callout tone="warn" className="mb-3">
          {error}
        </Callout>
      )}

      {slot.file && !replacing ? (
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-line-2 bg-inset px-[14px] py-[11px]">
          <Check size={15} className="shrink-0 text-accent" />
          <a
            href={slot.file.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-[13.5px] text-ink no-underline hover:underline"
          >
            {slot.file.name}
          </a>
          <span className="shrink-0 text-[11.5px] text-ink-4">
            {slot.file.by} · {slot.file.uploadedLabel}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setReplacing(true)} disabled={pending}>
            Replace
          </Button>
          <Button size="sm" variant="quiet" onClick={clear} disabled={pending}>
            Remove
          </Button>
        </div>
      ) : (
        <div>
          <FileUpload
            purpose="document"
            folder="partner-files"
            label={slot.file ? `Replace ${slot.file.name}` : 'Choose a file'}
            onUploaded={(f) => attach(f.name, f.url)}
          />
          {replacing && (
            <Button
              size="sm"
              variant="quiet"
              className="mt-2"
              onClick={() => setReplacing(false)}
            >
              Keep the current file
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------
   The library — files the organiser publishes to partners
   --------------------------------------------------------------- */

export interface LibraryFile {
  id: string;
  name: string;
  kind: string;
  size: string;
  url: string | null;
}

export function FileLibrary({ files }: { files: LibraryFile[] }) {
  return (
    <div className="grid grid-cols-2 gap-[10px] max-md:grid-cols-1">
      {files.map((file) => {
        const body = (
          <>
            <FileText size={17} className="shrink-0 text-ink-4" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] text-ink">{file.name}</div>
              <div className="mt-[2px] text-[11.5px] text-ink-4">
                {[file.kind, file.size].filter(Boolean).join(' · ')}
              </div>
            </div>
          </>
        );

        const shell =
          'flex items-center gap-3 rounded-xl border border-line-2 bg-panel px-[16px] py-[13px] no-underline';

        // A file with no stored object is still worth listing — the
        // partner can see it exists and chase it — but it must not
        // look like something they can open.
        return file.url ? (
          <a
            key={file.id}
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className={clsx(shell, 'transition-colors hover:border-line-4')}
          >
            {body}
          </a>
        ) : (
          <div key={file.id} className={clsx(shell, 'opacity-60')}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
