'use client';

import { clsx } from 'clsx';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

/* ============================================================
   Upload control

   Posts to /api/upload and hands back the app URL the file is
   served from. The server re-checks type and size regardless of
   what is accepted here.
   ============================================================ */

export interface UploadedResult {
  key: string;
  url: string;
  name: string;
  size: number;
  contentType: string;
}

const ACCEPT: Record<string, string> = {
  image: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
  document: '.pdf,.zip,.doc,.docx,.xls,.xlsx,.ai,.eps',
};

export function FileUpload({
  purpose = 'image',
  folder,
  onUploaded,
  label,
  compact,
}: {
  purpose?: 'image' | 'document';
  folder: string;
  onUploaded: (file: UploadedResult) => void;
  label?: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setDone(null);
    setBusy(true);

    try {
      const body = new FormData();
      body.append('file', file);
      body.append('purpose', purpose);
      body.append('folder', folder);

      const response = await fetch('/api/upload', { method: 'POST', body });
      const result = await response.json();

      if (!result.ok) {
        setError(result.error ?? 'The upload failed.');
        return;
      }

      setDone(result.file.name);
      onUploaded(result.file);
    } catch {
      setError('The upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
      // Allow re-selecting the same file after a failure.
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div>
      <label
        className={clsx(
          'flex cursor-pointer items-center gap-[10px] rounded-md border border-dashed transition-colors',
          compact ? 'px-[11px] py-[9px] text-[13px]' : 'px-[13px] py-[13px] text-[13.5px]',
          done ? 'border-accent text-ink' : 'border-line-5 text-ink-3 hover:border-line-4',
          busy && 'cursor-wait opacity-70',
        )}
      >
        {busy ? (
          <Loader2 size={16} className="shrink-0 animate-spin" />
        ) : done ? (
          <Check size={16} className="shrink-0 text-accent" />
        ) : (
          <Upload size={16} className="shrink-0" />
        )}
        <span className="min-w-0 truncate">
          {busy ? 'Uploading…' : done ? done : (label ?? 'Choose a file')}
        </span>
        <input
          ref={input}
          type="file"
          accept={ACCEPT[purpose]}
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="hidden"
        />
      </label>

      {error && (
        <div role="alert" className="mt-[6px] flex items-start gap-2 text-[12px] text-warn">
          <X size={13} className="mt-[2px] shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
