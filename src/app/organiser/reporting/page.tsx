import { requireArea } from '@/lib/auth/session';
import { Headlines, Reporting, type Report } from '@/components/reporting/Reporting';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import type { CsvCell } from '@/lib/csv';
import {
  fmtDateTime,
  isOverdue,
  money,
  resolveForms,
  resolveTasks,
  statusLabel,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function OrganiserReporting() {
  await requireArea('reporting', '/organiser/reporting');

  const db = await getDb();
  const currency = db.event.currency;

  /* ---- partner completion ---- */

  const completion = db.participations.map((part) => {
    const partner = db.partners.find((p) => p.id === part.partnerId);
    const tasks = resolveTasks(db, part);
    const forms = resolveForms(db, part);

    const tasksDone = tasks.filter((t) => t.completed).length;
    const formsDone = forms.filter((f) =>
      ['submitted', 'under_review', 'approved'].includes(f.state.status),
    ).length;

    const total = tasks.length + forms.length;
    const done = tasksDone + formsDone;

    const overdue =
      tasks.filter((t) => isOverdue(t.dueDate, t.completed)).length +
      forms.filter((f) =>
        isOverdue(
          f.dueDate,
          ['submitted', 'under_review', 'approved'].includes(f.state.status),
        ),
      ).length;

    return {
      part,
      name: partner?.name ?? 'Unknown partner',
      tasks,
      forms,
      tasksDone,
      formsDone,
      total,
      done,
      overdue,
      // A partner with nothing assigned is complete, not zero per
      // cent — dividing by nothing would report them as the worst.
      pct: total === 0 ? 100 : Math.round((done / total) * 100),
    };
  });

  /* ---- orders by supplier ---- */

  const bySupplier = new Map<
    string,
    { name: string; count: number; value: number; confirmed: number }
  >();

  db.supplierOrders.forEach((so) => {
    const supplier = db.suppliers.find((s) => s.id === so.supplierId);
    const entry = bySupplier.get(so.supplierId) ?? {
      name: supplier?.name ?? so.supplierId,
      count: 0,
      value: 0,
      confirmed: 0,
    };
    entry.count += 1;
    entry.value += so.subtotal;
    if (so.status === 'confirmed') entry.confirmed += 1;
    bySupplier.set(so.supplierId, entry);
  });

  /* ---- product quantities ---- */

  const quantities = new Map<string, { qty: number; orders: number }>();
  db.supplierOrders.forEach((so) =>
    so.items.forEach((item) => {
      const entry = quantities.get(item.name) ?? { qty: 0, orders: 0 };
      entry.qty += item.qty;
      entry.orders += 1;
      quantities.set(item.name, entry);
    }),
  );

  const confirmedValue = db.supplierOrders
    .filter((s) => s.status === 'confirmed')
    .reduce((a, s) => a + s.subtotal, 0);

  const failedWebhooks = db.webhookEvents.filter((w) => w.status === 'failed').length;
  const openRequests = db.requests.filter((r) =>
    ['submitted', 'under_review', 'more_info'].includes(r.status),
  ).length;

  /* ---- the reports ---- */

  const reports: Report[] = [
    {
      key: 'completion',
      title: 'Partner completion',
      description:
        'Tasks and forms each partner has finished, and how many are past their deadline.',
      filename: 'partner-completion.csv',
      headers: [
        'Partner',
        'Reference',
        'Tasks complete',
        'Tasks total',
        'Forms complete',
        'Forms total',
        'Completion',
        'Overdue',
      ],
      rows: completion.map(
        (c): CsvCell[] => [
          c.name,
          c.part.reference,
          c.tasksDone,
          c.tasks.length,
          c.formsDone,
          c.forms.length,
          `${c.pct}%`,
          c.overdue,
        ],
      ),
      summary: completion
        .slice()
        .sort((a, b) => a.pct - b.pct)
        .map((c) => ({
          label: c.name,
          value: `${c.done}/${c.total}`,
          detail: c.overdue > 0 ? `${c.overdue} overdue` : undefined,
          pct: c.pct,
        })),
    },

    {
      key: 'suppliers',
      title: 'Orders by supplier',
      description:
        'What each supplier has been sent, and its value excluding tax. Quoted items count only once a quote has been recorded.',
      filename: 'orders-by-supplier.csv',
      headers: [
        'Supplier',
        'Supplier orders',
        'Confirmed',
        `Value exc. tax (${currency})`,
      ],
      rows: [...bySupplier.values()].map(
        (s): CsvCell[] => [s.name, s.count, s.confirmed, s.value],
      ),
      summary: [...bySupplier.values()]
        .sort((a, b) => b.value - a.value)
        .map((s) => ({
          label: s.name,
          value: money(db, s.value),
          detail: `${s.count} ${s.count === 1 ? 'order' : 'orders'} · ${s.confirmed} confirmed`,
        })),
    },

    {
      key: 'products',
      title: 'Product quantities',
      description: 'Total ordered of each product, across every partner — what to procure.',
      filename: 'product-quantities.csv',
      headers: ['Product', 'Total quantity', 'Appears on orders'],
      rows: [...quantities.entries()].map(
        ([name, q]): CsvCell[] => [name, q.qty, q.orders],
      ),
      summary: [...quantities.entries()]
        .sort((a, b) => b[1].qty - a[1].qty)
        .map(([name, q]) => ({
          label: name,
          value: String(q.qty),
          detail: `on ${q.orders} ${q.orders === 1 ? 'order' : 'orders'}`,
        })),
    },

    {
      key: 'orders',
      title: 'Every supplier order',
      description:
        'One row per supplier order, with the parent order and partner it belongs to.',
      filename: 'supplier-orders.csv',
      headers: [
        'Order',
        'Partner',
        'Supplier order',
        'Supplier',
        'Status',
        `Total inc. tax (${currency})`,
      ],
      rows: db.orders.flatMap((order): CsvCell[][] => {
        const part = db.participations.find((p) => p.id === order.participationId);
        const partner = db.partners.find((p) => p.id === part?.partnerId);

        return db.supplierOrders
          .filter((so) => so.orderId === order.id)
          .map((so): CsvCell[] => [
            order.reference,
            partner?.name ?? '',
            so.reference,
            db.suppliers.find((s) => s.id === so.supplierId)?.name ?? so.supplierId,
            statusLabel(so.status),
            so.total,
          ]);
      }),
      summary: [],
    },

    {
      key: 'webhooks',
      title: 'Webhook deliveries',
      description:
        'Every event owed to a supplier and what happened to it. Failed deliveries can be resent from Orders & webhooks.',
      filename: 'webhook-deliveries.csv',
      headers: ['Event', 'Supplier', 'Status', 'Attempts', 'Idempotency key', 'Sent'],
      rows: db.webhookEvents.map(
        (w): CsvCell[] => [
          w.eventType,
          db.suppliers.find((s) => s.id === w.supplierId)?.name ?? w.supplierId,
          statusLabel(w.status),
          w.retryCount,
          w.idempotencyKey,
          w.sentAt ? fmtDateTime(w.sentAt) : '',
        ],
      ),
      summary: (['delivered', 'pending', 'failed'] as const)
        .map((status) => ({
          label: statusLabel(status),
          value: String(db.webhookEvents.filter((w) => w.status === status).length),
        }))
        .filter((row) => row.value !== '0'),
    },
  ];

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Reporting</PageTitle>
      <p className="mt-2 mb-7 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        Where the event stands, and the rows behind each figure. Every export is a CSV of
        exactly what is shown above it.
      </p>

      <Headlines
        items={[
          { label: 'Partners', value: String(db.participations.length) },
          { label: 'Confirmed orders', value: money(db, confirmedValue) },
          { label: 'Open requests', value: String(openRequests) },
          {
            label: 'Failed webhooks',
            value: String(failedWebhooks),
            tone: failedWebhooks > 0 ? 'warn' : undefined,
          },
        ]}
      />

      <Reporting reports={reports} />
    </Rise>
  );
}
