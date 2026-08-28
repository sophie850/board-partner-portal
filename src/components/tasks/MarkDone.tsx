'use client';

import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { setTaskDone } from '@/app/portal/[partnerId]/tasks/actions';

/* ============================================================
   Saying you have done it

   For the tasks the portal cannot see finish: a phone call to a
   contractor, a link followed somewhere else, a confirmation with
   no page behind it.

   An acknowledgement is confirmed in two steps and cannot be
   undone, because it is a record of somebody confirming something.
   The other two are self-reported progress, so a mis-tick can be
   put right — being unable to correct a slip is its own kind of
   broken.
   ============================================================ */

export function MarkDone({
  partnerId,
  taskId,
  title,
  kind,
  done,
}: {
  partnerId: string;
  taskId: string;
  title: string;
  /** Only these three ever reach this component. */
  kind: 'checklist' | 'url' | 'ack';
  done: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const permanent = kind === 'ack';

  function set(next: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setTaskDone(partnerId, taskId, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (error) {
    return (
      <div className="w-full">
        <Callout tone="warn" className="mb-2">
          {error}
        </Callout>
        <Button size="sm" variant="quiet" onClick={() => setError(null)}>
          Close
        </Button>
      </div>
    );
  }

  if (done) {
    // An acknowledgement stands. Nothing to offer here but the fact.
    if (permanent) return null;

    return (
      <button
        onClick={() => set(false)}
        disabled={pending}
        className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-ink-4 hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Reopening…' : 'Reopen'}
      </button>
    );
  }

  if (permanent && confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-ink-2">
          Confirm “{title}”? This is recorded and cannot be undone.
        </span>
        <Button size="sm" onClick={() => set(true)} disabled={pending}>
          {pending ? 'Recording…' : 'Confirm'}
        </Button>
        <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => (permanent ? setConfirming(true) : set(true))}
      disabled={pending}
    >
      <Check size={13} />
      {pending ? 'Saving…' : permanent ? 'Confirm' : 'Mark as done'}
    </Button>
  );
}
