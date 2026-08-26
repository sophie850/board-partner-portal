import { requireModule } from '@/lib/auth/session';
import { notFound } from 'next/navigation';

import { Promote } from '@/components/promote/Promote';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { suggestedCopy, type PromoteCopy } from '@/lib/promote';
import { terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function PartnerPromote({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  await requireModule(partnerId, 'promote');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const partner = db.partners.find((p) => p.id === part.partnerId);
  if (!partner) notFound();

  const t = terms(db);
  const marketing = part.marketing ?? {};

  const suggested: PromoteCopy = suggestedCopy(db, part, partner);

  /*
   * An absent `logoOverride` means "use the company logo"; an empty
   * string means the partner deliberately chose no logo at all.
   * Collapsing the two would take the choice away from them.
   */
  const logoOverride =
    'logoOverride' in marketing ? String(marketing.logoOverride ?? '') : null;

  const saved = {
    format: typeof marketing.format === 'string' ? marketing.format : undefined,
    bg: typeof marketing.bg === 'string' ? marketing.bg : undefined,
    eyebrow: typeof marketing.eyebrow === 'string' ? marketing.eyebrow : undefined,
    headline: typeof marketing.headline === 'string' ? marketing.headline : undefined,
    sub: typeof marketing.sub === 'string' ? marketing.sub : undefined,
    detail: typeof marketing.detail === 'string' ? marketing.detail : undefined,
    caption: typeof marketing.caption === 'string' ? marketing.caption : undefined,
  };

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Promote your presence</PageTitle>
      <p className="mt-2 mb-7 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        Co-branded graphics and ready-to-post copy announcing that {partner.name} will be at{' '}
        {db.event.name}. The suggested wording is based on what your participation includes —
        edit any of it.
      </p>

      <Promote
        partnerId={partnerId}
        partnerName={partner.name}
        companyLogo={partner.logo ?? ''}
        logoOverride={logoOverride}
        saved={saved}
        suggested={suggested}
      />
    </Rise>
  );
}
