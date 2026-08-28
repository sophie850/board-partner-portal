/* ============================================================
   BOARD Partner Portal — the personalisation engine

   These are the rules that decide what each partner sees. In the
   prototype they ran in the browser; here they are pure functions so
   the same logic can run on the server, where it is enforceable.

   IMPORTANT: client-side use of these is presentation only. Every
   visibility rule below is also an authorisation requirement — a
   partner must not be able to read another partner's data by any
   means, which is enforced in the data layer and (once auth lands)
   by row-level security in Postgres.
   ============================================================ */

import type {
  Db,
  FieldValue,
  FormDef,
  FormField,
  FormValues,
  Id,
  IsoDate,
  Participation,
  PartnerUser,
  Product,
  ResolvedForm,
  ResolvedTask,
  TaskTemplate,
  Terminology,
  VisibilityRule,
} from './types';

/* ---------------------------------------------------------------
   Entitlements
   --------------------------------------------------------------- */

/**
 * The partner's effective entitlement set.
 *
 * Precedence: partner override → event default. Package templates
 * were removed during design; `packageId` is still honoured so any
 * legacy record resolves, and so templates can return later.
 */
export function entitlementSet(db: Db, part: Participation): Set<string> {
  const pkg = db.packageTemplates.find((p) => p.id === part.packageId);
  const set = new Set<string>(pkg ? pkg.entitlements : []);
  (part.addedEntitlements || []).forEach((k) => set.add(k));
  (part.removedEntitlements || []).forEach((k) => set.delete(k));
  return set;
}

export function hasEnt(db: Db, part: Participation, key: string): boolean {
  return entitlementSet(db, part).has(key);
}

/** Entitlements with provenance, for the organiser's effective-config view. */
export function entitlementsWithSource(
  db: Db,
  part: Participation,
): Array<{ key: string; source: 'override' }> {
  const out: Array<{ key: string; source: 'override' }> = [];
  new Set(part.addedEntitlements || []).forEach((k) => {
    if ((part.removedEntitlements || []).includes(k)) return;
    out.push({ key: k, source: 'override' });
  });
  return out;
}

/**
 * Normalise the entitlement keys a rule carries. Supports the
 * multi-key `{ keys: [] }` shape and the legacy single-key
 * `{ key }` / `{ requires }` shapes.
 */
export function entKeys(rule: VisibilityRule | undefined | null): string[] {
  if (!rule) return [];
  if (Array.isArray(rule.keys)) return rule.keys;
  const k = rule.key || rule.requires;
  return k ? [k] : [];
}

/** ANY-of: the partner needs at least one of the listed keys. */
export function hasAnyEnt(db: Db, part: Participation, keys: string[]): boolean {
  if (!keys || !keys.length) return true;
  return keys.some((k) => hasEnt(db, part, k));
}

/* ---------------------------------------------------------------
   Visibility — one rule shape, used everywhere
   --------------------------------------------------------------- */

/**
 * The shared visibility check, applied identically to shop products,
 * content pages, files, tasks and individual form fields. Gating a
 * form field with this is how two partners receive the same form but
 * see different fields.
 */
export function ruleMatches(
  db: Db,
  rule: VisibilityRule | undefined | null,
  part: Participation,
): boolean {
  if (!rule || rule.type === 'all' || Object.keys(rule).length === 0) return true;
  if (rule.type === 'entitlement' || rule.requires || rule.keys) {
    return hasAnyEnt(db, part, entKeys(rule));
  }
  if (rule.type === 'package') return (rule.packages || []).includes(part.packageId ?? '');
  if (rule.type === 'partner') return (rule.partners || []).includes(part.partnerId);
  if (rule.type === 'except') return !(rule.partners || []).includes(part.partnerId);
  return true;
}

/**
 * The same rule, in plain English.
 *
 * For list rows, where showing the editor would be absurd and
 * "restricted" tells nobody anything useful. Kept beside
 * `ruleMatches` so the sentence and the behaviour cannot drift.
 */
