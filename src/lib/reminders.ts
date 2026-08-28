import 'server-only';

import { getDb } from '@/lib/db/store';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { mergeValuesFor, renderTemplate } from '@/lib/mergeFields';
import { reminderFor, reminderKey, type Due } from '@/lib/reminderRules';
import { formsNeedingReminder, resolveTasks } from '@/lib/resolvers';
import type { Db, Participation, PartnerUser } from '@/lib/types';

/* ============================================================
   Chasing deadlines

   The two reminder templates in Event settings described emails
   nothing sent. This sends them.

   It is the first thing in the portal that runs when nobody is
   looking, which changes what "careful" means. Three properties
   matter more than anything else here:

     * **It cannot chase twice.** Every send claims a slot in the
       database first, keyed to the partner, the item and the
       deadline. A second run — a retry, an overlap, somebody
       pressing the button by hand — loses the claim and sends
       nothing. See sendEmail's dedupeKey.

     * **It never throws.** One partner with a broken record must not
       stop the other forty being chased, so each is wrapped and
       counted.

     * **It is honest about what it did.** The run returns counts,
       and every message lands in the outbox where an organiser can
       see it. A chasing system nobody can audit is one nobody
       trusts.
   ============================================================ */

export interface ReminderRun {
  /** Deadlines examined. */
  scanned: number;
  sent: number;
  /** Already sent — the dedupe claim was lost. Expected, not a fault. */
  duplicate: number;
  failed: number;
  /** Nobody to send to, or the template is switched off. */
  skipped: number;
  /** Human-readable, for the organiser pressing "run now". */
  notes: string[];
}

const EMPTY: ReminderRun = {
  scanned: 0,
  sent: 0,
  duplicate: 0,
  failed: 0,
  skipped: 0,
  notes: [],
};

const TEMPLATE_FOR = {
  deadline: 'et_deadline',
  overdue: 'et_overdue',
} as const;

const FALLBACK = {
  deadline: {
    subject: 'Reminder: [task] is due [due]',
    body: [
      'Hi [first_name],',
      '',
      'A quick reminder that “[task]” is due [due] for [partner] at [event].',
      '',
      'You can complete it any time in your Partner Portal: [portal_link]',
      '',
      'If you have any questions, just reply to this email.',
      '',
      '[signature]',
    ].join('\n'),
  },
  overdue: {
    subject: 'Overdue: [task] was due [due]',
    body: [
      'Hi [first_name],',
      '',
      'Our records show that “[task]” for [partner] was due [due] and is now overdue. Please complete it as soon as possible so we can keep your participation in [event] on track.',
      '',
      'Complete it here: [portal_link]',
      '',
      'If this is already in hand or you need more time, let us know.',
      '',
      '[signature]',
    ].join('\n'),
  },
};

/** Where a link in an email should point. */
function siteUrl(): string {
  const configured = env('SITE_URL') ?? env('URL');
  return configured ? configured.replace(/\/$/, '') : '';
}

/**
 * Whether we are willing to chase this person.
 *
 * Never before they have been invited. Being chased about a deadline
 * in a portal you have never been told about is the worst possible
 * first contact, and it happens exactly when an event is busiest.
 */
function reachable(user: PartnerUser | null | undefined): user is PartnerUser {
  return Boolean(user?.email && user.invitedAt);
}

/** One outstanding thing with a date on it. */
interface Item {
  id: string;
  title: string;
  due: string;
  /** Where the partner goes to deal with it. */
  path: string;
}

/**
 * What this partner still owes, with deadlines.
 *
 * Tasks are the canonical list, and `formsNeedingReminder` drops any
 * form an outstanding task already stands for — the same
 * de-duplication the portal itself uses, so a partner is never
 * chased twice for one piece of work under two names.
 */
function outstanding(db: Db, part: Participation): Item[] {
  const tasks = resolveTasks(db, part)
    .filter((t) => !t.completed && t.dueDate)
    .map((t) => ({
      id: t.id,
      title: t.title,
      due: t.dueDate!,
      path: `/portal/${part.partnerId}/tasks`,
    }));

  const forms = formsNeedingReminder(db, part)
    .filter((f) => f.dueDate)
    .map((f) => ({
      id: f.id,
      title: f.title,
      due: f.dueDate!,
      path: `/portal/${part.partnerId}/forms/${f.id}`,
    }));

  return [...tasks, ...forms];
}

/**
 * Run one pass.
 *
 * `now` is injectable so a run can be reasoned about — and tested —
 * against a fixed clock rather than whatever today happens to be.
 */
export async function runReminders(now: Date = new Date()): Promise<ReminderRun> {
  const run: ReminderRun = { ...EMPTY, notes: [] };

  let db: Db;
  try {
    db = await getDb();
  } catch (e) {
    run.notes.push(
      `Could not read the database: ${e instanceof Error ? e.message : 'unknown error'}`,
    );
    return run;
  }

  const templates = {
    deadline: db.emailTemplates.find((t) => t.id === TEMPLATE_FOR.deadline),
    overdue: db.emailTemplates.find((t) => t.id === TEMPLATE_FOR.overdue),
  };

  const off = (['deadline', 'overdue'] as const).filter(
    (k) => templates[k] && !templates[k]!.enabled,
  );
  if (off.length) {
    run.notes.push(`Switched off in Event settings: ${off.join(', ')}.`);
  }
  if (off.length === 2) return run;

  for (const part of db.participations) {
    try {
      const lead = db.partnerUsers.find((u) => u.id === part.leadUserId) ?? null;
      const partner = db.partners.find((p) => p.id === part.partnerId) ?? null;

      const items = outstanding(db, part);
      run.scanned += items.length;

      if (!items.length) continue;

      /*
       * The Lead only. Everyone on a partner's team can see the
       * deadlines in the portal; deciding who internally chases whom
       * is the Lead's job, not ours, and copying four people on every
       * reminder is how a partner learns to ignore all of them.
       */
      if (!reachable(lead)) {
        run.skipped += items.length;
        continue;
      }

      for (const item of items) {
        const due = reminderFor(item.due, now);
        if (!due) continue;

        if (templates[due.kind] && !templates[due.kind]!.enabled) {
          run.skipped += 1;
          continue;
        }

        const result = await sendOne(db, part, lead, partner?.name ?? '', item, due);
        run[result] += 1;
      }
    } catch (e) {
      run.failed += 1;
      run.notes.push(
        `${part.reference}: ${e instanceof Error ? e.message : 'could not be processed'}`,
      );
    }
  }

  return run;
}

async function sendOne(
  db: Db,
  part: Participation,
  lead: PartnerUser,
  partnerName: string,
  item: Item,
  due: Due,
): Promise<'sent' | 'duplicate' | 'failed'> {
  const templateId = TEMPLATE_FOR[due.kind];
  const template = db.emailTemplates.find((t) => t.id === templateId);

  const { subject, text } = renderTemplate(
    template,
    mergeValuesFor(db, {
      partner: db.partners.find((p) => p.id === part.partnerId) ?? null,
      user: lead,
      task: item.title,
      due: item.due,
      portalLink: `${siteUrl()}${item.path}`,
    }),
    FALLBACK[due.kind],
  );

  const result = await sendEmail({
    to: lead.email,
    toName: lead.name,
    subject,
    text,
    templateId,
    partnerId: part.partnerId,
    dedupeKey: reminderKey(part.id, item.id, item.due, due),
  });

  if (result.ok) return 'sent';
  if (result.reason === 'duplicate') return 'duplicate';

  console.error(`[reminders] ${partnerName} — ${item.title}: ${result.error}`);
  return 'failed';
}
