import 'server-only';

import { requireSupabase } from '@/lib/db/client';
import { getDb } from '@/lib/db/store';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { mergeValuesFor, renderTemplate } from '@/lib/mergeFields';
import {
  itemLines,
  reminderFor,
  reminderKey,
  summarise,
  type Due,
} from '@/lib/reminderRules';
import { fmtDate, formsNeedingReminder, resolveTasks } from '@/lib/resolvers';
import type { Db, Participation, PartnerUser } from '@/lib/types';

/* ============================================================
   Chasing deadlines

   The two reminder templates in Event settings described emails
   nothing sent. This sends them.

   It is the first thing in the portal that runs when nobody is
   looking, which changes what "careful" means. Four properties
   matter more than anything else here:

     * **One email per partner, per run.** Not one per deadline. A
       partner with eight things outstanding gets one message
       listing eight things — because eight separate emails at 08:00
       is how somebody learns to filter you, taking the reminders
       that do matter with them.

     * **It cannot chase twice.** Every item claims a row in
       `reminder_claims` before anything is sent, and the primary key
       means the second claim loses. A retry, an overlapping run, or
       somebody pressing the button by hand claims nothing and sends
       nothing.

       The claim is deliberately not the email row: one message
       covers many items, so the two cannot be the same record.

     * **A failed send is tried again tomorrow.** If the message does
       not go out, its claims are released. Otherwise one bad
       afternoon at the mail provider would mark a fortnight of
       deadlines as chased and nobody would ever hear about them.

     * **It never throws.** One partner with a broken record must not
       stop the other forty being chased, so each is wrapped and
       counted.
   ============================================================ */

export interface ReminderRun {
  /** Deadlines examined. */
  scanned: number;
  /** Items chased — not messages sent; see `emails`. */
  chased: number;
  /** Messages actually sent, one per partner. */
  emails: number;
  /** Already chased, so nothing was claimed. Expected, not a fault. */
  duplicate: number;
  failed: number;
  /** Nobody to send to, or the template is switched off. */
  skipped: number;
  /** Human-readable, for the organiser pressing "run now". */
  notes: string[];
}

const EMPTY: ReminderRun = {
  scanned: 0,
  chased: 0,
  emails: 0,
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
      'A reminder of what is coming up for [partner] at [event]:',
      '',
      '[items]',
      '',
      'You can complete any of these in your Partner Portal: [portal_link]',
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
      'Our records show the following is outstanding for [partner], and some of it is now overdue. Please complete it as soon as you can so we can keep your participation in [event] on track.',
      '',
      '[items]',
      '',
      'You can complete any of these here: [portal_link]',
      '',
      'If any of this is already in hand or you need more time, let us know.',
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
}

/** An item that has been claimed and is going into this run's email. */
interface Claimed extends Item {
  due_: Due;
  key: string;
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
    .map((t) => ({ id: t.id, title: t.title, due: t.dueDate! }));

  const forms = formsNeedingReminder(db, part)
    .filter((f) => f.dueDate)
    .map((f) => ({ id: f.id, title: f.title, due: f.dueDate! }));

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

  const enabled = (kind: 'deadline' | 'overdue') =>
    !templates[kind] || templates[kind]!.enabled;

  const off = (['deadline', 'overdue'] as const).filter((k) => !enabled(k));
  if (off.length) run.notes.push(`Switched off in Event settings: ${off.join(', ')}.`);
  if (off.length === 2) return run;

