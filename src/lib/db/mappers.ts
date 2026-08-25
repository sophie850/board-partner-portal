/* ============================================================
   Row mappers — Postgres (snake_case) to domain types (camelCase)

   Kept explicit rather than generated: the column list is the place
   a sensitive field would leak from, so it should be readable. Note
   that `toSupplierRow`/`rowToSupplier` carry `webhookSecret`, which
   is why suppliers are only ever fetched through the server data
   layer, and why `publicSupplier()` exists for anything that reaches
   a partner.
   ============================================================ */

import type {
  AuditEntry,
  ContentCategory,
  ContentPage,
  EmailTemplate,
  Entitlement,
  FileAsset,
  FormDef,
  FormField,
  InventoryItem,
  Notification,
  Order,
  OrderItem,
  OrganiserUser,
  Participation,
  Partner,
  PartnerUser,
  Product,
  RequestComment,
  RequestRecord,
  RequestType,
  RequestedFile,
  SentEmail,
  ShopCategory,
  Supplier,
  SupplierOrder,
  SupplierOrderItem,
  TaskTemplate,
  BoardEvent,
  WebhookAttempt,
  WebhookEvent,
} from '@/lib/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (v: unknown, fallback = 0): number =>
  v === null || v === undefined ? fallback : Number(v);

const nullableNum = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

const str = (v: unknown, fallback = ''): string =>
  v === null || v === undefined ? fallback : String(v);

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/* ---------------------------------------------------------------
   Event
   --------------------------------------------------------------- */

export function rowToEvent(r: Row): BoardEvent {
  return {
    id: r.id,
    name: r.name,
    shortName: str(r.short_name),
    venue: str(r.venue),
    city: str(r.city),
    startDate: r.start_date,
    endDate: r.end_date,
    currency: str(r.currency, 'EUR'),
    currencySymbol: str(r.currency_symbol, '€'),
    timezone: str(r.timezone, 'Europe/Monaco'),
    tagline: str(r.tagline),
    sender: r.sender || { name: '', email: '', signature: '', logo: '' },
    terminology: r.terminology || {},
  };
}

export function eventToRow(e: BoardEvent): Row {
  return {
    id: e.id,
    name: e.name,
    short_name: e.shortName,
    venue: e.venue,
    city: e.city,
    start_date: e.startDate,
    end_date: e.endDate,
    currency: e.currency,
    currency_symbol: e.currencySymbol,
    timezone: e.timezone,
    tagline: e.tagline,
    sender: e.sender,
    terminology: e.terminology,
  };
}

/* ---------------------------------------------------------------
   Simple config tables
   --------------------------------------------------------------- */

export function rowToEntitlement(r: Row): Entitlement {
  return { key: r.key, label: str(r.label) };
}

export function entitlementToRow(e: Entitlement, eventId: string): Row {
  return { key: e.key, event_id: eventId, label: e.label };
}

export function rowToShopCategory(r: Row): ShopCategory {
  return { id: r.id, name: str(r.name) };
}

export function shopCategoryToRow(c: ShopCategory, eventId: string, position = 0): Row {
  return { id: c.id, event_id: eventId, name: c.name, position };
}

export function rowToContentCategory(r: Row): ContentCategory {
  return { id: r.id, name: str(r.name) };
}

export function contentCategoryToRow(c: ContentCategory, eventId: string, position = 0): Row {
  return { id: c.id, event_id: eventId, name: c.name, position };
}

export function rowToOrganiserUser(r: Row): OrganiserUser {
  return {
    id: r.id,
    name: str(r.name),
    title: str(r.title),
    email: str(r.email),
    role: r.role,
    permissions: r.permissions || undefined,
  };
}

export function organiserUserToRow(u: OrganiserUser): Row {
  return {
    id: u.id,
    name: u.name,
    title: u.title,
    email: u.email,
    role: u.role,
    permissions: u.permissions ?? null,
  };
}

/* ---------------------------------------------------------------
   Suppliers
   --------------------------------------------------------------- */

export function rowToSupplier(r: Row): Supplier {
  return {
    id: r.id,
    eventId: r.event_id,
    name: str(r.name),
    category: str(r.category),
    contact: str(r.contact),
    notifEmails: arr<string>(r.notif_emails),
    webhookUrl: str(r.webhook_url),
    routingKey: str(r.routing_key),
    webhookSecret: str(r.webhook_secret),
    active: !!r.active,
    approvalDefault: r.approval_default,
    notes: str(r.notes),
  };
}

