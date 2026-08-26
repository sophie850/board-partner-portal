'use client';

import { clsx } from 'clsx';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';

import {
  Button,
  Callout,
  Chip,
  Eyebrow,
  EmptyState,
  Help,
  Label,
  Panel,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';

import {
  approveSupplierOrder,
  cancelSupplierOrder,
  recordQuote,
  rejectSupplierOrder,
  resendWebhook,
} from '@/app/organiser/orders/actions';

/* ============================================================
   Orders & webhooks

   One row per parent order, expanding to the supplier splits it
   became. The split is the unit of work — an organiser approves a
   supplier's part of an order, never "the order".
   ============================================================ */

export interface WebhookView {
  id: string;
  eventType: string;
  status: 'pending' | 'delivered' | 'failed';
  sentAt: string | null;
  retryCount: number;
  lastResponse: string;
  lastCode: number | null;
}

export interface SplitView {
  id: string;
  reference: string;
  supplierName: string;
  /** False when the supplier has no webhook URL — resend cannot work. */
  supplierDeliverable: boolean;
  status: string;
  statusLabel: string;
  statusTone: 'good' | 'warn' | 'neutral' | 'muted';
  approvalMode: string;
  subtotalLabel: string;
  items: Array<{ name: string; qty: number; priceLabel: string }>;
  quote: { amountLabel: string; note: string; atLabel: string } | null;
  webhooks: WebhookView[];
}

export interface OrderView {
  id: string;
  reference: string;
  partnerName: string;
  partnerId: string;
  submittedLabel: string;
  totalLabel: string;
  itemCount: number;
  splits: SplitView[];
  billingEntity: string;
  invoiceEmail: string;
  poNumber: string;
}

export function OrderList({ orders }: { orders: OrderView[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        body="When a partner checks out in the shop, the order and its per-supplier splits appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[10px]">
      {orders.map((order) => {
        const open = openId === order.id;
        const needsAttention = order.splits.filter((s) =>
          ['under_review', 'quote_requested'].includes(s.status),
        ).length;
        const failedHooks = order.splits.reduce(
          (n, s) => n + s.webhooks.filter((w) => w.status === 'failed').length,
          0,
        );

        return (
          <Panel key={order.id} className="overflow-hidden p-0">
            <button
              onClick={() => setOpenId(open ? null : order.id)}
              aria-expanded={open}
              className="flex w-full cursor-pointer flex-wrap items-center gap-4 border-none bg-transparent px-[18px] py-4 text-left"
            >
              <ChevronRight
                size={15}
                className={clsx('shrink-0 text-ink-4 transition-transform', open && 'rotate-90')}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14.5px] text-ink">{order.partnerName}</span>
                  <span className="text-[12px] text-ink-4">{order.reference}</span>
                </div>
                <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
                  <span>{order.submittedLabel}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {order.splits.length}{' '}
                    {order.splits.length === 1 ? 'supplier order' : 'supplier orders'}
                  </span>
                </div>
              </div>

              {failedHooks > 0 && (
                <StatusPill tone="warn">
                  {failedHooks} webhook{failedHooks === 1 ? '' : 's'} failed
                </StatusPill>
              )}
              {needsAttention > 0 && (
                <StatusPill tone="warn">{needsAttention} to action</StatusPill>
              )}

              <div className="shrink-0 text-right">
                <div className="text-[14px] text-ink">{order.totalLabel}</div>
                <div className="mt-[2px] text-[11px] text-ink-4">exc. tax</div>
              </div>
            </button>

            {open && (
              <div className="border-t border-line bg-inset px-[18px] py-[18px]">
                <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-ink-4">
                  <span>
                    Invoice to <span className="text-ink-2">{order.billingEntity || '—'}</span>
                  </span>
                  <span>
                    Invoice email <span className="text-ink-2">{order.invoiceEmail || '—'}</span>
                  </span>
                  {order.poNumber && (
                    <span>
                      PO <span className="text-ink-2">{order.poNumber}</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {order.splits.map((split) => (
                    <Split key={split.id} split={split} />
                  ))}
                </div>
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   One supplier's part of an order
   --------------------------------------------------------------- */

function Split({ split }: { split: SplitView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'quote' | 'reject' | 'cancel' | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPanel(null);
      setAmount('');
      setNote('');
      setReason('');
    });
  }

  return (
    <div className="rounded-lg border border-line-2 bg-panel px-[16px] py-[14px]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] text-ink">{split.supplierName}</span>
          <span className="text-[11.5px] text-ink-4">{split.reference}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={split.statusTone}>{split.statusLabel}</StatusPill>
          <span className="text-[13px] text-ink-2">{split.subtotalLabel}</span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-ink-4">
        {split.items.map((item) => (
          <span key={item.name}>
            {item.qty} × {item.name}{' '}
            <span className="text-ink-5">{item.priceLabel}</span>
          </span>
        ))}
      </div>

      {split.quote && (
        <div className="mb-3 rounded-md border border-line-2 bg-inset px-[13px] py-[10px] text-[12.5px]">
          <span className="text-ink">Quoted {split.quote.amountLabel}</span>{' '}
          <span className="text-ink-4">{split.quote.atLabel}</span>
          {split.quote.note && <p className="mt-1 text-ink-3">{split.quote.note}</p>}
        </div>
      )}

      {error && (
        <Callout tone="warn" className="mb-3">
          {error}
        </Callout>
      )}

      {/* ---- what can be done from here ---- */}
      {panel === null && (
        <div className="flex flex-wrap items-center gap-2">
          {split.status === 'under_review' && (
            <>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => run(() => approveSupplierOrder(split.id))}
              >
                Approve &amp; send to supplier
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPanel('reject')}>
                Reject
              </Button>
            </>
          )}

          {(split.status === 'quote_requested' || split.status === 'quoted') && (
            <Button size="sm" onClick={() => setPanel('quote')}>
              {split.status === 'quoted' ? 'Revise quote' : 'Record quote'}
            </Button>
          )}

          {['under_review', 'quote_requested', 'quoted', 'confirmed'].includes(split.status) && (
            <Button size="sm" variant="quiet" onClick={() => setPanel('cancel')}>
              Cancel
            </Button>
          )}

          {split.status === 'quoted' && (
            <span className="text-[11.5px] text-ink-4">
              Waiting on the partner to accept or decline.
            </span>
          )}
        </div>
      )}

      {panel === 'quote' && (
        <div className="rounded-md border border-line-2 bg-inset px-[14px] py-[13px]">
          <Label htmlFor={`q-${split.id}`} required>
            Quoted amount, excluding tax
          </Label>
          <TextInput
            id={`q-${split.id}`}
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="mt-3">
            <Label htmlFor={`qn-${split.id}`}>Note for the partner</Label>
            <TextArea
              id={`qn-${split.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Help>
            The partner is shown this quote and accepts or declines it. Nothing is sent to the
            supplier until they accept.
          </Help>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => recordQuote(split.id, Number(amount), note))}
            >
              {pending ? 'Saving…' : 'Save quote'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {(panel === 'reject' || panel === 'cancel') && (
        <div className="rounded-md border border-line-2 bg-inset px-[14px] py-[13px]">
          <Label htmlFor={`r-${split.id}`} required>
            Reason
          </Label>
          <TextArea
            id={`r-${split.id}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              panel === 'reject'
                ? 'Why this cannot go ahead — the partner sees this.'
                : 'Why this is being cancelled — the partner sees this.'
            }
          />
          <Help>
            {panel === 'cancel' && split.status === 'confirmed'
              ? 'The supplier has already been told this order is confirmed, so they are sent a cancellation.'
              : 'The supplier has not been told about this order, so nothing is sent to them.'}
          </Help>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() =>
                run(() =>
                  panel === 'reject'
                    ? rejectSupplierOrder(split.id, reason)
                    : cancelSupplierOrder(split.id, reason),
                )
              }
            >
              {pending ? 'Saving…' : panel === 'reject' ? 'Reject order' : 'Cancel order'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>
              Back
            </Button>
          </div>
        </div>
      )}

      <Webhooks split={split} />
    </div>
  );
}

/* ---------------------------------------------------------------
   Delivery log
   --------------------------------------------------------------- */

function Webhooks({ split }: { split: SplitView }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  if (split.webhooks.length === 0) return null;

  function resend(id: string) {
    setError(null);
    setSent(null);
    startTransition(async () => {
      const result = await resendWebhook(id);
      if (!result.ok) setError(result.error);
      else setSent(id);
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <Eyebrow className="mb-2 tracking-[0.12em]">Webhook delivery</Eyebrow>

      {error && (
        <Callout tone="warn" className="mb-2">
          {error}
        </Callout>
      )}

      <div className="flex flex-col gap-[6px]">
        {split.webhooks.map((hook) => (
          <div key={hook.id} className="flex flex-wrap items-center gap-3 text-[11.5px]">
            <StatusPill
              tone={
                hook.status === 'delivered' ? 'good' : hook.status === 'failed' ? 'warn' : 'muted'
              }
            >
              {hook.status}
            </StatusPill>
            <Chip>{hook.eventType}</Chip>
            <span className="text-ink-4">
              {hook.sentAt ?? 'not sent'}
              {hook.lastCode ? ` · HTTP ${hook.lastCode}` : ''}
              {hook.retryCount > 1 ? ` · ${hook.retryCount} attempts` : ''}
            </span>

            <button
              onClick={() => resend(hook.id)}
              disabled={pending || !split.supplierDeliverable}
              title={
                split.supplierDeliverable
                  ? 'Send this again with the same idempotency key'
                  : `${split.supplierName} has no webhook URL configured`
              }
              className="ml-auto inline-flex cursor-pointer items-center gap-[6px] border-none bg-transparent text-ink-3 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw size={12} />
              {sent === hook.id ? 'Sent' : 'Resend'}
            </button>
          </div>
        ))}
      </div>

      {split.webhooks.some((h) => h.lastResponse) && (
        <Help>
          Last response:{' '}
          {split.webhooks.find((h) => h.lastResponse)?.lastResponse.slice(0, 160)}
        </Help>
      )}
    </div>
  );
}
