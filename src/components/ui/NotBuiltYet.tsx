import { Hammer } from 'lucide-react';

import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';

/**
 * An honest placeholder for a screen that is specified and scheduled
 * but not built. Better than a blank route or a dead nav item: it
 * says what will be here and what to do meanwhile.
 */
export function NotBuiltYet({
  title,
  summary,
  meanwhile,
}: {
  title: string;
  summary: string;
  meanwhile?: string;
}) {
  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>{title}</PageTitle>

      <div className="mt-6 flex max-w-[62ch] gap-4 rounded-xl border border-dashed border-line-3 bg-panel px-[22px] py-5">
        <span className="mt-[2px] shrink-0 text-ink-4">
          <Hammer size={18} />
        </span>
        <div>
          <div className="text-[14px] text-ink">Not built yet</div>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-3">{summary}</p>
          {meanwhile && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-4">{meanwhile}</p>
          )}
        </div>
      </div>
    </Rise>
  );
}
