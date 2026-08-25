import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';
import { GATE_COOKIE, gateToken, safeEqual } from '@/lib/gate';

/**
  * Holds the whole site behind the shared passphrase, when one is set.
 *
 * Runs before every request that is not a static asset, so there is
 * no route that quietly bypasses it — including server actions and
 * route handlers, which is the part a page-level check would miss.
 */
export async function proxy(request: NextRequest) {
  const passphrase = env('PORTAL_PASSPHRASE');

  // No passphrase configured: the site is intentionally open.
  if (!passphrase) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // The unlock screen and its action must stay reachable, or there
  // is no way in. The health check is deliberately open too: it
  // returns configuration shape and row counts only — never data —
  // and its whole purpose is diagnosing a site you cannot get into.
  if (
    pathname === '/unlock' ||
    pathname.startsWith('/api/unlock') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(GATE_COOKIE)?.value ?? '';
  const expected = await gateToken(passphrase);

  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/unlock';
  // Send them back where they were aiming once they are through.
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the favicon.
    '/((?!_next/static|_next/image|favicon.ico|fonts/|assets/).*)',
  ],
};
