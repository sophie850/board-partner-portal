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
 * Whole days from now until a date, by the calendar.
 *
 * Both sides are flattened to UTC midnight, so the answer does not
 * depend on what time of day the job happened to run — otherwise a
 * run at 23:00 and one at 01:00 could disagree about whether
 * something is due tomorrow.
 */
export function daysUntil(dueIso: string, now: Date = new Date()): number {
  const due = Date.parse(`${dueIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(due)) return NaN;

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((due - today) / 86_400_000);
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
