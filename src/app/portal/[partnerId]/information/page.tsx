import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { blocksToText } from '@/components/content/BlockRenderer';
import { getDb } from '@/lib/db/store';
import { contentVisible, fmtDate, gradientFor, stripMarkdown, terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function InformationCentre({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;

  // Unpublished pages are invisible, and each page's visibility rule
  // decides whether this partner sees it at all.
  const pages = db.contentPages.filter(
    (p) => p.published !== false && contentVisible(db, p, part),
  );

  const grouped = db.contentCategories
    .map((cat) => ({ cat, pages: pages.filter((p) => p.categoryId === cat.id) }))
    .filter((g) => g.pages.length > 0);

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Information</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything you need to prepare for {db.event.name}. You are only shown what applies to
        your participation.
      </p>

      {pages.length === 0 ? (
        <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">
          No information pages have been published for you yet.
        </Panel>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(({ cat, pages: catPages }) => (
            <section key={cat.id}>
              <Eyebrow tone="accent" className="mb-3 tracking-[0.14em]">
                {cat.name}
              </Eyebrow>
              <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
                {catPages.map((page) => {
                  const snippet =
                    stripMarkdown(page.body) || blocksToText(page.blocks).slice(0, 130);

                  return (
                    <Link
                      key={page.id}
                      href={`${base}/information/${page.id}`}
                      className="group overflow-hidden rounded-xl border border-line-2 bg-panel no-underline transition-colors hover:border-line-4"
                    >
                      <div
                        className="h-[104px] bg-cover bg-center"
                        style={{
                          backgroundImage: `url('${page.cover ?? gradientFor(page.categoryId ?? page.id)}')`,
                        }}
                      />
                      <div className="px-[16px] py-[14px]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[14px] text-ink">{page.title}</span>
                          {page.requireAck && (
                            <StatusPill tone="warn" className="shrink-0">
                              Read
                            </StatusPill>
                          )}
                        </div>
                        <p className="mt-[6px] line-clamp-3 text-[12.5px] leading-relaxed text-ink-3">
                          {snippet}
                        </p>
                        <div className="mt-[10px] text-[11px] text-ink-4">
                          Updated {fmtDate(page.updated)}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </Rise>
  );
}
