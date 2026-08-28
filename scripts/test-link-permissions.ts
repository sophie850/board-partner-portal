/*
 * The two escalation rules, on their own.
 *
 * A limited team member being able to mint a sign-in link for a
 * super admin would hand them every permission in the system. Nor
 * may one reach Event settings, which holds the permissions grid —
 * ticking your own boxes is the same escalation by a slower route.
 *
 * This asserts neither can happen, and that the legitimate cases
 * still work.
 *
 * Run: npx tsx scripts/test-link-permissions.ts
 */
import { canReachArea, mayIssueLinkFor, type Session } from '../src/lib/auth/permissions';
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

/*
 * The row that used to be enough. Left ticked deliberately: a stale
 * `settings: true` on an old record must grant nothing.
 */
const teamWithSettings: Session = {
  kind: 'organiser',
  user: { id: 'd', name: 'Coordinator', title: '', email: 's@b.c', role: 'team',
          permissions: { ...NONE, settings: true, forms: true } },
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

const areaCases: Array<[string, Session, 'settings' | 'forms' | 'partners', boolean]> = [
  ['super admin → settings', superAdmin, 'settings', true],

  // The rule: no tickbox grants Event settings.
  ['team WITH settings ticked → settings', teamWithSettings, 'settings', false],
  ['team WITH settings ticked → forms',    teamWithSettings, 'forms',    true],
  ['team without it → settings',           teamWithPartners, 'settings', false],
  ['team without it → partners',           teamWithPartners, 'partners', true],
  ['team without it → forms',              teamWithPartners, 'forms',    false],

  ['partner lead → settings', partnerLead, 'settings', false],
  ['partner lead → forms',    partnerLead, 'forms',    false],
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

for (const [label, session, area, want] of areaCases) {
  const got = canReachArea(session, area);
  if (got === want) {
    pass++;
  } else {
    fail++;
    console.log(`  ✗ ${label.padEnd(38)} want ${want}, got ${got}`);
  }
}

const total = cases.length + areaCases.length;
console.log(`${pass}/${total} passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
