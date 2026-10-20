import { fmtDate, resolveForms, resolveTasks, visibleFields } from '@/lib/resolvers';
import type { Db, FormSubmission, Participation, TaskState } from '@/lib/types';

/* ============================================================
   The portal, as a spreadsheet

   A copy of everything a partner has given us, outside the portal
   and outside Supabase, so that losing either does not lose the
   answers people spent a fortnight collecting.

   **A snapshot, not a feed.** Every run sends the whole picture and
   the sheet is replaced. The alternative — posting each submission
   as it happens — sounds more responsive and is worse for the job
   this is doing: one failed POST goes missing permanently and
   nobody finds out until they need it, whereas a snapshot that
   fails today is simply correct again tomorrow. It also keeps up
   with edits, reviews and withdrawals, which an append-only log of
   submissions never does.

   **Long, not wide.** Answers go one per row — partner, form,
   question, answer — rather than a column per question. Forms gain
   and lose fields constantly, and a wide sheet either breaks or
   silently shifts everybody's data one column left the day somebody
   reorders a question. Long format survives all of it, and a pivot
   table turns it back into a grid when a human wants one.

   Pure, and free of `server-only`, so the whole shape can be tested
   against fixtures rather than by reading a spreadsheet.
   ============================================================ */

export interface Tab {
  /** The sheet name. Replaced wholesale on each run. */
  name: string;
  header: string[];
  rows: Array<Array<string | number>>;
}

/** Anything, as something a spreadsheet cell can hold. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(cell).filter(Boolean).join(', ');

  if (typeof value === 'object') {
    const c = value as Record<string, unknown>;
    // The contact field type, and uploaded files, are the two
    // objects an answer can be. Both have an obvious reading.
    const parts = [c.name, c.email, c.phone, c.url].filter(Boolean).map(String);
    return parts.length ? parts.join(' · ') : JSON.stringify(value);
  }

  return String(value);
}

/** A date, readable, and empty rather than "Invalid Date". */
function when(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : fmtDate(iso);
}

/** Who a participation belongs to, for the leading columns of every tab. */
function who(db: Db, part: Participation): [string, string] {
  const partner = db.partners.find((p) => p.id === part.partnerId);
  return [partner?.name ?? part.partnerId, part.reference];
}

/* ---------------------------------------------------------------
   The tabs
   --------------------------------------------------------------- */

function partnersTab(db: Db): Tab {
  const rows = db.participations.map((part) => {
    const [name, reference] = who(db, part);
    const partner = db.partners.find((p) => p.id === part.partnerId);
    const lead = db.partnerUsers.find((u) => u.id === part.leadUserId);

    return [
      name,
      reference,
      partner?.sector ?? '',
      partner?.country ?? '',
      part.standRef ?? '',
      cell(part.addedEntitlements),
      lead?.name ?? '',
      lead?.email ?? '',
      when(lead?.invitedAt),
      when(lead?.acceptedAt),
      part.passAllocation,
      part.suspended ? 'Suspended' : 'Active',
    ];
  });

  return {
    name: 'Partners',
    header: [
      'Partner',
      'Reference',
      'Sector',
      'Country',
      'Stand',
      'Entitlements',
      'Lead',
      'Lead email',
      'Invited',
      'First signed in',
      'Passes',
      'Status',
    ],
    rows,
  };
}

/**
 * Every answer a partner has given, one per row.
 *
 * Only the fields that partner can actually see: a question hidden
 * from them has no answer, and an empty cell against it would read
 * as something they failed to fill in.
 */
function answersTab(db: Db): Tab {
  const rows: Array<Array<string | number>> = [];

  for (const part of db.participations) {
    const [name, reference] = who(db, part);

    for (const form of resolveForms(db, part)) {
      const state: FormSubmission = form.state ?? { status: 'not_started' };

      for (const field of visibleFields(db, form, part, state.values)) {
        if (field.type === 'section_heading' || field.type === 'guidance') continue;

        rows.push([
          name,
          reference,
          form.title,
          field.label,
          cell(state.values?.[field.key]),
          state.status,
          when(state.submittedAt),
          state.submittedBy ?? '',
          when(state.reviewedAt),
          state.feedback ?? '',
        ]);
      }
    }
  }

  return {
    name: 'Form answers',
    header: [
      'Partner',
      'Reference',
      'Form',
      'Question',
      'Answer',
      'Status',
      'Submitted',
      'Submitted by',
      'Reviewed',
      'Feedback',
    ],
    rows,
  };
}

function tasksTab(db: Db): Tab {
  const rows: Array<Array<string | number>> = [];

  for (const part of db.participations) {
    const [name, reference] = who(db, part);

    for (const task of resolveTasks(db, part)) {
      const state: TaskState = part.taskState?.[task.id] ?? {};

      rows.push([
        name,
        reference,
        task.title,
        task.category,
        task.required ? 'Required' : 'Optional',
        task.dueDate ? when(task.dueDate) : 'No date',
        state.declined ? 'Not needed' : task.completed ? 'Done' : 'Outstanding',
        when(state.completedAt ?? state.declinedAt),
        state.completedBy ?? '',
        state.partnerNotes ?? '',
      ]);
    }
  }

  return {
    name: 'Tasks',
    header: [
      'Partner',
      'Reference',
      'Task',
      'Category',
      'Required',
      'Due',
      'State',
      'Resolved',
      'By',
      'Partner notes',
    ],
    rows,
  };
}

