import Link from 'next/link';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { eventDateRange } from '@/lib/promote';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'No access — BOARD Partner Portal',
};

/**
 * What each refusal actually means.
 *
 * Written for the person reading it: what they tried, why it did not
 * work, and who can change that. "Forbidden" tells them nothing they
 * can act on.
 */
const REASONS: Record<string, { title: string; body: string }> = {
  partner: {
    title: 'That is another partner’s portal',
    body: 'Your account is linked to one organisation, and you can only see that one. If you work with more than one, your BOARD contact can set up a second account.',
  },
  organiser: {
    title: 'That part is for the BOARD team',
    body: 'The organiser side manages every partner at once, so it is only open to BOARD staff. Everything to do with your own participation is in your portal.',
  },
  area: {
    title: 'You do not have access to that area',
    body: 'Your BOARD account does not include this area. A super admin can grant it under Event settings → The BOARD team.',
  },
};

export default async function DeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const detail = REASONS[reason ?? ''] ?? REASONS.organiser;

  const [db, session] = await Promise.all([getDb(), getSession()]);

  const home =
    session?.kind === 'partner'
      ? `/portal/${session.partnerId}`
      : session?.kind === 'organiser'
        ? '/organiser'
        : '/signin';

  return (
    <AuthScreen
      eyebrow="Partner Portal"
      headline={db.event.tagline || 'Take your seat at the table'}
      blurb={`${db.event.name} — tasks, forms, orders and everything the team needs from you, in one place.`}
      footer={`${db.event.venue}, ${db.event.city} · ${eventDateRange(db.event)}`}
    >
      <div className="animate-rise">
        <h2 className="mb-2 text-[24px] font-light text-ink">{detail.title}</h2>
        <p className="mb-7 text-[13.5px] leading-relaxed text-ink-3">{detail.body}</p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={home}
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
          >
            {session ? 'Back to your portal' : 'Sign in'}
          </Link>
          {session && <SignOutButton variant="quiet" />}
        </div>

        {session && (
          <p className="mt-7 text-[12px] text-ink-4">
            Signed in as {session.user.email || session.user.name}.
          </p>
        )}
      </div>
    </AuthScreen>
  );
}