export function visibilityLabel(db: Db, rule: VisibilityRule | undefined | null): string {
  if (!rule || rule.type === 'all' || Object.keys(rule).length === 0) return 'All partners';

  const named = (ids: string[]) =>
    ids.map((id) => db.partners.find((p) => p.id === id)?.name).filter(Boolean) as string[];

  if (rule.type === 'partner') {
    const names = named(rule.partners ?? []);
    return names.length ? `Only ${names.join(', ')}` : 'Specific partners';
  }

  if (rule.type === 'except') {
    const names = named(rule.partners ?? []);
    return names.length ? `Everyone except ${names.join(', ')}` : 'All partners';
  }

  const labels = entKeys(rule).map(
    (k) => db.entitlements.find((e) => e.key === k)?.label ?? k,
  );

  if (!labels.length) return 'All partners';
  // ANY-of semantics: the partner needs at least one of these.
  return labels.join(' or ');
}

export function productVisible(db: Db, product: Product, part: Participation): boolean {
  if (!product.active) return false;
  return ruleMatches(db, product.visibility, part);
}

/**
 * Whether ordering has closed on a product.
 *
 * Inclusive of the day named: "Order by 28 February" means orders
 * are taken through the 28th and stop at the end of it. Comparing
 * against the current instant would close it at midnight on the
 * morning of the deadline — a day early, on the busiest day.
 *
 * A product with no deadline never closes.
 */
export function orderingClosed(product: Product, now: Date = new Date()): boolean {
  if (!product.orderDeadline) return false;
  return daysUntil(product.orderDeadline, now) < 0;
}

/**
 * Whether this partner can actually put it in a basket.
 *
 * Kept apart from `productVisible` on purpose: a closed product is
 * still listed, marked as closed. Removing it would leave a partner
 * who remembers seeing it wondering whether they imagined it, and
 * "ordering closed on 28 February" answers the question the empty
 * space would raise.
 */
export function productOrderable(
  db: Db,
  product: Product,
  part: Participation,
  now: Date = new Date(),
): boolean {
  return productVisible(db, product, part) && !orderingClosed(product, now);
}

/**
 * Whether the shop is still open to this partner.
 *
 * Closed once every product they can see has passed its deadline —
 * a shop with nothing orderable in it is a room with nothing in it,
 * and leaving it in the nav invites somebody to go and look.
 *
 * Per partner, because two partners see different catalogues: an
 * exhibitor's shop can close a fortnight after a sponsor's.
 */
export function shopOpen(db: Db, part: Participation, now: Date = new Date()): boolean {
  return db.products.some((p) => productOrderable(db, p, part, now));
}

/** Partner-specific price beats the catalogue price. */
export function priceFor(part: Participation, product: Product): number | null {
  const o = (part.priceOverrides || []).find((p) => p.productId === product.id);
  return o ? o.price : product.basePrice;
}

/** A field is shown when its visibility rule passes AND its condition holds. */
export function fieldVisible(
  db: Db,
  field: FormField,
  part: Participation,
  values?: FormValues,
): boolean {
  if (field.visibility && !ruleMatches(db, field.visibility, part)) return false;
  if (field.condition) {
    const v = values ? values[field.condition.field] : undefined;
    if (v !== field.condition.equals) return false;
  }
  return true;
}

export function formApplies(db: Db, form: FormDef, part: Participation): boolean {
  return ruleMatches(db, form.assign, part);
}

export function contentVisible(
  db: Db,
  page: { visibility: VisibilityRule },
  part: Participation,
): boolean {
  return ruleMatches(db, page.visibility, part);
}

export function taskApplies(db: Db, tpl: TaskTemplate, part: Participation): boolean {
  const keys = Array.isArray(tpl.requires) ? tpl.requires : tpl.requires ? [tpl.requires] : [];
  return hasAnyEnt(db, part, keys);
}

/* ---------------------------------------------------------------
   Resolution — template + per-partner state + deadline override
   --------------------------------------------------------------- */

/**
 * The partner's ordered task list.
 *
 * Deadline resolution: partner override → event default → none.
 * A task with no resolved date shows "Date to be confirmed" and is
 * never flagged overdue.
 */
export function resolveTasks(db: Db, part: Participation): ResolvedTask[] {
  return db.taskTemplates
    .filter((t) => taskApplies(db, t, part))
    .map((t) => {
      const st = (part.taskState && part.taskState[t.id]) || {};
      const override = part.taskDueDates && part.taskDueDates[t.id];
      const dueDate = override || t.dueDate || null;
      return {
        ...t,
        ...st,
        dueDate,
        deadlineOverridden: !!override,
        completed: !!st.completed,
      };
    });
}

