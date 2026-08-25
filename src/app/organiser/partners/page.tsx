import { Building2 } from 'lucide-react';
import Link from 'next/link';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  entitlementSet,
  isOverdue,
  money,
  packageValue,
  resolveForms,
  resolveTasks,
  taskProgress,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function PartnersPage() {
  const db = await getDb();
  const t = terms(db);

  const rows = db.participations
    .map((part) => {
      const partner = db.partners.find((p) => p.id === part.partnerId);
      if (!partner) return null;

      const tasks = resolveTasks(db, part);
      const progress = taskProgress(db, part);
      const overdue = tasks.filter((x) => isOverdue(x.dueDate, x.completed)).length;
      const toReview = resolveForms(db, part).filter(
        (f) => f.state.status === 'submitted' || f.state.status === 'under_review',
      ).length;

      return {
        partner,
        part,
        progress,
        overdue,
        toReview,
        value: packageValue(part),
        entitlements: entitlementSet(db, part).size,
      };
    })
    .filter(Boolean) as Array<{
    partner: (typeof db.partners)[number];
    part: (typeof db.participations)[number];
    progress: { done: number; total: number };
    overdue: number;
    toReview: number;
    value: number;
    entitlements: number;
  }>;

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <PageTitle>{t.partners}</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            Every organisation taking part, and how far along each one is. Open a{' '}
            {t.lower.partner} for the whole picture, or preview their portal exactly as they
            see it.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} />}
          title={`No ${t.lower.partners} yet`}
          body={`Everything you configure — entitlements, ${t.lower.tasks}, forms, shop, content — becomes the event default that each ${t.lower.partner} inherits. Adding the first one is the next step.`}
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {rows.map((row) => (
            <div
              key={row.part.id}
              className="flex items-center gap-4 rounded-xl border border-line-2 bg-panel px-[18px] py-4 max-md:flex-wrap"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line-3 bg-chip text-[14px] text-ink-3">
                {initials(row.partner.name)}
              </span>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/organiser/partners/${row.partner.id}`}
                  className="text-[15px] text-ink no-underline hover:text-accent"
                >
                  {row.partner.name}
                </Link>
                <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                  <span>{row.partner.sector}</span>
                  <span aria-hidden>·</span>
                  <span>{row.part.reference}</span>
                  {row.part.standRef && (
                    <>
                      <span aria-hidden>·</span>
                      <span>Stand {row.part.standRef}</span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span>{money(db, row.value)}</span>
                </div>
              </div>

              {/* progress */}
              <div className="w-[150px] shrink-0 max-md:order-5 max-md:w-full">
                <div className="flex items-baseline justify-between text-[11.5px] text-ink-4">
                  <span>
                    {row.progress.done}/{row.progress.total} {t.lower.tasks}
                  </span>
                  {row.overdue > 0 && <span className="text-warn">{row.overdue} overdue</span>}
                </div>
                <div className="mt-[6px] h-[4px] overflow-hidden rounded-pill bg-chip">
                  <div
                    className={`h-full rounded-pill ${row.overdue > 0 ? 'bg-warn' : 'bg-accent'}`}
                    style={{
                      width: `${row.progress.total ? (row.progress.done / row.progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {row.toReview > 0 && (
                <StatusPill tone="info" className="shrink-0">
                  {row.toReview} to review
                </StatusPill>
              )}

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/organiser/partners/${row.partner.id}`}
                  className="rounded-pill border border-line-4 px-[14px] py-[6px] text-[12px] text-ink-2 no-underline hover:border-line-5 hover:text-ink"
                >
                  Summary
                </Link>
                <Link
                  href={`/portal/${row.partner.id}`}
                  className="rounded-pill border border-accent-line px-[14px] py-[6px] text-[12px] text-accent no-underline hover:bg-accent-fill hover:text-accent"
                >
                  Preview
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Rise>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
