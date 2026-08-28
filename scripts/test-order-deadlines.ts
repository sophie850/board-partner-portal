/*
 * Order deadlines: the boundary, and when the shop closes.
 *
 * The boundary is the part worth pinning. "Order by 28 February"
 * has to mean orders are taken through the 28th — closing at
 * midnight that morning would shut the shop a day early, on the
 * busiest day, and nobody would find out until a partner rang.
 *
 * Run: npx tsx scripts/test-order-deadlines.ts
 */
import { seed } from '../src/data/seed';
import {
  orderingClosed,
  productOrderable,
  shopOpen,
  supplierClosesOn,
  supplierOpen,
} from '../src/lib/resolvers';

const db = seed();
const p = { ...db.products[0], orderDeadline: '2027-02-28' };

const at = (iso: string) => new Date(iso);
const cases: Array<[string, string, boolean]> = [
  ['the day before',              '2027-02-27T23:59:00Z', false],
  ['the morning of the deadline', '2027-02-28T00:01:00Z', false],
  ['late on the deadline day',    '2027-02-28T23:59:00Z', false],
  ['the next morning',            '2027-03-01T00:01:00Z', true],
  ['a week later',                '2027-03-07T12:00:00Z', true],
];

let fail = 0;
for (const [label, iso, want] of cases) {
  const got = orderingClosed(p, at(iso));
  if (got !== want) { fail++; console.log(`  ✗ ${label}: want closed=${want}, got ${got}`); }
}

// no deadline never closes
if (orderingClosed({ ...p, orderDeadline: null }, at('2030-01-01T00:00:00Z'))) {
  fail++; console.log('  ✗ a product with no deadline closed anyway');
}

// the shop closes only once EVERYTHING a partner sees has closed
const part = db.participations[0];
const latest = db.products
  .filter((x) => productOrderable(db, x, part, at('2020-01-01T00:00:00Z')))
  .map((x) => x.orderDeadline)
  .filter(Boolean)
  .sort()
  .at(-1)!;

const dayAfterLatest = new Date(latest); dayAfterLatest.setUTCDate(dayAfterLatest.getUTCDate() + 1);
const dayOfLatest = new Date(latest);

if (!shopOpen(db, part, dayOfLatest)) { fail++; console.log(`  ✗ shop closed on ${latest}, its last open day`); }
if (shopOpen(db, part, dayAfterLatest)) { fail++; console.log('  ✗ shop still open after every deadline passed'); }

/* ---- a supplier closes when its whole range has ---- */

const supplierIds = [...new Set(db.products.map((p) => p.supplierId))];

for (const id of supplierIds) {
  const closes = supplierClosesOn(db, id, part);
  if (!closes) continue;

  const dayOf = new Date(closes);
  const dayAfter = new Date(closes);
  dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);

  const name = db.suppliers.find((x) => x.id === id)?.name ?? id;
  if (!supplierOpen(db, id, part, dayOf)) {
    fail++; console.log(`  ✗ ${name} closed on ${closes}, its last open day`);
  }
  if (supplierOpen(db, id, part, dayAfter)) {
    fail++; console.log(`  ✗ ${name} still open after its last deadline`);
  }
}

// A supplier with anything open-ended never closes.
const openEnded = db.products.find((p) => p.orderDeadline);
if (openEnded) {
  const patched = {
    ...db,
    products: db.products.map((p) =>
      p.supplierId === openEnded.supplierId ? { ...p, orderDeadline: null } : p,
    ),
  };
  if (supplierClosesOn(patched, openEnded.supplierId, part) !== null) {
    fail++; console.log('  ✗ a supplier with an open-ended product was given a closing date');
  }
  if (!supplierOpen(patched, openEnded.supplierId, part, new Date('2099-01-01'))) {
    fail++; console.log('  ✗ a supplier with an open-ended product closed anyway');
  }
}

const supplierChecks = supplierIds.filter((id) => supplierClosesOn(db, id, part)).length * 2 + 2;
const total = 6 + 2 + supplierChecks;

console.log(`last deadline this partner can reach: ${latest}`);
console.log(`${total - fail}/${total} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