export function supplierToRow(s: Supplier): Row {
  return {
    id: s.id,
    event_id: s.eventId,
    name: s.name,
    category: s.category,
    contact: s.contact,
    notif_emails: s.notifEmails,
    webhook_url: s.webhookUrl,
    routing_key: s.routingKey,
    webhook_secret: s.webhookSecret,
    active: s.active,
    approval_default: s.approvalDefault,
    notes: s.notes,
  };
}

/**
 * A supplier stripped of everything a partner must not see.
 * Use this for any payload that crosses to a partner-facing surface.
 */
export type PublicSupplier = Omit<Supplier, 'webhookSecret' | 'webhookUrl' | 'routingKey' | 'notifEmails' | 'notes'>;

export function publicSupplier(s: Supplier): PublicSupplier {
  const { webhookSecret: _s, webhookUrl: _u, routingKey: _r, notifEmails: _e, notes: _n, ...rest } = s;
  void _s; void _u; void _r; void _e; void _n;
  return rest;
}

/* ---------------------------------------------------------------
   Products
   --------------------------------------------------------------- */

export function rowToProduct(r: Row): Product {
  return {
    id: r.id,
    eventId: r.event_id,
    name: str(r.name),
    supplierId: r.supplier_id,
    categoryId: r.category_id,
    description: str(r.description),
    unit: str(r.unit, 'each'),
    basePrice: nullableNum(r.base_price),
    taxRate: num(r.tax_rate, 0.2),
    approvalMode: r.approval_mode,
    minQty: num(r.min_qty, 1),
    maxQty: num(r.max_qty, 99),
    orderDeadline: r.order_deadline,
    leadTimeDays: num(r.lead_time_days),
    active: !!r.active,
    image: r.image || undefined,
    options: arr(r.options),
    questions: arr(r.questions),
    visibility: r.visibility || {},
  };
}

export function productToRow(p: Product): Row {
  return {
    id: p.id,
    event_id: p.eventId,
    name: p.name,
    supplier_id: p.supplierId,
    category_id: p.categoryId,
    description: p.description,
    unit: p.unit,
    base_price: p.basePrice,
    tax_rate: p.taxRate,
    approval_mode: p.approvalMode,
    min_qty: p.minQty,
    max_qty: p.maxQty,
    order_deadline: p.orderDeadline,
    lead_time_days: p.leadTimeDays,
    active: p.active,
    image: p.image ?? null,
    options: p.options,
    questions: p.questions,
    visibility: p.visibility,
  };
}

/* ---------------------------------------------------------------
   Forms
   --------------------------------------------------------------- */

export function rowToFormField(r: Row): FormField {
  return {
    key: r.key,
    label: str(r.label),
    type: r.type,
    required: !!r.required,
    help: str(r.help),
    readonly: !!r.readonly,
    options: arr<string>(r.options),
    visibility: r.visibility && Object.keys(r.visibility).length ? r.visibility : undefined,
    condition: r.condition || undefined,
  };
}

export function formFieldToRow(f: FormField, formId: string, position: number): Row {
  return {
    id: `${formId}__${f.key}`,
    form_id: formId,
    key: f.key,
    label: f.label,
    type: f.type,
    required: !!f.required,
    help: f.help ?? '',
    readonly: !!f.readonly,
    options: f.options ?? [],
    visibility: f.visibility ?? {},
    condition: f.condition ?? null,
    position,
  };
}

/** Fields arrive from a separate table; pass them in already ordered. */
export function rowToForm(r: Row, fields: FormField[]): FormDef {
  return {
    id: r.id,
    eventId: r.event_id,
    title: str(r.title),
    category: str(r.category),
    description: str(r.description),
    dueDate: r.due_date,
    assign: r.assign || { type: 'all' },
    allowResubmit: !!r.allow_resubmit,
    fields,
  };
}

export function formToRow(f: FormDef): Row {
  return {
    id: f.id,
    event_id: f.eventId,
    title: f.title,
    category: f.category,
    description: f.description,
    due_date: f.dueDate,
    assign: f.assign,
    allow_resubmit: !!f.allowResubmit,
  };
}

