'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { actorName, getSession, mayIssueLinkFor } from '@/lib/auth/session';
import {
  HANDED_LINK_MINUTES,
  INVITE_MINUTES,
  issueToken,
  type Recipient,
} from '@/lib/auth/tokens';
import { requireSupabase } from '@/lib/db/client';
import { getDb, getDbOrError, mintId } from '@/lib/db/store';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { INVITATION_FALLBACK, mergeValuesFor, renderTemplate } from '@/lib/mergeFields';
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

/* ============================================================
   Inviting somebody in

   The other half of the same idea. A sign-in link handed over is for
   when email has failed; an invitation is the ordinary way somebody
   first hears the portal exists.

   The wording comes from the Partner invitation template in Event
   settings, with its tokens filled in — which is what makes that
   template worth having rather than decoration.
   ============================================================ */

export type InviteResult =
  | { ok: true; name: string; email: string; days: number }
  | { ok: false; error: string };

/**
 * Email one partner user an invitation carrying a sign-in link.
 *
 * Permitted on the same terms as handing a link over: any organiser
 * who can reach Partners. It grants nothing they could not already
 * do — they can open that partner's portal themselves.
 */
export async function sendInvitation(userId: Id): Promise<InviteResult> {
  const session = await getSession();

  if (!session) return { ok: false, error: 'Your session has expired. Sign in again.' };
  if (!mayIssueLinkFor(session, 'partner')) {
    return { ok: false, error: 'You do not have access to partner accounts.' };
  }

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;
  const db = loaded.db;

  const user = db.partnerUsers.find((u) => u.id === userId);
  if (!user) return { ok: false, error: 'That person is no longer on the team.' };
  if (!user.email) {
    return { ok: false, error: `${user.name} has no email address. Add one first.` };
  }

  const partner = db.partners.find((p) => p.id === user.partnerId) ?? null;

  const template = db.emailTemplates.find((t) => t.id === 'et_invite');
  if (template && !template.enabled) {
    return {
      ok: false,
      error:
        'The Partner invitation template is switched off. Turn it on under ' +
        'Event settings → Email before sending invitations.',
    };
  }

  let issued;
  try {
    issued = await issueToken(
      { kind: 'partner', userId: user.id, email: user.email, name: user.name },
      partner ? `/portal/${partner.id}` : '',
      `invited by ${session.user.name}`,
      INVITE_MINUTES,
    );
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create a link.' };
  }

  if (!issued.ok) {
    if (issued.reason === 'rate_limited') {
      return {
        ok: false,
        error:
          `${user.name} already has several unused links. They should use one of ` +
          'those, or wait for them to expire.',
      };
    }
    return { ok: false, error: issued.error ?? 'Could not create a link.' };
  }

  const base = await siteUrl();
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(issued.token)}`;

  const { subject, text } = renderTemplate(
    template,
    mergeValuesFor(db, { partner, user, portalLink: link }),
    INVITATION_FALLBACK,
  );

  const sent = await sendEmail({
    to: user.email,
    toName: user.name,
    subject,
    text,
    // Deliberately not passing templateId: the outbox stores the body
    // of anything sent from a template, and this body contains a
    // working sign-in link. The subject and recipient are recorded,
    // which is what the outbox is for.
    partnerId: partner?.id ?? null,
  });

  if (!sent.ok) {
    return {
      ok: false,
      error:
        sent.reason === 'no_provider'
          ? 'No email provider is configured, so nothing can be sent yet. You can hand them a sign-in link instead.'
          : `The invitation could not be sent. ${sent.error}`,
    };
  }

  try {
    await requireSupabase()
      .from('partner_users')
      .update({ invited_at: new Date().toISOString() })
      .eq('id', user.id);
  } catch (e) {
    // The email has gone. Losing the stamp is a reporting problem,
    // not a reason to tell somebody the invitation failed.
    console.error('[auth] could not record an invitation:', e);
  }

  await audit(
    db.event.id,
    user.id,
    await actorName(),
    `Invited ${user.name} (${user.email}) to the portal.`,
  );

  revalidatePath(`/organiser/partners/${user.partnerId}`);
  revalidatePath('/organiser/settings');

  return {
    ok: true,
    name: user.name,
    email: user.email,
    days: Math.round(INVITE_MINUTES / (24 * 60)),
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
