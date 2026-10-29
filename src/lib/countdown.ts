import { daysUntil } from '@/lib/resolvers';
import type { BoardEvent } from '@/lib/types';

/* ============================================================
   How long until the show

   Its own module, free of JSX, because the interesting part is not
   the markup — it is the four states, three of which only happen
   once and all of which happen in the week somebody is least able
   to deal with a surprise.

   Counting down is easy. Counting past zero is where this goes
   wrong: "-2 days until BOARD 2027" on the morning of the second
   day of the show is the kind of thing nobody sees in October.
   ============================================================ */

export interface Countdown {
  /** The number, or a short phrase when a number would be wrong. */
  big: string;
  /** The label beside it. May contain a newline. */
  small: string;
}

/**
 * The countdown for one event, at one moment.
 *
 * Null when the event has no usable dates, so the hero can leave
 * the badge off entirely rather than show something meaningless.
 *
 * Dates are compared at UTC midnight, the same arithmetic every
 * deadline in the portal uses — so "144 days until BOARD" and "due
 * in 101 days" three rows below cannot disagree by one.
 */
export function countdown(event: BoardEvent, now: Date = new Date()): Countdown | null {
  const toStart = daysUntil(event.startDate, now);
  const toEnd = daysUntil(event.endDate, now);

  if (Number.isNaN(toStart) || Number.isNaN(toEnd)) return null;

  // Past the final day. Partners still come back afterwards for
  // their orders, so this has to read as something other than a
  // broken counter.
  if (toEnd < 0) return { big: 'That’s a wrap', small: `${event.shortName} has finished` };

  // Between the first and last day inclusive, which is where a
  // naive counter starts printing negative numbers.
  if (toStart <= 0) return { big: 'Happening now', small: event.shortName };

  if (toStart === 1) return { big: '1', small: `day until\n${event.shortName}` };

  return { big: String(toStart), small: `days until\n${event.shortName}` };
}
