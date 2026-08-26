/*
 * Participation references.
 *
 * Derived from the highest existing number, not the row count, so
 * removing a partner cannot make the next one reuse their reference.
 *
 * Run: npx tsx scripts/test-partner-reference.ts
 */
import { nextReference } from '../src/lib/resolvers';

const cases: Array<[string, string[], string]> = [
  ['first ever',                 [],                            'BP-001'],
  ['sequential',                 ['BP-001', 'BP-002'],          'BP-003'],
  ['out of order',               ['BP-003', 'BP-001'],          'BP-004'],
  ['gap left by a deletion',     ['BP-001', 'BP-004'],          'BP-005'],
  ['does not reuse a deleted one', ['BP-002'],                  'BP-003'],
  ['rolls past 999',             ['BP-999'],                    'BP-1000'],
  ['ignores a foreign format',   ['SPONSOR-7', 'BP-002'],       'BP-003'],
  ['ignores rubbish',            ['', '  ', 'BP-'],             'BP-001'],
  ['tolerates whitespace',       [' BP-005 '],                  'BP-006'],
];

let pass = 0;
let fail = 0;

for (const [label, existing, want] of cases) {
  const got = nextReference(existing);
  if (got === want) pass++;
  else {
    fail++;
    console.log(`  ✗ ${label.padEnd(30)} want ${want}, got ${got}`);
  }
}

console.log(`${pass}/${cases.length} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
