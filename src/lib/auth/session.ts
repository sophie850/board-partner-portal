import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { readSession, SESSION_COOKIE } from '@/lib/auth/cookie';
import { getDb } from '@/lib/db/store';
import { visibleModules } from '@/lib/resolvers';
import { env } from '@/lib/env';
import type { Id, OrganiserPermissions, OrganiserUser, PartnerUser } from '@/lib/types';

/* ============================================================
   Who is signed in, and what they may reach

   The cookie says who somebody claims to be. This resolves that
   claim against the database on every request, so a person removed
   from a team loses access immediately rather than when their
   cookie happens to expire.

   Everything below is the enforcement point. Hiding a nav item is
   presentation; these are the checks that decide.
   ============================================================ */

export type Session =
  | { kind: 'organiser'; user: OrganiserUser }
  | { kind: 'partner'; user: PartnerUser; partnerId: Id };

/** Whether sign-in is switched on for this deployment. */
export function authConfigured(): boolean {
  return Boolean(env('AUTH_SECRET'));
}

/**
 * The signed-in user, or null.
 *
 * Cached per request: a page and its layout both ask, and this
 * should not re-read the cookie and re-scan the user list each time.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const secret = env('AUTH_SECRET');
  if (!secret) return null;

  const store = await cookies();
  const claims = await readSession(store.get(SESSION_COOKIE)?.value, secret);
  if (!claims) return null;

  const db = await getDb();

  if (claims.kind === 'organiser') {
    const user = db.organiserUsers.find((u) => u.id === claims.userId);
    return user ? { kind: 'organiser', user } : null;
  }

  const user = db.partnerUsers.find((u) => u.id === claims.userId);
  if (!user) return null;

  return { kind: 'partner', user, partnerId: user.partnerId };
});

/* ---------------------------------------------------------------
   Guards
   --------------------------------------------------------------- */

/**
 * Send an unauthenticated visitor to sign in, remembering where they
 * were going.
 *
 * `redirect` throws, so callers do not need to return afterwards.
 */
function toSignIn(next: string): never {
  redirect(`/signin?next=${encodeURIComponent(next)}`);
}

/**
 * Refuse, and say so.
 *
 * A redirect rather than Next's `forbidden()`, which is still
 * experimental and needs a config flag turned on. An access control
 * should rest on the most boring mechanism available.
 */
function denied(reason: 'organiser' | 'partner' | 'area'): never {
  redirect(`/denied?reason=${reason}`);
}

export async function requireSession(next: string): Promise<Session> {
  // With no AUTH_SECRET the deployment has not turned sign-in on.
  // The shared passphrase gate is what is protecting it, and every
  // visitor is treated as an organiser — which is how this ran
  // before sign-in existed.
  if (!authConfigured()) return openSession();

  const session = await getSession();
  if (!session) toSignIn(next);
  return session;
}

/**
 * The stand-in identity used when sign-in is not configured.
 *
 * Deliberately explicit rather than a scattering of `if (!auth)`
 * branches: one place decides what "no sign-in configured" means,
 * and it means everybody is the BOARD team.
 */
function openSession(): Session {
  return {
    kind: 'organiser',
    user: {
      id: 'open_access',
      name: 'BOARD team',
      title: '',
      email: '',
      role: 'super_admin',
    },
  };
}

export async function requireOrganiser(next: string): Promise<Session> {
  const session = await requireSession(next);

  // A partner user reaching an organiser URL is not a routing
  // mistake to explain away — say no.
  if (session.kind !== 'organiser') denied('organiser');

  return session;
}

/**
 * Confirm the signed-in user may act for this partner.
 *
 * An organiser may: previewing a partner's portal is how the BOARD
 * team supports them, and the shell says plainly that is what is
 * happening. A partner user may only ever reach their own.
 */
export async function requirePartnerAccess(
  partnerId: Id,
  next: string,
): Promise<Session> {
  const session = await requireSession(next);

  if (session.kind === 'organiser') return session;
  if (session.partnerId === partnerId) return session;

  denied('partner');
}

/* ---------------------------------------------------------------
   Finer-grained permissions
   --------------------------------------------------------------- */

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

export async function requireArea(
  area: keyof OrganiserPermissions,
  next: string,
): Promise<Session> {
  const session = await requireOrganiser(next);
  if (!canReachArea(session, area)) denied('area');
  return session;
}

/**
 * Whether this session may use one module of a partner's portal.
 *
 * An organiser previewing sees everything the partner's package
 * includes. A partner user is further limited to what their Lead
 * granted them.
 */
export async function canUseModule(partnerId: Id, moduleKey: string): Promise<boolean> {
  const session = await requireSession(`/portal/${partnerId}`);
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) return false;

  return visibleModules(db, part, partnerUserOf(session)).some((m) => m.key === moduleKey);
}

export async function requireModule(partnerId: Id, moduleKey: string): Promise<Session> {
  const session = await requirePartnerAccess(partnerId, `/portal/${partnerId}`);
  if (!(await canUseModule(partnerId, moduleKey))) denied('area');
  return session;
}

/* ---------------------------------------------------------------
   Guards for server actions
   --------------------------------------------------------------- */

export interface Refusal {
  ok: false;
  error: string;
}

/**
 * The same checks, shaped for a server action.
 *
 * Actions are public endpoints — being reachable only from a page
 * the caller has already loaded is not a control, because nothing
 * stops anybody posting to them directly. These return a refusal
 * rather than redirecting, so an action's existing error path
 * carries it.
 *
 * Returns null when the caller is allowed to proceed.
 */
export async function guardPartner(
  partnerId: Id,
  moduleKey?: string,
): Promise<Refusal | null> {
  if (!authConfigured()) return null;

  const session = await getSession();
  if (!session) return { ok: false, error: 'Your session has expired. Sign in again.' };

  if (session.kind === 'partner' && session.partnerId !== partnerId) {
    return { ok: false, error: 'You do not have access to that.' };
  }

  if (moduleKey && !(await canUseModule(partnerId, moduleKey))) {
    return { ok: false, error: 'You do not have access to that part of the portal.' };
  }

  return null;
}

export async function guardOrganiser(
  area?: keyof OrganiserPermissions,
): Promise<Refusal | null> {
  if (!authConfigured()) return null;

  const session = await getSession();
  if (!session) return { ok: false, error: 'Your session has expired. Sign in again.' };

  if (session.kind !== 'organiser') {
    return { ok: false, error: 'Only the BOARD team can do that.' };
  }

  if (area && !canReachArea(session, area)) {
    return { ok: false, error: 'You do not have access to that area.' };
  }

  return null;
}

/** Who to record as the actor on an audit entry or a comment. */
export async function actorName(fallback = 'BOARD team'): Promise<string> {
  const session = await getSession();
  return session?.user.name || fallback;
}
