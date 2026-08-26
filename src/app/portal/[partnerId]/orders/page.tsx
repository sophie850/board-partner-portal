import { Receipt } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, money, orderTotal, statusLabel, statusTone, terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const orders = db.orders
    .filter((o) => o.participationId === part.id)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Orders</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything you have ordered through the shop. All values exclude tax. No payment is
        taken in the portal — invoices follow separately.
      </p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Receipt size={22} />}
          title="No orders yet"
          body="Anything you order in the shop appears here, with its progress through each supplier."
          action={
            <Link
              href={`/portal/${partnerId}/shop`}
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
            >
              Open the shop
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {orders.map((o) => {
            const splits = db.supplierOrders.filter((so) => so.orderId === o.id);
            const awaiting = splits.filter((so) => so.status === 'quoted').length;

            return (
              <Link
                key={o.id}
                href={`/portal/${partnerId}/orders/${o.id}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-line-2 bg-panel px-[18px] py-4 no-underline transition-colors hover:border-line-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] text-ink">{o.reference}</div>
                  <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                    <span>{fmtDate(o.submittedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</span>
                    <span aria-hidden>·</span>
                    <span>{splits.length} {splits.length === 1 ? 'supplier' : 'suppliers'}</span>
                  </div>
                </div>

                {awaiting > 0 && (
                  <StatusPill tone="warn">
                    {awaiting} {awaiting === 1 ? 'quote' : 'quotes'} to accept
                  </StatusPill>
                )}

                <div className="shrink-0 text-right">
                  <div className="text-[14px] text-ink">{money(db, orderTotal(db, o.id))}</div>
                  <div className="mt-[2px] text-[11px] text-ink-4">exc. tax</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Rise>
  );
}
