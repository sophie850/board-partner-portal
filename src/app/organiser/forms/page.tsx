import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, formApplies, NO_DATE_LABEL } from '@/lib/resolvers';
import type { Db, FormDef } from '@/lib/types';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Form-first, not submission-first.
 *
 * A form is a thing in its own right — it has fields, a deadline and
 * a lifecycle — and a partner filling it in is a submission against
 * it. Listing submissions at the top level buries the form itself
 * and makes "how many have replied?" hard to answer.
 */
export default async function FormsPage() {
  await requireArea('forms', '/organiser/forms');

  const db = await getDb();
  const summaries = db.forms.map((form) => summarise(db, form));

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <PageTitle>Forms</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            What you need partners to tell you. Fields can be shown to some partners and not
            others, so two partners can receive the same form and see different questions.
          </p>
        </div>
        <Link
          href="/organiser/forms/new/edit"
          className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline transition-colors hover:bg-brand-hover hover:text-on-brand"
        >
          <Plus size={16} /> New form
        </Link>
      </div>

      {db.forms.length === 0 ? (
        <EmptyState
          icon={<FileText size={22} />}
          title="No forms yet"
          body="Start with a company profile — legal name, display name, sector, logo and a description. It is the one form every partner needs, and it feeds signage, the delegate app and printed materials."
          action={
            <Link
              href="/organiser/forms/new/edit"
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
            >
              <Plus size={16} /> Create the first form
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {summaries.map((s) => (
            <Link
              key={s.form.id}
              href={`/organiser/forms/${s.form.id}`}
              className="flex items-center gap-[16px] rounded-xl border border-line-2 bg-panel px-[18px] py-4 no-underline transition-colors hover:border-line-4 max-md:flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="text-[14.5px] text-ink">{s.form.title}</span>
                  {s.form.category && (
                    <span className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
                      {s.form.category}
                    </span>
                  )}
                </div>
                <div className="mt-[4px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                  <span>
                    {s.fieldCount} {s.fieldCount === 1 ? 'field' : 'fields'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{s.assignedTo}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {s.form.dueDate ? `Due ${fmtDate(s.form.dueDate)}` : NO_DATE_LABEL}
                  </span>
                  {s.form.allowResubmit && (
                    <>
                      <span aria-hidden>·</span>
                      <span>Resubmission allowed</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] text-ink-2">
                  {s.responded}/{s.assigned} responses
                </div>
                {s.toReview > 0 && (
                  <StatusPill tone="warn" className="mt-[6px]">
                    {s.toReview} to review
                  </StatusPill>
                )}
                {s.toReview === 0 && s.changesRequired > 0 && (
                  <StatusPill tone="neutral" className="mt-[6px]">
                    {s.changesRequired} awaiting partner
                  </StatusPill>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Rise>
  );
}

/* ---------------------------------------------------------------
   Response summary
   --------------------------------------------------------------- */

interface Summary {
  form: FormDef;
  fieldCount: number;
  assigned: number;
  responded: number;
  toReview: number;
  changesRequired: number;
  assignedTo: string;
}

function summarise(db: Db, form: FormDef): Summary {
  const applicable = db.participations.filter((p) => formApplies(db, form, p));

  let responded = 0;
  let toReview = 0;
  let changesRequired = 0;

  applicable.forEach((part) => {
    const state = part.formState?.[form.id];
    if (!state || state.status === 'not_started' || state.status === 'in_progress') return;
    responded += 1;
    if (state.status === 'submitted' || state.status === 'under_review') toReview += 1;
    if (state.status === 'changes_required') changesRequired += 1;
  });

  return {
    form,
    // Section headings and guidance are layout, not questions.
    fieldCount: form.fields.filter(
      (f) => f.type !== 'section_heading' && f.type !== 'guidance',
    ).length,
    assigned: applicable.length,
    responded,
    toReview,
    changesRequired,
    assignedTo: assignmentLabel(db, form),
  };
}

function assignmentLabel(db: Db, form: FormDef): string {
  const rule = form.assign;
  if (!rule || rule.type === 'all' || Object.keys(rule).length === 0) return 'All partners';

  if (rule.type === 'partner') {
    const names = (rule.partners ?? [])
      .map((id) => db.partners.find((p) => p.id === id)?.name)
      .filter(Boolean);
    return names.length ? `Only ${names.join(', ')}` : 'Specific partners';
  }

  const keys = Array.isArray(rule.keys) ? rule.keys : rule.key ? [rule.key] : [];
  const labels = keys.map((k) => db.entitlements.find((e) => e.key === k)?.label ?? k);
  if (!labels.length) return 'All partners';
  return labels.join(' or ');
}
