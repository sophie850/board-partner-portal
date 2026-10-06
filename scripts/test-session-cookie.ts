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
import { randomBytes } from 'node:crypto';

import { readSession, signSession, SESSION_DAYS } from '../src/lib/auth/cookie';

/**
 * A base64 secret that definitely contains + and / and =.
 *
 * Random base64 usually does, but "usually" makes a test that passes
 * on Tuesday and skips the interesting case on Wednesday. Keep
 * drawing until the awkward characters are all present.
 */
function base64WithAwkwardCharacters(): string {
  for (let i = 0; i < 200; i++) {
    const candidate = randomBytes(32).toString('base64');
    if (candidate.includes('+') && candidate.includes('/')) return candidate;
  }
  // 200 draws without one is not possible in practice, but a test
  // that silently tested nothing would be worse than a loud failure.
  throw new Error('Could not generate a base64 secret containing + and /');
}

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
   * Real-shaped secrets, generated rather than written down.
   *
   * Two reasons, and the second is the one that bit us. A fresh
   * secret every run tests the whole shape rather than the single
   * example somebody happened to paste — and a credential-shaped
   * literal sitting in the repository is a thing every secret
   * scanner between here and production is right to object to, even
   * when it opens nothing.
   *
   * `openssl rand -base64 32` is what the README tells you to run,
   * and it produces + / and = — the characters most likely to be
   * mangled somewhere between a dashboard field and a runtime
   * environment, so that case is sought out rather than hoped for.
   */
  const SECRETS: Array<[string, string]> = [
    ['base64 with + / =', base64WithAwkwardCharacters()],
    ['plain hex', randomBytes(24).toString('hex')],
    ['with spaces either side', `  ${randomBytes(12).toString('base64url')}  `],
    ['unicode', `sécret-à-clé-très-longue-${randomBytes(6).toString('hex')}`],
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
