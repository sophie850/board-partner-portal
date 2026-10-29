import { countdown } from '@/lib/countdown';
import { fmtDate } from '@/lib/resolvers';
import type { BoardEvent } from '@/lib/types';

/* ============================================================
   The partner dashboard's hero

   The first thing a partner sees when they sign in: where they are
   going, and how long they have got.

   The countdown is the point of it. A list of deadlines tells
   somebody what is owed; the number of days to the show is what
   makes those deadlines mean something, and it is the one fact a
   partner never has to hand.

   Server-rendered. The page is force-dynamic, so the number is
   computed per request against the same UTC-midnight arithmetic the
   deadline resolvers use — no clock drifting in a browser tab left
   open overnight, and no mismatch between "146 days until BOARD"
   here and "due in 101 days" three rows below.
   ============================================================ */

export function PartnerHero({
  eyebrow,
  partnerName,
  event,
  now = new Date(),
}: {
  eyebrow: string;
  partnerName: string;
  event: BoardEvent;
  /** Injectable so the whole thing can be reasoned about at a fixed date. */
  now?: Date;
}) {
  const count = countdown(event, now);

  return (
    <div className="relative mb-7 overflow-hidden rounded-xl">
      {/*
       * A plain img, not next/image. The file is a fixed local asset
       * of known size that never changes per request, so the
       * optimiser would add a round trip and a function invocation
       * to serve bytes we could have served directly.
       */}
      <img
        src="/assets/hero-grimaldi-forum.webp"
        alt=""
        aria-hidden
        className="h-[280px] w-full object-cover max-md:h-[200px]"
      />

      {/* ---- who they are, top left ---- */}
      <div className="absolute top-0 left-0 max-w-[min(620px,78%)] rounded-br-xl bg-hero-scrim px-[28px] py-[22px] backdrop-blur-[2px] max-md:max-w-full max-md:px-[18px] max-md:py-4">
        <div className="mb-[10px] text-[11px] tracking-[0.16em] text-on-brand/70 uppercase">
          {eyebrow}
        </div>
        <h1 className="text-[34px] leading-[1.1] font-light text-on-brand max-md:text-[24px]">
          {partnerName}
        </h1>
        <p className="mt-[10px] text-[13px] text-on-brand/80 max-md:text-[12px]">
          {event.name} · {event.venue}, {event.city} · {fmtDate(event.startDate)} –{' '}
          {fmtDate(event.endDate)}
        </p>
      </div>

      {/* ---- how long they have, bottom right ---- */}
      {count && (
        <div className="absolute right-0 bottom-0 flex items-center gap-3 rounded-tl-xl bg-hero-scrim px-[24px] py-[14px] backdrop-blur-[2px] max-md:px-4 max-md:py-3">
          <span className="text-[40px] leading-none font-light text-on-brand max-md:text-[28px]">
            {count.big}
          </span>
          <span className="text-[12.5px] leading-[1.25] whitespace-pre-line text-on-brand/80 max-md:text-[11px]">
            {count.small}
          </span>
        </div>
      )}
    </div>
  );
}
