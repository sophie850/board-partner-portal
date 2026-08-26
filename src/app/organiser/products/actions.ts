'use server';

import { guardOrganiser } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { productToRow } from '@/lib/db/mappers';
import { mintId } from '@/lib/db/store';
import type {
  ApprovalMode,
  Id,
  Product,
  ProductOption,
  ProductQuestion,
  VisibilityRule,
} from '@/lib/types';

/* ============================================================
   Products — write operations
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface ProductInput {
  id?: Id;
  name: string;
  supplierId: Id | null;
  categoryId: Id | null;
  description: string;
  unit: string;
  /** null means quote-required — no price is ever shown. */
  basePrice: number | null;
  taxRate: number;
  approvalMode: ApprovalMode;
  minQty: number;
  maxQty: number;
  orderDeadline: string | null;
  leadTimeDays: number;
  active: boolean;
  image: string | null;
  options: ProductOption[];
  questions: ProductQuestion[];
  visibility: VisibilityRule;
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateProducts(id?: Id) {
  revalidatePath('/organiser/products');
  if (id) revalidatePath(`/organiser/products/${id}`);
  revalidatePath('/portal', 'layout');
}

export async function saveProduct(input: ProductInput): Promise<ActionResult> {
  const refused = await guardOrganiser('products');
  if (refused) return refused;

  if (!input.name.trim()) return { ok: false, error: 'Give the product a name.' };
  if (!input.supplierId) return { ok: false, error: 'Choose the supplier who fulfils this.' };

  if (input.minQty < 1) return { ok: false, error: 'Minimum quantity must be at least 1.' };
  if (input.maxQty < input.minQty) {
    return { ok: false, error: 'Maximum quantity cannot be below the minimum.' };
  }

  // A fixed price of zero is legitimate (an included item), but a
  // negative one is always a mistake.
  if (input.basePrice !== null && input.basePrice < 0) {
    return { ok: false, error: 'Price cannot be negative.' };
  }

  // Quote-required and a fixed price contradict each other: the
  // partner would see a price for something being quoted.
  if (input.approvalMode === 'quote' && input.basePrice !== null) {
    return {
      ok: false,
      error: 'A quote-required product cannot carry a price. Clear the price, or change the approval mode.',
    };
  }

  const badQuestion = input.questions.find((q) => !q.label.trim());
  if (badQuestion) return { ok: false, error: 'Every product question needs a label.' };

  const id = input.id ?? mintId('prod');

  const product: Product = {
    id,
    eventId: EVENT_ID,
    name: input.name.trim(),
    supplierId: input.supplierId,
    categoryId: input.categoryId ?? '',
    description: input.description.trim(),
    unit: input.unit.trim() || 'each',
    basePrice: input.basePrice,
    taxRate: input.taxRate,
    approvalMode: input.approvalMode,
    minQty: input.minQty,
    maxQty: input.maxQty,
    orderDeadline: input.orderDeadline || null,
    leadTimeDays: input.leadTimeDays,
    active: input.active,
    image: input.image ?? undefined,
    options: input.options.filter((o) => o.name.trim() && o.values.length > 0),
    questions: input.questions,
    visibility: input.visibility,
  };

  try {
    const { error } = await requireSupabase()
      .from('products')
      .upsert(productToRow(product), { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the product.' };
  }

  revalidateProducts(id);
  return { ok: true, id };
}

/**
 * Archive rather than delete.
 *
 * Order items reference products, and an order must stay readable
 * years later — deleting the product would leave line items pointing
 * at nothing. Archiving removes it from the shop and keeps history.
 */
export async function setProductActive(id: Id, active: boolean): Promise<ActionResult> {
  const refused = await guardOrganiser('products');
  if (refused) return refused;

  try {
    const { error } = await requireSupabase()
      .from('products')
      .update({ active })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update the product.' };
  }

  revalidateProducts(id);
  return { ok: true, id };
}

/* ---------------------------------------------------------------
   Per-partner price overrides
   --------------------------------------------------------------- */

export async function setPriceOverride(
  participationId: Id,
  productId: Id,
  price: number | null,
): Promise<ActionResult> {
  const refused = await guardOrganiser('products');
  if (refused) return refused;

  try {
    const client = requireSupabase();

    if (price === null) {
      const { error } = await client
        .from('partner_price_overrides')
        .delete()
        .eq('participation_id', participationId)
        .eq('product_id', productId);
      if (error) return { ok: false, error: error.message };
    } else {
      if (price < 0) return { ok: false, error: 'Price cannot be negative.' };
      const { error } = await client
        .from('partner_price_overrides')
        .upsert(
          { participation_id: participationId, product_id: productId, price },
          { onConflict: 'participation_id,product_id' },
        );
      if (error) return { ok: false, error: error.message };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not set the price.' };
  }

  revalidateProducts(productId);
  return { ok: true, id: productId };
}

/* ---------------------------------------------------------------
   Categories
   --------------------------------------------------------------- */

export async function saveShopCategory(name: string, id?: Id): Promise<ActionResult> {
  const refused = await guardOrganiser('products');
  if (refused) return refused;

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Give the category a name.' };

  const categoryId = id ?? mintId('cat');

  try {
    const { error } = await requireSupabase()
      .from('shop_categories')
      .upsert({ id: categoryId, event_id: EVENT_ID, name: trimmed }, { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the category.' };
  }

  revalidateProducts();
  return { ok: true, id: categoryId };
}
