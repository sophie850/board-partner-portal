import { fmtDate } from '@/lib/resolvers';
import type { Db, Partner, PartnerUser } from '@/lib/types';

/* ============================================================
   Merge fields

   Email templates are written by the BOARD team in Event settings,
   with tokens in square brackets — “Hi [first_name], a reminder
   that [task] is due [due]”. This is what turns those into words.

   Two rules, both deliberate:

     * Every token in KNOWN is always substituted, whether or not a
       value was supplied. A message with nothing to say about
       [task] leaves a gap, never the literal text “[task]” in a
       partner's inbox.

     * Anything else in brackets is left exactly as written. A typo
       — [frist_name] — stays visible so somebody notices, and
       ordinary prose in brackets survives being sent.

   Pure, and free of `server-only`, so the rules can be tested
   directly rather than by sending mail.
   ============================================================ */

export const KNOWN = [
  'first_name',
  'contact_name',
  'partner',
  'task',
  'due',
  'event',
  'portal_link',
  'sender',
  'sender_email',
  'signature',
] as const;

export type MergeToken = (typeof KNOWN)[number];
export type MergeValues = Partial<Record<MergeToken, string>>;

const KNOWN_SET = new Set<string>(KNOWN);

/**
 * Substitute the tokens in one piece of text.
 *
 * Case-insensitive, because people type [First_Name] and mean the
 * same thing.
 */
export function fillTokens(text: string, values: MergeValues): string {
  const filled = String(text ?? '').replace(/\[([a-zA-Z_]+)\]/g, (whole, name: string) => {
    const key = name.toLowerCase();
    if (!KNOWN_SET.has(key)) return whole;
    return values[key as MergeToken] ?? '';
  });

  return tidy(filled);
}

/**
 * Clear up after an empty substitution.
 *
 * A token that resolved to nothing leaves a double space, a stray
 * line, or a run of blank lines behind it. None of that is worth
 * asking the person writing the template to think about.
 */
function tidy(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * The values for one message.
 *
 * `portalLink` is passed rather than derived: an invitation carries
 * a single-use sign-in link, while a reminder points at the portal
 * itself, and only the caller knows which it is sending.
 */
export function mergeValuesFor(
  db: Db,
  input: {
    partner?: Partner | null;
    user?: PartnerUser | null;
    portalLink?: string;
    task?: string;
    due?: string | null;
  },
): MergeValues {
  const sender = db.event.sender ?? { name: '', email: '', signature: '', logo: '' };
  const name = input.user?.name ?? '';

  return {
    first_name: name.split(/\s+/)[0] ?? '',
    contact_name: name,
    partner: input.partner?.name ?? '',
    task: input.task ?? '',
    due: input.due ? fmtDate(input.due) : '',
    event: db.event.name,
    portal_link: input.portalLink ?? '',
    sender: sender.name,
    sender_email: sender.email,
    signature: sender.signature || sender.name,
  };
}

/**
 * A template, rendered.
 *
 * `fallback` covers the case where somebody has emptied the body in
 * settings. An invitation with no body is a blank email, which is
 * worse than one in the house wording.
 */
export function renderTemplate(
  template: { subject?: string; body?: string } | undefined,
  values: MergeValues,
  fallback: { subject: string; body: string },
): { subject: string; text: string } {
  const subject = template?.subject?.trim() || fallback.subject;
  const body = template?.body?.trim() || fallback.body;

  return {
    subject: fillTokens(subject, values),
    text: fillTokens(body, values),
  };
}

/** The wording an invitation falls back to. */
export const INVITATION_FALLBACK = {
  subject: 'You’re invited to the [event] Partner Portal',
  body: [
    'Hi [first_name],',
    '',
    'You have been given access to the Partner Portal for [event], on behalf of [partner].',
    '',
    'Everything we need from you lives there — your tasks and their deadlines, the forms to complete, the files to send us, and everything we have made available for you to download.',
    '',
    'Use this link to set up your access: [portal_link]',
    '',
    'The link works once and is just for you, so please do not forward it. If it has expired by the time you get to it, you can ask for a new one from the sign-in page using this email address.',
    '',
    'If you have any questions, reply to this email and it will reach us.',
    '',
    '[signature]',
  ].join('\n'),
};