/** The partner's forms, merged with their submission state. */
export function resolveForms(db: Db, part: Participation): ResolvedForm[] {
  return db.forms
    .filter((f) => formApplies(db, f, part))
    .map((f) => {
      const st = (part.formState && part.formState[f.id]) || { status: 'not_started' as const };
      const override = part.formDueDates && part.formDueDates[f.id];
      const dueDate = override || f.dueDate || null;
      return { ...f, dueDate, deadlineOverridden: !!override, state: st };
    });
}

/** The fields of a form this partner actually sees, given current answers. */
export function visibleFields(
  db: Db,
  form: FormDef,
  part: Participation,
  values?: FormValues,
): FormField[] {
  return form.fields.filter((f) => fieldVisible(db, f, part, values));
}

/* ---------------------------------------------------------------
   De-duplication — Tasks / Forms / Requests badges must be disjoint
   --------------------------------------------------------------- */

/**
 * Form ids that are represented by an outstanding linked task.
 *
 * A form with a linked outstanding task is *represented by that
 * task*. This keeps the nav badges disjoint (they sum exactly to the
 * Actions badge) and stops a partner receiving two reminder emails
 * for one unit of work.
 */
export function formsCoveredByTasks(db: Db, part: Participation): Set<Id> {
  const covered = new Set<Id>();
  resolveTasks(db, part).forEach((t) => {
    if (t.completed) return;
    if (t.link?.type === 'form' && t.link.target) covered.add(t.link.target);
  });
  return covered;
}

/** Forms that should fire their own reminder — i.e. have no linked task. */
export function formsNeedingReminder(db: Db, part: Participation): ResolvedForm[] {
  const covered = formsCoveredByTasks(db, part);
  return resolveForms(db, part).filter(
    (f) => !covered.has(f.id) && !isFormSettled(f.state.status),
  );
}

/**
 * The three action badges, guaranteed disjoint.
 *
 * Tasks is the canonical action list. Forms and Requests count only
 * work that no outstanding task already represents, so the three sum
 * exactly to the combined Actions badge and one unit of work is
 * never counted twice.
 */
export function actionCounts(
  db: Db,
  part: Participation,
): { tasks: number; forms: number; requests: number; total: number; overdue: number } {
  const tasks = resolveTasks(db, part);
  const outstanding = tasks.filter((t) => !t.completed);

  const covered = new Set(
    outstanding
      .filter((t) => t.link?.type === 'form' && t.link.target)
      .map((t) => t.link.target as string),
  );

  const forms = resolveForms(db, part).filter(
    (f) => isFormActionable(f.state.status) && !covered.has(f.id),
  ).length;

  const requests = db.requests.filter(
    (r) => r.participationId === part.id && r.status === 'more_info',
  ).length;

  const overdue = tasks.filter((t) => taskOverdue(t)).length;

  return {
    tasks: outstanding.length,
    forms,
    requests,
    total: outstanding.length + forms + requests,
    overdue,
  };
}

export function isFormSettled(status: string): boolean {
  return status === 'approved' || status === 'submitted' || status === 'under_review';
}

/** A form still needs the partner to do something. */
export function isFormActionable(status: string): boolean {
  return status === 'not_started' || status === 'in_progress' || status === 'changes_required';
}

/* ---------------------------------------------------------------
   Modules — which nav items this partner and user can see
   --------------------------------------------------------------- */

export interface ModuleDef {
  key: string;
  label: string;
  icon: string;
}

const BASE_MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { key: 'timeline', label: 'Timeline', icon: 'calendar-clock' },
  { key: 'participation', label: 'My participation', icon: 'package' },
  { key: 'tasks', label: 'Tasks', icon: 'circle-check' },
  { key: 'forms', label: 'Forms', icon: 'file-text' },
  { key: 'requests', label: 'Requests', icon: 'message-square-warning' },
  { key: 'information', label: 'Information', icon: 'book-open' },
  { key: 'shop', label: 'Shop', icon: 'shopping-bag' },
  { key: 'orders', label: 'Orders', icon: 'receipt' },
  { key: 'files', label: 'Files & assets', icon: 'folder' },
  { key: 'promote', label: 'Promote', icon: 'megaphone' },
  { key: 'team', label: 'Team', icon: 'users' },
];

