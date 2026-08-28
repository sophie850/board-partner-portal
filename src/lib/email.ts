import 'server-only';

import { requireSupabase } from '@/lib/db/client';
import { getDb, mintId } from '@/lib/db/store';
import { env } from '@/lib/env';
import type { Id } from '@/lib/types';

/* ============================================================
   Sending email

   One provider so far. The point of the seam is that nothing else
   in the app knows which — and that when no provider is configured
   the failure is loud and logged rather than silent, because an
   email nobody notices did not send is worse than one that visibly
   did not.

   Every send is recorded in `sent_emails`, including the ones that
   could not go out, so the outbox on Event settings tells the truth.
   ============================================================ */

export interface Outgoing {
  to: string;
  toName?: string;
  subject: string;
  /** Plain text. The HTML body is built from it. */
  text: string;
  /** Optional richer body; the text version is always sent too. */
  html?: string;
  templateId?: Id;
  partnerId?: Id | null;
  /**
   * Names what this message is about, for anything sent on a timer.
   *
   * The slot is claimed in the database before the send, and the
   * unique index means a second claim loses — so a reminder run that
   * fires twice, overlaps itself, or is set off by hand mid-cycle
   * cannot chase the same partner about the same deadline twice.
   *
   * Omit it for one-off sends. Two people asking for a sign-in link
   * a minute apart both want one.
   */
  dedupeKey?: string;
}

export type SendResult =
  | { ok: true; provider: string }
  | { ok: false; reason: 'no_provider' | 'failed' | 'duplicate'; error: string };

/** Which provider is configured, for diagnostics and the settings screen. */
export function emailProvider(): string | null {
  return env('RESEND_API_KEY') ? 'resend' : null;
}

export async function sendEmail(message: Outgoing): Promise<SendResult> {
  const db = await getDb();
  const sender = db.event.sender ?? { name: '', email: '', signature: '', logo: '' };

  const fromName = sender.name || db.event.name || 'BOARD';
  const fromEmail = sender.email || env('EMAIL_FROM') || '';

  /*
   * Claim first, send second. The order matters: claiming after a
   * successful send would leave a window in which two runs both
   * send and only then discover the clash, which is the exact thing
   * being prevented.
   */
  let claimId: string | null = null;
  if (message.dedupeKey) {
    claimId = await claim(message, fromName, fromEmail, db.event.id);
    if (!claimId) {
      return {
        ok: false,
        reason: 'duplicate',
        error: `Already sent: ${message.dedupeKey}`,
      };
    }
  }

  let result: SendResult;

  if (!emailProvider()) {
    result = {
      ok: false,
      reason: 'no_provider',
      error: 'No email provider is configured. Set RESEND_API_KEY.',
    };
  } else if (!fromEmail) {
    result = {
      ok: false,
      reason: 'failed',
      error:
        'No sender address. Set one under Event settings → Email, or set EMAIL_FROM.',
    };
  } else {
    result = await sendViaResend(message, fromName, fromEmail);
  }

  if (claimId) {
    await settle(claimId, message, result);
  } else {
    await record(message, fromName, fromEmail, result);
  }

  if (!result.ok) {
    // Logged rather than thrown: the caller decides what a failed
    // send means, and for a sign-in link it must not look like the
    // address was wrong.
    console.error(
      `[email] ${result.reason}: ${result.error} — "${message.subject}" to ${message.to}`,
    );
  }

  return result;
}

/* ---------------------------------------------------------------
   Resend
   --------------------------------------------------------------- */

async function sendViaResend(
  message: Outgoing,
  fromName: string,
  fromEmail: string,
): Promise<SendResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env('RESEND_API_KEY')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? htmlFromText(message.text),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return {
        ok: false,
        reason: 'failed',
        error: `Resend answered ${response.status}. ${body.slice(0, 300)}`.trim(),
      };
    }

    return { ok: true, provider: 'resend' };
  } catch (e) {
    return {
      ok: false,
      reason: 'failed',
      error: e instanceof Error ? e.message : 'The send failed.',
    };
  }
}

/* ---------------------------------------------------------------
   Bodies
   --------------------------------------------------------------- */

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * A plain-text body as simple HTML.
 *
 * Escaped first, then paragraphed — so a partner name containing an
 * ampersand cannot become markup.
 */
function htmlFromText(text: string): string {
  const paragraphs = escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return [
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:560px">',
    paragraphs,
    '</div>',
  ].join('');
}

/* ---------------------------------------------------------------
   The log
   --------------------------------------------------------------- */

/**
 * Take the slot, or find it already taken.
 *
 * Returns the new row's id, or null when this message has already
 * been sent. A failure to claim for any *other* reason also returns
 * null — refusing to send is the safe direction when the record of
 * what has been sent cannot be trusted.
 */
async function claim(
  message: Outgoing,
  fromName: string,
  fromEmail: string,
  eventId: Id,
): Promise<string | null> {
  const id = mintId('sm');

  try {
    const { error } = await requireSupabase().from('sent_emails').insert({
      id,
      event_id: eventId,
      template_id: message.templateId ?? null,
      to_email: message.to,
      to_name: message.toName ?? '',
      partner_id: message.partnerId ?? null,
      subject: message.subject,
      body: '',
      from_email: fromEmail,
      from_name: fromName,
      sent_at: new Date().toISOString(),
      status: 'sending',
      dedupe_key: message.dedupeKey,
    });

    if (error) {
      // 23505 is the unique violation: somebody got here first, which
      // is a normal outcome and not worth logging as a fault.
      if (error.code !== '23505') {
        console.error(`[email] could not claim "${message.dedupeKey}":`, error.message);
      }
      return null;
    }

    return id;
  } catch (e) {
    console.error('[email] could not claim a send:', e);
    return null;
  }
}

/** Close out a claimed row with what actually happened. */
async function settle(claimId: string, message: Outgoing, result: SendResult) {
  try {
    await requireSupabase()
      .from('sent_emails')
      .update({
        status: result.ok ? 'sent' : 'failed',
        // Same rule as below: only template-driven bodies are kept.
        body: message.templateId ? message.text : '',
        sent_at: new Date().toISOString(),
      })
      .eq('id', claimId);
  } catch (e) {
    console.error('[email] could not close out a send:', e);
  }
}

async function record(
  message: Outgoing,
  fromName: string,
  fromEmail: string,
  result: SendResult,
) {
  try {
    const db = await getDb();

    await requireSupabase()
      .from('sent_emails')
      .insert({
        id: mintId('sm'),
        event_id: db.event.id,
        template_id: message.templateId ?? null,
        to_email: message.to,
        to_name: message.toName ?? '',
        partner_id: message.partnerId ?? null,
        subject: message.subject,
        // The body of a sign-in email contains a working link, so
        // only messages that are safe to keep record theirs.
        body: message.templateId ? message.text : '',
        from_email: fromEmail,
        from_name: fromName,
        sent_at: new Date().toISOString(),
        status: result.ok ? 'sent' : 'failed',
      });
  } catch (e) {
    // Logging a send must never be the reason a send fails.
    console.error('[email] could not record the send:', e);
  }
}
