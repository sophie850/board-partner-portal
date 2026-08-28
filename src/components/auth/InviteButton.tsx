'use client';

import { Check, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { sendInvitation } from '@/lib/auth/actions';

/* ============================================================
   "Invite them in"

   Sends the Partner invitation template, with a sign-in link in it.
   Resending is allowed and normal — the first one went to spam, or
   the person who was sent it has left — so the button changes its
   wording rather than disappearing.

   A resend asks first. Everyone who has been chased by a system
   that fired twice knows why.
   ============================================================ */

export function InviteButton({
  userId,
  name,
  invited,
}: {
  userId: string;
  name: string;
  /** Whether they have been invited before. */
  invited: boolean;
}) {
  const router = useRouter();
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (invited && !window.confirm(`Send ${name} another invitation?`)) return;

    setError(null);
    startTransition(async () => {
      const result = await sendInvitation(userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSent(result.email);
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

  if (sent) {
    return (
      <span className="flex shrink-0 items-center gap-[6px] text-[12px] text-accent">
        <Check size={13} /> Sent to {sent}
      </span>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={send} disabled={pending}>
      <Mail size={13} />
      {pending ? 'Sending…' : invited ? 'Resend invitation' : 'Send invitation'}
    </Button>
  );
}
