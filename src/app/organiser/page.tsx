import {
  FileText,
  MessageSquareWarning,
  Receipt,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';

import { Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  taskOverdue,
  isUpcoming,
  money,
  resolveForms,
  resolveTasks,
  terms,
} from '@/lib/resolvers';
import type { Db } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function OrganiserDashboard() {
  const db = await getDb();
  const t = terms(db);

  /* ---- the queue: what the BOARD team owes partners ---- */
  const queue = outstandingActions(db);

  /* ---- headline figures ---- */
  const partnerCount = db.partners.length;

  let tasksOutstanding = 0;
  let tasksOverdue = 0;
  let formsToReview = 0;

  db.participations.forEach((part) => {
    resolveTasks(db, part).forEach((task) => {
      if (task.completed) return;
      tasksOutstanding += 1;
      if (taskOverdue(task)) tasksOverdue += 1;
    });
    resolveForms(db, part).forEach((f) => {
      if (f.state.status === 'submitted' || f.state.status === 'under_review') formsToReview += 1;
    });
  });

  const openRequests = db.requests.filter(
    (r) => r.status !== 'closed' && r.status !== 'approved' && r.status !== 'rejected',
  ).length;

  const ordersToApprove = db.supplierOrders.filter(
    (s) => s.status === 'under_review' || s.status === 'quote_requested',
  ).length;

  const failedWebhooks = db.webhookEvents.filter((w) => w.status === 'failed').length;

  const packageValue = db.participations.reduce(
    (sum, p) => sum + (p.inventory ?? []).reduce((a, i) => a + i.cost * (i.quantity || 1), 0),
    0,
  );

  /* ---- deadlines, aggregated by task rather than one row per partner ---- */
  const deadlines = aggregatedDeadlines(db);

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>{db.event.name}</PageTitle>
      <p className="mt-2 mb-7 text-[13.5px] text-ink-3">
        {db.event.venue}, {db.event.city} · {fmtDate(db.event.startDate)} –{' '}
        {fmtDate(db.event.endDate)}
      </p>

      {/* ---- your team's outstanding actions ---- */}
      <section className="mb-8">
        <h2 className="mb-3 text-[15px] font-light text-ink">
          Your team&rsquo;s outstanding actions
        </h2>

        {queue.length === 0 ? (
          <div className="rounded-xl border border-line-2 bg-panel px-[22px] py-6 text-[13.5px] text-ink-3">
            Nothing waiting on the BOARD team. Everything submitted has been reviewed.
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {queue.slice(0, 8).map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-[14px] rounded-xl border border-line-2 bg-panel px-4 py-[13px] no-underline transition-colors hover:border-line-4"
              >
                <span className={`shrink-0 ${item.tone === 'warn' ? 'text-warn' : 'text-info'}`}>
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink">{item.title}</div>
                  <div className="mt-[2px] text-[11.5px] text-ink-4">{item.sub}</div>
                </div>
                <StatusPill tone={item.tone}>{item.label}</StatusPill>
              </Link>
            ))}
            {queue.length > 8 && (
              <div className="pt-1 text-[12.5px] text-ink-4">
                +{queue.length - 8} more
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---- stats ---- */}
      <section className="mb-8">
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-[460px]:grid-cols-1">
          <Stat label={t.partners} value={partnerCount} href="/organiser/partners" />
          <Stat
            label={`${t.tasks} outstanding`}
            value={tasksOutstanding}
            href="/organiser/tasks"
          />
          <Stat
            label="Overdue"
            value={tasksOverdue}
            href="/organiser/tasks"
            tone={tasksOverdue > 0 ? 'warn' : undefined}
          />
          <Stat label="Forms to review" value={formsToReview} href="/organiser/forms" />
          <Stat label={`Open ${t.lower.requests}`} value={openRequests} href="/organiser/requests" />
          <Stat label="Orders to approve" value={ordersToApprove} href="/organiser/orders" />
          <Stat
            label="Failed webhooks"
            value={failedWebhooks}
            href="/organiser/orders"
            tone={failedWebhooks > 0 ? 'warn' : undefined}
          />
          <Stat label="Package value" value={money(db, packageValue)} href="/organiser/reporting" />
        </div>
        <p className="mt-3 text-[11.5px] text-ink-4">All values exclude tax.</p>
      </section>

      {/* ---- upcoming deadlines, aggregated ---- */}
      <section>
        <h2 className="mb-3 text-[15px] font-light text-ink">Upcoming deadlines</h2>
        {deadlines.length === 0 ? (
          <div className="rounded-xl border border-line-2 bg-panel px-[22px] py-6 text-[13.5px] text-ink-3">
            No deadlines ahead. Anything without a date shows as &ldquo;Date to be
            confirmed&rdquo; and is never counted as overdue.
          </div>
        ) : (
          <div className="flex flex-col gap-[9px]">
            {deadlines.slice(0, 6).map((d) => (
              <div
                key={d.key}
                className="flex items-center gap-[14px] rounded-xl border border-line-2 bg-panel px-4 py-[13px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-ink">{d.title}</div>
                  <div className="mt-[2px] text-[11.5px] text-ink-4">
                    {d.partners} {d.partners === 1 ? t.lower.partner : t.lower.partners}
                    {d.overdue > 0 && (
                      <span className="text-warn"> · {d.overdue} overdue</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-[12.5px] text-ink-3">{fmtDate(d.date)}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Rise>
  );
}

/* ---------------------------------------------------------------
   Stat card
   --------------------------------------------------------------- */

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

/* ---------------------------------------------------------------
   The queue

   Only things the BOARD team owes somebody: submissions awaiting
   review, requests awaiting an answer, orders awaiting approval,
   quotes to provide, and failed webhook deliveries. Partner-side
   work belongs on the partner's dashboard, not here.
   --------------------------------------------------------------- */

interface QueueItem {
  key: string;
  title: string;
  sub: string;
  label: string;
  tone: 'warn' | 'info';
  href: string;
  icon: React.ReactNode;
}

function outstandingActions(db: Db): QueueItem[] {
  const items: QueueItem[] = [];
  const partnerName = (participationId: string) => {
    const part = db.participations.find((p) => p.id === participationId);
    return db.partners.find((x) => x.id === part?.partnerId)?.name ?? 'Unknown partner';
  };

  // Forms awaiting review
  db.participations.forEach((part) => {
    const org = db.partners.find((x) => x.id === part.partnerId);
    resolveForms(db, part).forEach((f) => {
      if (f.state.status !== 'submitted' && f.state.status !== 'under_review') return;
      items.push({
        key: `form-${part.id}-${f.id}`,
        title: `Review ${f.title}`,
        sub: `${org?.name ?? ''} · submitted ${fmtDate(f.state.submittedAt)}`,
        label: 'To review',
        tone: 'info',
        href: '/organiser/forms',
        icon: <FileText size={17} />,
      });
    });
  });

  // Requests awaiting an answer
  db.requests.forEach((r) => {
    if (r.status !== 'submitted' && r.status !== 'under_review') return;
    const type = db.requestTypes.find((x) => x.id === r.typeId);
    items.push({
      key: `req-${r.id}`,
      title: `Answer ${type?.name ?? 'request'}`,
      sub: `${partnerName(r.participationId)} · ${r.reference}`,
      label: 'Awaiting reply',
      tone: 'info',
      href: '/organiser/requests',
      icon: <MessageSquareWarning size={17} />,
    });
  });

  // Supplier orders needing approval or a quote
  db.supplierOrders.forEach((so) => {
    if (so.status !== 'under_review' && so.status !== 'quote_requested') return;
    const supplier = db.suppliers.find((s) => s.id === so.supplierId);
    const order = db.orders.find((o) => o.id === so.orderId);
    items.push({
      key: `so-${so.id}`,
      title:
        so.status === 'quote_requested'
          ? `Provide a quote · ${supplier?.name ?? ''}`
          : `Approve order · ${supplier?.name ?? ''}`,
      sub: `${order ? partnerName(order.participationId) : ''} · ${so.reference}`,
      label: so.status === 'quote_requested' ? 'Quote needed' : 'To approve',
      tone: 'info',
      href: '/organiser/orders',
      icon: <Receipt size={17} />,
    });
  });

  // Failed webhook deliveries
  db.webhookEvents.forEach((w) => {
    if (w.status !== 'failed') return;
    const supplier = db.suppliers.find((s) => s.id === w.supplierId);
    items.push({
      key: `wh-${w.id}`,
      title: `Webhook failed · ${supplier?.name ?? ''}`,
      sub: `${w.eventType} · ${w.retryCount} attempts`,
      label: 'Failed',
      tone: 'warn',
      href: '/organiser/orders',
      icon: <TriangleAlert size={17} />,
    });
  });

  // Most urgent first: failures, then everything else.
  return items.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'warn' ? -1 : 1));
}

/* ---------------------------------------------------------------
   Deadlines, grouped by task

   One row per task with "N partners · X overdue", not one row per
   partner per task — at volume that list is unreadable, and a
   deadline is rarely partner-specific.
   --------------------------------------------------------------- */

interface DeadlineGroup {
  key: string;
  title: string;
  date: string;
  partners: number;
  overdue: number;
}

function aggregatedDeadlines(db: Db): DeadlineGroup[] {
  const groups = new Map<string, DeadlineGroup>();

  db.participations.forEach((part) => {
    resolveTasks(db, part).forEach((task) => {
      if (task.completed || !task.dueDate) return;
      if (!isUpcoming(task.dueDate)) return;

      // Key on task + date, so a per-partner override surfaces as
      // its own row rather than being folded into the default.
      const key = `${task.id}-${task.dueDate}`;
      const existing = groups.get(key);

      if (existing) {
        existing.partners += 1;
        if (taskOverdue(task)) existing.overdue += 1;
      } else {
        groups.set(key, {
          key,
          title: task.title,
          date: task.dueDate,
          partners: 1,
          overdue: taskOverdue(task) ? 1 : 0,
        });
      }
    });
  });

  return [...groups.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export const metadata = {
  title: 'Dashboard · BOARD Partner Portal',
};

