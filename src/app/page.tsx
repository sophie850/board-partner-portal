import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth/session';

/**
 * The root, routed by who is asking.
 *
 * The BOARD wordmark in the header links here from every page, so
 * this is reached far more often than the bare URL suggests. Sending
 * everybody to the organiser portal — which is what it did before
 * sign-in existed — bounced a partner clicking the logo straight
 * into "that part is for the BOARD team".
 */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (session?.kind === 'partner') redirect(`/portal/${session.partnerId}`);

  // An organiser, or a deployment with no sign-in configured, where
  // every visitor is treated as the BOARD team.
  redirect('/organiser');
}
