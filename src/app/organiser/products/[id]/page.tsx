import { notFound } from 'next/navigation';

import { ProductEditor } from '@/components/products/ProductEditor';
import { getDb } from '@/lib/db/store';

import { saveProduct, setProductActive } from '../actions';

export const dynamic = 'force-dynamic';

/** `/organiser/products/new` creates; `/organiser/products/<id>` edits. */
export default async function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();

  const isNew = id === 'new';
  const product = isNew ? null : (db.products.find((p) => p.id === id) ?? null);

  if (!isNew && !product) notFound();

  // Suppliers reach the browser here, so strip the signing secret —
  // the editor only needs their names.
  const suppliers = db.suppliers.map((s) => ({ ...s, webhookSecret: '' }));

  return (
    <ProductEditor
      product={product}
      suppliers={suppliers}
      categories={db.shopCategories}
      entitlements={db.entitlements}
      partners={db.partners}
      onSave={saveProduct}
      onArchive={setProductActive}
    />
  );
}
