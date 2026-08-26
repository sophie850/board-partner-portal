import { requireArea } from '@/lib/auth/session';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  fmtDateTime,
  formsCoveredByTasks,
  isFormActionable,
  isOverdue,
  isUpcoming,
  money,
  orderTotal,
  packageValue,
  resolveForms,
  resolveTasks,
  statusLabel,
  statusTone,
  taskProgress,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

/**
 * The "sponsor on the phone" screen.
 *
 * Everything about one partner on one page, ordered by what you'd
 * be asked: what's late, what's coming, what they've sent, what
 * they've raised, what they've bought, and what has happened.
 */
export default async function PartnerSummary({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('partners', '/organiser/partners/[id]');

  const { id } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === id);
  const part = db.participations.find((p) => p.partnerId === id);
  if (!partner || !part) notFound();

  const t = terms(db);
  const tasks = resolveTasks(db, part);
  const forms = resolveForms(db, part);
  const progress = taskProgress(db, part);
  const lead = db.partnerUsers.find((u) => u.id === part.leadUserId);

  const overdue = tasks.filter((x) => isOverdue(x.dueDate, x.completed));
  const covered = formsCoveredByTasks(db, part);

  // Same de-duplication as everywhere else: a form represented by an
  // outstanding task is not listed separately.
  const upcoming = [
    ...tasks
      .filter((x) => !x.completed && x.dueDate && isUpcoming(x.dueDate))
      .map((x) => ({ kind: t.task, title: x.title, date: x.dueDate! })),
    ...forms
      .filter(
        (f) =>
          !covered.has(f.id) &&
          f.dueDate &&
          isUpcoming(f.dueDate) &&
          isFormActionable(f.state.status),
      )
      .map((f) => ({ kind: 'Form', title: f.title, date: f.dueDate! })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const submissions = forms.filter((f) => f.state.status !== 'not_started');
  const requests = db.requests.filter((r) => r.participationId === part.id);
  const orders = db.orders.filter((o) => o.participationId === part.id);

  const uploads = (part.requestedFiles ?? []).filter((f) => f.file);
  const outstandingFiles = (part.requestedFiles ?? []).filter((f) => !f.file);

  const activity = db.auditLog
    .filter((a) => a.partnerId === partner.id)
    .sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <Rise className="max-w-[860px]">
      <Link
        href="/organiser/partners"
        className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> {t.partners}
      </Link>

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-line-3 bg-chip text-[15px] text-ink-3">
          {partner.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('')}
        </span>
        <div className="min-w-0 flex-1">
          <PageTitle>{partner.name}</PageTitle>
          <div className="mt-[3px] text-[12.5px] text-ink-4">
            {partner.sector} · {part.reference}
            {lead && ` · ${lead.name}`}
            {part.standRef && ` · Stand ${part.standRef}`}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/portal/${partner.id}`}
            className="rounded-pill border border-accent-line px-[15px] py-2 text-[12.5px] text-accent no-underline hover:bg-accent-fill hover:text-accent"
          >
            Preview
          </Link>
          <Link
            href={`/organiser/partners/${partner.id}/configure`}
            className="rounded-pill bg-brand px-[18px] py-2 text-[12.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
          >
            Configure
          </Link>
        </div>
      </div>

      {/* ---- stats ---- */}
      <div className="bp-grid-2up mb-5 grid grid-cols-4 gap-3 max-md:grid-cols-2 max-[460px]:grid-cols-1">
        <Stat label={`${t.tasks} complete`} value={`${progress.done}/${progress.total}`} />
        <Stat label="Overdue" value={String(overdue.length)} tone={overdue.length ? 'warn' : undefined} />
        <Stat label="Submissions" value={String(submissions.length)} />
        <Stat label="Package value" value={money(db, packageValue(part))} />
      </div>

      {/* ---- overdue ---- */}
      {overdue.length > 0 && (
        <div className="mb-4 rounded-xl border border-warn-line bg-warn-fill px-5 py-[18px]">
          <Eyebrow className="mb-3 tracking-[0.12em] text-warn">Overdue — needs chasing</Eyebrow>
          <div className="flex flex-col gap-[9px]">
            {overdue.map((x) => (
              <div
                key={x.id}
                className="flex items-center gap-3 rounded-md border border-warn-line bg-inset px-[14px] py-[11px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink">{x.title}</div>
                  <div className="mt-[2px] text-[11.5px] text-warn">
                    Was due {fmtDate(x.dueDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bp-set-grid grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Section title="Coming up" empty={upcoming.length === 0} emptyText="Nothing else outstanding.">
          {upcoming.map((u, i) => (
            <div key={i} className="flex items-start gap-[10px]">
              <StatusPill tone="neutral" className="mt-[1px]">
                {u.kind}
              </StatusPill>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink">{u.title}</div>
                <div className="mt-[2px] text-[11.5px] text-ink-4">Due {fmtDate(u.date)}</div>
              </div>
            </div>
          ))}
        </Section>

        <Section
          title="Submissions"
          empty={submissions.length === 0}
          emptyText="No form submissions yet."
        >
          {submissions.map((f) => (
            <Link
              key={f.id}
              href={`/organiser/forms/${f.id}`}
              className="flex items-center gap-[10px] rounded-md border border-line-2 bg-inset px-[13px] py-[10px] no-underline hover:border-line-4"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-ink">{f.title}</div>
                {f.state.submittedAt && (
                  <div className="mt-[2px] text-[11.5px] text-ink-4">
                    {fmtDate(f.state.submittedAt)} · {f.state.submittedBy}
                  </div>
                )}
              </div>
              <StatusPill tone={statusTone(f.state.status)}>
                {statusLabel(f.state.status)}
              </StatusPill>
            </Link>
          ))}
        </Section>

        <Section title={t.requests} empty={requests.length === 0} emptyText="No requests raised.">
          {requests.map((r) => {
            const type = db.requestTypes.find((x) => x.id === r.typeId);
            return (
              <Link
                key={r.id}
                href="/organiser/requests"
                className="flex items-center gap-[10px] rounded-md border border-line-2 bg-inset px-[13px] py-[10px] no-underline hover:border-line-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-ink">{r.reference}</div>
                  <div className="mt-[2px] text-[11.5px] text-ink-4">{type?.name}</div>
                </div>
                <StatusPill tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusPill>
              </Link>
            );
          })}
        </Section>

        <Section title="Orders" empty={orders.length === 0} emptyText="No shop orders.">
          {orders.map((o) => (
            <Link
              key={o.id}
              href="/organiser/orders"
              className="flex items-center gap-[10px] rounded-md border border-line-2 bg-inset px-[13px] py-[10px] no-underline hover:border-line-4"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink">{o.reference}</div>
                <div className="mt-[2px] text-[11.5px] text-ink-4">
                  {fmtDate(o.submittedAt)} · {o.items.length} items
                </div>
              </div>
              <div className="text-[13px] text-ink-2">{money(db, orderTotal(db, o.id))}</div>
            </Link>
          ))}
        </Section>
      </div>

      {/* ---- files ---- */}
      <Section
        title="Files & uploads"
        className="mt-4"
        empty={uploads.length === 0 && outstandingFiles.length === 0}
        emptyText="No files requested or uploaded yet."
      >
        {uploads.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-[11px] rounded-md border border-line-2 bg-inset px-[14px] py-[11px]"
          >
            <FileText size={15} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] text-ink">{f.file!.name}</div>
              <div className="mt-[2px] text-[11.5px] text-ink-4">
                {f.label} · {fmtDate(f.file!.uploadedAt)} · {f.file!.by}
              </div>
            </div>
          </div>
        ))}
        {outstandingFiles.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-[11px] rounded-md border border-line-2 bg-inset px-[14px] py-[11px]"
          >
            <FileText size={15} className="shrink-0 text-ink-4" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-ink-3">{f.label}</div>
              <div className="mt-[2px] text-[11.5px] text-ink-4">
                {f.due ? `Requested by ${fmtDate(f.due)}` : 'No deadline'} · not yet provided
              </div>
            </div>
            <StatusPill tone={f.due && isOverdue(f.due) ? 'warn' : 'muted'}>
              Outstanding
            </StatusPill>
          </div>
        ))}
      </Section>

      {/* ---- internal notes: organiser-only ---- */}
      {part.internalNotes && (
        <Panel className="mt-4 px-5 py-[18px]">
          <Eyebrow className="mb-2 tracking-[0.12em]">Internal notes</Eyebrow>
          <p className="text-[13px] leading-relaxed text-ink-2">{part.internalNotes}</p>
          <p className="mt-2 text-[11.5px] text-ink-4">
            Never shown to the {t.lower.partner}.
          </p>
        </Panel>
      )}

      {/* ---- activity ---- */}
      <Section
        title="Activity trail"
        className="mt-4"
        empty={activity.length === 0}
        emptyText="No recorded activity yet."
        gap={false}
      >
        {activity.map((a) => (
          <div key={a.id} className="flex gap-3 border-b border-line py-[10px] last:border-b-0">
            <span
              aria-hidden
              className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-pill bg-ink-5"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] leading-snug text-ink-2">{a.text}</div>
              <div className="mt-[2px] text-[11.5px] text-ink-4">
                {fmtDateTime(a.at)} · {a.actor}
              </div>
            </div>
          </div>
        ))}
      </Section>
    </Rise>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'warn';
}) {
  return (
    <div className="rounded-xl border border-line-2 bg-panel px-[18px] py-4">
      <div className="mb-[9px] text-[11px] tracking-[0.05em] text-ink-4 uppercase">{label}</div>
      <div className={`text-[22px] leading-none font-light ${tone === 'warn' ? 'text-warn' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  empty,
  emptyText,
  className,
  gap = true,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
  emptyText?: string;
  className?: string;
  gap?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-line-2 bg-panel px-5 py-[18px] ${className ?? ''}`}>
      <Eyebrow tone="accent" className="mb-[14px] tracking-[0.12em]">
        {title}
      </Eyebrow>
      {empty ? (
        <div className="text-[13px] text-ink-4">{emptyText}</div>
      ) : (
        <div className={`flex flex-col ${gap ? 'gap-[9px]' : ''}`}>{children}</div>
      )}
    </div>
  );
}