  for (const part of db.participations) {
    try {
      const lead = db.partnerUsers.find((u) => u.id === part.leadUserId) ?? null;
      const partnerName = db.partners.find((p) => p.id === part.partnerId)?.name ?? '';

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

      // Everything owed today, in one list, before anything is sent.
      const owed: Claimed[] = [];
      for (const item of items) {
        const due = reminderFor(item.due, now);
        if (!due) continue;

        if (!enabled(due.kind)) {
          run.skipped += 1;
          continue;
        }

        owed.push({ ...item, due_: due, key: reminderKey(part.id, item.id, item.due, due) });
      }

      if (!owed.length) continue;

      const claimed = await claimAll(db, part, owed);
      run.duplicate += owed.length - claimed.length;
      if (!claimed.length) continue;

      const sent = await sendDigest(db, part, lead, claimed);

      if (sent) {
        run.chased += claimed.length;
        run.emails += 1;
      } else {
        run.failed += claimed.length;
        // Released, so tomorrow's run tries again rather than
        // treating a mail outage as "already chased".
        await release(claimed);
        run.notes.push(`${partnerName || part.reference}: the reminder could not be sent.`);
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

/* ---------------------------------------------------------------
   Claims
   --------------------------------------------------------------- */

/**
 * Take each item's slot, and report which were actually won.
 *
 * Inserted one at a time on purpose. A single multi-row insert fails
 * as a unit, so one item already chased yesterday would block the
 * five that have not been — the opposite of what is wanted.
 */
async function claimAll(db: Db, part: Participation, owed: Claimed[]): Promise<Claimed[]> {
  const client = requireSupabase();
  const won: Claimed[] = [];

  for (const item of owed) {
    const { error } = await client.from('reminder_claims').insert({
      id: item.key,
      event_id: db.event.id,
      participation_id: part.id,
      item_id: item.id,
      due_date: item.due.slice(0, 10),
      kind: item.due_.kind,
      window_key: item.due_.window,
      claimed_at: new Date().toISOString(),
    });

    if (!error) {
      won.push(item);
      continue;
    }

    // 23505 is the unique violation: somebody got here first, which
    // is a normal outcome and not worth logging as a fault.
    if (error.code !== '23505') {
      console.error(`[reminders] could not claim ${item.key}:`, error.message);
    }
  }

  return won;
}

/** Hand the slots back, so the next run can try again. */
async function release(claimed: Claimed[]): Promise<void> {
  try {
    await requireSupabase()
      .from('reminder_claims')
      .delete()
      .in(
        'id',
        claimed.map((c) => c.key),
      );
  } catch (e) {
    console.error('[reminders] could not release claims after a failed send:', e);
  }
}

/** Note which message the claims went out in, for the audit trail. */
async function attach(claimed: Claimed[], sentEmailId: string): Promise<void> {
  try {
    await requireSupabase()
      .from('reminder_claims')
      .update({ sent_email_id: sentEmailId })
      .in(
        'id',
        claimed.map((c) => c.key),
      );
  } catch {
    // Cosmetic. The claim itself is what stops a second chase.
  }
}

/* ---------------------------------------------------------------
   The message
   --------------------------------------------------------------- */

async function sendDigest(
  db: Db,
  part: Participation,
  lead: PartnerUser,
  claimed: Claimed[],
): Promise<boolean> {
  const digest = summarise(
    claimed.map((c) => ({ title: c.title, due: c.due, reminder: c.due_ })),
  );
  if (!digest) return true;

  const templateId = TEMPLATE_FOR[digest.kind];
  const template = db.emailTemplates.find((t) => t.id === templateId);
  const list = itemLines(digest.ordered, fmtDate);

  const { subject, text } = renderTemplate(
    template,
    mergeValuesFor(db, {
      partner: db.partners.find((p) => p.id === part.partnerId) ?? null,
      user: lead,
      // The most urgent item, so a subject line written for one thing
      // still reads correctly when the body covers six.
      task: digest.worst.title,
      due: digest.worst.due,
      items: list,
      portalLink: `${siteUrl()}/portal/${part.partnerId}`,
    }),
    FALLBACK[digest.kind],
  );

  /*
   * A template written before this existed has no [items] token, and
   * a reminder that does not say what is outstanding is no use. So
   * the list is appended when the rendered body does not carry it.
   */
  const body = text.includes(list) ? text : `${text}\n\n${list}`;

  const result = await sendEmail({
    to: lead.email,
    toName: lead.name,
    subject,
    text: body,
    templateId,
    partnerId: part.partnerId,
  });

  if (!result.ok) {
    console.error(`[reminders] ${lead.email}: ${result.error}`);
    return false;
  }

  if (result.sentEmailId) await attach(claimed, result.sentEmailId);
  return true;
}
