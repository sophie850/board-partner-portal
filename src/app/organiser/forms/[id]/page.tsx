import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  fmtDateTime,
  formApplies,
  NO_DATE_LABEL,
  statusLabel,
  statusTone,
  visibleFields,
} from '@/lib/resolvers';
import type { Db, FormDef, FormSubmission, Participation } from '@/lib/types';

import { ReviewPanel } from './ReviewPanel';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Statuses where the ball is in the BOARD team's court. */
const AWAITING_REVIEW = new Set(['submitted', 'under_review']);
/** Statuses that are done as far as the organiser is concerned. */
const SETTLED = new Set(['approved', 'rejected']);

export default async function FormResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('forms', '/organiser/forms/[id]');

  const { id } = await params;
  const db = await getDb();

  const form = db.forms.find((f) => f.id === id);
  if (!form) notFound();

  const rows = db.participations
    .filter((p) => formApplies(db, form, p))
    .map((part) => ({
      part,
      partner: db.partners.find((x) => x.id === part.partnerId),
      state: (part.formState?.[form.id] ?? { status: 'not_started' }) as FormSubmission,
    }));

  // Awaiting review first, then everything still with the partner,
  // then settled ones dimmed under a divider. Sorting by urgency
  // means the top of the list is always the work.
  const awaiting = rows.filter((r) => AWAITING_REVIEW.has(r.state.status));
  const withPartner = rows.filter(
    (r) => !AWAITING_REVIEW.has(r.state.status) && !SETTLED.has(r.state.status),
  );
  const settled = rows.filter((r) => SETTLED.has(r.state.status));

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser · Forms</Eyebrow>

      <div className="mb-2 flex items-start justify-between gap-4">
        <PageTitle>{form.title}</PageTitle>
        <Link
          href={`/organiser/forms/${form.id}/edit`}
          className="inline-flex shrink-0 items-center gap-2 rounded-pill border border-line-4 px-4 py-[9px] text-[13px] text-ink no-underline transition-colors hover:border-accent-line hover:text-ink"
        >
          <Pencil size={14} /> Edit form
        </Link>
      </div>

      {form.description && (
        <p className="mb-3 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
          {form.description}
        </p>
      )}

      <div className="mb-7 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-4">
        <span>{form.dueDate ? `Due ${fmtDate(form.dueDate)}` : NO_DATE_LABEL}</span>
        <span aria-hidden>·</span>
        <span>
          {rows.filter((r) => r.state.status !== 'not_started').length}/{rows.length} responses
        </span>
        {form.allowResubmit && (
          <>
            <span aria-hidden>·</span>
            <span>Resubmission allowed</span>
          </>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-line-2 bg-panel px-[22px] py-6 text-[13.5px] text-ink-3">
          No partner currently matches this form&rsquo;s assignment rule, so nobody will
          receive it. Change who gets it under Edit form.
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {awaiting.map((r) => (
            <ResponseRow key={r.part.id} db={db} form={form} {...r} />
          ))}
          {withPartner.map((r) => (
            <ResponseRow key={r.part.id} db={db} form={form} {...r} />
          ))}

          {settled.length > 0 && (
            <>
              <div className="mt-4 mb-1 flex items-center gap-3">
                <span className="text-[11px] tracking-[0.14em] text-ink-4 uppercase">
                  Settled
                </span>
                <span className="h-px flex-1 bg-line-2" />
              </div>
              {settled.map((r) => (
                <ResponseRow key={r.part.id} db={db} form={form} {...r} dimmed />
              ))}
            </>
          )}
        </div>
      )}
    </Rise>
  );
}

function ResponseRow({
  db,
  form,
  part,
  partner,
  state,
  dimmed,
}: {
  db: Db;
  form: FormDef;
  part: Participation;
  partner: { id: string; name: string } | undefined;
  state: FormSubmission;
  dimmed?: boolean;
}) {
  const canReview = AWAITING_REVIEW.has(state.status);
  const answered = state.status !== 'not_started';

  // Only the fields this partner can actually see — a hidden field
  // has no answer, and showing it as blank would read as an omission.
  const fields = visibleFields(db, form, part, state.values).filter(
    (f) => f.type !== 'section_heading' && f.type !== 'guidance',
  );

  return (
    <div
      className={`rounded-xl border border-line-2 bg-panel px-[18px] py-4 ${dimmed ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] text-ink">{partner?.name ?? 'Unknown partner'}</div>
          <div className="mt-[3px] text-[11.5px] text-ink-4">
            {answered && state.submittedAt
              ? `Submitted ${fmtDateTime(state.submittedAt)} by ${state.submittedBy ?? '—'}`
              : 'Not started'}
            {state.reviewedAt && ` · Reviewed ${fmtDate(state.reviewedAt)}`}
          </div>
        </div>
        <StatusPill tone={statusTone(state.status)}>{statusLabel(state.status)}</StatusPill>
      </div>

      {state.feedback && (
        <div className="mt-3 rounded-lg border border-warn-line bg-warn-fill px-[15px] py-3 text-[12.5px] leading-relaxed text-ink-2">
          <span className="text-warn">Changes requested:</span> {state.feedback}
        </div>
      )}

      {answered && fields.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 max-md:grid-cols-1">
          {fields.map((f) => (
            <div key={f.key}>
              <dt className="text-[11px] tracking-[0.04em] text-ink-4 uppercase">{f.label}</dt>
              <dd className="mt-[3px] m-0 text-[13px] text-ink-2">
                {formatAnswer(state.values?.[f.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {canReview && <ReviewPanel participationId={part.id} formId={form.id} />}
    </div>
  );
}

/** Render an answer of any field type as readable text. */
function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') {
    const c = value as { name?: string; email?: string; phone?: string };
    return [c.name, c.email, c.phone].filter(Boolean).join(' · ') || '—';
  }
  return String(value);
}
