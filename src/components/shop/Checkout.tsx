'use client';

import { ArrowLeft, Minus, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  Panel,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import type { OrderBilling } from '@/lib/types';

import { checkout } from '@/app/portal/[partnerId]/shop/actions';
import { useCart } from './CartProvider';

/* ============================================================
   Cart and checkout

   The cart is grouped by supplier here, because that is how it will
   actually be fulfilled — one order each. Showing it as one flat
   list would hide the fact that three suppliers are involved and
   that they confirm on different terms.

   No payment is collected. The copy says so at the point of
   submitting, not only afterwards.
   ============================================================ */

export interface CartProductInfo {
  id: string;
  name: string;
  unit: string;
  price: number | null;
  supplierId: string;
  supplierName: string;
  approvalMode: 'auto' | 'manual' | 'quote';
  taxRate: number;
  minQty: number;
  maxQty: number;
  /** Past its order deadline — still shown, but blocks submission. */
  closed: boolean;
  closedLabel: string | null;
}

const APPROVAL_NOTE: Record<string, string> = {
  auto: 'Confirmed as soon as you submit.',
  manual: 'Reviewed by the BOARD team before it reaches the supplier.',
  quote: 'A quote is requested first. You accept or decline before anything is confirmed.',
};

export function Checkout({
  partnerId,
  participationId,
  products,
  defaultBilling,
  currencySymbol,
}: {
  partnerId: string;
  participationId: string;
  products: CartProductInfo[];
  defaultBilling: OrderBilling;
  currencySymbol: string;
}) {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [billing, setBilling] = useState<OrderBilling>(defaultBilling);
  const [terms, setTerms] = useState(false);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { supplierName: string; approval: string; lines: typeof cart.lines }
    >();

    cart.lines.forEach((line) => {
      const product = byId.get(line.productId);
      if (!product) return;
      const existing = map.get(product.supplierId);
      if (existing) {
        existing.lines.push(line);
        // The most cautious mode in the group wins, matching how the
        // supplier order will actually open.
        if (product.approvalMode === 'quote') existing.approval = 'quote';
        else if (product.approvalMode === 'manual' && existing.approval !== 'quote')
          existing.approval = 'manual';
      } else {
        map.set(product.supplierId, {
          supplierName: product.supplierName,
          approval: product.approvalMode,
          lines: [line],
        });
      }
    });

    return [...map.values()];
  }, [cart.lines, byId]);

  const money = (n: number) =>
    currencySymbol + new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 }).format(n);

  const grandSubtotal = cart.lines.reduce((sum, l) => {
    const p = byId.get(l.productId);
    return sum + (p?.price ?? 0) * l.qty;
  }, 0);

  const anyQuote = cart.lines.some((l) => byId.get(l.productId)?.price === null);

  // Lines whose ordering window has shut. The order cannot go while
  // any remain, so they are named rather than silently dropped.
  const closedLines = cart.lines.filter((l) => byId.get(l.productId)?.closed);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await checkout(
        partnerId,
        participationId,
        cart.lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          options: l.options,
          answers: l.answers,
        })),
        billing,
        terms,
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      cart.clear();
      router.push(`/portal/${partnerId}/orders/${result.orderId}?placed=1`);
      router.refresh();
    });
  }

  if (!cart.ready) {
    return <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">Loading your cart…</Panel>;
  }

  if (cart.lines.length === 0) {
    return (
      <Panel className="px-[22px] py-8 text-center">
        <p className="text-[14px] text-ink">Your cart is empty.</p>
        <Link
          href={`/portal/${partnerId}/shop`}
          className="mt-4 inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[10px] text-[13px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
        >
          Back to the shop
        </Link>
      </Panel>
    );
  }

  const patch = (p: Partial<OrderBilling>) => setBilling((b) => ({ ...b, ...p }));

  return (
    <>
      <Link
        href={`/portal/${partnerId}/shop`}
        className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> Keep shopping
      </Link>

      {error && (
        <Callout tone="warn" className="mb-5">
          {error}
        </Callout>
      )}

      {/* ---- cart, grouped by supplier ---- */}
      <div className="mb-7 flex flex-col gap-4">
        {groups.map((group) => {
          const subtotal = group.lines.reduce((sum, l) => {
            const p = byId.get(l.productId);
            return sum + (p?.price ?? 0) * l.qty;
          }, 0);
          const hasQuote = group.lines.some((l) => byId.get(l.productId)?.price === null);

          return (
            <Panel key={group.supplierName} className="px-[20px] py-[18px]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <Eyebrow tone="accent" className="tracking-[0.12em]">
                  {group.supplierName}
                </Eyebrow>
                <StatusPill tone={group.approval === 'auto' ? 'good' : 'warn'}>
                  {group.approval === 'auto'
                    ? 'Auto-confirmed'
                    : group.approval === 'manual'
                      ? 'Needs approval'
                      : 'Quote requested'}
                </StatusPill>
              </div>

              <p className="mb-4 text-[12px] text-ink-4">{APPROVAL_NOTE[group.approval]}</p>

              <div className="flex flex-col gap-[10px]">
                {group.lines.map((line) => {
                  const product = byId.get(line.productId);
                  if (!product) return null;
                  const quote = product.price === null;

                  return (
                    <div
                      key={line.productId}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-line-2 bg-inset px-[14px] py-[11px]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] text-ink">{product.name}</div>
                        {product.closed && (
                          <div className="mt-[2px] text-[11.5px] text-warn">
                            {product.closedLabel} — remove it to place the rest of your order.
                          </div>
                        )}
                        <div className="mt-[2px] text-[11.5px] text-ink-4">
                          {quote ? 'Quoted per order' : `${money(product.price!)} / ${product.unit}`}
                          {Object.entries(line.options).length > 0 &&
                            ' · ' +
                              Object.entries(line.options)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => cart.updateQty(line.productId, line.qty - 1)}
                          disabled={line.qty <= product.minQty}
                          aria-label={`Fewer ${product.name}`}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-line-4 text-ink-3 disabled:opacity-30"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-[13px] text-ink">{line.qty}</span>
                        <button
                          onClick={() => cart.updateQty(line.productId, line.qty + 1)}
                          disabled={line.qty >= product.maxQty}
                          aria-label={`More ${product.name}`}
                          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm border border-line-4 text-ink-3 disabled:opacity-30"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="w-[90px] shrink-0 text-right text-[13px] text-ink-2">
                        {quote ? 'On quote' : money(product.price! * line.qty)}
                      </div>

                      <button
                        onClick={() => cart.remove(line.productId)}
                        aria-label={`Remove ${product.name}`}
                        className="shrink-0 cursor-pointer border-none bg-transparent text-ink-4 hover:text-warn"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex justify-between border-t border-line pt-3 text-[13px]">
                <span className="text-ink-4">Subtotal exc. tax</span>
                <span className="text-ink">
                  {money(subtotal)}
                  {hasQuote && <span className="text-ink-4"> + quoted items</span>}
                </span>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* ---- billing ---- */}
      <Panel className="mb-6 px-[20px] py-[18px]">
        <Eyebrow className="mb-4 tracking-[0.12em]">Invoicing details</Eyebrow>

        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="b-entity" required>
              Legal entity to invoice
            </Label>
            <TextInput
              id="b-entity"
              value={billing.legalEntity}
              onChange={(e) => patch({ legalEntity: e.target.value })}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="b-address">Billing address</Label>
            <TextInput
              id="b-address"
              value={billing.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="b-tax">VAT / tax number</Label>
            <TextInput
              id="b-tax"
              value={billing.taxNumber}
              onChange={(e) => patch({ taxNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="b-po">Purchase order number</Label>
            <TextInput
              id="b-po"
              value={billing.poNumber}
              onChange={(e) => patch({ poNumber: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="b-contact">Invoice contact</Label>
            <TextInput
              id="b-contact"
              value={billing.invoiceContactName}
              onChange={(e) => patch({ invoiceContactName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="b-email" required>
              Invoice email
            </Label>
            <TextInput
              id="b-email"
              type="email"
              value={billing.invoiceContactEmail}
              onChange={(e) => patch({ invoiceContactEmail: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="b-ref">Your internal reference</Label>
            <TextInput
              id="b-ref"
              value={billing.internalRef}
              onChange={(e) => patch({ internalRef: e.target.value })}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="b-notes">Notes for the BOARD team</Label>
            <TextArea
              id="b-notes"
              rows={2}
              value={billing.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </div>
        </div>
      </Panel>

      {/* ---- totals and submit ---- */}
      <Panel className="px-[20px] py-[18px]">
        <div className="mb-4 flex items-baseline justify-between">
          <span className="text-[13.5px] text-ink-3">Total exc. tax</span>
          <span className="text-[22px] font-light text-ink">
            {money(grandSubtotal)}
            {anyQuote && <span className="ml-2 text-[13px] text-ink-4">+ quoted items</span>}
          </span>
        </div>

        <Callout className="mb-4">
          <strong className="font-normal text-ink">No payment is taken here.</strong> Submitting
          sends your order to the BOARD team and the relevant suppliers. Some items need
          confirmation before they are final. An invoice follows separately.
        </Callout>

        <label className="mb-5 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-[2px] h-4 w-4 shrink-0 accent-[var(--bp-blue)]"
          />
          <span className="text-[13px] leading-relaxed text-ink-2">
            I confirm these details are correct and accept the event&rsquo;s supplier terms.
            Orders cannot be edited once submitted — changes are requested through your BOARD
            contact.
          </span>
        </label>

        {closedLines.length > 0 && (
          <Callout tone="warn" className="mb-5">
            {closedLines.length === 1
              ? 'One item in your basket has passed its order deadline. '
              : `${closedLines.length} items in your basket have passed their order deadlines. `}
            Remove {closedLines.length === 1 ? 'it' : 'them'} above to submit the rest — your
            BOARD contact can tell you whether they can still be arranged.
          </Callout>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={pending || !terms || closedLines.length > 0}>
            {pending ? 'Submitting…' : 'Submit order'}
          </Button>
          <Link
            href={`/portal/${partnerId}/shop`}
            className="text-[13px] text-ink-3 no-underline hover:text-ink"
          >
            Keep shopping
          </Link>
        </div>

        {groups.length > 1 && (
          <Help>
            This creates {groups.length} supplier orders from one submission — one for each of{' '}
            {groups.map((g) => g.supplierName).join(', ')}.
          </Help>
        )}
      </Panel>
    </>
  );
}
