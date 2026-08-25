/* ============================================================
   BOARD Partner Portal — domain types

   Ported from the prototype's `data.js`, which the handoff brief
   names as the source of truth for the schema. Each top-level
   collection on `Db` maps to a table in the eventual Postgres
   schema; every event-scoped record carries `eventId` so an event
   can be duplicated for a future edition.
   ============================================================ */

export type Id = string;
/** ISO-8601 date (YYYY-MM-DD) — deadlines are dates, not instants. */
export type IsoDate = string;
/** ISO-8601 timestamp. */
export type IsoDateTime = string;

/* ---------------------------------------------------------------
   Event
   --------------------------------------------------------------- */

/** Editable singulars. Plurals are inferred — see `plural()`. */
export interface Terminology {
  partner: string;
  partnerPlural: string;
  partnerPortal: string;
  participation: string;
  task: string;
  taskPlural: string;
  request: string;
  requestPlural: string;
}

/** Default outbound-email identity, editable in Event settings. */
export interface EventSender {
  name: string;
  email: string;
  signature: string;
  logo: string;
}

export interface BoardEvent {
  id: Id;
  name: string;
  shortName: string;
  venue: string;
  city: string;
  startDate: IsoDate;
  endDate: IsoDate;
  currency: string;
  currencySymbol: string;
  timezone: string;
  tagline: string;
  sender: EventSender;
  terminology: Terminology;
}

export interface Currency {
  code: string;
  symbol: string;
  label: string;
}

/* ---------------------------------------------------------------
   Entitlements & visibility
   --------------------------------------------------------------- */

/** Reusable capability key. Organisers add keys without code changes. */
export interface Entitlement {
  key: string;
  label: string;
}

/**
 * Shared visibility rule — applied identically to shop products,
 * content pages, files, tasks and individual form fields.
 *
 * For `entitlement`, `keys` is a set matched ANY-of: the partner
 * needs at least one. `key`/`requires` are legacy single-key shapes
 * kept so older records still resolve.
 */
export interface VisibilityRule {
  type?: 'all' | 'entitlement' | 'partner' | 'except' | 'package';
  key?: string;
  keys?: string[];
  requires?: string;
  partners?: Id[];
  packages?: Id[];
}

/* ---------------------------------------------------------------
   Suppliers
   --------------------------------------------------------------- */

export type ApprovalMode = 'auto' | 'manual' | 'quote';

export interface Supplier {
  id: Id;
  eventId: Id;
  name: string;
  category: string;
  contact: string;
  notifEmails: string[];
  /** Zapier catch hook. Server-side only. */
  webhookUrl: string;
  routingKey: string;
  /** MUST never be sent to a client or a partner user. */
  webhookSecret: string;
  active: boolean;
  approvalDefault: ApprovalMode;
  notes: string;
}

/* ---------------------------------------------------------------
   Shop
   --------------------------------------------------------------- */

export interface ShopCategory {
  id: Id;
  name: string;
}

export interface ProductOption {
  name: string;
  values: string[];
}

export interface ProductQuestion {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
}

export interface Product {
  id: Id;
  eventId: Id;
  name: string;
  supplierId: Id;
  categoryId: Id;
  description: string;
  unit: string;
  /** `null` means quote-required — never render a price for these. */
  basePrice: number | null;
  taxRate: number;
  approvalMode: ApprovalMode;
  minQty: number;
  maxQty: number;
  orderDeadline: IsoDate | null;
  leadTimeDays: number;
  active: boolean;
  visibility: VisibilityRule;
  options: ProductOption[];
  questions: ProductQuestion[];
  /** Uploaded media; falls back to a deterministic BOARD gradient. */
  image?: string;
}

/* ---------------------------------------------------------------
   Forms
   --------------------------------------------------------------- */

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'currency'
  | 'email'
  | 'telephone'
  | 'url'
  | 'date'
  | 'time'
  | 'address'
  | 'single_select'
  | 'multi_select'
  | 'radio'
  | 'checkboxes'
  | 'yes_no'
  | 'contact'
  | 'acknowledgement'
  | 'section_heading'
  | 'guidance'
  | 'file_upload'
  | 'image_upload'
  | 'document_upload';

/** Show this field only when an earlier answer matches. */
export interface FieldCondition {
  field: string;
  equals: string | number | boolean;
}

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: string[];
  /** Field-level gating — how two partners get different fields. */
  visibility?: VisibilityRule;
  condition?: FieldCondition;
  readonly?: boolean;
}

export interface ContactValue {
  name?: string;
  email?: string;
  phone?: string;
}

export type FieldValue =
  | string
  | number
  | boolean
  | string[]
  | ContactValue
  | null
  | undefined;

