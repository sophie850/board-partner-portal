'use client';

import { useState, useTransition } from 'react';

import { Button, Callout, Label, TextInput } from '@/components/ui/primitives';

import { unlock } from './actions';

export function UnlockForm({ next, error }: { next?: string; error?: string }) {
  const [passphrase, setPassphrase] = useState('');
  const [message, setMessage] = useState<string | null>(
    error === 'wrong' ? 'That passphrase was not recognised.' : null,
  );
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await unlock(passphrase, next);
      // A successful unlock redirects, so reaching here means it failed.
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="animate-rise">
      <h2 className="mb-2 text-[24px] font-light text-ink">Enter the passphrase</h2>
      <p className="mb-7 text-[13.5px] leading-relaxed text-ink-3">
        The portal is not open to the public yet. Use the shared passphrase from the BOARD
        team; individual sign-in is coming.
      </p>

      {message && (
        <Callout tone="warn" className="mb-5">
          {message}
        </Callout>
      )}

      <Label htmlFor="passphrase">Passphrase</Label>
      <TextInput
        id="passphrase"
        type="password"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        autoFocus
        autoComplete="current-password"
        className="mb-[18px]"
      />

      <Button type="submit" disabled={pending || !passphrase} className="w-full">
        {pending ? 'Checking…' : 'Continue'}
      </Button>
    </form>
  );
}
