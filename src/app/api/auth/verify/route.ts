import { NextResponse, type NextRequest } from 'next/server';

import {
  SESSION_COOKIE,
  SESSION_DAYS,
  sessionCookieOptions,
  signSession,
} from '@/lib/auth/cookie';
import { consumeToken } from '@/lib/auth/tokens';
import { getDb } from '@/lib/db/store';
import { env } from '@/lib/env';

/**
 * Exchange a sign-in link for a session.
 *
 * The token is spent here whatever happens next, so a link that has
 * been clicked once cannot be clicked again — including by anybody
 * who later gets hold of the email.
 */
export const dynamic = 'force-dynamic';

/** Where somebody lands when the link carried no destination. */
async function homeFor(kind: 'organiser' | 'partner', userId: string): Promise<string> {
  if (kind === 'organiser') return '/organiser';

  const db = await getDb();
  const user = db.partnerUsers.find((u) => u.id === userId);
  return user ? `/portal/${user.partnerId}` : '/signin';
}

export async function GET(request: NextRequest) {
  const secret = env('AUTH_SECRET');
  if (!secret) {
    return NextResponse.redirect(new URL('/signin?error=not_configured', request.url));
  }

  const token = request.nextUrl.searchParams.get('token') ?? '';
  const result = await consumeToken(token);

  if (!result.ok) {
    // The three failures are told apart for the person holding the
    // link, because the thing to do differs: ask for a new one, or
    // realise you already used this one.
    return NextResponse.redirect(new URL(`/signin?error=${result.reason}`, request.url));
  }

  const now = Math.floor(Date.now() / 1000);

  const cookie = await signSession(
    {
      kind: result.kind,
      userId: result.userId,
      email: result.email,
      issuedAt: now,
      expiresAt: now + SESSION_DAYS * 24 * 60 * 60,
    },
    secret,
  );

  const destination = result.nextPath || (await homeFor(result.kind, result.userId));

  const response = NextResponse.redirect(new URL(destination, request.url));

  response.cookies.set(
    SESSION_COOKIE,
    cookie,
    // Secure everywhere but plain-HTTP localhost, where a secure
    // cookie would simply be dropped and sign-in would appear to
    // fail for no reason.
    sessionCookieOptions(request.nextUrl.protocol === 'https:'),
  );

  return response;
}
