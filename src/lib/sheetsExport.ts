import 'server-only';

import { getDb } from '@/lib/db/store';
import { env } from '@/lib/env';
import { buildWorkbook, type Tab } from '@/lib/sheets';
import { sign } from '@/lib/webhooks';

/* ============================================================
   Sending the snapshot to Google

   The portal does not talk to the Sheets API. It POSTs the whole
   workbook to a Google Apps Script bound to one spreadsheet, and
   that script writes the tabs.

   That choice is deliberate and worth defending, because the
   obvious alternative is a service account and the googleapis
   client. This way there is no Google Cloud project to create, no
   service-account key to store in Netlify and rotate, no OAuth
   scope to get wrong, and no new dependency in the bundle. The
   secret is a string we generate, the transport is one signed POST,
   and the script lives inside the spreadsheet it writes — so
   whoever owns the sheet owns the integration.

   The signature is the same scheme the supplier webhooks use:
   HMAC-SHA256 over `timestamp.body`, so a captured request cannot
   be replayed later. See docs/sheets-apps-script.gs for the half
   that runs at Google.
   ============================================================ */

/** Long: the whole event in one request, over somebody's wifi. */
const TIMEOUT_MS = 60_000;

export interface ExportResult {
  ok: boolean;
  /** One per tab, for the organiser pressing the button. */
  tabs: Array<{ name: string; rows: number }>;
  error?: string;
}

/** Where the snapshot goes, if anywhere. */
export function sheetsConfigured(): boolean {
  return Boolean(env('SHEETS_WEBHOOK_URL') && env('SHEETS_WEBHOOK_SECRET'));
}

/**
 * Build the workbook and send it.
 *
 * Never throws: this runs on a schedule, and a failed export must
 * report itself rather than take down whatever called it.
 */
export async function exportToSheets(now: Date = new Date()): Promise<ExportResult> {
  const url = env('SHEETS_WEBHOOK_URL');
  const secret = env('SHEETS_WEBHOOK_SECRET');

  if (!url || !secret) {
    return {
      ok: false,
      tabs: [],
      error:
        'Not configured. Set SHEETS_WEBHOOK_URL and SHEETS_WEBHOOK_SECRET to the Apps Script ' +
        'deployment and the secret it checks.',
    };
  }

  let tabs: Tab[];
  try {
    tabs = buildWorkbook(await getDb(), now);
  } catch (e) {
    return {
      ok: false,
      tabs: [],
      error: `Could not read the portal: ${e instanceof Error ? e.message : 'unknown error'}`,
    };
  }

  const summary = tabs.map((t) => ({ name: t.name, rows: t.rows.length }));
  const body = JSON.stringify({ event: 'workbook', exportedAt: now.toISOString(), tabs });
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const signature = sign(secret, timestamp, body);

  /*
   * The signature travels in the query string, not only in headers.
   *
   * An Apps Script web app cannot read custom request headers at
   * all — doPost(e) is handed postData, parameter and pathInfo, and
   * nothing else. Headers are sent too, because they cost nothing
   * and are the right place if this ever points at something that
   * can read them, but the query string is what actually arrives.
   *
   * Putting a signature in a URL is safe in a way putting a secret
   * there would not be: this is a MAC over the body, it opens
   * nothing on its own, and a replay is bounded by the timestamp
   * the script checks.
   */
  const signed = new URL(url);
  signed.searchParams.set('x-board-timestamp', timestamp);
  signed.searchParams.set('x-board-signature', signature);

  try {
    const response = await fetch(signed, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-board-timestamp': timestamp,
        'x-board-signature': signature,
      },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const text = (await response.text()).slice(0, 500);

    if (!response.ok) {
      return { ok: false, tabs: summary, error: `Google replied ${response.status}: ${text}` };
    }

    /*
     * Apps Script answers 200 to a great many things it did not
     * actually do, including its own sign-in page when a deployment
     * is set to the wrong access level. So the script says "ok" in
     * its body, and anything else is treated as a failure — this is
     * the one check that catches the commonest misconfiguration.
     */
    if (!text.includes('"ok":true')) {
      /*
       * Two very different failures look alike from here, and
       * guessing between them sends somebody to the wrong setting.
       * The script answers JSON; a misconfigured deployment answers
       * Google's sign-in page, which is HTML. So the shape of the
       * reply decides what to say, and the script's own message is
       * relayed rather than talked over.
       */
      const reachedTheScript = text.trimStart().startsWith('{');

      return {
        ok: false,
        tabs: summary,
        error: reachedTheScript
          ? `The script refused the write: ${text}`
          : 'Google answered, but with a page rather than the script — the deployment is ' +
            'probably not set to "Anyone", so the request reached a sign-in page. It ' +
            `replied: ${text.slice(0, 200)}`,
      };
    }

    return { ok: true, tabs: summary };
  } catch (e) {
    return {
      ok: false,
      tabs: summary,
      error: e instanceof Error ? e.message : 'The export could not be sent.',
    };
  }
}
