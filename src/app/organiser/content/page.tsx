import { BookOpen, Plus } from 'lucide-react';
import Link from 'next/link';

import { PageTitle, Eyebrow, EmptyState, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate } from '@/lib/resolvers';
import type { ContentPage, Db } from '@/lib/types';

import { RowActions } from './RowActions';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  await requireArea('content', '/organiser/content');

  const db = await getDb();

  const grouped = db.contentCategories
    .map((cat) => ({
      cat,
      pages: db.contentPages.filter((p) => p.categoryId === cat.id),
    }))
    .filter((g) => g.pages.length > 0);

  // Pages whose category was deleted still need somewhere to live.
  const orphans = db.contentPages.filter(
    (p) => !db.contentCategories.some((c) => c.id === p.categoryId),
  );

  const total = db.contentPages.length;
  const unpublished = db.contentPages.filter((p) => p.published === false).length;

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <PageTitle>Information pages</PageTitle>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
            What partners read to prepare. Each page is built from blocks — text, images,
            lists, callouts, key dates — and is shown only to the partners its visibility
            rule allows.
          </p>
        </div>
        <Link
          href="/organiser/content/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline transition-colors hover:bg-brand-hover hover:text-on-brand"
        >
          <Plus size={16} /> New page
        </Link>
      </div>

      <div className="mb-6 flex gap-5 text-[12.5px] text-ink-4">
        <span>
          <span className="text-ink">{total}</span> {total === 1 ? 'page' : 'pages'}
        </span>
        {unpublished > 0 && (
          <span>
            <span className="text-warn">{unpublished}</span> unpublished
          </span>
        )}
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} />}
          title="No information pages yet"
          body="Start with the pages every partner needs — key deadlines, the venue guide, and how access and accreditation work. You can gate anything build-specific to partners with exhibition space."
          action={
            <Link
              href="/organiser/content/new"
              className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand no-underline hover:bg-brand-hover hover:text-on-brand"
            >
              <Plus size={16} /> Create the first page
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-[22px]">
          {grouped.map(({ cat, pages }) => (
            <section key={cat.id}>
              <Eyebrow tone="accent" className="mb-[10px] tracking-[0.14em]">
                {cat.name}
              </Eyebrow>
              <div className="flex flex-col gap-[9px]">
                {pages.map((p) => (
                  <PageRow key={p.id} page={p} db={db} />
                ))}
              </div>
            </section>
          ))}

          {orphans.length > 0 && (
            <section>
              <Eyebrow className="mb-[10px] tracking-[0.14em]">Uncategorised</Eyebrow>
              <div className="flex flex-col gap-[9px]">
                {orphans.map((p) => (
                  <PageRow key={p.id} page={p} db={db} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </Rise>
  );
}

function PageRow({ page, db }: { page: ContentPage; db: Db }) {
  return (
    <div className="flex flex-wrap items-center gap-[14px] rounded-xl border border-line-2 bg-panel px-4 py-[13px]">
      <div className="min-w-0 flex-1">
        <Link
          href={`/organiser/content/${page.id}`}
          className="text-[14px] text-ink no-underline hover:text-accent"
        >
          {page.title}
        </Link>
        <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-4">
          <span>{visibilityLabel(page, db)}</span>
          <span aria-hidden>·</span>
          <span>Updated {fmtDate(page.updated)}</span>
          {page.requireAck && (
            <>
              <span aria-hidden>·</span>
              <span className="text-warn">Acknowledgement required</span>
            </>
          )}
        </div>
      </div>

      <StatusPill tone={page.published === false ? 'muted' : 'good'}>
        {page.published === false ? 'Draft' : 'Published'}
      </StatusPill>

      <Link
        href={`/organiser/content/${page.id}`}
        className="rounded-pill border border-accent-line px-[14px] py-[6px] text-[12px] text-accent no-underline hover:bg-accent-fill hover:text-accent"
      >
        Edit
      </Link>

      <RowActions id={page.id} title={page.title} published={page.published !== false} />
    </div>
  );
}

/** Plain-English description of who can see a page. */
function visibilityLabel(page: ContentPage, db: Db): string {
  const rule = page.visibility;
  if (!rule || rule.type === 'all' || Object.keys(rule).length === 0) return 'All partners';

  if (rule.type === 'partner') {
    const names = (rule.partners ?? [])
      .map((id) => db.partners.find((p) => p.id === id)?.name)
      .filter(Boolean);
    return names.length ? `Only ${names.join(', ')}` : 'Specific partners';
  }

  if (rule.type === 'except') {
    const names = (rule.partners ?? [])
      .map((id) => db.partners.find((p) => p.id === id)?.name)
      .filter(Boolean);
    return names.length ? `Everyone except ${names.join(', ')}` : 'All partners';
  }

  const keys = Array.isArray(rule.keys) ? rule.keys : rule.key ? [rule.key] : [];
  const labels = keys
    .map((k) => db.entitlements.find((e) => e.key === k)?.label ?? k)
    .filter(Boolean);

  if (!labels.length) return 'All partners';
  // ANY-of semantics: the partner needs at least one of these.
  return labels.length === 1 ? labels[0] : `${labels.join(' or ')}`;
}