export type FormValues = Record<string, FieldValue>;

export type FormStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'under_review'
  | 'changes_required'
  | 'approved'
  | 'rejected';

export interface FormDef {
  id: Id;
  eventId: Id;
  title: string;
  category: string;
  description: string;
  /** Blank means the deadline is set per partner. */
  dueDate: IsoDate | null;
  assign: VisibilityRule;
  allowResubmit?: boolean;
  fields: FormField[];
}

/** A prior submission, snapshotted when a form is reopened. */
export interface FormVersion {
  at: IsoDateTime;
  by: string;
  values: FormValues;
  status: FormStatus;
  feedback?: string;
}

export interface FormSubmission {
  status: FormStatus;
  values?: FormValues;
  submittedAt?: IsoDateTime;
  submittedBy?: string;
  reviewedAt?: IsoDateTime;
  reviewedBy?: string;
  feedback?: string;
  history?: FormVersion[];
}

/* ---------------------------------------------------------------
   Requests
   --------------------------------------------------------------- */

export type RequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'more_info'
  | 'approved'
  | 'rejected'
  | 'closed';

export interface RequestType {
  id: Id;
  eventId: Id;
  name: string;
  ownerDefault: string;
  fields: FormField[];
}

export interface RequestComment {
  by: string;
  role: 'partner' | 'organiser';
  at: IsoDateTime;
  text: string;
  files?: string[];
}

export interface RequestRecord {
  id: Id;
  eventId: Id;
  participationId: Id;
  typeId: Id;
  reference: string;
  status: RequestStatus;
  owner: string;
  submittedBy: string;
  submittedAt: IsoDateTime;
  responseAt: IsoDateTime | null;
  values: FormValues;
  files: string[];
  comments: RequestComment[];
}

/* ---------------------------------------------------------------
   Content
   --------------------------------------------------------------- */

export interface ContentCategory {
  id: Id;
  name: string;
}

export interface TimelineItem {
  date: IsoDate;
  title: string;
  note?: string;
}

/** Block-based page body. Text blocks accept **bold**, _italic_, [links](url). */
export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; src: string; caption?: string }
  | { type: 'list'; items: string[] }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; tone: 'info' | 'warn'; text: string }
  | { type: 'divider' }
  | { type: 'video'; url: string; caption?: string }
  /** `url` is an app path served by /api/files/*, not a public link. */
  | { type: 'download'; name: string; note?: string; url?: string }
  | { type: 'timeline'; items: TimelineItem[] };

export interface ContentPage {
  id: Id;
  eventId: Id;
  categoryId: Id;
  title: string;
  updated: IsoDate;
  visibility: VisibilityRule;
  /** Page must be acknowledged before its linked task completes. */
  requireAck: boolean;
  /** Plain-text snippet used on cards. */
  body: string;
  blocks?: ContentBlock[];
  cover?: string;
  published?: boolean;
  relatedTasks?: Id[];
  relatedForms?: Id[];
}

/* ---------------------------------------------------------------
   Files
   --------------------------------------------------------------- */

/** A file in the BOARD library, offered to partners to download. */
export interface FileAsset {
  id: Id;
  eventId: Id;
  name: string;
  kind: string;
  size: string;
  visibility: VisibilityRule;
  url?: string;
}

/** A file the organiser needs *from* a partner. */
export interface RequestedFile {
  id: Id;
  label: string;
  due: IsoDate | null;
  required: boolean;
  file: UploadedFile | null;
}

export interface UploadedFile {
  name: string;
  uploadedAt: IsoDateTime;
  by: string;
  url?: string;
}

/* ---------------------------------------------------------------
   Tasks
   --------------------------------------------------------------- */

export type TaskLinkType =
  | 'form'
  | 'request'
  | 'shop'
  | 'content'
  | 'upload'
  | 'url'
  | 'ack'
  | 'checklist';

export interface TaskLink {
  type: TaskLinkType;
  /** Id of the linked form / request type / category / page, or a URL. */
  target: string | null;
}

export type TaskPriority = 'high' | 'medium' | 'low';

export interface TaskTemplate {
  id: Id;
  eventId: Id;
  title: string;
  description?: string;
  category: string;
  /** Which portal module the task belongs to. */
  module: string;
  priority: TaskPriority;
  required: boolean;
  /** Blank means the deadline is set per partner. */
  dueDate: IsoDate | null;
  /** Entitlement gating — a key, a set of keys, or null for everyone. */
  requires: string | string[] | null;
  link: TaskLink;
  instructions: string;
  attachments?: string[];
  assignedUsers?: Id[];
}

