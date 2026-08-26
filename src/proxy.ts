import { NextResponse, type NextRequest } from 'next/server';

import { readSession, SESSION_COOKIE } from '@/lib/auth/cookie';
import { env } from '@/lib/env';
import { GATE_COOKIE, gateToken, safeEqual } from '@/lib/gate';

/* ============================================================
   The front door

   Runs before every request that is not a static asset, so there is
   no route that quietly bypasses it — including server actions and
   route handlers, which a page-level check would miss.

   Two mechanisms, and only ever one of them in force:

     * AUTH_SECRET set — real sign-in. Individual accounts, and the
       app knows who each visitor is.
     * AUTH_SECRET unset — the shared passphrase, if PORTAL_PASSPHRASE
       is set. One secret, no identity.

   Sign-in supersedes the passphrase rather than stacking on top of
   it: two walls in front of the same door is a nuisance, not twice
   the security.

   This is the cheap check — is there a valid session at all. It
   cannot tell whether *this* user may see *this* partner, because
   that needs the database and middleware runs on the edge. The
   guards in lib/auth/session.ts do that on every route.
   ============================================================ */

/** Reachable without a session, or there would be no way in. */
function isOpenPath(pathname: string): boolean {
  return (
    pathname === '/signin' ||
    pathname === '/unlock' ||
    pathname === '/denied' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/unlock') ||
    // Deliberately open: it returns configuration shape and row
    // counts only — never data — and its whole purpose is diagnosing
    // a site you cannot get into.
    pathname === '/api/health'
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authSecret = env('AUTH_SECRET');

  if (authSecret) {
    if (isOpenPath(pathname)) return NextResponse.next();

    const claims = await readSession(
      request.cookies.get(SESSION_COOKIE)?.value,
      authSecret,
    );
    if (claims) return NextResponse.next();

    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.search = '';
    // Send them back where they were aiming once they are through.
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  /* ---- no sign-in configured: the shared passphrase ---- */

  const passphrase = env('PORTAL_PASSPHRASE');

  // Neither configured: the site is intentionally open.
  if (!passphrase) return NextResponse.next();

  if (isOpenPath(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(GATE_COOKIE)?.value ?? '';
  const expected = await gateToken(passphrase);

  if (cookie && safeEqual(cookie, expected)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except Next's own assets and the favicon.
    '/((?!_next/static|_next/image|favicon.ico|fonts/|assets/).*)',
  ],
};
