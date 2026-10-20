/*
 * The email BOARD gets when a form is submitted.
 *
 * This one carries a partner's answers to somebody's inbox, so the
 * failures that matter are quiet ones: an answer attributed to the
 * wrong partner, a question the partner was never shown listed as
 * though they left it blank, or a value rendered as [object Object]
 * by somebody who only tested text fields.
 *
 * Run: npx tsx scripts/test-submission-notice.ts
 */
import { seed } from '../src/data/seed';
import { readable, submissionNotice } from '../src/lib/submissionNotice';
import { visibleFields } from '../src/lib/resolvers';

let fail = 0;
let count = 0;

function check(what: string, ok: boolean, detail = ''): void {
  count += 1;
  if (!ok) {
    fail += 1;
    console.log(`  ✗ ${what}${detail ? `: ${detail}` : ''}`);
  }
}

const db = seed();
const LINK = 'https://example.test/organiser/forms/f_profile';

/* ---- values of every shape ---- */

check('nothing renders as [object Object]', !readable({ a: 1, b: 2 }).includes('[object'));
check('an empty answer is a dash', readable('') === '—' && readable(null) === '—');
check('a boolean reads as a word', readable(true) === 'Yes' && readable(false) === 'No');
check('an empty list is a dash, not an empty string', readable([]) === '—');
check('a list is comma separated', readable(['a', 'b']) === 'a, b');
check(
  'a contact reads as a person',
  readable({ name: 'Alex Morgan', email: 'a@b.test', phone: '+44' }) ===
    'Alex Morgan · a@b.test · +44',
);
check('an uploaded file reads as its link', readable({ url: 'https://x.test/f.pdf' }).includes('f.pdf'));
check('zero is not mistaken for empty', readable(0) === '0');
check('false is not mistaken for empty', readable(false) === 'No');

/* ---- the notice itself ---- */

const part = db.participations.find((p) => p.formState && Object.keys(p.formState).length)!;
const partner = db.partners.find((p) => p.id === part.partnerId)!;
const form = db.forms.find((f) => f.id === Object.keys(part.formState!)[0])!;

const notice = submissionNotice(db, form, part, LINK);

check('the subject names the form', notice.subject.includes(form.title));
check('the subject names the partner', notice.subject.includes(partner.name));
check('the body names the partner', notice.text.includes(partner.name));
check('the body carries the reference', notice.text.includes(part.reference));
check('the body links somewhere to review it', notice.text.includes(LINK));
check('no [object Object] anywhere in the body', !notice.text.includes('[object'));
check('no unsubstituted merge tokens', !/\[[a-z_]+\]/.test(notice.text));

/* ---- only the questions this partner was actually asked ---- */

const shown = visibleFields(db, form, part, part.formState![form.id].values)
  .filter((f) => f.type !== 'section_heading' && f.type !== 'guidance')
  .map((f) => f.label);

check('every visible question appears', shown.every((l) => notice.text.includes(l)),
  shown.filter((l) => !notice.text.includes(l)).join(', '));

const hidden = form.fields
  .filter((f) => !shown.includes(f.label))
  .filter((f) => f.type !== 'section_heading' && f.type !== 'guidance');

check(
  'a question this partner was never shown is not listed',
  hidden.every((f) => !notice.text.includes(`${f.label}:`)),
  hidden.filter((f) => notice.text.includes(`${f.label}:`)).map((f) => f.label).join(', '),
);

check(
  'section headings are not listed as questions',
  form.fields
    .filter((f) => f.type === 'section_heading')
    .every((f) => !notice.text.includes(`${f.label}:`)),
);

/* ---- no partner's answers reach another's notice ---- */

for (const other of db.participations.filter((p) => p.id !== part.id)) {
  const theirForm = db.forms.find((f) => f.id === Object.keys(other.formState ?? {})[0]);
  if (!theirForm) continue;

  const theirs = submissionNotice(db, theirForm, other, LINK);
  check(
    `${db.partners.find((p) => p.id === other.partnerId)?.name}'s notice does not name another partner`,
    !theirs.text.includes(partner.name),
  );
}

/* ---- a form nobody has answered still produces a sane message ---- */

const untouched = db.forms.find((f) => !part.formState?.[f.id])!;
const blank = submissionNotice(db, untouched, part, LINK);
check('an unanswered form still names itself', blank.subject.includes(untouched.title));
check('an unanswered form has no [object Object]', !blank.text.includes('[object'));
check('an unanswered form still links to review', blank.text.includes(LINK));

/* ---- the eight venue forms are pointed at somebody ---- */

const venue = db.forms.filter((f) => f.id.startsWith('gf_'));
check('all eight venue forms exist', venue.length === 8, `${venue.length}`);
check(
  'every venue form tells somebody',
  venue.every((f) => (f.notifyEmails ?? []).length > 0),
  venue.filter((f) => !(f.notifyEmails ?? []).length).map((f) => f.id).join(', '),
);
check(
  'and that somebody is Anna',
  venue.every((f) => f.notifyEmails?.includes('anna@boardsummits.com')),
);

console.log(`${count - fail}/${count} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
