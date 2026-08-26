/* ============================================================
   The session cookie

   A signed, HttpOnly cookie carrying who is signed in. Signed, not
   encrypted: the contents are an id and an email address, which the
   holder already knows. What matters is that they cannot change
   them, which the signature prevents.

   Web Crypto throughout, so the identical code verifies a cookie in
   middleware (which runs on the edge, where node:crypto does not
   exist) and in a server component.

   There is no sessions table. The cookie says who you claim to be;
   the server then re-reads that user from the database on every
   request, so removing somebody from a team ends their access at
   once rather than whenever their cookie happens to expire.
   ============================================================ */

export const SESSION_COOKIE = 'board_session';

/** Long enough not to be a nuisance, short enough to matter. */
export const SESSION_DAYS = 14;

export interface SessionClaims {
  /** Which table `userId` refers to. */
  kind: 'organiser' | 'partner';
  userId: string;
  email: string;
  /** Seconds since the epoch. */
  issuedAt: number;
  expiresAt: number;
}

/* ---------------------------------------------------------------
   base64url, without padding
   --------------------------------------------------------------- */

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/* ---------------------------------------------------------------
   Signing
   --------------------------------------------------------------- */

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Constant-time comparison — a fast reject leaks the signature. */
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSession(
  claims: SessionClaims,
  secret: string,
): Promise<string> {
  // Short keys: a cookie is sent on every request, including every
  // asset the middleware matcher covers.
  const payload = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        k: claims.kind,
        u: claims.userId,
        e: claims.email,
        i: claims.issuedAt,
        x: claims.expiresAt,
      }),
    ),
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(secret),
    new TextEncoder().encode(payload),
  );

  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify a cookie and return its claims, or null.
 *
 * Null for every failure — bad signature, malformed, expired. The
 * caller cannot act differently on any of them, and distinguishing
 * them in a response would tell an attacker which part to work on.
 */
export async function readSession(
  cookie: string | undefined | null,
  secret: string,
): Promise<SessionClaims | null> {
  if (!cookie || !secret) return null;

  const split = cookie.lastIndexOf('.');
  if (split <= 0) return null;

  const payload = cookie.slice(0, split);
  const signature = cookie.slice(split + 1);

  try {
    const expected = new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        await key(secret),
        new TextEncoder().encode(payload),
      ),
    );

    if (!safeEqual(expected, fromBase64Url(signature))) return null;

    const raw = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));

    const claims: SessionClaims = {
      kind: raw.k,
      userId: String(raw.u ?? ''),
      email: String(raw.e ?? ''),
      issuedAt: Number(raw.i ?? 0),
      expiresAt: Number(raw.x ?? 0),
    };

    if (claims.kind !== 'organiser' && claims.kind !== 'partner') return null;
    if (!claims.userId) return null;
    if (!Number.isFinite(claims.expiresAt)) return null;
    if (claims.expiresAt * 1000 <= Date.now()) return null;

    return claims;
  } catch {
    return null;
  }
}

/** The cookie attributes, in one place so they cannot drift apart. */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    // Lax rather than Strict: a sign-in link arrives from an email
    // client, and Strict would drop the cookie on that first
    // navigation and bounce them straight back to the sign-in page.
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  };
}
