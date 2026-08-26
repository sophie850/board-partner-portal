import { notFound } from 'next/navigation';

import { CartProvider } from '@/components/shop/CartProvider';
import { Checkout, type CartProductInfo } from '@/components/shop/Checkout';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { priceFor, productVisible, terms } from '@/lib/resolvers';
import type { OrderBilling } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CartPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === partnerId);
  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!partner || !part) notFound();

  const t = terms(db);

  // Only orderable products are sent, so a cart holding something
  // since withdrawn simply cannot be checked out.
  const products: CartProductInfo[] = db.products
    .filter((p) => productVisible(db, p, part))
    .map((p) => ({
      id: p.id,
      name: p.name,
      unit: p.unit,
      price: priceFor(part, p),
      supplierId: p.supplierId,
      supplierName: db.suppliers.find((s) => s.id === p.supplierId)?.name ?? 'BOARD',
      approvalMode: p.approvalMode,
      taxRate: p.taxRate,
      minQty: p.minQty,
      maxQty: p.maxQty,
    }));

  // Prefilled from what the organiser already holds, so the common
  // case needs no typing.
  const defaultBilling: OrderBilling = {
    legalEntity: partner.billing?.entity ?? partner.name,
    address: [
      partner.billing?.address,
      partner.billing?.city,
      partner.billing?.postcode,
      partner.billing?.country,
    ]
      .filter(Boolean)
      .join(', '),
    taxNumber: partner.billing?.vat ?? '',
    invoiceContactName: '',
    invoiceContactEmail: '',
    poNumber: '',
    internalRef: '',
    notes: '',
  };

  return (
    <CartProvider partnerId={partnerId}>
      <Rise className="max-w-[760px]">
        <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
        <PageTitle className="mb-6">Your order</PageTitle>

        <Checkout
          partnerId={partnerId}
          participationId={part.id}
          products={products}
          defaultBilling={defaultBilling}
          currencySymbol={db.event.currencySymbol}
        />
      </Rise>
    </CartProvider>
  );
}
