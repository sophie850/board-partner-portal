import { requireModule } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

import Link from 'next/link';

import { CartProvider } from '@/components/shop/CartProvider';
import { Shop, type ShopProduct } from '@/components/shop/Shop';
import { Eyebrow, PageTitle, Panel, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  gradientFor,
  money,
  orderingClosed,
  priceFor,
  shopOpen,
  productVisible,
  terms,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function ShopPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'shop');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);

  /*
   * Filtering happens here, on the server. A product this partner
   * may not order never reaches their browser at all — hiding it in
   * the interface would still ship its price and detail.
   */
  const visible = db.products.filter((p) => productVisible(db, p, part));

  const products: ShopProduct[] = visible.map((p) => {
    const price = priceFor(part, p);
    const quote = price === null;
    const closed = orderingClosed(p);

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      unit: p.unit,
      price,
      priceLabel: quote ? 'Quote required' : `${money(db, price)} / ${p.unit}`,
      hasOverride: (part.priceOverrides ?? []).some((o) => o.productId === p.id),
      supplierName: db.suppliers.find((s) => s.id === p.supplierId)?.name ?? 'BOARD',
      categoryId: p.categoryId,
      image: p.image ?? gradientFor(p.categoryId || p.id),
      minQty: p.minQty,
      maxQty: p.maxQty,
      deadlineLabel: p.orderDeadline
        ? closed
          ? `Ordering closed on ${fmtDate(p.orderDeadline)}`
          : `Order by ${fmtDate(p.orderDeadline)}`
        : null,
      closed,
      approvalMode: p.approvalMode,
      options: p.options,
      questions: p.questions,
    };
  });

  const categories = db.shopCategories.filter((c) =>
    products.some((p) => p.categoryId === c.id),
  );

  /*
   * Every deadline has passed. The shop has already left the nav; a
   * partner arriving from a bookmark or an old email gets told what
   * happened and where their orders are, rather than an empty
   * catalogue or a page about permissions.
   */
  const closedFor = shopOpen(db, part)
    ? null
    : visible
        .map((p) => p.orderDeadline)
        .filter(Boolean)
        .sort()
        .at(-1);

  if (closedFor) {
    return (
      <Rise>
        <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
        <PageTitle>Shop</PageTitle>
        <Panel className="mt-6 px-[22px] py-6">
          <div className="text-[14px] text-ink">Ordering has closed</div>
          <p className="mt-2 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-3">
            The last order deadline passed on {fmtDate(closedFor)}. Anything you ordered is
            still on your{' '}
            <Link href={`/portal/${partnerId}/orders`} className="text-accent">
              orders page
            </Link>
            , and your BOARD contact can tell you whether anything can still be arranged.
          </p>
        </Panel>
      </Rise>
    );
  }

  return (
    <CartProvider partnerId={partnerId}>
      <Rise>
        <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
        <PageTitle>Shop</PageTitle>
        <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
          Everything you can order on top of your package. Prices exclude tax. Nothing is
          charged here — orders are invoiced separately once confirmed.
        </p>

        {products.length === 0 ? (
          <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">
            There is nothing for you to order. If you were expecting to see something here,
            your BOARD contact can check what your participation includes.
          </Panel>
        ) : (
          <Shop
            products={products}
            categories={categories}
            cartHref={`/portal/${partnerId}/shop/cart`}
          />
        )}
      </Rise>
    </CartProvider>
  );
}
