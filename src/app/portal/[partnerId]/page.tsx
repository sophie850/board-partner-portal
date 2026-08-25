import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  actionCounts,
  fmtDate,
  formsCoveredByTasks,
  isFormActionable,
  isOverdue,
  isUpcoming,
  money,
  packageValue,
  resolveForms,
  resolveTasks,
  taskProgress,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

/** "Eight of 12" reads better than "8/12" in a sentence. */
const WORDS = [
  'None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
  'Nine', 'Ten', 'Eleven', 'Twelve',
];

function spell(n: number): string {
  return WORDS[n] ?? String(n);
}

export default async function PartnerDashboard({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === partnerId);
  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!partner || !part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const counts = actionCounts(db, part);
  const progress = taskProgress(db, part);

  const tasks = resolveTasks(db, part);
  const forms = resolveForms(db, part);

  // A form with an outstanding linked task is represented by that
  // task, so listing both would show one unit of work twice — the
  // same rule that keeps the nav badges disjoint.
  const covered = formsCoveredByTasks(db, part);

  // Upcoming only. A partner's dashboard should show what is coming,
  // not re-litigate what is already late — overdue has its own stat.
  const upcoming = [
    ...tasks
      .filter((x) => !x.completed && x.dueDate && isUpcoming(x.dueDate))
      .map((x) => ({ id: x.id, title: x.title, date: x.dueDate!, kind: 'task' as const })),
    ...forms
      .filter(
        (f) =>
          !covered.has(f.id) &&
          f.dueDate &&
          isUpcoming(f.dueDate) &&
          isFormActionable(f.state.status),
      )
      .map((f) => ({ id: f.id, title: f.title, date: f.dueDate!, kind: 'form' as const })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const value = packageValue(part);
  const itemCount = (part.inventory ?? []).length;

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>{partner.name}</PageTitle>
      <p className="mt-2 text-[13.5px] text-ink-3">
        {db.event.name} · {db.event.venue}, {db.event.city} · {fmtDate(db.event.startDate)} –{' '}
        {fmtDate(db.event.endDate)}
      </p>

      <p className="mt-5 mb-7 max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
        {progress.total === 0
          ? `Nothing is outstanding yet. Anything the BOARD team needs from you will appear here.`
          : `${spell(progress.done)} of ${progress.total} ${t.lower.tasks} completed.` +
            (counts.overdue > 0
              ? ` ${spell(counts.overdue)} ${counts.overdue === 1 ? 'is' : 'are'} overdue.`
              : counts.total > 0
                ? ` ${spell(counts.total)} still ${counts.total === 1 ? 'needs' : 'need'} your attention.`
                : ' Nothing is outstanding.')}
      </p>

      {/* ---- clickable stats ---- */}
      <div className="mb-8 grid grid-cols-4 gap-3 max-md:grid-cols-2 max-[460px]:grid-cols-1">
        <Stat
          label="Outstanding"
          value={counts.tasks}
          href={`${base}/tasks`}
        />
        <Stat
          label="Overdue"
          value={counts.overdue}
          href={`${base}/tasks?filter=overdue`}
          tone={counts.overdue > 0 ? 'warn' : undefined}
        />
        <Stat label="Forms to do" value={counts.forms} href={`${base}/forms`} />
        <Stat
          label={`${t.participation} value`}
          value={money(db, value)}
          href={`${base}/participation`}
        />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-5 max-md:grid-cols-1">
        {/* ---- upcoming deadlines ---- */}
        <section>
          <h2 className="mb-3 text-[15px] font-light text-ink">Coming up</h2>
          {upcoming.length === 0 ? (
            <Panel className="px-[20px] py-5 text-[13.5px] text-ink-3">
              Nothing with a date ahead of it. Anything without a confirmed date shows as
              &ldquo;Date to be confirmed&rdquo; and is never treated as late.
            </Panel>
          ) : (
            <div className="flex flex-col gap-[9px]">
              {upcoming.slice(0, 6).map((item) => (
                <Link
                  key={`${item.kind}-${item.id}`}
                  href={item.kind === 'form' ? `${base}/forms/${item.id}` : `${base}/tasks`}
                  className="flex items-center gap-4 rounded-xl border border-line-2 bg-panel px-4 py-[13px] no-underline transition-colors hover:border-line-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink">{item.title}</div>
                    <div className="mt-[2px] text-[11.5px] text-ink-4">
                      {item.kind === 'form' ? 'Form' : t.task} · due {fmtDate(item.date)}
                    </div>
                  </div>
                  <ArrowRight size={15} className="shrink-0 text-ink-4" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ---- package summary + support ---- */}
        <aside className="flex flex-col gap-5">
          <section>
            <h2 className="mb-3 text-[15px] font-light text-ink">Your package</h2>
            <Panel className="px-[18px] py-4">
              {itemCount === 0 ? (
                <p className="text-[13px] text-ink-3">
                  Your package has not been set up yet.
                </p>
              ) : (
                <>
                  <ul className="m-0 flex list-none flex-col gap-[10px] p-0">
                    {(part.inventory ?? []).map((item) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-pill bg-accent"
                        />
                        <div className="min-w-0">
                          <div className="text-[13px] text-ink">{item.name}</div>
                          <div className="text-[11.5px] text-ink-4">
                            {item.type}
                            {item.standNumber && ` · Stand ${item.standNumber}`}
                            {item.quantity > 1 && ` · ×${item.quantity}`}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`${base}/participation`}
                    className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-accent no-underline"
                  >
                    See everything you have <ArrowRight size={13} />
                  </Link>
                </>
              )}
            </Panel>
          </section>

          <section>
            <h2 className="mb-3 text-[15px] font-light text-ink">Your BOARD contact</h2>
            <Panel className="px-[18px] py-4">
              <div className="text-[13px] text-ink">{db.event.sender.name}</div>
              <a
                href={`mailto:${db.event.sender.email}`}
                className="mt-[3px] block text-[12.5px] text-accent"
              >
                {db.event.sender.email}
              </a>
              {part.partnerNotes && (
                <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-3">
                  {part.partnerNotes}
                </p>
              )}
            </Panel>
          </section>
        </aside>
      </div>

      {/* ---- overdue, called out separately ---- */}
      {counts.overdue > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-light text-ink">Overdue</h2>
          <div className="flex flex-col gap-[9px]">
            {tasks
              .filter((x) => isOverdue(x.dueDate, x.completed))
              .map((x) => (
                <Link
                  key={x.id}
                  href={`${base}/tasks`}
                  className="flex items-center gap-4 rounded-xl border border-warn-line bg-warn-fill px-4 py-[13px] no-underline"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink">{x.title}</div>
                    <div className="mt-[2px] text-[11.5px] text-ink-3">
                      Was due {fmtDate(x.dueDate)}
                    </div>
                  </div>
                  <StatusPill tone="warn">Overdue</StatusPill>
                </Link>
              ))}
          </div>
        </section>
      )}
    </Rise>
  );
}

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  href: string;
  tone?: 'warn';
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line-2 bg-panel px-[18px] py-4 no-underline transition-colors hover:border-line-4"
    >
      <div
        className={`text-[28px] leading-none font-light ${tone === 'warn' ? 'text-warn' : 'text-ink'}`}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] tracking-[0.08em] text-ink-4 uppercase">{label}</div>
    </Link>
  );
}
