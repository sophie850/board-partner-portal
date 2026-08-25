import { clsx } from 'clsx';
import { Download, Info, TriangleAlert } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

import type { ContentBlock, TimelineItem } from '@/lib/types';
import { fmtDate } from '@/lib/resolvers';

/* ============================================================
   Block-based content rendering

   Pages are authored as blocks rather than one body field, so the
   information centre reads like an edited page instead of a wall of
   text or, worse, a PDF.

   Inline markdown is parsed into React nodes rather than injected as
   HTML: organiser-authored copy is still untrusted input as far as
   the browser is concerned, and this way there is no XSS surface at
   all.
   ============================================================ */

/* ---------------------------------------------------------------
   Inline markdown: **bold**, _italic_, [text](url)
   --------------------------------------------------------------- */

const INLINE = /(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\([^)]*\))/g;

/** Only http(s) and mailto survive; anything else renders as text. */
function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return null;
}

export function InlineText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(INLINE).filter((p) => p !== '');

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Brand rule: never heavier than Regular. "Bold" reads as
          // a colour shift to primary ink, not a weight change.
          return (
            <strong key={i} className="font-normal text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith('_') && part.endsWith('_')) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }

        const link = part.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
        if (link) {
          const href = safeHref(link[2]);
          if (!href) return <span key={i}>{link[1]}</span>;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-accent-line underline-offset-2 hover:text-ink"
            >
              {link[1]}
            </a>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/* ---------------------------------------------------------------
   Blocks
   --------------------------------------------------------------- */

export function BlockRenderer({
  blocks,
  className,
}: {
  blocks: ContentBlock[] | undefined;
  className?: string;
}) {
  if (!blocks?.length) return null;

  return (
    <div className={clsx('flex flex-col gap-5', className)}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }): ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="mt-2 text-[19px] leading-snug font-light text-ink">{block.text}</h2>
      );

    case 'paragraph':
      return (
        <p className="text-[14px] leading-relaxed text-ink-2">
          <InlineText text={block.text} />
        </p>
      );

    case 'image':
      return (
        <figure className="m-0">
          <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-line-2">
            <Image
              src={block.src}
              alt={block.caption || ''}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
              /* Uploaded files live behind /api/files/*, which is
                 gated. The image optimiser fetches server-side
                 without the gate cookie, so it would get a redirect
                 rather than the image — serve these unoptimised. */
              unoptimized={block.src.startsWith('/api/files/')}
            />
          </div>
          {block.caption && (
            <figcaption className="mt-[9px] text-[12px] text-ink-4">{block.caption}</figcaption>
          )}
        </figure>
      );

    case 'list':
      return (
        <ul className="m-0 flex list-none flex-col gap-[9px] p-0">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-ink-2">
              <span aria-hidden className="mt-[9px] h-[3px] w-[3px] shrink-0 rounded-pill bg-accent" />
              <span>
                <InlineText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );

    case 'quote':
      return (
        <blockquote className="m-0 border-l-2 border-accent-line pl-[18px]">
          <p className="text-[16px] leading-relaxed font-light text-ink">{block.text}</p>
          {block.cite && <cite className="mt-2 block text-[12px] not-italic text-ink-4">— {block.cite}</cite>}
        </blockquote>
      );

    case 'callout':
      return (
        <div
          className={clsx(
            'flex gap-3 rounded-lg border px-[17px] py-[14px]',
            block.tone === 'warn'
              ? 'border-warn-line bg-warn-fill'
              : 'border-brand-line bg-brand-fill',
          )}
        >
          <span className={clsx('mt-[2px] shrink-0', block.tone === 'warn' ? 'text-warn' : 'text-info')}>
            {block.tone === 'warn' ? <TriangleAlert size={16} /> : <Info size={16} />}
          </span>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            <InlineText text={block.text} />
          </p>
        </div>
      );

    case 'divider':
      return <hr className="my-2 border-0 border-t border-line-2" />;

    case 'video': {
      const href = safeHref(block.url);
      return (
        <div>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-line-3 bg-chip px-[17px] py-[14px] text-[13.5px] text-ink hover:border-accent-line"
            >
              Watch the video
            </a>
          ) : (
            <div className="text-[13px] text-ink-4">Video URL not set.</div>
          )}
          {block.caption && <div className="mt-[9px] text-[12px] text-ink-4">{block.caption}</div>}
        </div>
      );
    }

    case 'download': {
      const body = (
        <>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line-3 bg-chip text-accent">
            <Download size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] text-ink">{block.name}</div>
            {block.note && <div className="mt-[2px] text-[11.5px] text-ink-4">{block.note}</div>}
          </div>
        </>
      );

      const shell =
        'flex items-center gap-3 rounded-lg border border-line-3 bg-inset px-[17px] py-[14px]';

      // Only app-served paths are linked. The file lives in a private
      // bucket behind /api/files/*, so this is never an external URL.
      if (block.url?.startsWith('/api/files/')) {
        return (
          <a
            href={block.url}
            download
            className={`${shell} no-underline transition-colors hover:border-accent-line`}
          >
            {body}
          </a>
        );
      }

      return <div className={shell}>{body}</div>;
    }

    case 'timeline':
      return <KeyDates items={block.items} />;

    default:
      return null;
  }
}