/* ---------------------------------------------------------------
   Request types
   --------------------------------------------------------------- */

export function rowToRequestType(r: Row): RequestType {
  return {
    id: r.id,
    eventId: r.event_id,
    name: str(r.name),
    ownerDefault: str(r.owner_default),
    fields: arr<FormField>(r.fields),
  };
}

export function requestTypeToRow(t: RequestType): Row {
  return {
    id: t.id,
    event_id: t.eventId,
    name: t.name,
    owner_default: t.ownerDefault,
    fields: t.fields,
  };
}

/* ---------------------------------------------------------------
   Content
   --------------------------------------------------------------- */

export function rowToContentPage(r: Row): ContentPage {
  return {
    id: r.id,
    eventId: r.event_id,
    categoryId: r.category_id,
    title: str(r.title),
    updated: r.updated,
    visibility: r.visibility || { type: 'all' },
    requireAck: !!r.require_ack,
    published: r.published !== false,
    body: str(r.body),
    blocks: arr(r.blocks),
    cover: r.cover || undefined,
    relatedTasks: arr<string>(r.related_tasks),
    relatedForms: arr<string>(r.related_forms),
  };
}

export function contentPageToRow(p: ContentPage): Row {
  return {
    id: p.id,
    event_id: p.eventId,
    category_id: p.categoryId,
    title: p.title,
    body: p.body,
    blocks: p.blocks ?? [],
    cover: p.cover ?? null,
    visibility: p.visibility,
    require_ack: !!p.requireAck,
    published: p.published !== false,
    related_tasks: p.relatedTasks ?? [],
    related_forms: p.relatedForms ?? [],
    updated: p.updated,
  };
}

/* ---------------------------------------------------------------
   Files
   --------------------------------------------------------------- */

export function rowToFile(r: Row): FileAsset {
  return {
    id: r.id,
    eventId: r.event_id,
    name: str(r.name),
    kind: str(r.kind),
    size: str(r.size),
    url: r.url || undefined,
    visibility: r.visibility || { type: 'all' },
  };
}

export function fileToRow(f: FileAsset): Row {
  return {
    id: f.id,
    event_id: f.eventId,
    name: f.name,
    kind: f.kind,
    size: f.size,
    url: f.url ?? null,
    visibility: f.visibility,
  };
}

/* ---------------------------------------------------------------
   Tasks
   --------------------------------------------------------------- */

export function rowToTaskTemplate(r: Row): TaskTemplate {
  const requires = arr<string>(r.requires);
  return {
    id: r.id,
    eventId: r.event_id,
    title: str(r.title),
    description: str(r.description),
    category: str(r.category),
    module: str(r.module),
    priority: r.priority,
    required: !!r.required,
    dueDate: r.due_date,
    // Collapse the single-key case so it round-trips with the seed.
    requires: requires.length === 0 ? null : requires.length === 1 ? requires[0] : requires,
    link: { type: r.link_type, target: r.link_target ?? null },
    instructions: str(r.instructions),
    attachments: arr<string>(r.attachments),
  };
}

export function taskTemplateToRow(t: TaskTemplate): Row {
  const requires = Array.isArray(t.requires) ? t.requires : t.requires ? [t.requires] : [];
  return {
    id: t.id,
    event_id: t.eventId,
    title: t.title,
    description: t.description ?? '',
    category: t.category,
    module: t.module,
    priority: t.priority,
    required: t.required,
    due_date: t.dueDate,
    requires,
    link_type: t.link.type,
    link_target: t.link.target,
    instructions: t.instructions,
    attachments: t.attachments ?? [],
  };
}

/* ---------------------------------------------------------------
   Partners
   --------------------------------------------------------------- */

export function rowToPartner(r: Row): Partner {
  return {
    id: r.id,
    name: str(r.name),
    sector: str(r.sector),
    country: str(r.country),
    billing: r.billing || {},
    logo: str(r.logo),
    logoLight: r.logo_light || undefined,
  };
}

export function partnerToRow(p: Partner): Row {
  return {
    id: p.id,
    name: p.name,
    sector: p.sector,
    country: p.country,
    billing: p.billing,
    logo: p.logo,
    logo_light: p.logoLight ?? null,
  };
}

