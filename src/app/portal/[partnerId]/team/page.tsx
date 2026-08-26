import { requireModule } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

import { Team, type TeamMember } from '@/components/team/Team';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function PartnerTeam({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'team');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);

  const members: TeamMember[] = db.partnerUsers
    .filter((u) => u.partnerId === partnerId)
    // The Lead first, then everybody else alphabetically.
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'lead' ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: u.permissions,
      status: u.acceptedAt
        ? `Joined ${fmtDate(u.acceptedAt)}`
        : u.invitedAt
          ? `Added ${fmtDate(u.invitedAt)}`
          : 'Not yet signed in',
    }));

  return (
    <Rise className="max-w-[860px]">
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Your team</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        The Partner Lead decides who from {' '}
        {db.partners.find((p) => p.id === partnerId)?.name ?? 'your organisation'} can see and
        do what. Turn an area on to grant access to it.
      </p>

      <Team partnerId={partnerId} members={members} />
    </Rise>
  );
}
