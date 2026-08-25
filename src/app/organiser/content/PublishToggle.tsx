'use client';

import { useTransition } from 'react';

import type { Id } from '@/lib/types';

import { toggleContentPublished } from './actions';

/**
 * Publish / unpublish in place. Unpublishing removes a page from
 * every partner's information centre immediately, so it asks first.
 */
export function PublishToggle({ id, published }: { id: Id; published: boolean }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (published) {
      const ok = window.confirm(
        'Unpublish this page? Partners will no longer see it in their information centre.',
      );
      if (!ok) return;
    }
    startTransition(async () => {
      await toggleContentPublished(id, !published);
    });
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="shrink-0 cursor-pointer rounded-pill border border-line-4 bg-transparent px-[14px] py-[6px] text-[12px] text-ink-3 transition-colors hover:border-line-5 hover:text-ink disabled:opacity-50"
    >
      {pending ? '…' : published ? 'Unpublish' : 'Publish'}
    </button>
  );
}