export function rowToPartnerUser(r: Row): PartnerUser {
  return {
    id: r.id,
    partnerId: r.partner_id,
    name: str(r.name),
    email: str(r.email),
    telephone: str(r.telephone),
    role: r.role,
    permissions: r.permissions ?? 'all',
    invitedAt: r.invited_at || undefined,
    acceptedAt: r.accepted_at || undefined,
  };
}

export function partnerUserToRow(u: PartnerUser): Row {
  return {
    id: u.id,
    partner_id: u.partnerId,
    name: u.name,
    email: u.email,
    telephone: u.telephone,
    role: u.role,
    permissions: u.permissions,
    invited_at: u.invitedAt ?? null,
    accepted_at: u.acceptedAt ?? null,
  };
}

/* ---------------------------------------------------------------
   Participation
   --------------------------------------------------------------- */

export function rowToInventory(r: Row): InventoryItem {
  return {
    id: r.id,
    type: r.type,
    name: str(r.name),
    description: str(r.description),
    cost: num(r.cost),
    quantity: num(r.quantity, 1),
    standNumber: str(r.stand_number),
    passType: r.pass_type || undefined,
    refs: arr(r.refs),
  };
}

export function inventoryToRow(i: InventoryItem, participationId: string, position: number): Row {
  return {
    id: i.id,
    participation_id: participationId,
    type: i.type,
    name: i.name,
    description: i.description,
    cost: i.cost,
    quantity: i.quantity,
    stand_number: i.standNumber,
    pass_type: i.passType ?? null,
    refs: i.refs,
    position,
  };
}

export function rowToRequestedFile(r: Row): RequestedFile {
  return {
    id: r.id,
    label: str(r.label),
    due: r.due,
    required: !!r.required,
    file: r.file_name
      ? {
          name: r.file_name,
          url: r.file_url || undefined,
          uploadedAt: r.uploaded_at,
          by: str(r.uploaded_by),
        }
      : null,
  };
}

export function requestedFileToRow(f: RequestedFile, participationId: string, position: number): Row {
  return {
    id: f.id,
    participation_id: participationId,
    label: f.label,
    due: f.due,
    required: f.required,
    file_name: f.file?.name ?? null,
    file_url: f.file?.url ?? null,
    uploaded_at: f.file?.uploadedAt ?? null,
    uploaded_by: f.file?.by ?? null,
    position,
  };
}

/** Child collections come from their own tables; pass them in. */
export function rowToParticipation(
  r: Row,
  inventory: InventoryItem[],
  requestedFiles: RequestedFile[],
  priceOverrides: Array<{ productId: string; price: number }>,
): Participation {
  return {
    id: r.id,
    eventId: r.event_id,
    partnerId: r.partner_id,
    reference: str(r.reference),
    standRef: r.stand_ref,
    packageId: r.package_id,
    addedEntitlements: arr<string>(r.added_entitlements),
    removedEntitlements: arr<string>(r.removed_entitlements),
    moduleOverrides: r.module_overrides || {},
    priceOverrides,
    formDueDates: r.form_due_dates || {},
    taskDueDates: r.task_due_dates || {},
    taskState: r.task_state || {},
    formState: r.form_state || {},
    inventory,
    requestedFiles,
    contract: r.contract_name ? { name: r.contract_name, dataUrl: str(r.contract_url) } : null,
    partnerNotes: str(r.partner_notes),
    internalNotes: str(r.internal_notes),
    leadUserId: r.lead_user_id,
    passAllocation: num(r.pass_allocation),
    marketing: r.marketing || {},
    suspended: !!r.suspended,
  };
}

export function participationToRow(p: Participation): Row {
  return {
    id: p.id,
    event_id: p.eventId,
    partner_id: p.partnerId,
    reference: p.reference,
    stand_ref: p.standRef,
    package_id: p.packageId,
    added_entitlements: p.addedEntitlements,
    removed_entitlements: p.removedEntitlements,
    module_overrides: p.moduleOverrides,
    form_due_dates: p.formDueDates ?? {},
    task_due_dates: p.taskDueDates ?? {},
    task_state: p.taskState,
    form_state: p.formState,
    contract_name: p.contract?.name ?? null,
    contract_url: p.contract?.dataUrl ?? null,
    partner_notes: p.partnerNotes,
    internal_notes: p.internalNotes,
    lead_user_id: p.leadUserId,
    pass_allocation: p.passAllocation,
    marketing: p.marketing ?? {},
    suspended: !!p.suspended,
  };
}

