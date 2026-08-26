import { requireModule } from '@/lib/auth/session';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { QuoteResponse } from '@/components/shop/QuoteResponse';
import {
  Callout,
  Eyebrow,
  PageTitle,
  Panel,
  Rise,
  StatusPill,
} from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, fmtDateTime, money, statusLabel, statusTone, terms } from '@/lib/resolvers';
import type { SupplierOrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * What each supplier-order state actually means for the partner.
 *
 * The status word alone is ambiguous — "confirmed" could reasonably
 * be read as "paid for" — so every state says plainly what has and
 * has not happened.
 */
const STATE_NOTE: Record<SupplierOrderStatus, string> = {
  confirmed:
    'Confirmed with the supplier. It will be invoiced separately — no payment has been taken here.',
  under_review:
    'With the BOARD team for review. It has not reached the supplier yet, and nothing is owed.',
  quote_requested:
    'A quote has been requested from the supplier. Nothing is confirmed until you accept it.',
  quoted: 'The supplier has quoted. Accept or decline below — nothing is confirmed until you do.',
  cancelled: 'Cancelled. Nothing is owed for these items.',
  rejected: 'Not accepted by the BOARD team. Your contact can explain why.',
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ partnerId: string; orderId: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { partnerId, orderId } = await params;
  await requireModule(partnerId, 'orders');
  const { placed } = await searchParams;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const order = db.orders.find((o) => o.id === orderId);
  // Scoped to this partner's participation, so guessing an order id
  // from another partner returns nothing rather than their invoicing
  // details.
  if (!order || order.participationId !== part.id) notFound();

  const t = terms(db);
  const splits = db.supplierOrders
    .filter((so) => so.orderId === order.id)
    .sort((a, b) => a.reference.localeCompare(b.reference));

  const subtotal = splits.reduce((sum, so) => sum + so.subtotal, 0);
  const quotedPending = splits.some(
    (so) => so.status === 'quote_requested' || so.status === 'quoted',
  );

  return (
    <Rise>
      <Link
        href={`/portal/${partnerId}/orders`}
        className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> All orders
      </Link>

      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>{order.reference}</PageTitle>
      <p className="mt-2 mb-7 text-[12.5px] text-ink-4">
        Submitted {fmtDateTime(order.submittedAt)} · {order.items.length}{' '}
        {order.items.length === 1 ? 'item' : 'items'} · {splits.length}{' '}
        {splits.length === 1 ? 'supplier' : 'suppliers'}
      </p>

      {placed === '1' && (
        <Callout className="mb-6">
          <span className="mb-1 flex items-center gap-2 text-ink">
            <CheckCircle2 size={16} className="text-accent" />
            <strong className="font-normal">Your order has been submitted.</strong>
          </span>
          No payment has been taken. Some items need confirmation before they are final — each
          supplier&rsquo;s progress is shown below. An invoice will follow separately from the
          BOARD team.
        </Callout>
      )}

      {/* ---- one card per supplier order ---- */}
      <div className="flex flex-col gap-4">
        {splits.map((so) => {
          const supplier = db.suppliers.find((s) => s.id === so.supplierId);

          return (
            <Panel key={so.id} className="px-[20px] py-[18px]">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <Eyebrow tone="accent" className="tracking-[0.12em]">
                  {supplier?.name ?? 'BOARD'}
                </Eyebrow>
                <StatusPill tone={statusTone(so.status)}>{statusLabel(so.status)}</StatusPill>
              </div>

              <p className="mb-4 text-[12px] text-ink-4">
                {so.reference}
                {so.confirmedAt && ` · confirmed ${fmtDate(so.confirmedAt)}`}
              </p>

              <p className="mb-4 text-[12.5px] leading-relaxed text-ink-3">
                {STATE_NOTE[so.status]}
              </p>

              <div className="flex flex-col gap-[10px]">
                {so.items.map((item) => {
                  // Options and answers live on the parent order line —
                  // suppliers get the specification, the partner sees
                  // what they chose.
                  const parentLine = order.items.find((i) => i.productId === item.productId);
                  const options = Object.entries(parentLine?.options ?? {});

                  return (
                    <div
                      key={item.productId}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-line-2 bg-inset px-[14px] py-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] text-ink">{item.name}</div>
                        <div className="mt-[2px] text-[11.5px] text-ink-4">
                          {item.qty} ×{' '}
                          {item.unitPrice === null ? 'quoted' : money(db, item.unitPrice)}
                          {options.length > 0 &&
                            ' · ' + options.map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </div>
                      </div>
                      <div className="w-[100px] shrink-0 text-right text-[13px] text-ink-2">
                        {item.unitPrice === null
                          ? 'On quote'
                          : money(db, item.unitPrice * item.qty)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {so.quote && (
                <div className="mt-4 rounded-lg border border-warn-line bg-warn-fill px-[16px] py-[13px]">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-[12.5px] text-ink-3">
                      Quoted {fmtDate(so.quote.at)}
                    </span>
                    <span className="text-[17px] font-light text-ink">
                      {money(db, so.quote.amount)}{' '}
                      <span className="text-[11.5px] text-ink-4">exc. tax</span>
                    </span>
                  </div>
                  {so.quote.note && (
                    <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                      {so.quote.note}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-3 flex justify-between border-t border-line pt-3 text-[13px]">
                <span className="text-ink-4">Subtotal exc. tax</span>
                <span className="text-ink">{money(db, so.subtotal)}</span>
              </div>

              {so.status === 'quoted' && (
                <QuoteResponse
                  partnerId={partnerId}
                  supplierOrderId={so.id}
                  supplierName={supplier?.name ?? 'the supplier'}
                />
              )}
            </Panel>
          );
        })}
      </div>

      {/* ---- total ---- */}
      <Panel className="mt-4 px-[20px] py-[18px]">
        <div className="flex items-baseline justify-between">
          <span className="text-[13.5px] text-ink-3">Order total exc. tax</span>
          <span className="text-[22px] font-light text-ink">{money(db, subtotal)}</span>
        </div>
        {quotedPending && (
          <p className="mt-2 text-[12px] text-ink-4">
            Quoted items are not included until you accept the quote.
          </p>
        )}
        <p className="mt-3 text-[12px] leading-relaxed text-ink-4">
          No payment is taken in the portal. Invoices are raised separately by the BOARD team.
        </p>
      </Panel>

      {/* ---- invoicing details as submitted ---- */}
      <Panel className="mt-4 px-[20px] py-[18px]">
        <Eyebrow className="mb-4 tracking-[0.12em]">Invoicing details as submitted</Eyebrow>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] max-md:grid-cols-1">
          {(
            [
              ['Legal entity', order.billing.legalEntity],
              ['Billing address', order.billing.address],
              ['VAT / tax number', order.billing.taxNumber],
              ['Purchase order', order.billing.poNumber],
              ['Invoice contact', order.billing.invoiceContactName],
              ['Invoice email', order.billing.invoiceContactEmail],
              ['Your reference', order.billing.internalRef],
              ['Notes', order.billing.notes],
            ] as const
          )
            .filter(([, value]) => Boolean(value?.trim()))
            .map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11.5px] text-ink-4">{label}</dt>
                <dd className="mt-[2px] text-ink-2">{value}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 text-[12px] text-ink-4">
          These cannot be edited here once the order is submitted — your BOARD contact can
          change them.
        </p>
      </Panel>
    </Rise>
  );
}
