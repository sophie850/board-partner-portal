import { requireModule } from '@/lib/auth/session';
import { CalendarClock, CheckCircle2, Circle, FileText, ListChecks, Package } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  formsCoveredByTasks,
  isOverdue,
  productVisible,
  resolveForms,
  resolveTasks,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

interface Entry {
  key: string;
  date: string;
  title: string;
  detail: string;
  href: string | null;
  kind: 'task' | 'form' | 'file' | 'order' | 'event';
  done: boolean;
  overdue: boolean;
}

const ICON = {
  task: <ListChecks size={15} />,
  form: <FileText size={15} />,
  file: <FileText size={15} />,
  order: <Package size={15} />,
  event: <CalendarClock size={15} />,
};

export default async function PartnerTimeline({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'timeline');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const entries: Entry[] = [];

  /*
   * Tasks and forms are de-duplicated the same way the badges are: a
   * form with an outstanding linked task appears once, as the task.
   * Listing both would put the same piece of work on the timeline
   * twice with the same deadline.
   */
  const covered = formsCoveredByTasks(db, part);

  resolveTasks(db, part).forEach((task) => {
    if (!task.dueDate) return;
    entries.push({
      key: `task-${task.id}`,
      date: task.dueDate,
      title: task.title,
      detail: task.required ? 'Task' : 'Task · optional',
      href: `${base}/tasks`,
      kind: 'task',
      done: task.completed,
      overdue: isOverdue(task.dueDate, task.completed),
    });
  });

  resolveForms(db, part).forEach((form) => {
    if (!form.dueDate || covered.has(form.id)) return;
    const submitted = ['submitted', 'under_review', 'approved'].includes(form.state.status);
    entries.push({
      key: `form-${form.id}`,
      date: form.dueDate,
      title: form.title,
      detail: form.category ? `Form · ${form.category}` : 'Form',
      href: `${base}/forms/${form.id}`,
      kind: 'form',
      done: submitted,
      overdue: isOverdue(form.dueDate, submitted),
    });
  });

  (part.requestedFiles ?? []).forEach((file) => {
    if (!file.due) return;
    entries.push({
      key: `file-${file.id}`,
      date: file.due,
      title: file.label,
      detail: 'File we need from you',
      href: `${base}/files`,
      kind: 'file',
      done: Boolean(file.file),
      overdue: isOverdue(file.due, Boolean(file.file)),
    });
  });

  // Order deadlines are per product and only matter for things this
  // partner has not already ordered.
  const ordered = new Set(
    db.orders
      .filter((o) => o.participationId === part.id)
      .flatMap((o) => o.items.map((i) => i.productId)),
  );

  db.products.forEach((product) => {
    if (!product.orderDeadline || ordered.has(product.id)) return;
    // Only what this partner may actually order — a deadline for
    // something they cannot buy is not their deadline.
    if (!productVisible(db, product, part)) return;
    entries.push({
      key: `product-${product.id}`,
      date: product.orderDeadline,
      title: `Order deadline — ${product.name}`,
      detail: 'Shop',
      href: `${base}/shop`,
      kind: 'order',
      done: false,
      overdue: isOverdue(product.orderDeadline, false),
    });
  });

  entries.push({
    key: 'event-start',
    date: db.event.startDate,
    title: `${db.event.name} opens`,
    detail: `${db.event.venue}, ${db.event.city}`,
    href: null,
    kind: 'event',
    done: false,
    overdue: false,
  });

  entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  // Grouped by month, because a flat list of thirty dates is harder
  // to place yourself in than five headed months.
  const months: Array<{ label: string; items: Entry[] }> = [];
  entries.forEach((entry) => {
    const label = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    const last = months.at(-1);
    if (last?.label === label) last.items.push(entry);
    else months.push({ label, items: [entry] });
  });

  const outstanding = entries.filter((e) => !e.done && e.kind !== 'event').length;

  return (
    <Rise className="max-w-[820px]">
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Timeline</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything with a date attached, in the order it falls.
        {outstanding > 0 && ` ${outstanding} still outstanding.`}
      </p>

      {entries.length === 0 ? (
        <EmptyState
          icon={<CalendarClock size={22} />}
          title="Nothing dated yet"
          body="Deadlines appear here as the BOARD team sets them."
        />
      ) : (
        <div className="flex flex-col gap-7">
          {months.map((month) => (
            <section key={month.label}>
              <Eyebrow tone="accent" className="mb-3 tracking-[0.14em]">
                {month.label}
              </Eyebrow>

              <div className="flex flex-col">
                {month.items.map((entry) => {
                  const row = (
                    <>
                      {/* rail */}
                      <div className="flex w-[26px] shrink-0 flex-col items-center">
                        <span
                          className={
                            entry.done
                              ? 'text-accent'
                              : entry.overdue
                                ? 'text-warn'
                                : 'text-ink-4'
                          }
                        >
                          {entry.done ? <CheckCircle2 size={15} /> : <Circle size={13} />}
                        </span>
                        <span className="mt-1 w-px flex-1 bg-line" />
                      </div>

                      <div className="min-w-0 flex-1 pb-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] text-ink-4">{fmtDate(entry.date)}</span>
                          {entry.overdue && !entry.done && (
                            <StatusPill tone="warn">Overdue</StatusPill>
                          )}
                        </div>
                        <div
                          className={
                            entry.done
                              ? 'mt-[3px] text-[14px] text-ink-4 line-through'
                              : 'mt-[3px] text-[14px] text-ink'
                          }
                        >
                          {entry.title}
                        </div>
                        <div className="mt-[2px] flex items-center gap-[6px] text-[11.5px] text-ink-4">
                          {ICON[entry.kind]}
                          {entry.detail}
                        </div>
                      </div>
                    </>
                  );

                  return entry.href ? (
                    <Link
                      key={entry.key}
                      href={entry.href}
                      className="flex gap-3 no-underline hover:[&_*]:text-ink"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={entry.key} className="flex gap-3">
                      {row}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Rise>
  );
}
