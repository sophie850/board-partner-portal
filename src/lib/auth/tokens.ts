import 'server-only';

import { requireSupabase } from '@/lib/db/client';
import { getDb, mintId } from '@/lib/db/store';
import type { Id } from '@/lib/types';

/* ============================================================
   Sign-in links

   A link is a single-use token that expires quickly. Only its
   SHA-256 hash is stored, so a copy of `auth_tokens` is not a set of
   working links — the same reason a password table stores hashes.
   ============================================================ */

/** Long enough to arrive and be clicked, short enough to be useless later. */
export const LINK_MINUTES = 20;

/**
 * A link an organiser hands over themselves.
 *
 * Longer, because it goes into Teams or a text message and gets read
 * when the person next looks — twenty minutes would expire in the
 * gap. Still single-use, which is the protection that matters.
 */
export const HANDED_LINK_MINUTES = 120;

/**
 * An invitation, emailed to somebody who has never signed in.
 *
 * A week, because an invitation is not a response to anything — it
 * arrives unannounced, possibly on a Friday, and the person opens it
 * when they get to it. Expiring overnight would mean every partner's
 * first experience of the portal is a link that no longer works.
 *
 * Still single-use, and it grants no more than any other link.
 */
export const INVITE_MINUTES = 7 * 24 * 60;

/** Live links one address may hold at once, before we stop issuing more. */
const MAX_LIVE_PER_EMAIL = 5;

export interface Recipient {
  kind: 'organiser' | 'partner';
  userId: Id;
  email: string;
  name: string;
}

/** 32 random bytes, base64url — 256 bits, unguessable. */
function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Find who an email address belongs to.
 *
 * Organiser first: somebody on the BOARD team who is also listed
 * against a partner organisation is here to run the event, and an
 * organiser can open any partner's portal anyway.
 *
 * Comparison is case-insensitive — people type their own address
 * with whatever capitalisation they please.
 */
export async function findRecipient(email: string): Promise<Recipient | null> {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return null;

  const db = await getDb();

  const organiser = db.organiserUsers.find((u) => u.email.toLowerCase() === wanted);
  if (organiser) {
    return {
      kind: 'organiser',
      userId: organiser.id,
      email: organiser.email,
      name: organiser.name,
    };
  }

  const partnerUser = db.partnerUsers.find((u) => u.email.toLowerCase() === wanted);
  if (partnerUser) {
    return {
      kind: 'partner',
      userId: partnerUser.id,
      email: partnerUser.email,
      name: partnerUser.name,
    };
  }

  return null;
}

export type IssueResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'rate_limited' | 'error'; error?: string };

/**
 * Mint a link for somebody we have already established exists.
 *
 * Returns the raw token, which is never stored and must not be
 * logged anywhere but the outgoing email.
 */
