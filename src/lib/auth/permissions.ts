import type { Id, OrganiserPermissions, OrganiserUser, PartnerUser } from '@/lib/types';

/* ============================================================
   Who may do what

   Pure functions over a session. No request, no database, no
   `server-only` — deliberately, so the rules that decide access can
   be tested directly rather than only through a running app.

   Reading the session is a separate job, in session.ts.
   ============================================================ */

export type Session =
  | { kind: 'organiser'; user: OrganiserUser }
  | { kind: 'partner'; user: PartnerUser; partnerId: Id };

/** The partner user for a session, or null when an organiser is previewing. */
export function partnerUserOf(session: Session): PartnerUser | null {
  return session.kind === 'partner' ? session.user : null;
}

/**
 * Whether a session may reach one area of the organiser portal.
 *
 * A super admin may reach everything, including Event settings. A
 * team member is limited to the areas ticked against them.
 */
export function canReachArea(
  session: Session,
  area: keyof OrganiserPermissions,
): boolean {
  if (session.kind !== 'organiser') return false;
  if (session.user.role === 'super_admin') return true;
  return Boolean(session.user.permissions?.[area]);
}

/**
 * Whether a session may hand somebody else a sign-in link.
 *
 * The rules, and why:
 *
 *   * a partner user may never issue one for anybody;
 *   * an organiser may issue one for a partner user if they can
 *     reach Partners — it grants nothing they lack, since they can
 *     already open any partner's portal to support them;
 *   * only a super admin may issue one for another BOARD account.
 *     Without that, a team member limited to Requests could mint a
 *     link for a super admin, sign in as them, and hold every
 *     permission in the system.
 */
export function mayIssueLinkFor(
  session: Session,
  kind: 'organiser' | 'partner',
): boolean {
  if (session.kind !== 'organiser') return false;
  if (kind === 'organiser') return session.user.role === 'super_admin';
  return canReachArea(session, 'partners');
}
