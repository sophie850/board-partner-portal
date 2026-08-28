/* ============================================================
   When to chase

   Kept apart from the sending so it can be tested against a fixed
   clock rather than by waiting a fortnight and reading an inbox.

   Two decisions are baked in here and worth stating plainly:

   **Windows, not exact days.** A reminder is owed for a *range* —
   "somewhere between four and fourteen days out" — rather than on
   day 14 precisely. A daily job that misses a run, a deadline set
   for next Tuesday by an organiser on Monday, a partner added late:
   all of those skip an exact-day check silently, and the partner is
   never chased at all. A range cannot be missed, and the dedupe key
   is what stops it firing every day within the range.

   **Chasing stops.** An overdue item is chased once a week for four
   weeks and then not again. Something a month late needs a phone
   call, not a fifth email, and a system that nags forever is one
   people filter to junk — taking the reminders that do matter with
   it.
   ============================================================ */

/** Beyond this, it is too early to be useful. */
const EARLY_DAYS = 14;

/** Inside this, it is the last call rather than a heads-up. */
const FINAL_DAYS = 3;

/** Weekly chases after a deadline passes, counting the first. */
const OVERDUE_CHASES = 4;

import { daysUntil } from '@/lib/resolvers';

// Re-exported so callers that think in reminders need one import.
export { daysUntil };

export type ReminderKind = 'deadline' | 'overdue';

export interface Due {
  kind: ReminderKind;
  /**
   * Which reminder this is, and part of the dedupe key — so the
   * two-week heads-up and the final call are separate sends, and
   * each fires once.
   */
  window: string;
  /** Whole days until the deadline; negative once it has passed. */
  days: number;
}

/**
 * Which reminder, if any, is owed for a deadline right now.
 *
 * Null means nothing is owed: too far off, or chased enough.
 */
export function reminderFor(dueIso: string | null | undefined, now: Date = new Date()): Due | null {
  if (!dueIso) return null;

  const days = daysUntil(dueIso, now);
  if (Number.isNaN(days)) return null;

  if (days > EARLY_DAYS) return null;

  if (days > FINAL_DAYS) return { kind: 'deadline', window: 'two_weeks', days };
  if (days >= 0) return { kind: 'deadline', window: 'final', days };

  // Overdue. Week 0 is the first week past the deadline.
  const week = Math.floor(-days / 7);
  if (week >= OVERDUE_CHASES) return null;

  return { kind: 'overdue', window: `week_${week}`, days };
}

/** One item going into a partner's digest. */
export interface DigestItem {
  title: string;
  /** The deadline, as stored. */
  due: string;
  reminder: Due;
}

export interface Digest {
  /**
   * The framing for the whole message. Anything overdue makes it an
   * overdue one: a partner late on one thing and early on another
   * should hear the more urgent of the two, and it is one email, so
   * it can only have one.
   */
  kind: ReminderKind;
  /** The most urgent item, which names the subject line. */
  worst: DigestItem;
  /** Most urgent first — the order somebody would say them aloud. */
  ordered: DigestItem[];
}

/**
 * Turn everything owed into one message's worth of decisions.
 *
 * Pure, because "which template does a mixed batch use" and "which
 * item names the subject" are exactly the questions that are easy to
 * get subtly wrong and impossible to notice in a sent email.
 */
export function summarise(items: DigestItem[]): Digest | null {
  if (!items.length) return null;

  const ordered = [...items].sort((a, b) => a.reminder.days - b.reminder.days);

  return {
    kind: ordered.some((i) => i.reminder.kind === 'overdue') ? 'overdue' : 'deadline',
    worst: ordered[0],
    ordered,
  };
}

/**
 * The list a partner reads.
 *
 * Each line carries its own date: one message covering six things is
 * only useful if it says which is which.
 */
export function itemLines(ordered: DigestItem[], fmt: (iso: string) => string): string {
  return ordered
    .map((i) =>
      i.reminder.kind === 'overdue'
        ? `• ${i.title} — was due ${fmt(i.due)}`
        : `• ${i.title} — due ${fmt(i.due)}`,
    )
    .join('\n');
}

/**
 * The key that makes a reminder happen once.
 *
 * The deadline is part of it on purpose: an organiser who moves a
 * date has changed the thing being chased, and the partner should
 * hear about the new one.
 */
export function reminderKey(
  participationId: string,
  itemId: string,
  dueIso: string,
  due: Due,
): string {
  return [due.kind, participationId, itemId, dueIso.slice(0, 10), due.window].join(':');
}
