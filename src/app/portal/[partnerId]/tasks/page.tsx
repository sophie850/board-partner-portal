import { requireModule } from '@/lib/auth/session';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TaskAnswer } from '@/components/tasks/TaskAnswer';
import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  isOverdue,
  NO_DATE_LABEL,
  resolveTasks,
  taskOverdue,
  terms,
} from '@/lib/resolvers';
import type { Db, Participation, ResolvedTask } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PartnerTasks({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'tasks');
  const { filter } = await searchParams;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const all = resolveTasks(db, part);

  const filtered =
    filter === 'overdue'
      ? all.filter((x) => taskOverdue(x))
      : filter === 'completed'
        ? all.filter((x) => x.completed)
        : filter === 'optional'
          ? all.filter((x) => !x.required)
          : all;

  // Outstanding first, overdue at the very top, then completed —
  // a single ordered list rather than separate buckets to scan.
  const ordered = [...filtered].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aOver = taskOverdue(a);
    const bOver = taskOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });

  const filters = [
    { key: undefined, label: 'All', count: all.length },
    { key: 'overdue', label: 'Overdue', count: all.filter((x) => taskOverdue(x)).length },
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
            <TaskRow
              key={task.id}
              db={db}
              part={part}
              task={task}
              base={base}
              partnerId={partnerId}
            />
          ))}
        </div>
      )}
    </Rise>
  );
}

/**
 * The kinds the portal cannot watch finish, so the partner says so.
 * Everything else completes as a consequence of the work itself.
 */
const SELF_REPORTED = new Set(['checklist', 'url', 'ack']);

/**
 * "Not needed" is a real answer to an offer, not to an obligation.
 * Anything optional, and anything from the shop — ordering is only
 * work if you want what is on sale.
 */
function mayDecline(task: ResolvedTask): boolean {
  if (task.completed) return false;
  return !task.required || task.link?.type === 'shop';
}

function TaskRow({
  db,
  part,
  task,
  base,
  partnerId,
}: {
  db: Db;
  part: Participation;
  task: ResolvedTask;
  base: string;
  partnerId: string;
}) {
  const overdue = taskOverdue(task);
  const action = actionFor(db, task, base);
  const kind = task.link?.type;
  /*
   * An upload task completes when the requested files arrive — but if
   * the organiser asked for none, nothing will ever arrive and the
   * task would be unfinishable. Rare, and a misconfiguration, but the
   * partner should not be the one stuck with it.
   */
  const nothingToUpload = kind === 'upload' && (part.requestedFiles ?? []).length === 0;

  const tickable = Boolean(kind && SELF_REPORTED.has(kind)) || nothingToUpload;
  const declinable = mayDecline(task);
  const declined = Boolean(task.declined);

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
            {task.declined ? (
              <span className="text-ink-4">
                Not needed — you told us on{' '}
                {task.declinedAt ? fmtDate(task.declinedAt) : 'a previous visit'}
              </span>
            ) : task.completed ? (
              <span className="text-ink-4">
                Completed {task.completedAt ? fmtDate(task.completedAt) : ''}
                {task.completedBy ? ` by ${task.completedBy}` : ''}
              </span>
            ) : !task.dueDate ? (
              <span className="text-ink-4">{NO_DATE_LABEL}</span>
            ) : overdue ? (
              <span className="text-warn">Overdue — was due {fmtDate(task.dueDate)}</span>
            ) : isOverdue(task.dueDate, task.completed) ? (
              // Optional, and past its date. Not late — nobody owed it
              // — but "Due 18 Aug" about a day gone by reads as a
              // mistake, so say what actually happened.
              <span className="text-ink-4">Was due {fmtDate(task.dueDate)}</span>
            ) : (
              <span className="text-ink-3">Due {fmtDate(task.dueDate)}</span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {task.declined ? (
            <StatusPill tone="muted">Not needed</StatusPill>
          ) : task.completed ? (
            <StatusPill tone="good">Done</StatusPill>
          ) : overdue ? (
            <StatusPill tone="warn">Overdue</StatusPill>
          ) : (
            <StatusPill tone="neutral">To do</StatusPill>
          )}

          {/*
            * The way in stays for a declined task. Declining answers
            * the chaser, not the thing behind it — a partner who said
            * they needed no AV in January and changes their mind in
            * March must find the shop exactly where they left it, and
            * taking the link away is how a portal implies it closed
            * something it has not closed.
            */}
          {(!task.completed || task.declined) && action && (
            <Link
              href={action.href}
              className={
                // Secondary when a "Mark as done" sits beside it —
                // two solid buttons on one row compete, and the tick
                // is the one that finishes the task.
                tickable || declinable
                  ? 'inline-flex items-center gap-[6px] rounded-pill border border-accent-line px-[16px] py-[8px] text-[12.5px] text-accent no-underline hover:bg-accent-fill hover:text-accent'
                  : 'inline-flex items-center gap-[6px] rounded-pill bg-brand px-[16px] py-[8px] text-[12.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand'
              }
            >
              {action.label} <ArrowUpRight size={13} />
            </Link>
          )}

          {(tickable || declinable || declined) && (
            <TaskAnswer
              partnerId={partnerId}
              taskId={task.id}
              title={task.title}
              tickable={tickable}
              declinable={declinable}
              permanent={kind === 'ack'}
              done={task.completed}
              declined={declined}
            />
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
