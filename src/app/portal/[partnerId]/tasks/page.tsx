import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, isOverdue, NO_DATE_LABEL, resolveTasks, terms } from '@/lib/resolvers';
import type { Db, ResolvedTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PartnerTasks({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { partnerId } = await params;
  const { filter } = await searchParams;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const all = resolveTasks(db, part);

  const filtered =
    filter === 'overdue'
      ? all.filter((x) => isOverdue(x.dueDate, x.completed))
      : filter === 'completed'
        ? all.filter((x) => x.completed)
        : filter === 'optional'
          ? all.filter((x) => !x.required)
          : all;

  // Outstanding first, overdue at the very top, then completed —
  // a single ordered list rather than separate buckets to scan.
  const ordered = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aOver = isOverdue(a.dueDate, a.completed);
    const bOver = isOverdue(b.dueDate, b.completed);
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  const filters = [
    { key: undefined, label: 'All', count: all.length },
    { key: 'overdue', label: 'Overdue', count: all.filter((x) => isOverdue(x.dueDate, x.completed)).length },
    { key: 'completed', label: 'Completed', count: all.filter((x) => x.completed).length },
    { key: 'optional', label: 'Optional', count: all.filter((x) => !x.required).length },
  ];

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>{t.tasks}</PageTitle>
      <p className="mt-2 mb-6 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything the BOARD team needs from you, in one list. Where a {t.lower.task} links to
        a form or a request, completing that marks the {t.lower.task} done automatically.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.key || (!filter && !f.key);
          return (
            <Link
              key={f.label}
              href={f.key ? `${base}/tasks?filter=${f.key}` : `${base}/tasks`}
              className={`rounded-pill border px-[14px] py-[6px] text-[12.5px] no-underline transition-colors ${
                active
                  ? 'border-accent-line bg-accent-fill text-accent hover:text-accent'
                  : 'border-line-3 text-ink-3 hover:text-ink'
              }`}
            >
              {f.label} · {f.count}
            </Link>
          );
        })}
      </div>

      {ordered.length === 0 ? (
        <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">
          Nothing here. Try another filter.
        </Panel>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {ordered.map((task) => (
            <TaskRow key={task.id} db={db} task={task} base={base} />
          ))}
        </div>
      )}
    </Rise>
  );
}

function TaskRow({ db, task, base }: { db: Db; task: ResolvedTask; base: string }) {
  const overdue = isOverdue(task.dueDate, task.completed);
  const action = actionFor(db, task, base);

  return (
    <div
      className={`rounded-xl border bg-panel px-[18px] py-4 ${
        overdue ? 'border-warn-line' : 'border-line-2'
      } ${task.completed ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="text-[14.5px] text-ink">{task.title}</span>
            {!task.required && (
              <span className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
                Optional
              </span>
            )}
          </div>

          {task.instructions && (
            <p className="mt-[6px] max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
              {task.instructions}
            </p>
          )}

          <div className="mt-[8px] text-[12px]">
            {task.completed ? (
              <span className="text-ink-4">
                Completed {task.completedAt ? fmtDate(task.completedAt) : ''}
                {task.completedBy ? ` by ${task.completedBy}` : ''}
              </span>
            ) : !task.dueDate ? (
              <span className="text-ink-4">{NO_DATE_LABEL}</span>
            ) : overdue ? (
              <span className="text-warn">Overdue — was due {fmtDate(task.dueDate)}</span>
            ) : (
              <span className="text-ink-3">Due {fmtDate(task.dueDate)}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {task.completed ? (
            <StatusPill tone="good">Done</StatusPill>
          ) : overdue ? (
            <StatusPill tone="warn">Overdue</StatusPill>
          ) : (
            <StatusPill tone="neutral">To do</StatusPill>
          )}

          {!task.completed && action && (
            <Link
              href={action.href}
              className="inline-flex items-center gap-[6px] rounded-pill bg-brand px-[16px] py-[8px] text-[12.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
            >
              {action.label} <ArrowUpRight size={13} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** The button label adapts to what the task actually links to. */
function actionFor(
  db: Db,
  task: ResolvedTask,
  base: string,
): { label: string; href: string } | null {
  const target = task.link?.target;

  switch (task.link?.type) {
    case 'form':
      return target ? { label: 'Complete form', href: `${base}/forms/${target}` } : null;
    case 'content':
      return target ? { label: 'Read & acknowledge', href: `${base}/information/${target}` } : null;
    case 'request':
      return { label: 'Start request', href: `${base}/requests` };
    case 'shop':
      return { label: 'Open shop', href: `${base}/shop` };
    case 'upload':
      return { label: 'Upload file', href: `${base}/files` };
    case 'url':
      return target ? { label: 'Open link', href: target } : null;
    default:
      return null;
  }
}
