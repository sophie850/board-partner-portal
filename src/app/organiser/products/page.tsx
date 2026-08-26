import { Plus, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { EmptyState, Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, gradientFor, money, terms } from '@/lib/resolvers';
import type { Db, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const db = await getDb();
  const t = terms(db);

  const grouped = db.shopCategories
    .map((cat) => ({ cat, items: db.products.filter((p) => p.categoryId === cat.id) }))
    .filter((g) => g.items.length > 0);

  const uncategorised = db.products.filter(
    (p) => !db.shopCategories.some((c) => c.id === p.categoryId),
  );

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <PageTitle>Products</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            What {t.lower.partners} can order. Each product belongs to one supplier, and a
            cart spanning several suppliers becomes one order each.
          </p>
        </div>
        <Link
          href="/organiser/products/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
        >
          <Plus size={16} /> New product
        </Link>
      </div>

      {db.products.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag size={22} />}
          title="No products yet"
          body="Add what partners can order on top of their package — AV, furniture, power, signage, catering. Gate anything build-specific to partners with exhibition space."
        />
      ) : (
        <div className="flex flex-col gap-[22px]">
          {grouped.map(({ cat, items }) => (
            <section key={cat.id}>
              <Eyebrow tone="accent" className="mb-3 tracking-[0.14em]">
                {cat.name}
              </Eyebrow>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {items.map((p) => (
                  <Card key={p.id} product={p} db={db} />
                ))}
              </div>
            </section>
          ))}
          {uncategorised.length > 0 && (
            <section>
              <Eyebrow className="mb-3 tracking-[0.14em]">Uncategorised</Eyebrow>
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {uncategorised.map((p) => (
                  <Card key={p.id} product={p} db={db} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Rise>
  );
}

function Card({ product, db }: { product: Product; db: Db }) {
  const supplier = db.suppliers.find((s) => s.id === product.supplierId);
  const quote = product.basePrice === null;
  const overrides = db.participations.filter((part) =>
    (part.priceOverrides ?? []).some((o) => o.productId === product.id),
  ).length;

  return (
    <Link
      href={`/organiser/products/${product.id}`}
      className={`overflow-hidden rounded-xl border border-line-2 bg-panel no-underline transition-colors hover:border-line-4 ${
        product.active ? '' : 'opacity-55'
      }`}
    >
      <div
        className="h-[84px] bg-cover bg-center"
        style={{ backgroundImage: `url('${product.image ?? gradientFor(product.categoryId || product.id)}')` }}
      />
      <div className="px-[16px] py-[14px]">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[14px] text-ink">{product.name}</span>
          <span className="shrink-0 text-[13px] text-ink-2">
            {quote ? 'Quote' : money(db, product.basePrice)}
          </span>
        </div>
        <div className="mt-[5px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
          <span>{supplier?.name ?? 'No supplier'}</span>
          <span aria-hidden>·</span>
          <span>{product.unit}</span>
          {product.orderDeadline && (
            <>
              <span aria-hidden>·</span>
              <span>Order by {fmtDate(product.orderDeadline)}</span>
            </>
          )}
        </div>
        <div className="mt-[9px] flex flex-wrap gap-2">
          {!product.active && <StatusPill tone="muted">Archived</StatusPill>}
          {product.approvalMode !== 'auto' && (
            <StatusPill tone={product.approvalMode === 'quote' ? 'warn' : 'neutral'}>
              {product.approvalMode === 'quote' ? 'Quote required' : 'Needs approval'}
            </StatusPill>
          )}
          {overrides > 0 && (
            <StatusPill tone="info">
              {overrides} custom {overrides === 1 ? 'price' : 'prices'}
            </StatusPill>
          )}
        </div>
      </div>
    </Link>
  );
}
