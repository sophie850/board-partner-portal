'use client';

import { CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { acknowledgePage } from '@/app/portal/[partnerId]/information/actions';

/* ============================================================
   Confirming you have read a page

   Deliberately two steps — tick, then confirm. A single button is
   too easy to press on the way past, and the whole point of an
   acknowledgement is that the person meant it.

   Once given it stands. There is no untick, because a record of
   somebody confirming something is not a preference.
   ============================================================ */

export function Acknowledge({
  partnerId,
  pageId,
  title,
  acknowledged,
}: {
  partnerId: string;
  pageId: string;
  title: string;
  /** Set once given — who, and when, in words. */
  acknowledged: { by: string; atLabel: string } | null;
}) {
  const router = useRouter();
  const [ticked, setTicked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (acknowledged) {
    return (
      <div className="mt-8 flex flex-wrap items-center gap-3 rounded-lg border border-accent-line bg-accent-fill px-[18px] py-[14px]">
        <CheckCircle2 size={17} className="shrink-0 text-accent" />
        <span className="text-[13px] text-ink-2">
          Acknowledged by{' '}
          <strong className="font-normal text-ink">{acknowledged.by}</strong> on{' '}
          {acknowledged.atLabel}.
        </span>
      </div>
    );
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgePage(partnerId, pageId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-warn-line bg-warn-fill px-[18px] py-[16px]">
      <div className="mb-1 text-[13.5px] text-ink">This page has to be acknowledged</div>
      <p className="mb-4 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-3">
        Confirm you have read it. Your name and the time are recorded, and it cannot be
        undone — so read it properly first.
      </p>

      {error && (
        <Callout tone="warn" className="mb-4">
          {error}
        </Callout>
      )}

      <label className="mb-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={ticked}
          onChange={(e) => setTicked(e.target.checked)}
          className="mt-[2px] h-4 w-4 shrink-0 accent-[var(--bp-blue)]"
        />
        <span className="text-[13px] leading-relaxed text-ink-2">
          I confirm I have read and understood “{title}”.
        </span>
      </label>

      <Button onClick={confirm} disabled={!ticked || pending}>
        {pending ? 'Recording…' : 'Confirm'}
      </Button>
    </div>
  );
}
