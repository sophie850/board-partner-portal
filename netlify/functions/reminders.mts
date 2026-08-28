/* ============================================================
   The daily reminder run

   Netlify's scheduler cannot call a Next.js route directly, so this
   is the thin thing it can call: a function whose only job is to
   knock on /api/cron/reminders with the shared secret.

   Deliberately almost empty. All the judgement — which deadlines are
   owed a reminder, who gets it, and how one is never sent twice —
   lives in src/lib/reminders.ts, where it is next to the rest of the
   application and can be tested. A scheduler wrapper that grows
   logic is a scheduler wrapper nobody ever looks at again.

   08:00 UTC: early enough to be in somebody's morning across
   Europe, late enough that a deadline set yesterday evening is
   included.
   ============================================================ */

export const config = {
  schedule: '0 8 * * *',
};

export default async function run() {
  const secret = process.env.CRON_SECRET;
  const base = process.env.URL ?? process.env.SITE_URL;

  if (!secret || !base) {
    // Logged rather than thrown: a misconfigured schedule should say
    // what is missing in the function log, not retry forever.
    console.error(
      '[reminders] not run — %s is not set.',
      !secret ? 'CRON_SECRET' : 'URL',
    );
    return new Response('Not configured', { status: 503 });
  }

  const response = await fetch(`${base.replace(/\/$/, '')}/api/cron/reminders`, {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}` },
  });

  const body = await response.text();
  console.log('[reminders] %s %s', response.status, body.slice(0, 500));

  return new Response(body, { status: response.status });
}
