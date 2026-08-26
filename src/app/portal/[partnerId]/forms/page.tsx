import { requireModule } from '@/lib/auth/session';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  isFormActionable,
  isOverdue,
  NO_DATE_LABEL,
  resolveForms,
  statusLabel,
  statusTone,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

/** Most urgent first among the forms still needing work. */
const ACTION_ORDER: Record<string, number> = {
  changes_required: 0,
  in_progress: 1,
  not_started: 2,
};

export default async function PartnerForms({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'forms');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const forms = resolveForms(db, part);

  const actionable = forms
    .filter((f) => isFormActionable(f.state.status))
    .sort(
      (a, b) =>
        (ACTION_ORDER[a.state.status] ?? 9) - (ACTION_ORDER[b.state.status] ?? 9),
    );

  const settled = forms.filter((f) => !isFormActionable(f.state.status));

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Forms</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Information the BOARD team needs from you. You are only asked the questions that
        apply to your participation.
      </p>

      {forms.length === 0 ? (
        <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">
          No forms have been assigned to you.
        </Panel>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {actionable.map((f) => (
            <FormRow key={f.id} form={f} base={base} />
          ))}

          {settled.length > 0 && (
            <>
              <div className="mt-4 mb-1 flex items-center gap-3">
                <span className="text-[11px] tracking-[0.14em] text-ink-4 uppercase">
                  Submitted &amp; approved
                </span>
                <span className="h-px flex-1 bg-line-2" />
              </div>
              {settled.map((f) => (
                <FormRow key={f.id} form={f} base={base} dimmed />
              ))}
            </>
          )}
        </div>
      )}
    </Rise>
  );
}

function FormRow({
  form,
  base,
  dimmed,
}: {
  form: ReturnType<typeof resolveForms>[number];
  base: string;
  dimmed?: boolean;
}) {
  const overdue =
    isFormActionable(form.state.status) && isOverdue(form.dueDate, false);

  return (
    <Link
      href={`${base}/forms/${form.id}`}
      className={`flex items-center gap-4 rounded-xl border bg-panel no-underline transition-colors hover:border-line-4 ${
        overdue ? 'border-warn-line' : 'border-line-2'
      } ${dimmed ? 'px-[18px] py-[13px] opacity-60' : 'px-[18px] py-4'}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-[10px]">
          <span className={dimmed ? 'text-[13.5px] text-ink' : 'text-[14.5px] text-ink'}>
            {form.title}
          </span>
          {form.category && (
            <span className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
              {form.category}
            </span>
          )}
        </div>

        {!dimmed && form.description && (
          <p className="mt-[6px] max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
            {form.description}
          </p>
        )}

        <div className="mt-[8px] text-[12px]">
          {!form.dueDate ? (
            <span className="text-ink-4">{NO_DATE_LABEL}</span>
          ) : overdue ? (
            <span className="text-warn">Overdue — was due {fmtDate(form.dueDate)}</span>
          ) : (
            <span className="text-ink-4">Due {fmtDate(form.dueDate)}</span>
          )}
          {form.state.submittedAt && (
            <span className="text-ink-4">
              {' '}
              · Submitted {fmtDate(form.state.submittedAt)}
            </span>
          )}
        </div>
      </div>

      <StatusPill tone={statusTone(form.state.status)}>
        {statusLabel(form.state.status)}
      </StatusPill>
    </Link>
  );
}
