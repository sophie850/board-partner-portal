import { requireArea } from '@/lib/auth/session';
import { OrderList, type OrderView } from '@/components/orders/OrderList';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  fmtDateTime,
  money,
  orderTotal,
  statusLabel,
  statusTone,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function OrganiserOrdersPage() {
  await requireArea('orders', '/organiser/orders');

  const db = await getDb();

  const orders: OrderView[] = db.orders
    .slice()
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
    .map((order) => {
      const part = db.participations.find((p) => p.id === order.participationId);
      const partner = db.partners.find((p) => p.id === part?.partnerId);

      const splits = db.supplierOrders
        .filter((so) => so.orderId === order.id)
        .sort((a, b) => a.reference.localeCompare(b.reference))
        .map((so) => {
          const supplier = db.suppliers.find((s) => s.id === so.supplierId);

          const webhooks = db.webhookEvents
            .filter((w) => w.supplierOrderId === so.id)
            .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
            .map((w) => {
              const last = (w.attempts ?? []).at(-1);
              return {
                id: w.id,
                eventType: w.eventType,
                status: w.status,
                sentAt: w.sentAt ? fmtDateTime(w.sentAt) : null,
                retryCount: w.retryCount,
                lastResponse: last?.responseBody ?? '',
                lastCode: last?.responseCode ?? null,
              };
            });

          return {
            id: so.id,
            reference: so.reference,
            supplierName: supplier?.name ?? 'Unknown supplier',
            /*
             * Whether a resend can possibly work. The URL itself is a
             * server-side value and is deliberately not sent to the
             * browser — only the fact that one exists.
             */
            supplierDeliverable: Boolean(supplier?.webhookUrl),
            status: so.status,
            statusLabel: statusLabel(so.status),
            statusTone: statusTone(so.status),
            approvalMode: so.approvalMode,
            subtotalLabel: money(db, so.subtotal),
            items: so.items.map((i) => ({
              name: i.name,
              qty: i.qty,
              priceLabel: i.unitPrice === null ? 'on quote' : money(db, i.unitPrice * i.qty),
            })),
            quote: so.quote
              ? {
                  amountLabel: money(db, so.quote.amount),
                  note: so.quote.note,
                  atLabel: fmtDate(so.quote.at),
                }
              : null,
            webhooks,
          };
        });

      return {
        id: order.id,
        reference: order.reference,
        partnerName: partner?.name ?? 'Unknown partner',
        partnerId: part?.partnerId ?? '',
        submittedLabel: fmtDateTime(order.submittedAt),
        totalLabel: money(db, orderTotal(db, order.id)),
        itemCount: order.items.length,
        splits,
        billingEntity: order.billing.legalEntity,
        invoiceEmail: order.billing.invoiceContactEmail,
        poNumber: order.billing.poNumber,
      };
    });

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Orders &amp; webhooks</PageTitle>
      <p className="mt-2 mb-6 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        Every order a partner has placed, split into the supplier orders it became. Approve or
        quote each one here — the supplier is notified by signed webhook, and every delivery
        attempt is logged below the order it belongs to.
      </p>

      <OrderList orders={orders} />
    </Rise>
  );
}