/* ---------------------------------------------------------------
   Key dates — the timeline block

   A big Ambit-Light day numeral against a connected spine, rather
   than a bulleted list of dates. This is the treatment that made the
   deadlines page worth reading.
   --------------------------------------------------------------- */

function KeyDates({ items }: { items: TimelineItem[] }) {
  const now = new Date();
  const sorted = [...items].sort((a, b) => (a.date < b.date ? -1 : 1));

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {sorted.map((item, i) => {
        const date = new Date(item.date);
        const past = date < now;
        const last = i === sorted.length - 1;

        return (
          <li key={i} className="flex gap-4">
            {/* numeral */}
            <div className={clsx('w-[52px] shrink-0 text-right', past && 'opacity-45')}>
              <div className="text-[30px] leading-none font-light text-ink">
                {date.toLocaleDateString('en-GB', { day: 'numeric' })}
              </div>
              <div className="mt-[3px] text-[10.5px] tracking-[0.08em] text-ink-4 uppercase">
                {date.toLocaleDateString('en-GB', { month: 'short' })} {date.getFullYear()}
              </div>
            </div>

            {/* spine */}
            <div className="flex shrink-0 flex-col items-center pt-[10px]">
              <span
                className={clsx(
                  'h-[9px] w-[9px] rounded-pill border',
                  past ? 'border-line-4 bg-transparent' : 'border-accent bg-accent',
                )}
              />
              {!last && <span className="w-px flex-1 bg-line-3" />}
            </div>

            {/* body */}
            <div className={clsx('min-w-0 flex-1 pt-[6px]', last ? 'pb-0' : 'pb-6', past && 'opacity-55')}>
              <div className="text-[14px] text-ink">{item.title}</div>
              {item.note && (
                <div className="mt-[4px] text-[12.5px] leading-relaxed text-ink-4">{item.note}</div>
              )}
              <div className="mt-[6px] text-[11px] tracking-[0.04em] text-ink-4 uppercase">
                {past ? 'Passed' : relativeLabel(date, now)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function relativeLabel(date: Date, now: Date): string {
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

/** Plain-text preview of a page's blocks, for cards and search. */
export function blocksToText(blocks: ContentBlock[] | undefined): string {
  if (!blocks?.length) return '';
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'heading':
        case 'paragraph':
        case 'quote':
        case 'callout':
          return b.text;
        case 'list':
          return b.items.join('. ');
        case 'download':
          return b.name;
        case 'timeline':
          return b.items.map((i) => `${fmtDate(i.date)} ${i.title}`).join('. ');
        default:
          return '';
      }
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}
