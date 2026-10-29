/*
 * The countdown on the partner dashboard.
 *
 * Four states, three of which happen exactly once — and all of them
 * in the week nobody has time to notice a bug. A naive counter
 * prints "-2 days until BOARD 2027" on the second morning of the
 * show, which is the thing this exists to stop.
 *
 * Run: npx tsx scripts/test-countdown.ts
 */
import { countdown } from '../src/lib/countdown';
import { seed } from '../src/data/seed';

const event = seed().event;
let fail = 0;
let count = 0;

function check(what: string, ok: boolean, detail = ''): void {
  count += 1;
  if (!ok) { fail += 1; console.log(`  ✗ ${what}${detail ? `: ${detail}` : ''}`); }
}

const at = (iso: string) => countdown(event, new Date(`${iso}T09:00:00Z`));

// Event runs 22–24 Mar 2027.
const far = at('2026-10-29')!;
check('counts the days when it is months off', far.big === '144', far.big);
check('and says what it is counting to', far.small.includes('days until'));

const week = at('2027-03-15')!;
check('a week out counts 7', week.big === '7', week.big);

const tomorrow = at('2027-03-21')!;
check('the day before says 1', tomorrow.big === '1', tomorrow.big);
check('and says day, not days', tomorrow.small.startsWith('day until'), tomorrow.small);

for (const day of ['2027-03-22', '2027-03-23', '2027-03-24']) {
  const during = at(day)!;
  check(`${day} reads as happening, not a number`, during.big === 'Happening now', during.big);
  check(`${day} shows no negative number`, !/-/.test(during.big + during.small));
}

const after = at('2027-03-25')!;
check('the day after is finished', after.big === 'That’s a wrap', after.big);
check('and names the event', after.small.includes(event.shortName));

const long = at('2027-06-01')!;
check('months later still finished', long.big === 'That’s a wrap', long.big);

check(
  'no state ever prints a negative number',
  ['2026-01-01','2027-03-21','2027-03-22','2027-03-24','2027-03-25','2030-01-01']
    .every((d) => { const c = at(d)!; return !/^-|\s-\d/.test(c.big + ' ' + c.small); }),
);

const broken = countdown({ ...event, startDate: '', endDate: '' }, new Date());
check('an event with no dates shows no badge at all', broken === null);

console.log(`${count - fail}/${count} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
