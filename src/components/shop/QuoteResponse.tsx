'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { respondToQuote } from '@/app/portal/[partnerId]/shop/actions';

/* ============================================================
   Accepting or declining a quote

   Declining is destructive — it cancels that supplier's whole
   order — so it asks once before doing it. Accepting is not, and
   goes straight through.
   ============================================================ */

export function QuoteResponse({
  partnerId,
  supplierOrderId,
  supplierName,
}: {
  partnerId: string;
  supplierOrderId: string;
  supplierName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToQuote(partnerId, supplierOrderId, accept);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmingDecline(false);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {error && (
        <Callout tone="warn" className="mb-3">
          {error}
        </Callout>
      )}

      {confirmingDecline ? (
        <>
          <p className="mb-3 text-[13px] leading-relaxed text-ink-2">
            Declining cancels everything in this order from {supplierName}. It cannot be
            reinstated here — you would need to order again.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" size="sm" onClick={() => respond(false)} disabled={pending}>
              {pending ? 'Declining…' : 'Yes, decline the quote'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDecline(false)}
              disabled={pending}
            >
              Keep it
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => respond(true)} disabled={pending}>
            {pending ? 'Saving…' : 'Accept quote'}
          </Button>
          <Button
            variant="quiet"
            size="sm"
            onClick={() => setConfirmingDecline(true)}
            disabled={pending}
          >
            Decline
          </Button>
        </div>
      )}
    </div>
  );
}
