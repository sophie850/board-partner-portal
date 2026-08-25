/* ============================================================
   Interim access gate

   A single shared passphrase in front of the whole site, standing in
   for authentication until magic links are built.

   This is deliberately modest. It stops the URL being an open door
   to real commercial data — partner billing details, VAT numbers,
   internal notes — while the portal is in use before auth lands. It
   is NOT per-user authentication: everyone shares one secret, there
   is no identity, and nothing is audited to a person. Replace it,
   do not extend it.

   Leaving PORTAL_PASSPHRASE unset disables the gate entirely and
   leaves the site public.
   ============================================================ */

export const GATE_COOKIE = 'board_portal_access';

/**
 * The cookie value for a given passphrase.
 *
 * The passphrase itself is never stored in the cookie — a SHA-256
 * digest is, so reading the cookie does not hand over the secret.
 * Uses Web Crypto so it runs in middleware on the edge as well as
 * in Node.
 */
export async function gateToken(passphrase: string): Promise<string> {
  const data = new TextEncoder().encode(`board-portal:${passphrase}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Length-independent comparison, so timing does not leak the value. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
