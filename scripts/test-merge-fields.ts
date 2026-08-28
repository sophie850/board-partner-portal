/*
 * Token substitution, on its own.
 *
 * Email templates are written by the BOARD team and sent to
 * partners, so the two failures that matter are opposites: a real
 * token surviving into somebody's inbox as “[first_name]”, and a
 * piece of ordinary text in brackets being silently eaten.
 *
 * Run: npx tsx scripts/test-merge-fields.ts
 */
import { fillTokens } from '../src/lib/mergeFields';

type Case = [label: string, text: string, values: Parameters<typeof fillTokens>[1], want: string];

const cases: Case[] = [
  [
    'substitutes a supplied token',
    'Hi [first_name],',
    { first_name: 'Sophie' },
    'Hi Sophie,',
  ],
  [
    'case-insensitive',
    'Hi [First_Name], from [EVENT]',
    { first_name: 'Sophie', event: 'BOARD Monaco 2027' },
    'Hi Sophie, from BOARD Monaco 2027',
  ],
  [
    'a known token with no value becomes nothing',
    'Due [due].',
    { first_name: 'Sophie' },
    'Due .',
  ],
  [
    'an unknown token is left exactly as written',
    'Hi [frist_name],',
    { first_name: 'Sophie' },
    'Hi [frist_name],',
  ],
  [
    'ordinary bracketed prose survives',
    'The stand [see the floor plan] is ready.',
    {},
    'The stand [see the floor plan] is ready.',
  ],
  [
    'the gap left by an empty token is tidied away',
    'Hi [first_name], [task] is due.',
    { first_name: 'Sophie', task: '' },
    'Hi Sophie, is due.',
  ],
  [
    'a run of blank lines collapses',
    'One\n\n[task]\n\n\nTwo',
    {},
    'One\n\nTwo',
  ],
  [
    'no tokens, no change',
    'Nothing to substitute here.',
    { first_name: 'Sophie' },
    'Nothing to substitute here.',
  ],
  [
    'a value containing brackets is not substituted again',
    'Hi [first_name].',
    { first_name: '[event]' },
    'Hi [event].',
  ],
  [
    'the same token twice',
    '[partner] — [partner]',
    { partner: 'Helvetica Systems' },
    'Helvetica Systems — Helvetica Systems',
  ],
];

let fail = 0;

for (const [label, text, values, want] of cases) {
  const got = fillTokens(text, values);
  if (got !== want) {
    fail++;
    console.log(`  ✗ ${label}\n      want ${JSON.stringify(want)}\n      got  ${JSON.stringify(got)}`);
  }
}

console.log(`${cases.length - fail}/${cases.length} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
