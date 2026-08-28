import { requireModule } from '@/lib/auth/session';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Acknowledge } from '@/components/content/Acknowledge';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { contentVisible, fmtDate, fmtDateTime, gradientFor } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function InformationPage({
  params,
}: {
  params: Promise<{ partnerId: string; pageId: string }>;
}) {
  const { partnerId, pageId } = await params;
  await requireModule(partnerId, 'information');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const page = db.contentPages.find((p) => p.id === pageId);
  const ack = part.ackState?.[pageId] ?? null;

  // A page this partner is not entitled to see must 404 exactly like
  // one that does not exist — otherwise the difference between the
  // two leaks that it exists.
  if (!page || page.published === false || !contentVisible(db, page, part)) notFound();

  const category = db.contentCategories.find((c) => c.id === page.categoryId);
  const base = `/portal/${partnerId}`;

  return (
    <Rise className="mx-auto max-w-[760px]">
      <Link
        href={`${base}/information`}
        className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> Information
      </Link>

      <div
        className="mb-6 h-[180px] rounded-xl bg-cover bg-center"
        style={{
          backgroundImage: `url('${page.cover ?? gradientFor(page.categoryId ?? page.id)}')`,
        }}
      />

      {category && (
        <Eyebrow tone="accent" className="mb-2 tracking-[0.14em]">
          {category.name}
        </Eyebrow>
      )}

      <PageTitle className="text-[30px]">{page.title}</PageTitle>
      <div className="mt-2 mb-7 text-[12px] text-ink-4">Last updated {fmtDate(page.updated)}</div>

      {page.blocks?.length ? (
        <BlockRenderer blocks={page.blocks} />
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-2">{page.body}</p>
      )}

      {page.requireAck && (
        <Acknowledge
          partnerId={partnerId}
          pageId={page.id}
          title={page.title}
          acknowledged={
            ack ? { by: ack.by, atLabel: fmtDateTime(ack.at) } : null
          }
        />
      )}
    </Rise>
  );
}
