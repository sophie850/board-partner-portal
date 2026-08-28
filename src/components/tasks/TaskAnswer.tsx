'use client';

import { Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { setTaskState } from '@/app/portal/[partnerId]/tasks/actions';

/* ============================================================
   Answering a task

   Two different things live here, because on a shop task they sit
   side by side and reading them as one control is the point:

     "Mark as done"  — for the kinds the portal cannot watch finish.
                       On a shop task it reads "Finished ordering",
                       because partners order in waves and only they
                       know which order was the last one.
     "Not needed"    — for the ones that are an offer, not a duty.

   A partner who does not want AV should be able to say so in one
   click and stop hearing about it. Saying so is an answer, not a
   dismissal: it is recorded, an organiser can see it, and it can be
   taken back the moment they change their mind.
   ============================================================ */

export function TaskAnswer({
  partnerId,
  taskId,
  title,
  /** Present only where the partner may tick it themselves. */
  tickable,
  /** Present only where "not needed" is a real answer. */
  declinable,
  /** Two-step, and no undo. Acknowledgements only. */
  permanent,
  /** "Finished ordering" reads better than "Mark as done" on a shop task. */
  doneLabel = 'Mark as done',
  done,
  declined,
}: {
  partnerId: string;
  taskId: string;
  title: string;
  tickable: boolean;
  declinable: boolean;
  permanent: boolean;
  doneLabel?: string;
  done: boolean;
  declined: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(answer: 'done' | 'declined' | 'open') {
    setError(null);
    startTransition(async () => {
      const result = await setTaskState(partnerId, taskId, answer);
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

  /*
   * A declined task can always be reopened. Someone who did not want
   * AV in January may well want it in March, and making that hard
   * would only turn into an email to the BOARD team.
   */
  if (declined) {
    return (
      <button
        onClick={() => set('open')}
        disabled={pending}
        className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-accent hover:underline disabled:opacity-50"
      >
        {pending ? 'Reopening…' : 'Actually, I do need this'}
      </button>
    );
  }

  if (done) {
    // An acknowledgement stands. Nothing to offer but the fact.
    if (permanent || !tickable) return null;

    return (
      <button
        onClick={() => set('open')}
        disabled={pending}
        className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-ink-4 hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Reopening…' : 'Reopen'}
      </button>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[12px] text-ink-2">
          Confirm “{title}”? This is recorded and cannot be undone.
        </span>
        <Button size="sm" onClick={() => set('done')} disabled={pending}>
          {pending ? 'Recording…' : 'Confirm'}
        </Button>
        <Button size="sm" variant="quiet" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {tickable && (
        <Button
          size="sm"
          onClick={() => (permanent ? setConfirming(true) : set('done'))}
          disabled={pending}
        >
          <Check size={13} />
          {pending ? 'Saving…' : permanent ? 'Confirm' : doneLabel}
        </Button>
      )}

      {declinable && (
        <button
          onClick={() => set('declined')}
          disabled={pending}
          className="inline-flex cursor-pointer items-center gap-[5px] border-none bg-transparent p-0 text-[12px] text-ink-4 hover:text-ink disabled:opacity-50"
        >
          <X size={12} /> {pending ? 'Saving…' : 'Not needed'}
        </button>
      )}
    </div>
  );
}
