import { visibleFields } from '@/lib/resolvers';
import type { Db, FormDef, Participation } from '@/lib/types';

/* ============================================================
   What BOARD is told when a form arrives

   Kept apart from the sending, and free of `server-only`, so the
   thing that matters — which answers end up in whose inbox — can be
   checked against fixtures rather than by submitting a form and
   reading an inbox.
   ============================================================ */

/** One answer of any field type, as a line of text. */
export function readable(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map(readable).join(', ') : '—';

  if (typeof value === 'object') {
    const c = value as Record<string, unknown>;
    const parts = [c.name, c.email, c.phone, c.url].filter(Boolean).map(String);
    return parts.length ? parts.join(' · ') : JSON.stringify(value);
  }

  return String(value);
}

export interface Notice {
  subject: string;
  text: string;
}

/**
 * The message, built from the submission as it stands.
 *
 * The answers travel in the body rather than only a link. A venue
 * questionnaire that says "a form was submitted" and nothing else
 * makes somebody open a browser to learn one fact, and the email is
 * then also a record in its own right — which, for a team that
 * wanted their data in a spreadsheet in case anything went wrong, is
 * most of the point.
 *
 * Only the fields this partner could see. A question hidden from
 * them has no answer, and listing it blank reads as an omission on
 * their part rather than a question they were never asked.
 */
export function submissionNotice(
  db: Db,
  form: FormDef,
  part: Participation,
  reviewLink: string,
): Notice {
  const partner = db.partners.find((p) => p.id === part.partnerId) ?? null;
  const name = partner?.name ?? 'A partner';
  const state = part.formState?.[form.id];

  const fields = visibleFields(db, form, part, state?.values).filter(
    (f) => f.type !== 'section_heading' && f.type !== 'guidance',
  );

  const answers = fields
    .map((f) => `${f.label}: ${readable(state?.values?.[f.key])}`)
    .join('\n');

  /*
   * null drops a line, '' keeps a blank one. Filtering every empty
   * string would take the paragraph breaks with it and run the
   * whole message together — which is what it did until somebody
   * read one.
   */
  const text = [
    `${name} has submitted \u201C${form.title}\u201D.`,
    '',
    `Partner:   ${name}${part.reference ? ` (${part.reference})` : ''}`,
    part.standRef ? `Stand:     ${part.standRef}` : null,
    `Submitted: ${state?.submittedBy ?? '\u2014'}`,
    '',
    answers || 'No answers were recorded against this submission.',
    '',
    `Review it here: ${reviewLink}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    subject: `${form.title} — submitted by ${name}`,
    text,
  };
}
