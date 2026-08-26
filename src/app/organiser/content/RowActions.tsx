'use client';

import { Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import type { Id } from '@/lib/types';

import { deleteContentPage, toggleContentPublished } from './actions';

/* ============================================================
   Row actions

   Unpublish is reversible and asks once. Delete is not, so it asks
   for the page's title to be typed — a page can represent a lot of
   writing, and a mis-click in a list should not be able to destroy
   it.
   ============================================================ */

export function RowActions({
  id,
  title,
  published,
}: {
  id: Id;
  title: string;
  published: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);

  function togglePublish() {
    if (published) {
      const ok = window.confirm(
        `Unpublish "${title}"? Partners will no longer see it in their information centre. You can publish it again at any time.`,
      );
      if (!ok) return;
    }
    startTransition(async () => {
      const result = await toggleContentPublished(id, !published);
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteContentPage(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex basis-full flex-col gap-2 rounded-lg border border-warn-line bg-warn-fill px-[14px] py-3">
        <div className="text-[12.5px] leading-relaxed text-ink">
          Deleting <strong className="font-normal">{title}</strong> cannot be undone. Any task
          linking to it will lose its target.
        </div>
        <div className="text-[11.5px] text-ink-3">
          Type the page title to confirm.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={title}
            aria-label={`Type "${title}" to confirm deletion`}
            autoFocus
            className="min-w-[200px] flex-1 rounded-sm border border-line-4 bg-inset px-[11px] py-[7px] text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-warn-line focus:ring-2 focus:ring-warn-line"
          />
          <button
            onClick={remove}
            disabled={pending || typed.trim() !== title.trim()}
            className="cursor-pointer rounded-pill border border-warn-line bg-warn px-[14px] py-[6px] text-[12px] text-inset disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Deleting…' : 'Delete permanently'}
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setTyped('');
              setError(null);
            }}
            disabled={pending}
            className="cursor-pointer border-none bg-transparent text-[12px] text-ink-3 hover:text-ink"
          >
            Cancel
          </button>
        </div>
        {error && (
          <div role="alert" className="text-[12px] text-warn">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={togglePublish}
        disabled={pending}
        className="shrink-0 cursor-pointer rounded-pill border border-line-4 bg-transparent px-[14px] py-[6px] text-[12px] text-ink-3 transition-colors hover:border-line-5 hover:text-ink disabled:opacity-50"
      >
        {pending ? '…' : published ? 'Unpublish' : 'Publish'}
      </button>

      <button
        onClick={() => setConfirming(true)}
        disabled={pending}
        aria-label={`Delete ${title}`}
        title="Delete permanently"
        className="flex h-[29px] w-[29px] shrink-0 cursor-pointer items-center justify-center rounded-pill border border-line-4 bg-transparent text-ink-4 transition-colors hover:border-warn-line hover:text-warn disabled:opacity-50"
      >
        <Trash2 size={13} />
      </button>

      {error && (
        <span role="alert" className="text-[12px] text-warn">
          {error}
        </span>
      )}
    </>
  );
}