export interface TaskState {
  completed?: boolean;
  completedAt?: IsoDateTime;
  completedBy?: string;
  partnerNotes?: string;
  organiserNotes?: string;
  file?: UploadedFile | null;
}

/** A task template merged with a partner's state and deadline override. */
export interface ResolvedTask extends TaskTemplate, TaskState {
  completed: boolean;
  deadlineOverridden: boolean;
}

/** A form merged with a partner's submission and deadline override. */
export interface ResolvedForm extends FormDef {
  deadlineOverridden: boolean;
  state: FormSubmission;
}

/* ---------------------------------------------------------------
   Partners & participation
   --------------------------------------------------------------- */

export interface BillingDetails {
  entity: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  vat: string;
}

export interface Partner {
  id: Id;
  name: string;
  sector: string;
  /** Legacy flat address line, retained for display fallbacks. */
  country: string;
  billing: BillingDetails;
  logo: string;
  /** Light-ground variant; partners supply both where they can. */
  logoLight?: string;
}

/** Per-module permissions for a Partner User. `'all'` for the Lead. */
export interface PartnerPermissions {
  tasks: boolean;
  forms: boolean;
  requests: boolean;
  shop: boolean;
  orders: boolean;
  profile: boolean;
  team: boolean;
}

export interface PartnerUser {
  id: Id;
  partnerId: Id;
  name: string;
  email: string;
  telephone: string;
  role: 'lead' | 'user';
  permissions: 'all' | PartnerPermissions;
  invitedAt?: IsoDateTime;
  acceptedAt?: IsoDateTime;
}

export type InventoryType =
  | 'Dedicated Space'
  | 'Curated Introductions'
  | 'Branding'
  | 'Bespoke'
  | 'Delegate Passes';

/** A line item the partner purchased — their "Package". */
export interface InventoryItem {
  id: Id;
  type: InventoryType;
  name: string;
  description: string;
  cost: number;
  quantity: number;
  /** Prompted for when the type is Dedicated Space. */
  standNumber: string;
  /** Delegate Passes autofill their description from the pass type. */
  passType?: string;
  /** Linked tasks/forms, rendered as clickable chips. */
  refs: Array<{ kind: 'task' | 'form'; id: Id }>;
}

export interface PriceOverride {
  productId: Id;
  price: number;
}

export interface MarketingSettings {
  background?: 'gradient' | 'black';
  gradient?: string;
  [key: string]: unknown;
}

/**
 * The central join — and the personalisation record. Every
 * per-partner override lives here.
 */
export interface Participation {
  id: Id;
  eventId: Id;
  partnerId: Id;
  reference: string;
  standRef: string | null;
  /** Retained for migration only; entitlements are now set directly. */
  packageId: Id | null;
  addedEntitlements: string[];
  removedEntitlements: string[];
  /** `{ shop: false }` hides a module for this partner. */
  moduleOverrides: Record<string, boolean>;
  priceOverrides: PriceOverride[];
  /** Per-partner deadline overrides, keyed by form / task id. */
  formDueDates?: Record<Id, IsoDate>;
  taskDueDates?: Record<Id, IsoDate>;
  taskState: Record<Id, TaskState>;
  formState: Record<Id, FormSubmission>;
  inventory: InventoryItem[];
  requestedFiles: RequestedFile[];
  contract?: { name: string; dataUrl: string } | null;
  /** Visible to the partner. */
  partnerNotes: string;
  /** Never shown to the partner. */
  internalNotes: string;
  leadUserId: Id;
  passAllocation: number;
  marketing?: MarketingSettings;
  suspended?: boolean;
  allocatedProducts?: Id[];
}

/* ---------------------------------------------------------------
   Orders
   --------------------------------------------------------------- */

export type OrderStatus = 'draft' | 'submitted' | 'part_confirmed' | 'confirmed' | 'cancelled';

export type SupplierOrderStatus =
  | 'under_review'
  | 'quote_requested'
  | 'quoted'
  | 'confirmed'
  | 'cancelled'
  | 'rejected';

/** Collected at checkout. No payment is ever taken. */
export interface OrderBilling {
  legalEntity: string;
  address: string;
  taxNumber: string;
  invoiceContactName: string;
  invoiceContactEmail: string;
  poNumber: string;
  internalRef: string;
  notes: string;
}

export interface OrderItem {
  productId: Id;
  name: string;
  supplierId: Id;
  qty: number;
  /** `null` for quote-required items. */
  unitPrice: number | null;
  options: Record<string, string>;
  answers: Record<string, string>;
}

export interface Order {
  id: Id;
  eventId: Id;
  participationId: Id;
  reference: string;
  status: OrderStatus;
  submittedAt: IsoDateTime;
  billing: OrderBilling;
  items: OrderItem[];
  /** Manual field — the portal never generates invoices. */
  invoiceStatus?: string;
}

