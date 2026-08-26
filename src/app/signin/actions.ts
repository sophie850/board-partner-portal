'use server';

import { headers } from 'next/headers';

import { findRecipient, issueToken, LINK_MINUTES, safeNextPath } from '@/lib/auth/tokens';
import { emailProvider, sendEmail } from '@/lib/email';
import { getDb } from '@/lib/db/store';
import { env } from '@/lib/env';

/* ============================================================
   Asking for a sign-in link

   The reply is the same whether or not the address belongs to
   anybody. Saying "no such account" would turn this form into a way
   of finding out who the BOARD team works with, which for a private
   event is exactly the thing not to give away.
   ============================================================ */

export interface SignInResult {
  /** Always true when the form was usable — see the note above. */
  sent: boolean;
  message: string;
  /**
   * The link itself, returned ONLY when AUTH_DEV_SHOW_LINK is set.
   * That flag exists so a deployment with no email provider can be
   * got into once, and it defeats the point of sign-in while it is
   * on. Never set it in front of real data.
   */
  devLink?: string;
}

/** Where the link should point — the deployment's own address. */
async function siteUrl(): Promise<string> {
  const configured = env('SITE_URL') ?? env('URL');
  if (configured) return configured.replace(/\/$/, '');

  // Netlify does not always set URL for a given context, so fall
  // back to the host the request actually arrived on.
  const head = await headers();
  const host = head.get('x-forwarded-host') ?? head.get('host') ?? 'localhost:3000';
  const proto = head.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function requestSignInLink(
  email: string,
  next: string,
): Promise<SignInResult> {
  const address = String(email ?? '').trim();

  const sameAnswer: SignInResult = {
    sent: true,
    message:
      'If that address belongs to an account, a sign-in link is on its way. ' +
      `It expires in ${LINK_MINUTES} minutes.`,
  };

  if (!address || !address.includes('@')) {
    return { sent: false, message: 'Enter the email address you were invited on.' };
  }

  const recipient = await findRecipient(address);
  if (!recipient) return sameAnswer;

  const head = await headers();
  const origin =
    head.get('x-nf-client-connection-ip') ??
    head.get('x-forwarded-for') ??
    'unknown';

  const issued = await issueToken(recipient, safeNextPath(next), origin);

  if (!issued.ok) {
    if (issued.reason === 'rate_limited') {
      return {
        sent: false,
        message:
          'There are already several unused links for that address. ' +
          'Check your inbox, or wait for them to expire before asking for another.',
      };
    }
    return {
      sent: false,
      message: 'Something went wrong issuing your link. Try again in a moment.',
    };
  }

  const base = await siteUrl();
  const link = `${base}/api/auth/verify?token=${encodeURIComponent(issued.token)}`;

  const db = await getDb();
  const signature = db.event.sender?.signature ?? '';

  await sendEmail({
    to: recipient.email,
    toName: recipient.name,
    subject: `Sign in to the ${db.event.name} portal`,
    text: [
      `Hello ${recipient.name.split(' ')[0] || ''}`.trim(),
      `Here is your sign-in link for ${db.event.name}. It works once and expires in ${LINK_MINUTES} minutes.`,
      link,
      'If you did not ask for this, you can ignore it — nobody can sign in without the link.',
      signature,
    ]
      .filter(Boolean)
      .join('\n\n'),
  });

  /*
   * With no provider configured the send above failed and logged.
   * The link goes to the server log too, so a deployment can be got
   * into while email is still being set up.
   */
  if (!emailProvider()) {
    console.warn(`[signin] no email provider — link for ${recipient.email}: ${link}`);
  }

  if (env('AUTH_DEV_SHOW_LINK') === '1') {
    return { ...sameAnswer, devLink: link };
  }

  return sameAnswer;
}
