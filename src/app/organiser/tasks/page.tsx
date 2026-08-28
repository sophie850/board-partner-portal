import { CircleCheck, Plus } from 'lucide-react';
import Link from 'next/link';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  NO_DATE_LABEL,
  resolveTasks,
  taskApplies,
  taskOverdue,
  terms,
} from '@/lib/resolvers';
import type { Db, TaskTemplate } from '@/lib/types';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  await requireArea('tasks', '/organiser/tasks');

  const db = await getDb();
  const t = terms(db);

  const rows = db.taskTemplates.map((task) => summarise(db, task));

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <PageTitle>{t.tasks}</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            The canonical action list. Each {t.lower.task} can send a {t.lower.partner} to a
            form, a page, a request or the shop — and completes itself when they finish it,
            so nothing is ticked off twice.
          </p>
        </div>
        <Link
          href="/organiser/tasks/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline transition-colors hover:bg-brand-hover hover:text-on-brand"
        >
          <Plus size={16} /> New {t.lower.task}
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CircleCheck size={22} />}
          title={`No ${t.lower.tasks} yet`}
          body={`A ${t.lower.task} is one thing you need a ${t.lower.partner} to do. Gate it by entitlement and only the ${t.lower.partners} it applies to will ever see it.`}
          action={
            <Link
              href="/organiser/tasks/new"
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
            >
              <Plus size={16} /> Create the first one
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {rows.map((row) => (
            <Link
              key={row.task.id}
              href={`/organiser/tasks/${row.task.id}`}
              className="flex items-center gap-4 rounded-xl border border-line-2 bg-panel px-[18px] py-4 no-underline transition-colors hover:border-line-4 max-md:flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-[10px]">
                  <span className="text-[14.5px] text-ink">{row.task.title}</span>
                  {row.task.category && (
                    <span className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
                      {row.task.category}
                    </span>
                  )}
                  {!row.task.required && (
                    <span className="text-[11px] tracking-[0.06em] text-ink-4 uppercase">
                      Optional
                    </span>
                  )}
                </div>
                <div className="mt-[4px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                  <span>{row.appliesLabel}</span>
                  <span aria-hidden>·</span>
                  <span>{row.linkLabel}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {row.task.dueDate ? `Due ${fmtDate(row.task.dueDate)}` : NO_DATE_LABEL}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-[13px] text-ink-2">
                  {row.done}/{row.applies} complete
                  {row.declined > 0 && (
                    <span className="text-ink-4"> · {row.declined} not needed</span>
                  )}
                </div>
                {row.overdue > 0 && (
                  <StatusPill tone="warn" className="mt-[6px]">
                    {row.overdue} overdue
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

interface Summary {
  task: TaskTemplate;
  applies: number;
  done: number;
  overdue: number;
  appliesLabel: string;
  linkLabel: string;
  /** Partners who answered "not needed". */
  declined: number;
}

function summarise(db: Db, task: TaskTemplate): Summary {
  const applicable = db.participations.filter((p) => taskApplies(db, task, p));

  let done = 0;
  let declined = 0;
  let overdue = 0;

  applicable.forEach((part) => {
    const resolved = resolveTasks(db, part).find((x) => x.id === task.id);
    if (!resolved) return;
    // Counted apart from done on purpose. "Six completed it" and
    // "six said they did not need it" mean very different things
    // when you are deciding whether to chase anybody.
    if (resolved.declined) declined += 1;
    else if (resolved.completed) done += 1;
    else if (taskOverdue(resolved)) overdue += 1;
  });

  return {
    task,
    applies: applicable.length,
    done,
    declined,
    overdue,
    appliesLabel: appliesLabel(db, task),
    linkLabel: linkLabel(db, task),
  };
}

function appliesLabel(db: Db, task: TaskTemplate): string {
  const keys = Array.isArray(task.requires)
    ? task.requires
    : task.requires
      ? [task.requires]
      : [];

  if (!keys.length) return 'All partners';

  const labels = keys.map((k) => db.entitlements.find((e) => e.key === k)?.label ?? k);
  return labels.join(' or ');
}

/** Says what completing the task actually involves. */
function linkLabel(db: Db, task: TaskTemplate): string {
  const target = task.link?.target;

  switch (task.link?.type) {
    case 'form': {
      const form = db.forms.find((f) => f.id === target);
      return form ? `Form · ${form.title}` : 'Form · missing';
    }
    case 'content': {
      const page = db.contentPages.find((p) => p.id === target);
      return page ? `Page · ${page.title}` : 'Page · missing';
    }
    case 'request': {
      const type = db.requestTypes.find((r) => r.id === target);
      return type ? `Request · ${type.name}` : 'Request · missing';
    }
    case 'shop': {
      const cat = db.shopCategories.find((c) => c.id === target);
      return cat ? `Shop · ${cat.name}` : 'Shop';
    }
    case 'upload':
      return 'File upload';
    case 'url':
      return 'External link';
    case 'ack':
      return 'Acknowledgement';
    default:
      return 'Checklist';
  }
}