function ordersTab(db: Db): Tab {
  const rows: Array<Array<string | number>> = [];

  for (const order of db.orders) {
    const part = db.participations.find((p) => p.id === order.participationId);
    const [name, reference] = part ? who(db, part) : ['', ''];

    for (const item of order.items ?? []) {
      const supplier = db.suppliers.find((s) => s.id === item.supplierId);

      rows.push([
        name,
        reference,
        order.reference,
        order.status,
        when(order.submittedAt),
        // The name as ordered, not as the catalogue reads today —
        // a product renamed or withdrawn afterwards must not rewrite
        // what somebody actually bought.
        item.name,
        supplier?.name ?? '',
        item.qty,
        // Null means the price came from a quote, so it is said
        // rather than shown as free.
        item.unitPrice === null ? 'On quotation' : item.unitPrice,
        item.unitPrice === null ? '' : item.qty * item.unitPrice,
        db.event.currency,
        order.invoiceStatus ?? '',
      ]);
    }
  }

  return {
    name: 'Orders',
    header: [
      'Partner',
      'Reference',
      'Order',
      'Status',
      'Placed',
      'Product',
      'Supplier',
      'Quantity',
      'Unit price',
      'Line total',
      'Currency',
      'Invoice',
    ],
    rows,
  };
}

function requestsTab(db: Db): Tab {
  const rows: Array<Array<string | number>> = [];

  for (const request of db.requests) {
    const part = db.participations.find((p) => p.id === request.participationId);
    const [name, reference] = part ? who(db, part) : ['', ''];
    const type = db.requestTypes.find((t) => t.id === request.typeId);

    rows.push([
      name,
      reference,
      request.reference,
      type?.name ?? request.typeId,
      request.status,
      when(request.submittedAt),
      request.submittedBy,
      request.owner,
      when(request.responseAt),
      // The answers, flattened — a request type's fields are
      // arbitrary and there is one row per request, so they go in a
      // single readable column rather than inventing columns.
      Object.entries(request.values ?? {})
        .map(([k, v]) => `${k}: ${cell(v)}`)
        .join(' | '),
      String((request.comments ?? []).length),
    ]);
  }

  return {
    name: 'Requests',
    header: [
      'Partner',
      'Reference',
      'Request',
      'Type',
      'Status',
      'Raised',
      'By',
      'Owner',
      'Answered',
      'Details',
      'Comments',
    ],
    rows,
  };
}

function filesTab(db: Db): Tab {
  const rows: Array<Array<string | number>> = [];

  for (const part of db.participations) {
    const [name, reference] = who(db, part);

    for (const requested of part.requestedFiles ?? []) {
      rows.push([
        name,
        reference,
        requested.label,
        requested.required ? 'Required' : 'Optional',
        requested.due ? when(requested.due) : 'No date',
        requested.file ? 'Uploaded' : 'Outstanding',
        requested.file?.name ?? '',
        when(requested.file?.uploadedAt),
        requested.file?.by ?? '',
        // The URL, so a copy of the sheet is a way back to the file
        // itself rather than only a record that one exists.
        requested.file?.url ?? '',
      ]);
    }
  }

  return {
    name: 'Files',
    header: [
      'Partner',
      'Reference',
      'Asked for',
      'Required',
      'Due',
      'State',
      'File',
      'Uploaded',
      'By',
      'Link',
    ],
    rows,
  };
}

function teamTab(db: Db): Tab {
  const rows = db.partnerUsers.map((user) => {
    const partner = db.partners.find((p) => p.id === user.partnerId);
    const part = db.participations.find((p) => p.partnerId === user.partnerId);

    return [
      partner?.name ?? user.partnerId,
      part?.reference ?? '',
      user.name,
      user.email,
      user.telephone ?? '',
      user.role,
      part?.leadUserId === user.id ? 'Lead' : '',
      when(user.invitedAt),
      when(user.acceptedAt),
    ];
  });

  return {
    name: 'Team',
    header: [
      'Partner',
      'Reference',
      'Name',
      'Email',
      'Telephone',
      'Role',
      'Lead',
      'Invited',
      'First signed in',
    ],
    rows,
  };
}

/* ---------------------------------------------------------------
   The workbook
   --------------------------------------------------------------- */

/**
 * Everything, ready to be written to a spreadsheet.
 *
 * Order matters only for where the tabs sit along the bottom, and
 * Partners goes first because it is the one somebody opens.
 */
export function buildWorkbook(db: Db, now: Date = new Date()): Tab[] {
  return [
    partnersTab(db),
    answersTab(db),
    tasksTab(db),
    ordersTab(db),
    requestsTab(db),
    filesTab(db),
    teamTab(db),
    {
      name: 'About',
      header: ['Field', 'Value'],
      rows: [
        ['Event', db.event.name],
        ['Venue', `${db.event.venue}, ${db.event.city}`],
        ['Exported', now.toISOString()],
        [
          'Source',
          'BOARD Partner Portal. This sheet is replaced on every export — edits made here are overwritten.',
        ],
      ],
    },
  ];
}