export async function issueToken(
  recipient: Recipient,
  nextPath: string,
  requestedBy: string,
  minutes: number = LINK_MINUTES,
): Promise<IssueResult> {
  const now = new Date();

  try {
    // Inside the try: building the client can fail (misconfiguration,
    // a missing key after a bad deploy) and that has to come back as
    // a refusal the caller can show, not an unhandled rejection.
    const client = requireSupabase();

    // Opportunistic housekeeping: spent and long-expired rows are of
    // no further use, and clearing them here means no scheduled job.
    await client
      .from('auth_tokens')
      .delete()
      .lt('expires_at', new Date(now.getTime() - 7 * 24 * 3600_000).toISOString());

    /*
     * Refuse to keep issuing to one address. Somebody walking a list
     * of addresses to see which ones get an email is the attack this
     * blunts; it also stops a stuck form emailing a person twenty
     * times.
     */
    const { count } = await client
      .from('auth_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('email', recipient.email)
      .is('used_at', null)
      .gt('expires_at', now.toISOString());

    if ((count ?? 0) >= MAX_LIVE_PER_EMAIL) {
      return { ok: false, reason: 'rate_limited' };
    }

    const token = newToken();

    const { error } = await client.from('auth_tokens').insert({
      id: mintId('tok'),
      token_hash: await hashToken(token),
      kind: recipient.kind,
      user_id: recipient.userId,
      email: recipient.email,
      // Only ever an in-app path. Anything else would turn a sign-in
      // link into an open redirect.
      next_path: safeNextPath(nextPath),
      created_at: now.toISOString(),
      expires_at: new Date(now.getTime() + minutes * 60_000).toISOString(),
      used_at: null,
      requested_by: requestedBy.slice(0, 120),
    });

    if (error) return { ok: false, reason: 'error', error: error.message };

    return { ok: true, token };
  } catch (e) {
    return {
      ok: false,
      reason: 'error',
      error: e instanceof Error ? e.message : 'Could not issue a sign-in link.',
    };
  }
}

export type ConsumeResult =
  | { ok: true; kind: 'organiser' | 'partner'; userId: Id; email: string; nextPath: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/**
 * Exchange a token for the identity it stands for, once.
 *
 * The row is marked used before anything is returned, and the update
 * is conditional on it still being unused — so two simultaneous
 * clicks cannot both succeed.
 */
export async function consumeToken(token: string): Promise<ConsumeResult> {
  if (!token) return { ok: false, reason: 'invalid' };

  try {
    return await claim(token);
  } catch (e) {
    // A link that cannot be checked is not a link that works. The
    // person gets "not recognised" and can ask for another, rather
    // than a stack trace.
    console.error('[auth] could not verify a sign-in link:', e);
    return { ok: false, reason: 'invalid' };
  }
}

async function claim(token: string): Promise<ConsumeResult> {
  const client = requireSupabase();
  const hash = await hashToken(token);

  const { data, error } = await client
    .from('auth_tokens')
    .select('id, kind, user_id, email, next_path, expires_at, used_at')
    .eq('token_hash', hash)
    .maybeSingle();

  if (error || !data) return { ok: false, reason: 'invalid' };
  if (data.used_at) return { ok: false, reason: 'used' };
  if (new Date(data.expires_at).getTime() <= Date.now()) return { ok: false, reason: 'expired' };

  const { data: claimed, error: claimError } = await client
    .from('auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id)
    // The guard that makes this single-use under a race: the second
    // update matches no rows and comes back empty.
    .is('used_at', null)
    .select('id');

  if (claimError || !claimed?.length) return { ok: false, reason: 'used' };

  return {
    ok: true,
    kind: data.kind as 'organiser' | 'partner',
    userId: data.user_id,
    email: data.email,
    nextPath: safeNextPath(data.next_path),
  };
}

/**
 * Record that a partner user has signed in for the first time.
 *
 * `accepted_at` is what tells an organiser their invitation landed —
 * without it the only honest answer to "did they get it?" is "we
 * sent one". Only the first sign-in stamps it, so the column keeps
 * meaning "accepted" rather than "last seen", and a failure here
 * never blocks the sign-in it is describing.
 */
export async function markAccepted(kind: 'organiser' | 'partner', userId: Id): Promise<void> {
  if (kind !== 'partner') return;

  try {
    await requireSupabase()
      .from('partner_users')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', userId)
      .is('accepted_at', null);
  } catch (e) {
    console.error('[auth] could not record a first sign-in:', e);
  }
}

/**
 * Reduce a redirect target to something safe.
 *
 * Only a path on this site. `//evil.example` is a protocol-relative
 * URL that browsers treat as absolute, so a leading double slash is
 * rejected along with anything carrying a scheme.
 */
export function safeNextPath(path: string | null | undefined): string {
  const value = String(path ?? '').trim();
  if (!value.startsWith('/')) return '';
  if (value.startsWith('//')) return '';
  if (value.includes('://')) return '';
  return value.slice(0, 512);
}
