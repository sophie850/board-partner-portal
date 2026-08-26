import { entitlementSet } from '@/lib/resolvers';
import type { BoardEvent, Db, Participation, Partner } from '@/lib/types';

/* ============================================================
   Suggested marketing copy

   Derived from what the partner actually bought, so an exhibitor
   gets "Come and find us at Stand A12" and a speaker gets "Catch
   our session on the programme". Every line is editable afterwards
   — this is a starting point, not a template they must accept.

   Pure and server-safe, so the page can render the suggestion and
   "Reset to suggested" can produce exactly the same text.
   ============================================================ */

export const PROMOTE_TAGLINE = 'Take your seat at the table';
export const PROMOTE_URL = 'boardsummits.com';

export interface PromoteCopy {
  eyebrow: string;
  headline: string;
  sub: string;
  detail: string;
  caption: string;
}

/** "22–24 March 2027", collapsing the month when both dates share one. */
export function eventDateRange(event: BoardEvent): string {
  try {
    const start = new Date(`${event.startDate}T00:00:00Z`);
    const end = new Date(`${event.endDate}T00:00:00Z`);
    const month = (d: Date) =>
      d.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });
    const year = end.getUTCFullYear();

    if (month(start) === month(end)) {
      return `${start.getUTCDate()}–${end.getUTCDate()} ${month(end)} ${year}`;
    }
    return `${start.getUTCDate()} ${month(start)} – ${end.getUTCDate()} ${month(end)} ${year}`;
  } catch {
    return '';
  }
}

/** Venue, city and dates — the line that appears on every format. */
export function dateline(event: BoardEvent): string {
  return `${event.venue}, ${event.city} · ${eventDateRange(event)}`;
}

/**
 * The role a partner is promoting, in the order that matters.
 *
 * A partner may hold several of these. Speaking outranks exhibiting
 * because it is the more newsworthy thing to announce; a stand is
 * still mentioned in the caption either way.
 */
function role(db: Db, part: Participation, event: BoardEvent) {
  const set = entitlementSet(db, part);
  const has = (k: string) => set.has(k);

  const forum =
    'the invitation-only forum where Europe’s boardroom leaders, founders and investors meet';

  if (has('has_content_session')) {
    return {
      eyebrow: 'On the programme',
      sub: `Speaking at BOARD — ${forum}.`,
      line: 'Catch our session on the programme.',
    };
  }

  if (has('has_exhibition_space') && part.standRef) {
    return {
      eyebrow: 'Exhibition partner',
      sub: `Exhibiting at BOARD — ${forum}.`,
      line: `Come and find us at Stand ${part.standRef}.`,
    };
  }

  if (has('has_meetings_package')) {
    return {
      eyebrow: 'Meetings partner',
      sub: `Joining the meetings programme at BOARD — Europe’s invitation-only forum for boardroom leaders, founders and investors.`,
      line: `Let’s arrange time to meet in ${event.city}.`,
    };
  }

  if (has('has_hospitality_activation')) {
    return {
      eyebrow: 'Hospitality host',
      sub: `Hosting at BOARD — ${forum}.`,
      line: 'Join us for hospitality on site.',
    };
  }

  return {
    eyebrow: 'Official partner',
    sub: `A proud partner of BOARD — ${forum}.`,
    line: 'Come and connect with our team on site.',
  };
}

export function suggestedCopy(
  db: Db,
  part: Participation,
  partner: Partner,
): PromoteCopy {
  const event = db.event;
  const range = eventDateRange(event);
  const { eyebrow, sub, line } = role(db, part, event);

  const caption = [
    `${partner.name} is heading to ${event.city}.`,
    `We’re joining ${event.name} — the invitation-only forum where Europe’s boardroom leaders, founders and investors meet — at the ${event.venue}, ${range}.`,
    line,
    `Find out more at ${PROMOTE_URL}`,
    `#${event.shortName.replace(/\s+/g, '')} #${event.city.replace(/\s+/g, '')} #BoardroomLeadership`,
  ].join('\n\n');

  return {
    eyebrow,
    // The organisation's own name is the headline. Anything cleverer
    // would be a slogan they did not write.
    headline: partner.name,
    sub,
    detail: dateline(event),
    caption,
  };
}

/* ---------------------------------------------------------------
   Formats
   --------------------------------------------------------------- */

export interface PromoteFormat {
  key: string;
  label: string;
  width: number;
  height: number;
}

export const PROMOTE_FORMATS: PromoteFormat[] = [
  { key: 'square', label: 'Social post', width: 1080, height: 1080 },
  { key: 'banner', label: 'LinkedIn banner', width: 1584, height: 396 },
  { key: 'story', label: 'Story', width: 1080, height: 1920 },
  { key: 'badge', label: 'Email badge', width: 1200, height: 400 },
];

/** The nine BOARD fluted gradients, plus solid black. */
export const PROMOTE_BACKGROUNDS = [
  '/assets/board-bg-1.png',
  '/assets/board-bg-2.png',
  '/assets/board-bg-3.png',
  '/assets/board-bg-4.png',
  '/assets/board-bg-5.png',
  '/assets/board-bg-6.png',
  '/assets/board-bg-7.png',
  '/assets/board-bg-8.png',
  '/assets/board-bg-9.png',
];
