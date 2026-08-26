'use client';

import { Check, Copy, KeyRound, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button, Callout } from '@/components/ui/primitives';

import { createSignInLink } from '@/lib/auth/actions';

/* ============================================================
   "Get a sign-in link"

   For the phone call that starts "I never got the email". The
   organiser generates a link and sends it however they normally
   reach that person.

   The link is shown rather than emailed, because the whole reason
   for reaching for this is that email is not working.
   ============================================================ */

export function HandLinkButton({
  kind,
  userId,
  name,
}: {
  kind: 'organiser' | 'partner';
  userId: string;
  name: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(120);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createSignInLink(kind, userId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
      setMinutes(result.expiresInMinutes);
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('Your browser would not let it be copied. Select the link and copy it.');
    }
  }

  if (error && !url) {
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

  if (url) {
    return (
      <div className="w-full rounded-lg border border-warn-line bg-warn-fill px-[14px] py-[12px]">
        <div className="mb-2 flex items-start justify-between gap-3">
          <span className="text-[12.5px] leading-relaxed text-ink-2">
            Anyone holding this link signs in as{' '}
            <strong className="font-normal text-ink">{name}</strong>. Send it to them
            directly — not to a shared channel. It works once and expires in{' '}
            {minutes >= 60 ? `${Math.round(minutes / 60)} hours` : `${minutes} minutes`}.
          </span>
          <button
            onClick={() => setUrl(null)}
            aria-label="Hide the link"
            className="shrink-0 cursor-pointer border-none bg-transparent text-ink-4 hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border border-line-3 bg-inset px-[10px] py-[7px] text-[11.5px] text-ink-2">
            {url}
          </code>
          <Button size="sm" onClick={copy}>
            {copied ? (
              <>
                <Check size={13} /> Copied
              </>
            ) : (
              <>
                <Copy size={13} /> Copy
              </>
            )}
          </Button>
        </div>

        {error && (
          <p className="mt-2 text-[12px] text-warn" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={generate} disabled={pending}>
      <KeyRound size={13} />
      {pending ? 'Creating…' : 'Sign-in link'}
    </Button>
  );
}
