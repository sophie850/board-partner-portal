import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { PartnerConfigure } from '@/components/partners/PartnerConfigure';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { terms } from '@/lib/resolvers';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('partners', '/organiser/partners/[id]/configure');

  const { id } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === id);
  const participation = db.participations.find((p) => p.partnerId === id);
  if (!partner || !participation) notFound();

  const t = terms(db);
  const lead = db.partnerUsers.find((u) => u.id === participation.leadUserId) ?? null;

  return (
    <Rise className="max-w-[880px]">
      <Link
        href={`/organiser/partners/${partner.id}`}
        className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> {partner.name}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow tone="accent" className="mb-2">
            {partner.sector}
          </Eyebrow>
          <PageTitle>Configure</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            What {partner.name} has bought and what you need from them. Everything here
            shapes the portal they see — each section saves on its own.
          </p>
        </div>
        <Link
          href={`/portal/${partner.id}`}
          className="shrink-0 rounded-pill border border-accent-line px-[15px] py-2 text-[12.5px] text-accent no-underline hover:bg-accent-fill hover:text-accent"
        >
          Preview as {t.lower.partner}
        </Link>
      </div>

      <PartnerConfigure
        partner={partner}
        participation={participation}
        lead={lead}
        entitlements={db.entitlements}
        forms={db.forms}
        tasks={db.taskTemplates}
      />
    </Rise>
  );
}
