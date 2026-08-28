/*
 * When a deadline is chased, against a fixed clock.
 *
 * The failures that matter are at the edges: something chased on the
 * day it is due, something chased forever, something that falls
 * between two windows and is never chased at all. Waiting a
 * fortnight and reading an inbox is no way to find those.
 *
 * Run: npx tsx scripts/test-reminder-rules.ts
 */
import { daysUntil, reminderFor, reminderKey } from '../src/lib/reminderRules';

/** A fixed "today" — midday, to catch any midnight-rounding slip. */
const NOW = new Date('2027-02-01T12:00:00Z');

/** A date this many days from NOW, as the YYYY-MM-DD the app stores. */
function inDays(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Case = [label: string, due: string | null, want: string | null];

/** 'kind:window', or null for "nothing owed". */
const cases: Case[] = [
  ['a month out — too early', inDays(30), null],
  ['15 days — still too early', inDays(15), null],

  ['14 days — the heads-up starts', inDays(14), 'deadline:two_weeks'],
  ['7 days — still the heads-up', inDays(7), 'deadline:two_weeks'],
  ['4 days — still the heads-up', inDays(4), 'deadline:two_weeks'],

  ['3 days — final call', inDays(3), 'deadline:final'],
  ['tomorrow — final call', inDays(1), 'deadline:final'],
  ['today — final call, not overdue', inDays(0), 'deadline:final'],

  ['a day late', inDays(-1), 'overdue:week_0'],
  ['six days late — same chase', inDays(-6), 'overdue:week_0'],
  ['a week late — second chase', inDays(-7), 'overdue:week_1'],
  ['three weeks late — fourth chase', inDays(-21), 'overdue:week_3'],

  ['four weeks late — chasing stops', inDays(-28), null],
  ['a year late — still stopped', inDays(-365), null],

  ['no deadline at all', null, null],
  ['nonsense date', 'not-a-date', null],
];

let fail = 0;

for (const [label, due, want] of cases) {
  const got = reminderFor(due, NOW);
  const asString = got ? `${got.kind}:${got.window}` : null;

  if (asString !== want) {
    fail += 1;
    console.log(`  ✗ ${label}\n      want ${want}\n      got  ${asString}`);
  }
}

/* ---- the clock must not decide the answer ---- */

const late = new Date('2027-02-01T23:59:00Z');
const early = new Date('2027-02-01T00:01:00Z');
if (daysUntil(inDays(3), late) !== daysUntil(inDays(3), early)) {
  fail += 1;
  console.log('  ✗ the time of day changed how many days away a deadline is');
}

/* ---- keys separate what must be separate ---- */

const twoWeeks = reminderFor(inDays(14), NOW)!;
const final = reminderFor(inDays(1), NOW)!;

const keys = [
  reminderKey('ep_1', 'task_a', '2027-03-01', twoWeeks),
  reminderKey('ep_1', 'task_a', '2027-03-01', final),
  reminderKey('ep_1', 'task_b', '2027-03-01', twoWeeks),
  reminderKey('ep_2', 'task_a', '2027-03-01', twoWeeks),
  // A moved deadline is a different thing to be chased about.
  reminderKey('ep_1', 'task_a', '2027-03-08', twoWeeks),
];

if (new Set(keys).size !== keys.length) {
  fail += 1;
  console.log('  ✗ two different reminders share a dedupe key — one would never send');
}

// The same reminder asked for twice must key the same, or the claim
// never collides and everybody is chased daily.
if (
  reminderKey('ep_1', 'task_a', '2027-03-01', twoWeeks) !==
  reminderKey('ep_1', 'task_a', '2027-03-01', twoWeeks)
) {
  fail += 1;
  console.log('  ✗ the same reminder produced two different keys');
}

const total = cases.length + 3;
console.log(`${total - fail}/${total} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
