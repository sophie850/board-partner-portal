import 'server-only';

import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { mergeValuesFor, renderTemplate } from '@/lib/mergeFields';
import type { Db, Id, Participation, PartnerUser } from '@/lib/types';

/* ============================================================
   Telling people what just happened

   Five templates in Event settings described emails that were never
   sent. These are three of them — the ones that follow an action
   somebody took. The other two follow a date rather than an action
   and live in reminders.ts.

   Two rules hold throughout:

     * **Nothing here ever throws.** A partner who has submitted a
       form has submitted it. If the confirmation cannot go out, that
       is a problem with email, not with the submission, and it must
       not surface as a failed action or roll anything back.

     * **A disabled template means no email.** The toggle in Event
       settings is the control, and it is checked here rather than
       somewhere the organiser cannot see.
   ============================================================ */

/** Where a link in an email should point. */
function siteUrl(): string {
  const configured = env('SITE_URL') ?? env('URL');
  return configured ? configured.replace(/\/$/, '') : '';
}

/**
 * A link into the portal.
 *
 * Absolute where the deployment knows its own address, relative
 * otherwise — a relative link in an email is useless, but it is
 * better than a link to localhost, and the missing SITE_URL shows
 * up in /api/health rather than here.
 */
function portalLink(path: string): string {
  return `${siteUrl()}${path}`;
}

/** The partner user acting right now, when there is one. */
async function actingPartnerUser(db: Db, partnerId: Id): Promise<PartnerUser | null> {
  const session = await getSession();
  if (session?.kind !== 'partner') return null;
  const user = db.partnerUsers.find((u) => u.id === session.user.id);
  return user?.partnerId === partnerId ? user : null;
}

/** The Partner Lead, who is the fallback recipient for everything. */
function leadOf(db: Db, part: Participation): PartnerUser | null {
  return db.partnerUsers.find((u) => u.id === part.leadUserId) ?? null;
}

/**
 * Whether we are willing to email this person at all.
 *
 * Never before they have been invited. The first thing a partner
 * contact hears from the portal should be an invitation explaining
 * what it is — not a confirmation of something they did not know
 * they were part of, and certainly not a chase.
 */
function reachable(user: PartnerUser | null): user is PartnerUser {
  return Boolean(user?.email && user.invitedAt);
}

/* ---------------------------------------------------------------
   Form submitted
   --------------------------------------------------------------- */

export async function notifyFormSubmitted(participationId: Id, formId: Id): Promise<void> {
  try {
    const db = await getDb();

    const template = db.emailTemplates.find((t) => t.id === 'et_submit');
    if (template && !template.enabled) return;

    const part = db.participations.find((p) => p.id === participationId);
    const form = db.forms.find((f) => f.id === formId);
    if (!part || !form) return;

    const partner = db.partners.find((p) => p.id === part.partnerId) ?? null;

    // To whoever pressed submit, falling back to the Lead — an
    // organiser submitting on a partner's behalf should not send the
    // confirmation to themselves.
    const acting = await actingPartnerUser(db, part.partnerId);
    const user = reachable(acting) ? acting : leadOf(db, part);
    if (!reachable(user)) return;

    const { subject, text } = renderTemplate(
      template,
      mergeValuesFor(db, {
        partner,
        user,
        task: form.title,
        portalLink: portalLink(`/portal/${part.partnerId}/forms/${form.id}`),
      }),
      SUBMIT_FALLBACK,
    );

    await sendEmail({
      to: user.email,
      toName: user.name,
      subject,
      text,
      templateId: 'et_submit',
      partnerId: part.partnerId,
    });
  } catch (e) {
    console.error('[notify] submission confirmation failed:', e);
  }
}

const SUBMIT_FALLBACK = {
  subject: 'We’ve received your submission',
  body: [
    'Hi [first_name],',
    '',
    'Thank you — we have received “[task]” for [partner].',
    '',
    'There is nothing further for you to do on it for now. We will be in touch if we need anything changed, and you can see its status at any time in your Partner Portal: [portal_link]',
    '',
    '[signature]',
  ].join('\n'),
};