/* ---------------------------------------------------------------
   Orders
   --------------------------------------------------------------- */

export function rowToOrderItem(r: Row): OrderItem {
  return {
    productId: r.product_id,
    name: str(r.name),
    supplierId: r.supplier_id,
    qty: num(r.qty, 1),
    unitPrice: nullableNum(r.unit_price),
    options: r.options || {},
    answers: r.answers || {},
  };
}

export function orderItemToRow(i: OrderItem, orderId: string, position: number): Row {
  return {
    id: `${orderId}__${position}`,
    order_id: orderId,
    product_id: i.productId,
    name: i.name,
    supplier_id: i.supplierId,
    qty: i.qty,
    unit_price: i.unitPrice,
    options: i.options,
    answers: i.answers,
    position,
  };
}

export function rowToOrder(r: Row, items: OrderItem[]): Order {
  return {
    id: r.id,
    eventId: r.event_id,
    participationId: r.participation_id,
    reference: str(r.reference),
    status: r.status,
    submittedAt: r.submitted_at,
    billing: r.billing || {},
    items,
    invoiceStatus: str(r.invoice_status),
  };
}

export function orderToRow(o: Order): Row {
  return {
    id: o.id,
    event_id: o.eventId,
    participation_id: o.participationId,
    reference: o.reference,
    status: o.status,
    submitted_at: o.submittedAt,
    billing: o.billing,
    invoice_status: o.invoiceStatus ?? '',
  };
}

export function rowToSupplierOrderItem(r: Row): SupplierOrderItem {
  return {
    productId: r.product_id,
    name: str(r.name),
    qty: num(r.qty, 1),
    unitPrice: nullableNum(r.unit_price),
  };
}

export function supplierOrderItemToRow(
  i: SupplierOrderItem,
  supplierOrderId: string,
  position: number,
): Row {
  return {
    id: `${supplierOrderId}__${position}`,
    supplier_order_id: supplierOrderId,
    product_id: i.productId,
    name: i.name,
    qty: i.qty,
    unit_price: i.unitPrice,
    position,
  };
}

export function rowToSupplierOrder(r: Row, items: SupplierOrderItem[]): SupplierOrder {
  return {
    id: r.id,
    orderId: r.order_id,
    supplierId: r.supplier_id,
    reference: str(r.reference),
    status: r.status,
    submittedAt: r.submitted_at,
    confirmedAt: r.confirmed_at,
    approvalMode: r.approval_mode,
    items,
    subtotal: num(r.subtotal),
    tax: num(r.tax),
    total: num(r.total),
    quote: r.quote || null,
  };
}

export function supplierOrderToRow(s: SupplierOrder): Row {
  return {
    id: s.id,
    order_id: s.orderId,
    supplier_id: s.supplierId,
    reference: s.reference,
    status: s.status,
    approval_mode: s.approvalMode,
    submitted_at: s.submittedAt,
    confirmed_at: s.confirmedAt,
    subtotal: s.subtotal,
    tax: s.tax,
    total: s.total,
    quote: s.quote ?? null,
  };
}

/* ---------------------------------------------------------------
   Requests
   --------------------------------------------------------------- */

export function rowToRequestComment(r: Row): RequestComment {
  return {
    by: str(r.author),
    role: r.role,
    at: r.created_at,
    text: str(r.body),
    files: arr<string>(r.files),
  };
}

export function requestCommentToRow(c: RequestComment, requestId: string, index: number): Row {
  return {
    id: `${requestId}__c${index}`,
    request_id: requestId,
    author: c.by,
    role: c.role,
    body: c.text,
    files: c.files ?? [],
    created_at: c.at,
  };
}

export function rowToRequest(r: Row, comments: RequestComment[]): RequestRecord {
  return {
    id: r.id,
    eventId: r.event_id,
    participationId: r.participation_id,
    typeId: r.type_id,
    reference: str(r.reference),
    status: r.status,
    owner: str(r.owner),
    submittedBy: str(r.submitted_by),
    submittedAt: r.submitted_at,
    responseAt: r.response_at,
    values: r.values || {},
    files: arr<string>(r.files),
    comments,
  };
}

