import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_COOKIE } from '@/lib/auth/cookie';

/**
 * Sign out.
 *
 * POST rather than GET: a link an email client or a prefetcher can
 * follow would sign people out by accident.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/signin?signed_out=1', request.url), {
    // The browser must not repeat the POST at the new address.
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 0,
  });

  return response;
}