/** Entitlements that give a partner something to buy. */
const SHOP_KEYS = [
  'can_order_av',
  'can_order_furniture',
  'can_order_signage',
  'can_order_catering',
  'has_exhibition_space',
  'has_hospitality_activation',
  'has_branding_inventory',
];

/** Info-only modules are always on; the rest map to a permission key. */
const ALWAYS_ON = new Set(['dashboard', 'timeline', 'information', 'files']);

const PERMISSION_KEY: Record<string, keyof import('./types').PartnerPermissions> = {
  tasks: 'tasks',
  forms: 'forms',
  requests: 'requests',
  shop: 'shop',
  orders: 'orders',
  participation: 'profile',
  promote: 'profile',
  team: 'team',
};

/**
 * The modules this partner — and this signed-in user — can see.
 *
 * Gating here is presentation. The same checks must be enforced
 * server-side: hiding a nav item is not access control.
 */
/**
 * The modules to show this partner.
 *
 * `now` decides whether time-based closures apply. Passing null asks
 * "may they reach it at all", which is what an access check wants:
 * the shop drops out of the nav when ordering closes, but the URL
 * still has to load so the screen can say ordering has closed —
 * rather than bouncing somebody to a page about BOARD permissions.
 */
export function visibleModules(
  db: Db,
  part: Participation,
  user?: PartnerUser | null,
  now: Date | null = new Date(),
): ModuleDef[] {
  const canShop = SHOP_KEYS.some((k) => hasEnt(db, part, k));
  const perm = user && user.permissions !== 'all' ? user.permissions : null;

  return BASE_MODULES.filter((m) => {
    if (part.moduleOverrides && part.moduleOverrides[m.key] === false) return false;
    if ((m.key === 'shop' || m.key === 'orders') && !canShop) return false;
    /*
     * Deliberately only the shop. Orders stays: what a partner has
     * already bought does not stop mattering when ordering closes —
     * that is exactly when they start checking on it.
     */
    if (m.key === 'shop' && now && !shopOpen(db, part, now)) return false;
    if (perm && !ALWAYS_ON.has(m.key)) {
      const k = PERMISSION_KEY[m.key];
      if (k && !perm[k]) return false;
    }
    return true;
  });
}

/* ---------------------------------------------------------------
   Money — one helper, driven by the event currency
   --------------------------------------------------------------- */

/**
 * All monetary values display exc. tax, rounded to the nearest euro.
 * Changing the event currency reformats every price in the product.
 */
