'use client';

import { clsx } from 'clsx';
import { Check, ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';

import { useCart } from './CartProvider';

/* ============================================================
   The partner-facing shop

   Everything here has already been filtered on the server to what
   this partner may order. Prices already carry any partner-specific
   override.
   ============================================================ */

/** Exactly what the server sends — no supplier internals. */
export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  unit: string;
  /** null means quote-required; never render a price for these. */
  price: number | null;
  priceLabel: string;
  /** True when this partner has a price other than the catalogue one. */
  hasOverride: boolean;
  supplierName: string;
  categoryId: string;
  image: string;
  minQty: number;
  maxQty: number;
  deadlineLabel: string | null;
  approvalMode: 'auto' | 'manual' | 'quote';
  options: Array<{ name: string; values: string[] }>;
  questions: Array<{ key: string; label: string; type: string; required: boolean }>;
}

export function Shop({
  products,
  categories,
  cartHref,
}: {
  products: ShopProduct[];
  categories: Array<{ id: string; name: string }>;
  cartHref: string;
}) {
  const cart = useCart();
  const [open, setOpen] = useState<ShopProduct | null>(null);

  const grouped = categories
    .map((c) => ({ category: c, items: products.filter((p) => p.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      {cart.ready && cart.count > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border border-accent-line bg-accent-fill px-[18px] py-[14px]">
          <ShoppingBag size={17} className="shrink-0 text-accent" />
          <span className="flex-1 text-[13.5px] text-ink">
            {cart.count} {cart.count === 1 ? 'item' : 'items'} in your cart
          </span>
          <Link
            href={cartHref}
            className="shrink-0 rounded-pill bg-brand px-[16px] py-[8px] text-[12.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
          >
            Review &amp; check out
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {grouped.map(({ category, items }) => (
          <section key={category.id}>
            <Eyebrow tone="accent" className="mb-3 tracking-[0.14em]">
              {category.name}
            </Eyebrow>
            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
              {items.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setOpen(p)}
                  className="cursor-pointer overflow-hidden rounded-xl border border-line-2 bg-panel p-0 text-left transition-colors hover:border-line-4"
                >
                  <div
                    className="h-[96px] bg-cover bg-center"
                    style={{ backgroundImage: `url('${p.image}')` }}
                  />
                  <div className="px-[16px] py-[14px]">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[14px] text-ink">{p.name}</span>
                    </div>
                    <p className="mt-[6px] line-clamp-2 text-[12.5px] leading-relaxed text-ink-3">
                      {p.description}
                    </p>
                    <div className="mt-[10px] flex flex-wrap items-center gap-2">
                      <span className="rounded-pill border border-board-teal bg-accent-fill px-[11px] py-[3px] text-[12px] text-accent">
                        {p.priceLabel}
                      </span>
                      {p.hasOverride && <StatusPill tone="info">Your price</StatusPill>}
                      {p.approvalMode === 'quote' && <StatusPill tone="warn">Quote</StatusPill>}
                      {p.approvalMode === 'manual' && (
                        <StatusPill tone="neutral">Approval</StatusPill>
                      )}
                    </div>
                    {p.deadlineLabel && (
                      <div className="mt-[8px] text-[11.5px] text-ink-4">{p.deadlineLabel}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {open && <ProductDialog product={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------------------------------------------------------
   Product detail
   --------------------------------------------------------------- */

function ProductDialog({
  product,
  onClose,
}: {
  product: ShopProduct;
  onClose: () => void;
}) {
  const cart = useCart();
  const [qty, setQty] = useState(product.minQty);
  const [options, setOptions] = useState<Record<string, string>>(
    Object.fromEntries(product.options.map((o) => [o.name, o.values[0] ?? ''])),
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  function addToCart() {
    const missing = product.questions.find(
      (q) => q.required && !String(answers[q.key] ?? '').trim(),
    );
    if (missing) {
      setError(`${missing.label} is needed before this can be added.`);
      return;
    }

    cart.add({ productId: product.id, qty, options, answers });
    setAdded(true);
    window.setTimeout(onClose, 700);
  }

  const lineTotal =
    product.price === null ? null : product.price * qty;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--bp-scrim)] p-6 max-md:items-start max-md:p-3"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bp-scroll max-h-[88vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-line-4 bg-panel"
      >
        <div
          className="h-[140px] bg-cover bg-center"
          style={{ backgroundImage: `url('${product.image}')` }}
        />

        <div className="px-[26px] py-[22px]">
          <div className="mb-2 flex items-start justify-between gap-4">
            <h2 className="text-[20px] font-light text-ink">{product.name}</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 cursor-pointer border-none bg-transparent text-ink-4 hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>

          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-3">{product.description}</p>

          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="rounded-pill border border-board-teal bg-accent-fill px-[13px] py-[5px] text-[13px] text-accent">
              {product.priceLabel}
            </span>
            <span className="text-[12px] text-ink-4">Supplied by {product.supplierName}</span>
          </div>

          {product.approvalMode === 'quote' && (
            <Callout tone="warn" className="mb-5">
              This is quoted per order. Submitting requests a quote from{' '}
              {product.supplierName} — you will be able to accept or decline before anything
              is confirmed.
            </Callout>
          )}

          {product.approvalMode === 'manual' && (
            <Callout className="mb-5">
              This item is reviewed by the BOARD team before it reaches the supplier.
            </Callout>
          )}

          {error && (
            <Callout tone="warn" className="mb-4">
              {error}
            </Callout>
          )}

          {/* options */}
          {product.options.map((opt) => (
            <div key={opt.name} className="mb-4">
              <Label htmlFor={`opt-${opt.name}`}>{opt.name}</Label>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((v) => {
                  const on = options[opt.name] === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setOptions((o) => ({ ...o, [opt.name]: v }))}
                      aria-pressed={on}
                      className={clsx(
                        'cursor-pointer rounded-pill border px-[14px] py-[7px] text-[12.5px]',
                        on
                          ? 'border-accent bg-accent-fill text-ink'
                          : 'border-line-4 text-ink-3 hover:text-ink',
                      )}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* questions */}
          {product.questions.map((q) => (
            <div key={q.key} className="mb-4">
              <Label htmlFor={`q-${q.key}`} required={q.required}>
                {q.label}
              </Label>
              {q.type === 'long_text' ? (
                <TextArea
                  id={`q-${q.key}`}
                  rows={2}
                  value={answers[q.key] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                />
              ) : (
                <TextInput
                  id={`q-${q.key}`}
                  type={q.type === 'number' ? 'number' : q.type === 'time' ? 'time' : 'text'}
                  value={answers[q.key] ?? ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
                />
              )}
            </div>
          ))}

          {/* quantity */}
          <div className="mb-5">
            <Label htmlFor="qty">Quantity</Label>
            <div className="flex items-center gap-3">
              <input
                id="qty"
                type="number"
                min={product.minQty}
                max={product.maxQty}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value) || product.minQty)}
                className="w-[110px] rounded-md border border-line-4 bg-inset px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line"
              />
              <span className="text-[12.5px] text-ink-4">
                {product.unit} · min {product.minQty}, max {product.maxQty}
              </span>
            </div>
            {lineTotal !== null && (
              <Help>
                Line total {new Intl.NumberFormat('en-GB').format(Math.round(lineTotal))} exc.
                tax
              </Help>
            )}
          </div>

          {product.deadlineLabel && (
            <div className="mb-5 text-[12px] text-ink-4">{product.deadlineLabel}</div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-line pt-5">
            <Button onClick={addToCart} disabled={added}>
              {added ? (
                <>
                  <Check size={14} /> Added
                </>
              ) : (
                'Add to cart'
              )}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
