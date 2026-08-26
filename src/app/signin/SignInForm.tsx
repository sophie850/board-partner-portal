'use client';

import { Check, Mail } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button, Callout, Label, TextInput } from '@/components/ui/primitives';

import { requestSignInLink } from './actions';

/* ============================================================
   Asking for a sign-in link

   No password, so nothing to forget or to reuse from somewhere
   else. The reply is the same whether or not the address is known —
   see the comment on the action.
   ============================================================ */

/** What each failure from the verify route means to the person holding the link. */
const LINK_ERRORS: Record<string, string> = {
  invalid: 'That sign-in link was not recognised. Ask for a new one below.',
  expired: 'That link had expired. They last 20 minutes — here is a fresh start.',
  used: 'That link had already been used. Links work once; ask for another below.',
  not_configured:
    'Sign-in is not switched on for this deployment yet. Your BOARD contact can help.',
};

export function SignInForm({
  next,
  error,
  signedOut,
  eventName,
}: {
  next?: string;
  error?: string;
  signedOut?: boolean;
  eventName: string;
}) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(
    error ? (LINK_ERRORS[error] ?? LINK_ERRORS.invalid) : null,
  );
  const [devLink, setDevLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setDevLink(null);

    startTransition(async () => {
      const result = await requestSignInLink(email, next ?? '');
      setMessage(result.message);
      setSent(result.sent);
      if (result.devLink) setDevLink(result.devLink);
    });
  }

  if (sent) {
    return (
      <div className="animate-rise">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-pill border border-accent-line bg-accent-fill text-accent">
          <Mail size={20} />
        </div>

        <h2 className="mb-2 text-[24px] font-light text-ink">Check your inbox</h2>
        <p className="mb-6 text-[13.5px] leading-relaxed text-ink-3">{message}</p>

        {devLink && (
          <Callout tone="warn" className="mb-6">
            <strong className="font-normal text-ink">
              This deployment is showing sign-in links on screen.
            </strong>{' '}
            That is what <code className="text-[12px]">AUTH_DEV_SHOW_LINK</code> does, and it
            means anybody can sign in as anybody. Turn it off before real partners use this.
            <a
              href={devLink}
              className="mt-3 block truncate text-[12px] text-accent hover:underline"
            >
              {devLink}
            </a>
          </Callout>
        )}

        <p className="text-[12.5px] leading-relaxed text-ink-4">
          The link works once and expires in 20 minutes. If nothing arrives, check the
          address you were invited on — a link is only sent to an address that already has
          an account.
        </p>

        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => {
            setSent(false);
            setMessage(null);
            setDevLink(null);
          }}
        >
          Use a different address
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="animate-rise">
      <h2 className="mb-2 text-[24px] font-light text-ink">Sign in</h2>
      <p className="mb-7 text-[13.5px] leading-relaxed text-ink-3">
        Enter the address you were invited on and we will email you a link. There is no
        password to remember.
      </p>

      {signedOut && (
        <Callout className="mb-5">
          <span className="flex items-center gap-2">
            <Check size={15} className="shrink-0 text-accent" />
            You are signed out.
          </span>
        </Callout>
      )}

      {message && (
        <Callout tone="warn" className="mb-5">
          {message}
        </Callout>
      )}

      <Label htmlFor="email">Email address</Label>
      <TextInput
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
        autoComplete="email"
        placeholder="you@company.com"
        className="mb-[18px]"
      />

      <Button type="submit" disabled={pending || !email.trim()} className="w-full">
        {pending ? 'Sending…' : 'Email me a link'}
      </Button>

      <p className="mt-6 text-[12px] leading-relaxed text-ink-4">
        Access to {eventName} is by invitation. If you need an account, ask your BOARD
        contact rather than signing up.
      </p>
    </form>
  );
}
