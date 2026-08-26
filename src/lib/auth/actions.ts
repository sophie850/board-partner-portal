'use server';

import { headers } from 'next/headers';

import { actorName, getSession, mayIssueLinkFor } from '@/lib/auth/session';
import { HANDED_LINK_MINUTES, issueToken, type Recipient } from '@/lib/auth/tokens';
import { requireSupabase } from '@/lib/db/client';
import { getDb, getDbOrError, mintId } from '@/lib/db/store';
import { env } from '@/lib/env';
import type { Id } from '@/lib/types';

/* ============================================================
   Handing somebody a sign-in link

   For when email is not an option — it is going to spam, the person
   never received it, or they are locked out and on the phone. An
   organiser generates a link and sends it however they normally talk
   to that person.

   This is a sensitive thing to be able to do: whoever holds the link
   signs in AS that person. So it is narrowly permitted, always
   audited, and the link is single-use like any other.
   ============================================================ */

export type LinkResult =
  | { ok: true; url: string; expiresInMinutes: number; name: string }
  | { ok: false; error: string };

/** Where the link should point — the deployment's own address. */
async function siteUrl(): Promise<string> {
  const configured = env('SITE_URL') ?? env('URL');
  if (configured) return configured.replace(/\/$/, '');

  const head = await headers();
  const host = head.get('x-forwarded-host') ?? head.get('host') ?? 'localhost:3000';
  const proto =
    head.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/**
 * Mint a sign-in link for a named person.
 *
 * The permission rules are the whole point of this function:
 *
 *   * A **partner user** — any organiser who can reach Partners. It
 *     grants nothing they do not already have, since an organiser can
 *     open any partner's portal to support them.
 *
 *   * Another **organiser** — super admins only. Without that rule a
 *     team member limited to, say, Requests could mint a link for a
 *     super admin, sign in as them, and hold every permission in the
 *     system. That is the escalation this closes.
 *
 * Nobody needs one for themselves; they are already signed in.
 */
export async function createSignInLink(
  kind: 'organiser' | 'partner',
  userId: Id,
): Promise<LinkResult> {
  const session = await getSession();

  if (!session) {
    return { ok: false, error: 'Your session has expired. Sign in again.' };
  }
  if (session.kind !== 'organiser') {
    return { ok: false, error: 'Only the BOARD team can do that.' };
  }

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  let recipient: Recipient;
  let context: string;

  if (!mayIssueLinkFor(session, kind)) {
    return {
      ok: false,
      error:
        kind === 'organiser'
          ? 'Only a super admin can issue a sign-in link for another BOARD account. Ask one of them.'
          : 'You do not have access to partner accounts.',
    };
  }

  if (kind === 'organiser') {
    const user = db.organiserUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'That account no longer exists.' };
    if (!user.email) return { ok: false, error: 'That account has no email address.' };

    recipient = { kind: 'organiser', userId: user.id, email: user.email, name: user.name };
    context = 'the BOARD team';
  } else {
    const user = db.partnerUsers.find((u) => u.id === userId);
    if (!user) return { ok: false, error: 'That person is no longer on the team.' };
    if (!user.email) return { ok: false, error: 'That person has no email address.' };

    const partner = db.partners.find((p) => p.id === user.partnerId);
    recipient = { kind: 'partner', userId: user.id, email: user.email, name: user.name };
    context = partner?.name ?? 'a partner';
  }

  const head = await headers();
  const origin =
    head.get('x-nf-client-connection-ip') ?? head.get('x-forwarded-for') ?? 'unknown';

  let issued;
  try {
    issued = await issueToken(
      recipient,
      '',
      `handed by ${session.user.name} (${origin})`,
      HANDED_LINK_MINUTES,
    );
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not create a link.',
    };
  }

  if (!issued.ok) {
    if (issued.reason === 'rate_limited') {
      return {
        ok: false,
        error:
          `${recipient.name} already has several unused links. ` +
          'Use one of those, or wait for them to expire.',
      };
    }
    return { ok: false, error: issued.error ?? 'Could not create a link.' };
  }

  /*
   * Audited without exception. "Somebody signed in as Anna" is only
   * answerable later if the act of handing out the link was recorded
   * at the time, with who did it.
   */
  await audit(
    db.event.id,
    kind === 'partner' ? recipient.userId : null,
    await actorName(),
    `Issued a sign-in link for ${recipient.name} (${recipient.email}) — ${context}.`,
  );

  const base = await siteUrl();

  return {
    ok: true,
    url: `${base}/api/auth/verify?token=${encodeURIComponent(issued.token)}`,
    expiresInMinutes: HANDED_LINK_MINUTES,
    name: recipient.name,
  };
}

async function audit(
  eventId: Id,
  partnerUserId: Id | null,
  actor: string,
  body: string,
) {
  try {
    const db = await getDb();
    // audit_log references the partner *organisation*, not the user,
    // so resolve it — a null here would lose which partner it was.
    const partnerId = partnerUserId
      ? (db.partnerUsers.find((u) => u.id === partnerUserId)?.partnerId ?? null)
      : null;

    await requireSupabase().from('audit_log').insert({
      id: mintId('a'),
      event_id: eventId,
      partner_id: partnerId,
      actor,
      body,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('[auth] could not audit a handed sign-in link:', e);
  }
}
