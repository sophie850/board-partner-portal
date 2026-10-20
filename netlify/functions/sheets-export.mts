/* ============================================================
   The nightly snapshot to Google Sheets

   Same shape as reminders.mts, and for the same reason: Netlify's
   scheduler cannot call a Next.js route directly, so this is the
   thin thing it can call.

   02:00 UTC. Late enough that a partner working into the evening
   anywhere in Europe is included, early enough that the sheet is
   already right when somebody opens it in the morning.

   A snapshot rather than a feed, so a run that fails is not a hole
   in the record — tomorrow's run is simply correct again. That is
   the whole argument for doing it this way, and it is why nothing
   here retries.
   ============================================================ */

export const config = {
  schedule: '0 2 * * *',
};

/**
 * Read a variable without baking it into the bundle.
 *
 * A static `process.env.CRON_SECRET` is replaced with the literal
 * value when this function is bundled, which puts the secret in a
 * deploy artifact. An indexed lookup on a computed key cannot be
 * statically replaced, so it is resolved at run time.
 */
function env(name: string): string | undefined {
  const key = name;
  return process.env[key];
}

export default async function run() {
  const secret = env('CRON_SECRET');
  const base = env('URL') ?? env('SITE_URL');

  if (!secret || !base) {
    console.error(
      '[sheets] not run — %s is not set.',
      !secret ? 'CRON_SECRET' : 'URL',
    );
    return new Response('Not configured', { status: 503 });
  }

  const response = await fetch(`${base.replace(/\/$/, '')}/api/cron/sheets`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  console.log('[sheets] %s %s', response.status, body.slice(0, 500));

  return new Response(body, { status: response.status });
}
