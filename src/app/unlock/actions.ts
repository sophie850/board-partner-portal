'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/lib/env';
import { GATE_COOKIE, gateToken, safeEqual } from '@/lib/gate';

/** Only same-site paths, so the gate cannot be used as an open redirect. */
function safeNext(next?: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/organiser';
  return next;
}

export async function unlock(passphrase: string, next?: string) {
  const expected = env('PORTAL_PASSPHRASE');

  // No passphrase configured means the gate is off; nothing to check.
  if (!expected) redirect(safeNext(next));

  if (!safeEqual(passphrase, expected)) {
    // Deliberately vague, and no hint about length or near-misses.
    return { error: 'That passphrase was not recognised.' };
  }

  const store = await cookies();
  store.set(GATE_COOKIE, await gateToken(expected), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env('NODE_ENV') === 'production',
    path: '/',
    // A working week, so the team is not re-entering it constantly.
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(safeNext(next));
}
