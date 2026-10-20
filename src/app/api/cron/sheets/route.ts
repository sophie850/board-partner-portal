import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/lib/env';
import { exportToSheets } from '@/lib/sheetsExport';

/* ============================================================
   The snapshot export

   Called on a schedule — see netlify/functions/sheets-export.mts —
   and by hand when somebody wants the sheet brought up to date now.

   It reads every partner's answers and sends them out of the
   building, so it is guarded the same way the reminder run is: a
   shared secret, because a scheduler has no cookie, and an outright
   refusal when none is configured. Unprotected is not a mode it has.

   It shares CRON_SECRET rather than inventing a second one. Both
   endpoints are the same kind of thing — a machine doing a thing on
   a timer — and a second secret to rotate buys nothing when leaking
   either already means the same blast radius.
   ============================================================ */

export const dynamic = 'force-dynamic';

/** Compare without leaking length or position through timing. */
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
          'CRON_SECRET is not set, so the export cannot be run. Set it in the Netlify ' +
          'environment and redeploy.',
      },
      { status: 503 },
    );
  }

  const header = request.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const given = bearer || request.headers.get('x-cron-secret') || '';

  if (!given || !sameSecret(given, expected)) {
    return NextResponse.json({ ok: false, error: 'Not authorised.' }, { status: 401 });
  }

  const result = await exportToSheets();

  // Logged as well as returned: a scheduled run has nobody watching
  // the response, and the function log is where it will be looked for.
  if (result.ok) {
    console.log(
      '[sheets] exported %s',
      result.tabs.map((t) => `${t.name} ${t.rows}`).join(', '),
    );
  } else {
    console.error('[sheets] export failed: %s', result.error);
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

/**
 * GET is accepted too.
 *
 * Some schedulers only issue one, and this is idempotent by
 * construction — it replaces the sheet with the current picture,
 * so running it twice leaves exactly what running it once did. It
 * is not a link anybody can follow: without the secret it is a 401.
 */
export async function GET(request: NextRequest) {
  return handle(request);
}
