import { redirect } from 'next/navigation';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { authConfigured, getSession } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { eventDateRange } from '@/lib/promote';

import { SignInForm } from './SignInForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in — BOARD Partner Portal',
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; signed_out?: string }>;
}) {
  const { next, error, signed_out: signedOut } = await searchParams;

  // Already signed in and not arriving from a sign-out: there is
  // nothing to do here, so send them where they were going.
  if (!signedOut) {
    const session = await getSession();
    if (session) {
      redirect(
        session.kind === 'organiser' ? '/organiser' : `/portal/${session.partnerId}`,
      );
    }
  }

  const db = await getDb();
  const event = db.event;

  return (
    <AuthScreen
      eyebrow="Partner Portal"
      headline={event.tagline || 'Take your seat at the table'}
      blurb={`Manage your participation in ${event.name} — tasks, forms, orders and everything the team needs from you, in one place.`}
      footer={`${event.venue}, ${event.city} · ${eventDateRange(event)}`}
    >
      {!authConfigured() ? (
        <div className="animate-rise">
          <h2 className="mb-2 text-[24px] font-light text-ink">Sign-in is not switched on</h2>
          <p className="text-[13.5px] leading-relaxed text-ink-3">
            This deployment has no <code className="text-[12.5px]">AUTH_SECRET</code> set, so
            there are no accounts to sign in to. The site is protected by the shared
            passphrase instead.
          </p>
        </div>
      ) : (
        <SignInForm
          next={next}
          error={error}
          signedOut={signedOut === '1'}
          eventName={event.name}
        />
      )}
    </AuthScreen>
  );
}
