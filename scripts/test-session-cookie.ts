/*
 * The session cookie, signed and read back.
 *
 * If this round-trip ever fails, the symptom is a sign-in that looks
 * like it worked and then bounces you to /signin — the link is
 * consumed, the cookie is set, and the proxy refuses it on the very
 * next request. That is indistinguishable from a broken link unless
 * you know which half failed, so it is worth pinning down.
 *
 * Run: npx tsx scripts/test-session-cookie.ts
 */
import { readSession, signSession, SESSION_DAYS } from '../src/lib/auth/cookie';

async function main() {
  const now = Math.floor(Date.now() / 1000);

  const claims = {
    kind: 'organiser' as const,
    userId: 'ou_sophie',
    email: 'sophie@forreal.events',
    issuedAt: now,
    expiresAt: now + SESSION_DAYS * 24 * 60 * 60,
  };

  /*
   * Real-shaped secrets. `openssl rand -base64 32` is what the README
   * tells you to run, and it produces + / and = — the characters most
   * likely to be mangled somewhere between a dashboard field and a
   * runtime environment.
   */
  const SECRETS: Array<[string, string]> = [
    ['base64 with + / =', 'kP3+aZ/vQ8nR1sT4uW7xY0bC2dE5fG8hJ1kL4mN7oP0='],
    ['plain hex', 'a3f1c7d59e2b4806a3f1c7d59e2b4806a3f1c7d59e2b4806'],
    ['with spaces either side', '  spaced-secret-value-long-enough-to-be-real  '],
    ['unicode', 'sécret-à-clé-très-longue-pour-être-réaliste-0123'],
    ['very long', 'x'.repeat(512)],
  ];

  let fail = 0;

  for (const [label, secret] of SECRETS) {
    const cookie = await signSession(claims, secret);
    const back = await readSession(cookie, secret);

    if (!back) {
      fail += 1;
      console.log(`  ✗ ${label}: signed, then would not read back`);
      continue;
    }
    if (back.userId !== claims.userId || back.kind !== claims.kind) {
      fail += 1;
      console.log(`  ✗ ${label}: read back as a different session`);
    }
  }

  /* ---- a cookie must not verify under a different secret ---- */

  const signed = await signSession(claims, SECRETS[0][1]);
  if (await readSession(signed, SECRETS[1][1])) {
    fail += 1;
    console.log('  ✗ a cookie verified under the wrong secret — the signature is not checked');
  }

  /* ---- nor when tampered with ---- */

  const tampered = signed.slice(0, -1) + (signed.endsWith('A') ? 'B' : 'A');
  if (await readSession(tampered, SECRETS[0][1])) {
    fail += 1;
    console.log('  ✗ a tampered cookie was accepted');
  }

  /* ---- nor once expired ---- */

  const stale = await signSession(
    { ...claims, expiresAt: now - 60 },
    SECRETS[0][1],
  );
  if (await readSession(stale, SECRETS[0][1])) {
    fail += 1;
    console.log('  ✗ an expired cookie was accepted');
  }

  /* ---- rubbish in, null out, never a throw ---- */

  for (const junk of ['', 'not-a-cookie', 'a.b.c', '....']) {
    if (await readSession(junk, SECRETS[0][1])) {
      fail += 1;
      console.log(`  ✗ "${junk}" was accepted as a session`);
    }
  }

  const total = SECRETS.length + 3 + 4;
  console.log(`${total - fail}/${total} passed${fail ? `, ${fail} FAILED` : ''}`);
  process.exit(fail ? 1 : 0);

}

main();