export function money(db: Db, n: number | null | undefined): string {
  const sym = db.event?.currencySymbol || '€';
  return sym + Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

/* ---------------------------------------------------------------
   Dates
   --------------------------------------------------------------- */

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

/** "Date to be confirmed" — used wherever no deadline resolves. */
export const NO_DATE_LABEL = 'Date to be confirmed';

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
    ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

export function daysLeft(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

/** A task or form with no resolved date is never overdue. */
export function isOverdue(
  iso: string | null | undefined,
  done?: boolean,
  now: Date = new Date(),
): boolean {
  return !done && !!iso && new Date(iso) < now;
}

/**
 * Whether a task is genuinely late.
 *
 * An optional task is an opportunity with a closing date, not a debt.
 * "Order essential AV — optional, but AV books up quickly" is worth a
 * nudge before the date; it is not something a partner can be late
 * for, and colouring it red and counting it as overdue chases people
 * about work they were never obliged to do.
 *
 * Everything that reports overdue-ness about a task goes through here
 * rather than calling isOverdue directly, so the rule holds in the
 * counts, the badges, both portals and the reminder run at once.
 */
export function taskOverdue(task: ResolvedTask, now: Date = new Date()): boolean {
  if (!task.required) return false;
  return isOverdue(task.dueDate, task.completed, now);
}

/** Upcoming only — the dashboard deadline list never shows past dates. */
export function isUpcoming(iso: string | null | undefined, now: Date = new Date()): boolean {
  return !!iso && new Date(iso) >= now;
}

/* ---------------------------------------------------------------
   Status vocabulary
   --------------------------------------------------------------- */

/** Maps a status to a semantic token, not a raw hex, so themes hold. */
export type StatusTone = 'good' | 'warn' | 'neutral' | 'muted';

const STATUS_TONE: Record<string, StatusTone> = {
  confirmed: 'good',
  approved: 'good',
  completed: 'good',
  delivered: 'good',
  partially_confirmed: 'good',
  in_fulfilment: 'good',
  submitted: 'neutral',
  under_review: 'warn',
  more_info: 'warn',
  quote_requested: 'warn',
  awaiting_information: 'warn',
  changes_required: 'warn',
  quoted: 'warn',
  failed: 'warn',
  rejected: 'muted',
  cancelled: 'muted',
  draft: 'muted',
  closed: 'muted',
  not_started: 'muted',
  in_progress: 'neutral',
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONE[status] || 'neutral';
}

export function statusLabel(s: string | null | undefined): string {
  const raw = String(s || '').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/* ---------------------------------------------------------------
   Terminology — plurals are inferred from the singular
   --------------------------------------------------------------- */

/**
 * Infer a plural: `-y` → `-ies`, sibilants → `-es`, else `+s`.
 * The organiser edits singulars only.
 */
export function plural(singular: string): string {
  const s = (singular || '').trim();
  if (!s) return '';
  if (/[^aeiou]y$/i.test(s)) return s.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/i.test(s)) return s + 'es';
  return s + 's';
}

/** Falls back to the product's own vocabulary if a key is missing. */
const DEFAULT_TERMS: Terminology = {
  partner: 'Partner',
  partnerPlural: 'Partners',
  partnerPortal: 'Partner Portal',
  participation: 'Participation',
  task: 'Task',
  taskPlural: 'Tasks',
  request: 'Request',
  requestPlural: 'Requests',
};

/**
 * Terminology lookup with inferred plurals, for nav, headings and
 * body copy.
 *
 * Every key is defaulted: terminology is a JSONB column, so a
 * partially-populated or empty object is a realistic state, and a
 * missing key must not take down every page that renders a heading.
 */
export function terms(db: Db) {
  const t = { ...DEFAULT_TERMS, ...(db.event?.terminology ?? {}) };
  return {
    partner: t.partner,
    partners: t.partnerPlural || plural(t.partner),
    partnerPortal: t.partnerPortal,
    participation: t.participation,
    task: t.task,
    tasks: t.taskPlural || plural(t.task),
    request: t.request,
    requests: t.requestPlural || plural(t.request),
    /** Lower-cased forms, for mid-sentence body copy. */
    lower: {
      partner: t.partner.toLowerCase(),
      partners: (t.partnerPlural || plural(t.partner)).toLowerCase(),
      participation: t.participation.toLowerCase(),
      task: t.task.toLowerCase(),
      tasks: (t.taskPlural || plural(t.task)).toLowerCase(),
      request: t.request.toLowerCase(),
      requests: (t.requestPlural || plural(t.request)).toLowerCase(),
    },
  };
}

/* ---------------------------------------------------------------
   References
   --------------------------------------------------------------- */

/**
 * The next free participation reference — BP-004 after BP-003.
 *
 * Taken from the highest existing number rather than the row count,
 * so removing a partner cannot cause the next one to reuse their
 * reference. Anything not matching the format is ignored, so a
 * hand-edited or imported reference cannot derail the sequence.
 *
 * Two organisers adding at the same instant could still collide; a
 * reference is a label rather than a key, so the cost is a duplicate
 * to rename, not a broken record.
 */
export function nextReference(existing: string[]): string {
  const highest = existing.reduce((max, ref) => {
    const match = /^BP-(\d+)$/.exec(String(ref ?? '').trim());
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `BP-${String(highest + 1).padStart(3, '0')}`;
}

/* ---------------------------------------------------------------
   Derived figures
   --------------------------------------------------------------- */

/** Order totals are the sum of supplier-order subtotals — exc. tax. */
export function orderTotal(db: Db, orderId: Id): number {
  return db.supplierOrders
    .filter((s) => s.orderId === orderId)
    .reduce((a, s) => a + s.subtotal, 0);
}

/** Value of everything the partner bought up front, exc. tax. */
export function packageValue(part: Participation): number {
  return (part.inventory || []).reduce((a, i) => a + i.cost * (i.quantity || 1), 0);
}

/** The next deadline across a set of linked tasks and forms. */
export function nextDeadline(
  db: Db,
  part: Participation,
  refs: Array<{ kind: 'task' | 'form'; id: Id }>,
  now: Date = new Date(),
): IsoDate | null {
  const tasks = resolveTasks(db, part);
  const forms = resolveForms(db, part);
  const dates: string[] = [];

  refs.forEach((r) => {
    if (r.kind === 'task') {
      const t = tasks.find((x) => x.id === r.id);
      if (t && !t.completed && t.dueDate) dates.push(t.dueDate);
    } else {
      const f = forms.find((x) => x.id === r.id);
      if (f && !isFormSettled(f.state.status) && f.dueDate) dates.push(f.dueDate);
    }
  });

  const upcoming = dates.filter((d) => isUpcoming(d, now)).sort();
  return upcoming[0] || null;
}

/** Progress across a partner's required tasks, for the "Eight of 12" copy. */
export function taskProgress(db: Db, part: Participation): { done: number; total: number } {
  const tasks = resolveTasks(db, part);
  return { done: tasks.filter((t) => t.completed).length, total: tasks.length };
}

/* ---------------------------------------------------------------
   Deterministic gradient assignment
   --------------------------------------------------------------- */

const GRADIENTS = Array.from({ length: 9 }, (_, i) => `/assets/board-bg-${i + 1}.png`);

/**
 * Pick a BOARD gradient for a record with no uploaded image. Stable
 * for a given id, so a card does not change picture between renders.
 */
export function gradientFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/* ---------------------------------------------------------------
   Inline markdown — **bold**, _italic_, [links](url)
   --------------------------------------------------------------- */

/** Strip inline markdown, for card snippets and plain-text contexts. */
export function stripMarkdown(text: string): string {
  return (text || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
}

/* ---------------------------------------------------------------
   Field value helpers
   --------------------------------------------------------------- */

export function isUploadField(type: string): boolean {
  return type === 'file_upload' || type === 'image_upload' || type === 'document_upload';
}

export function isPresentationField(type: string): boolean {
  return type === 'section_heading' || type === 'guidance';
}

/**
 * An answer as a person would read it back.
 *
 * Used wherever a submitted answer is displayed rather than edited:
 * an unticked acknowledgement should read "No", not "false", and a
 * contact should read as one line rather than three fields.
 */
export function answerText(value: FieldValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') {
    const parts = [value.name, value.email, value.phone].filter(Boolean);
    return parts.length ? parts.join(' · ') : '—';
  }
  // Uploads are stored as "Original name.pdf|/api/files/<key>".
  const upload = uploadAnswer(value);
  return upload ? upload.name : String(value);
}

/**
 * The two halves of an upload answer, or null if it is not one.
 *
 * Answers are plain strings, so the shape is what identifies them:
 * a name, a pipe, and a path served by this app. Anything else a
 * partner types is left alone.
 */
export function uploadAnswer(
  value: FieldValue,
): { name: string; url: string } | null {
  if (typeof value !== 'string') return null;
  const at = value.indexOf('|/api/files/');
  if (at <= 0) return null;
  return { name: value.slice(0, at), url: value.slice(at + 1) };
}

/** Whether a required field has been answered. */
export function hasValue(v: FieldValue): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'boolean') return true;
  if (typeof v === 'number') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.values(v).some((x) => !!x);
  return false;
}

/**
 * Validate a submission against the fields the partner can actually
 * see — a hidden required field must never block submission.
 */
export function validateForm(
  db: Db,
  form: FormDef,
  part: Participation,
  values: FormValues,
): Record<string, string> {
  return validateFields(db, form.fields, part, values);
}

/**
 * The same rules against a bare field list.
 *
 * Request types carry fields without being forms, so the validation
 * lives here and `validateForm` delegates to it — one implementation
 * for both, rather than two that can drift apart.
 */
export function validateFields(
  db: Db,
  fields: FormField[],
  part: Participation,
  values: FormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  fields
    .filter((f) => fieldVisible(db, f, part, values))
    .forEach((f) => {
      if (isPresentationField(f.type)) return;
      if (!f.required) return;
      if (f.type === 'acknowledgement') {
        if (values[f.key] !== true) errors[f.key] = 'Please confirm to continue.';
        return;
      }
      if (!hasValue(values[f.key])) errors[f.key] = 'This field is required.';
    });
  return errors;
}
