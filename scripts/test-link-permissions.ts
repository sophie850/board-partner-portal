/*
 * The escalation rule, on its own.
 *
 * A limited team member being able to mint a sign-in link for a
 * super admin would hand them every permission in the system. This
 * asserts it cannot happen, and that the legitimate cases still work.
 *
 * Run: npx tsx scripts/test-link-permissions.ts
 */
import { mayIssueLinkFor, type Session } from '../src/lib/auth/permissions';
import type { OrganiserPermissions } from '../src/lib/types';

const NONE: OrganiserPermissions = {
  partners: false, forms: false, tasks: false, content: false, products: false,
  suppliers: false, orders: false, requests: false, reporting: false, settings: false,
};

const superAdmin: Session = {
  kind: 'organiser',
  user: { id: 'a', name: 'Anna', title: '', email: 'a@b.c', role: 'super_admin' },
};

const teamWithPartners: Session = {
  kind: 'organiser',
  user: { id: 'b', name: 'Ops', title: '', email: 'o@b.c', role: 'team',
          permissions: { ...NONE, partners: true } },
};

const teamWithoutPartners: Session = {
  kind: 'organiser',
  user: { id: 'c', name: 'Reviewer', title: '', email: 'r@b.c', role: 'team',
          permissions: { ...NONE, requests: true } },
};

const partnerLead: Session = {
  kind: 'partner',
  partnerId: 'part_a',
  user: { id: 'u', partnerId: 'part_a', name: 'Alex', email: 'x@y.z',
          telephone: '', role: 'lead', permissions: 'all' },
};

const cases: Array<[string, Session, 'organiser' | 'partner', boolean]> = [
  ['super admin  → BOARD account', superAdmin, 'organiser', true],
  ['super admin  → partner user',  superAdmin, 'partner',   true],

  // The escalation this rule exists to stop.
  ['team+partners → BOARD account', teamWithPartners, 'organiser', false],
  ['team+partners → partner user',  teamWithPartners, 'partner',   true],

  ['team, no partners → BOARD account', teamWithoutPartners, 'organiser', false],
  ['team, no partners → partner user',  teamWithoutPartners, 'partner',   false],

  // A partner may never issue one for anybody, including themselves.
  ['partner lead → BOARD account', partnerLead, 'organiser', false],
  ['partner lead → partner user',  partnerLead, 'partner',   false],
];

let pass = 0;
let fail = 0;

for (const [label, session, kind, want] of cases) {
  const got = mayIssueLinkFor(session, kind);
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.log(`  ✗ ${label.padEnd(38)} want ${want}, got ${got}`);
  }
}

console.log(`${pass}/${cases.length} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