export function requestToRow(r: RequestRecord): Row {
  return {
    id: r.id,
    event_id: r.eventId,
    participation_id: r.participationId,
    type_id: r.typeId,
    reference: r.reference,
    status: r.status,
    owner: r.owner,
    submitted_by: r.submittedBy,
    submitted_at: r.submittedAt,
    response_at: r.responseAt,
    values: r.values,
    files: r.files,
  };
}

/* ---------------------------------------------------------------
   Webhooks
   --------------------------------------------------------------- */

export function rowToWebhookAttempt(r: Row): WebhookAttempt {
  return {
    at: r.attempted_at,
    responseCode: num(r.response_code),
    responseBody: str(r.response_body),
    ok: !!r.ok,
  };
}

export function webhookAttemptToRow(a: WebhookAttempt, eventId: string, index: number): Row {
  return {
    id: `${eventId}__a${index}`,
    webhook_event_id: eventId,
    attempted_at: a.at,
    response_code: a.responseCode,
    response_body: a.responseBody,
    ok: a.ok,
  };
}

export function rowToWebhookEvent(r: Row, attempts: WebhookAttempt[]): WebhookEvent {
  return {
    id: r.id,
    eventType: r.event_type,
    supplierOrderId: r.supplier_order_id,
    supplierId: r.supplier_id,
    sentAt: r.sent_at,
    idempotencyKey: str(r.idempotency_key),
    status: r.status,
    attempts,
    retryCount: num(r.retry_count),
    payload: r.payload,
    signature: str(r.signature),
  };
}

export function webhookEventToRow(w: WebhookEvent): Row {
  return {
    id: w.id,
    event_type: w.eventType,
    supplier_order_id: w.supplierOrderId,
    supplier_id: w.supplierId,
    idempotency_key: w.idempotencyKey,
    signature: w.signature ?? '',
    status: w.status,
    retry_count: w.retryCount,
    payload: w.payload,
    sent_at: w.sentAt,
  };
}

/* ---------------------------------------------------------------
   Notifications, email, audit
   --------------------------------------------------------------- */

export function rowToNotification(r: Row): Notification {
  return {
    id: r.id,
    participationId: r.participation_id,
    at: r.created_at,
    kind: str(r.kind),
    text: str(r.body),
    read: !!r.read,
    target: r.target || undefined,
  };
}

export function notificationToRow(n: Notification): Row {
  return {
    id: n.id,
    participation_id: n.participationId,
    kind: n.kind,
    body: n.text,
    read: n.read,
    target: n.target ?? null,
    created_at: n.at,
  };
}

export function rowToEmailTemplate(r: Row): EmailTemplate {
  return {
    id: r.id,
    name: str(r.name),
    subject: str(r.subject),
    body: str(r.body) || undefined,
    category: str(r.category) || undefined,
    enabled: !!r.enabled,
  };
}

export function emailTemplateToRow(t: EmailTemplate, eventId: string): Row {
  return {
    id: t.id,
    event_id: eventId,
    name: t.name,
    subject: t.subject,
    body: t.body ?? '',
    category: t.category ?? '',
    enabled: t.enabled,
  };
}

export function rowToSentEmail(r: Row): SentEmail {
  return {
    id: r.id,
    templateId: r.template_id,
    to: str(r.to_email),
    toName: str(r.to_name),
    partnerId: r.partner_id,
    subject: str(r.subject),
    body: str(r.body),
    from: str(r.from_email),
    fromName: str(r.from_name),
    at: r.sent_at,
    status: r.status,
  };
}

export function sentEmailToRow(e: SentEmail, eventId: string): Row {
  return {
    id: e.id,
    event_id: eventId,
    template_id: e.templateId,
    partner_id: e.partnerId,
    to_email: e.to,
    to_name: e.toName,
    from_email: e.from,
    from_name: e.fromName,
    subject: e.subject,
    body: e.body,
    status: e.status,
    sent_at: e.at,
  };
}

export function rowToAuditEntry(r: Row): AuditEntry {
  return {
    id: r.id,
    at: r.created_at,
    actor: str(r.actor),
    text: str(r.body),
    partnerId: r.partner_id,
  };
}

export function auditEntryToRow(a: AuditEntry, eventId: string): Row {
  return {
    id: a.id,
    event_id: eventId,
    partner_id: a.partnerId ?? null,
    actor: a.actor,
    body: a.text,
    created_at: a.at,
  };
}
