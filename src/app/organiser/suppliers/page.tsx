import { SupplierList, type SupplierView } from '@/components/suppliers/SupplierList';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Supplier order states still waiting on somebody. */
const OPEN_STATES = new Set(['under_review', 'quote_requested', 'quoted']);

export default async function SuppliersPage() {
  await requireArea('suppliers', '/organiser/suppliers');

  const db = await getDb();

  /*
   * The projection below is the security boundary for this screen.
   *
   * `webhookSecret` is deliberately absent: anything in this array
   * is serialised into the page and reaches the browser, so the
   * secret must be dropped here rather than merely hidden in the UI.
   * `hasSecret` carries the only fact the interface needs.
   */
  const suppliers: SupplierView[] = db.suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    contact: s.contact,
    notifEmails: s.notifEmails,
    webhookUrl: s.webhookUrl,
    routingKey: s.routingKey,
    active: s.active,
    approvalDefault: s.approvalDefault,
    notes: s.notes,
    hasSecret: Boolean(s.webhookSecret),
    productCount: db.products.filter((p) => p.supplierId === s.id).length,
    /*
     * Event-wide rather than per partner: this screen is about the
     * supplier, not about anybody's catalogue. Null means they have
     * something open-ended and never close.
     */
    closesOn: (() => {
      const theirs = db.products.filter((p) => p.supplierId === s.id);
      if (!theirs.length || theirs.some((p) => !p.orderDeadline)) return null;
      return theirs.map((p) => p.orderDeadline!).sort().at(-1) ?? null;
    })(),
    openOrders: db.supplierOrders.filter(
      (so) => so.supplierId === s.id && OPEN_STATES.has(so.status),
    ).length,
  }));

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Suppliers</PageTitle>
      <p className="mt-2 mb-6 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        Who fulfils what partners order. Each supplier gets its own order when a cart spans
        several of them, and its own signed webhook when that order is confirmed.
      </p>

      <SupplierList suppliers={suppliers} />
    </Rise>
  );
}