export interface SupplierOrderItem {
  productId: Id;
  name: string;
  qty: number;
  unitPrice: number | null;
}

/** One per supplier per checkout — a cart may span several. */
export interface SupplierOrder {
  id: Id;
  orderId: Id;
  supplierId: Id;
  reference: string;
  status: SupplierOrderStatus;
  submittedAt: IsoDateTime;
  confirmedAt: IsoDateTime | null;
  approvalMode: ApprovalMode;
  items: SupplierOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  quote?: { amount: number; note: string; at: IsoDateTime } | null;
  comments?: RequestComment[];
}

/* ---------------------------------------------------------------
   Webhooks
   --------------------------------------------------------------- */

export type WebhookEventType =
  | 'supplier_order.quote_requested'
  | 'supplier_order.confirmed'
  | 'supplier_order.updated'
  | 'supplier_order.cancelled';

export interface WebhookAttempt {
  at: IsoDateTime;
  responseCode: number;
  /** Truncated before storage. */
  responseBody: string;
  ok: boolean;
}

export interface WebhookEvent {
  id: Id;
  eventType: WebhookEventType;
  supplierOrderId: Id;
  supplierId: Id;
  sentAt: IsoDateTime;
  /** Unique per event, so a retry is never double-processed. */
  idempotencyKey: string;
  status: 'delivered' | 'failed' | 'pending';
  attempts: WebhookAttempt[];
  retryCount: number;
  payload: unknown;
  /** HMAC of the payload using the supplier's secret. */
  signature?: string;
}

/* ---------------------------------------------------------------
   Notifications, email, audit
   --------------------------------------------------------------- */

export interface Notification {
  id: Id;
  participationId: Id | null;
  at: IsoDateTime;
  kind: string;
  text: string;
  read: boolean;
  /** Where clicking the notification should land. */
  target?: { view: string; id?: Id };
}

export interface EmailTemplate {
  id: Id;
  name: string;
  subject: string;
  enabled: boolean;
  category?: 'reminder' | string;
  body?: string;
}

export interface SentEmail {
  id: Id;
  templateId: Id;
  to: string;
  toName: string;
  partnerId: Id | null;
  subject: string;
  body: string;
  from: string;
  fromName: string;
  at: IsoDateTime;
  status: 'sent' | 'failed';
  logo?: string;
}

export interface AuditEntry {
  id: Id;
  at: IsoDateTime;
  actor: string;
  text: string;
  partnerId?: Id | null;
}

export interface OrganiserPermissions {
  partners: boolean;
  forms: boolean;
  tasks: boolean;
  content: boolean;
  products: boolean;
  suppliers: boolean;
  orders: boolean;
  requests: boolean;
  reporting: boolean;
  settings: boolean;
}

export interface OrganiserUser {
  id: Id;
  name: string;
  title: string;
  email: string;
  role: 'super_admin' | 'team';
  permissions?: OrganiserPermissions;
}

/* ---------------------------------------------------------------
   Package templates (retained for migration; no longer authored)
   --------------------------------------------------------------- */

export interface PackageTemplate {
  id: Id;
  eventId: Id;
  name: string;
  entitlements: string[];
  notes: string;
}

/* ---------------------------------------------------------------
   The database
   --------------------------------------------------------------- */

export interface Db {
  version: number;
  event: BoardEvent;
  entitlements: Entitlement[];
  suppliers: Supplier[];
  shopCategories: ShopCategory[];
  products: Product[];
  forms: FormDef[];
  requestTypes: RequestType[];
  contentCategories: ContentCategory[];
  contentPages: ContentPage[];
  files: FileAsset[];
  taskTemplates: TaskTemplate[];
  packageTemplates: PackageTemplate[];
  partners: Partner[];
  partnerUsers: PartnerUser[];
  participations: Participation[];
  orders: Order[];
  supplierOrders: SupplierOrder[];
  webhookEvents: WebhookEvent[];
  requests: RequestRecord[];
  notifications: Notification[];
  emailTemplates: EmailTemplate[];
  sentEmails: SentEmail[];
  auditLog: AuditEntry[];
  organiserUsers: OrganiserUser[];
  orgAuditSeenAt?: IsoDateTime | null;
}

/* ---------------------------------------------------------------
   Session
   --------------------------------------------------------------- */

export type PortalKind = 'organiser' | 'partner';

export interface Session {
  kind: PortalKind;
  /** Organiser user id, or partner user id. */
  userId: Id;
  /** Set for partner sessions. */
  partnerId?: Id;
}
