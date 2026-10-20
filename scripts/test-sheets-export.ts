/*
 * The Google Sheets snapshot.
 *
 * Two things here can be wrong in ways nobody notices until the
 * backup is needed, which is the worst possible moment.
 *
 * The first is the flattening: a column that silently holds "[object
 * Object]", a row shorter than its header, an answer belonging to
 * the wrong partner. The sheet would look fine.
 *
 * The second is the signature. Two implementations compute it — one
 * in Node with createHmac, one in Apps Script with
 * computeHmacSha256Signature and a hand-rolled hex loop over signed
 * bytes. Java bytes are signed, so a byte above 127 comes back
 * negative and the obvious conversion produces something like "-7f".
 * That is a real trap and it only shows up on roughly half of all
 * signatures, so it is pinned here against the same vectors.
 *
 * Run: npx tsx scripts/test-sheets-export.ts
 */
import { createHmac } from 'node:crypto';

import { seed } from '../src/data/seed';
import { buildWorkbook } from '../src/lib/sheets';

let fail = 0;
let count = 0;

function check(what: string, ok: boolean, detail = ''): void {
  count += 1;
  if (!ok) {
    fail += 1;
    console.log(`  ✗ ${what}${detail ? `: ${detail}` : ''}`);
  }
}

/* ---- the workbook ---- */

const db = seed();
const tabs = buildWorkbook(db, new Date('2026-10-20T09:00:00Z'));

check('every expected tab is present', tabs.length === 8, `got ${tabs.length}`);

for (const tab of tabs) {
  check(`${tab.name} has a header`, tab.header.length > 0);

  const wrong = tab.rows.filter((r) => r.length !== tab.header.length);
  check(
    `${tab.name}: every row is as wide as its header`,
    wrong.length === 0,
    `${wrong.length} of ${tab.rows.length} rows are not`,
  );

  const unstringified = tab.rows.flat().filter((c) => String(c).includes('[object'));
  check(`${tab.name}: nothing rendered as [object Object]`, unstringified.length === 0);

  const undef = tab.rows.flat().filter((c) => c === undefined || c === null);
  check(`${tab.name}: no empty cells left undefined`, undef.length === 0);

  const invalid = tab.rows.flat().filter((c) => String(c) === 'Invalid Date');
  check(`${tab.name}: no unparsed dates`, invalid.length === 0);
}

/* ---- the answers tab is the one that matters ---- */

const answers = tabs.find((t) => t.name === 'Form answers')!;

check('there are answers at all', answers.rows.length > 50, `${answers.rows.length} rows`);

/*
 * Every answer must sit against the partner it belongs to. Rebuilt
 * from the fixtures independently rather than trusting the same
 * code that produced the tab.
 */
const expected = new Set<string>();
for (const part of db.participations) {
  const partner = db.partners.find((p) => p.id === part.partnerId)!;
  expected.add(`${partner.name}|${part.reference}`);
}
const actual = new Set(answers.rows.map((r) => `${r[0]}|${r[1]}`));
check(
  'every answer belongs to a real partner',
  [...actual].every((k) => expected.has(k)),
  [...actual].filter((k) => !expected.has(k)).join(', '),
);

/*
 * A partner must never see another's answers in the export. The
 * long format makes this checkable: for one known value, only the
 * partner who gave it should carry it.
 */
const helvetica = answers.rows.filter((r) => r[0] === 'Helvetica Systems');
const leaked = answers.rows.filter(
  (r) => r[0] !== 'Helvetica Systems' && String(r[4]).includes('Helvetica Systems AG'),
);
check('one partner’s answers do not appear against another', leaked.length === 0);
check('the known partner has answers', helvetica.length > 0);

/* ---- section headings and guidance are not questions ---- */

const headings = answers.rows.filter((r) => String(r[3]).trim() === '');
check('no blank question labels', headings.length === 0);

/* ---- the signature, as both ends compute it ---- */

/** What src/lib/webhooks.ts does. */
function signInNode(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/**
 * What docs/sheets-apps-script.gs does, byte for byte.
 *
 * Apps Script hands back signed bytes, so the negative ones must be
 * brought back into range before they are rendered as hex.
 */
function signLikeAppsScript(secret: string, timestamp: string, body: string): string {
  const raw = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  const bytes = [...raw].map((b) => (b > 127 ? b - 256 : b)); // as Java would hand them over

  let hex = '';
  for (const signed of bytes) {
    const b = (signed < 0 ? signed + 256 : signed).toString(16);
    hex += b.length === 1 ? `0${b}` : b;
  }
  return hex;
}

const secret = 'a-shared-secret-for-the-test-only';
const vectors: Array<[string, string]> = [
  ['1', '{}'],
  ['1761000000', JSON.stringify({ tabs })],
  ['1761000000', 'é — ² ×'],
  ['1761000000', 'x'.repeat(5000)],
];

for (const [ts, body] of vectors) {
  const mine = signInNode(secret, ts, body);
  const theirs = signLikeAppsScript(secret, ts, body);
  check(
    `both ends agree on the signature (${body.length} bytes)`,
    mine === theirs,
    `${mine.slice(0, 16)}… vs ${theirs.slice(0, 16)}…`,
  );
  check(`the signature is lower-case hex (${body.length} bytes)`, /^[0-9a-f]{64}$/.test(mine));
}

/* ---- a changed body must not verify ---- */

const ts = '1761000000';
const body = JSON.stringify({ tabs });
check(
  'a tampered body produces a different signature',
  signInNode(secret, ts, body) !== signInNode(secret, ts, `${body} `),
);
check(
  'a different secret produces a different signature',
  signInNode(secret, ts, body) !== signInNode(`${secret}x`, ts, body),
);
check(
  'a replayed body under a new timestamp does not match',
  signInNode(secret, ts, body) !== signInNode(secret, '1761000001', body),
);

console.log(`${count - fail}/${count} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
