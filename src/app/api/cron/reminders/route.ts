import { NextResponse, type NextRequest } from 'next/server';

import { runReminders } from '@/lib/reminders';
import { env } from '@/lib/env';

/* ============================================================
   The reminder run

   Called on a schedule — see netlify/functions/reminders.mts — and
   by the "Run reminders now" button in Event settings.

   This endpoint sends real email to real partners, so it is not
   protected by the portal's sign-in: a scheduler has no cookie.
   It carries a shared secret instead, and refuses outright when
   none is configured. Unprotected is not a mode it has.
   ============================================================ */

export const dynamic = 'force-dynamic';

/**
 * Compare without leaking length or position through timing.
 *
 * The window here is small, but a secret that grants "email every
 * partner" is worth the six lines.
 */
function sameSecret(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i += 1) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

async function handle(request: NextRequest) {
  const expected = env('CRON_SECRET');

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'CRON_SECRET is not set, so reminders cannot be run. Set it in the Netlify ' +
          'environment and redeploy.',
      },
      { status: 503 },
    );
  }

  // Either header — a scheduler sends Authorization, and the button
  // in Event settings has no reason to look like a browser request.
  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const given = bearer || request.headers.get('x-cron-secret') || '';

  if (!given || !sameSecret(given, expected)) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401 });
  }

  const result = await runReminders();

  // Logged as well as returned: a scheduled run has nobody watching
  // the response, and the function log is where it will be looked for.
  console.log(
    `[reminders] scanned ${result.scanned}, chased ${result.chased} ` +
      `in ${result.emails} email(s), already chased ${result.duplicate}, ` +
      `skipped ${result.skipped}, failed ${result.failed}`,
  );

  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/**
 * GET is accepted too.
 *
 * Some schedulers only issue one, and this is idempotent by
 * construction — the dedupe claim means a second call sends nothing.
 * It is not a link anybody can follow: without the secret it is a 401.
 */
export async function GET(request: NextRequest) {
  return handle(request);
}