/* ---------------------------------------------------------------
   Changes required
   --------------------------------------------------------------- */

export async function notifyChangesRequired(
  participationId: Id,
  formId: Id,
  feedback: string,
): Promise<void> {
  try {
    const db = await getDb();

    const template = db.emailTemplates.find((t) => t.id === 'et_changes');
    if (template && !template.enabled) return;

    const part = db.participations.find((p) => p.id === participationId);
    const form = db.forms.find((f) => f.id === formId);
    if (!part || !form) return;

    const partner = db.partners.find((p) => p.id === part.partnerId) ?? null;

    /*
     * Back to whoever filled it in, by the user id stored on the
     * submission. Falling back to the Lead, who can pass it on —
     * better than nobody hearing that their form was sent back.
     */
    const submittedBy = part.formState?.[formId]?.submittedByUserId;
    const author = submittedBy
      ? (db.partnerUsers.find((u) => u.id === submittedBy) ?? null)
      : null;

    const user = reachable(author) ? author : leadOf(db, part);
    if (!reachable(user)) return;

    const values = mergeValuesFor(db, {
      partner,
      user,
      task: form.title,
      portalLink: portalLink(`/portal/${part.partnerId}/forms/${form.id}`),
    });

    const { subject, text } = renderTemplate(template, values, CHANGES_FALLBACK);

    /*
     * The reviewer's message is appended rather than merged through a
     * token. It is free text written moments ago by an organiser, and
     * putting it in a token would let a stray "[due]" in their
     * feedback be substituted — quietly changing what they said.
     */
    const body = feedback.trim() ? `${text}\n\n---\n\n${feedback.trim()}` : text;

    await sendEmail({
      to: user.email,
      toName: user.name,
      subject,
      text: body,
      templateId: 'et_changes',
      partnerId: part.partnerId,
    });
  } catch (e) {
    console.error('[notify] changes-required email failed:', e);
  }
}

const CHANGES_FALLBACK = {
  subject: 'Action needed: changes required on [task]',
  body: [
    'Hi [first_name],',
    '',
    'We have reviewed “[task]” for [partner] and need a few changes before we can approve it.',
    '',
    'You can reopen it and send it back to us here: [portal_link]',
    '',
    'What needs changing is below.',
    '',
    '[signature]',
  ].join('\n'),
};

/* ---------------------------------------------------------------
   Order submitted
   --------------------------------------------------------------- */

export async function notifyOrderSubmitted(
  participationId: Id,
  orderId: Id,
  reference: string,
): Promise<void> {
  try {
    const db = await getDb();

    const template = db.emailTemplates.find((t) => t.id === 'et_order');
    if (template && !template.enabled) return;

    const part = db.participations.find((p) => p.id === participationId);
    if (!part) return;

    const partner = db.partners.find((p) => p.id === part.partnerId) ?? null;

    const acting = await actingPartnerUser(db, part.partnerId);
    const user = reachable(acting) ? acting : leadOf(db, part);
    if (!reachable(user)) return;

    const { subject, text } = renderTemplate(
      template,
      mergeValuesFor(db, {
        partner,
        user,
        task: reference,
        portalLink: portalLink(`/portal/${part.partnerId}/orders/${orderId}`),
      }),
      ORDER_FALLBACK,
    );

    await sendEmail({
      to: user.email,
      toName: user.name,
      subject,
      text,
      templateId: 'et_order',
      partnerId: part.partnerId,
    });
  } catch (e) {
    console.error('[notify] order confirmation failed:', e);
  }
}

const ORDER_FALLBACK = {
  subject: 'Your [event] order has been submitted',
  body: [
    'Hi [first_name],',
    '',
    'Thank you — we have received order [task] for [partner].',
    '',
    'Items that need confirming go to the relevant supplier now. You will see each line move from pending to confirmed in your Partner Portal, and anything that needs a quote will come back to you to accept before it is ordered.',
    '',
    'The full order is here: [portal_link]',
    '',
    '[signature]',
  ].join('\n'),
};
