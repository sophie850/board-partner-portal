/* ============================================================
   BOARD Partner Portal — seed data

   A faithful port of the prototype's `data.js` seed. Three partners
   prove the personalisation system works: each holds a different set
   of entitlements, so each sees a different portal.

   This is also the seed the Postgres migration script reads, so the
   demo story survives the move to a real database.
   ============================================================ */

import type {
  AuditEntry,
  BoardEvent,
  ContentCategory,
  ContentPage,
  Currency,
  Db,
  EmailTemplate,
  Entitlement,
  FileAsset,
  FormDef,
  Notification,
  Order,
  OrganiserUser,
  PackageTemplate,
  Participation,
  Partner,
  PartnerUser,
  Product,
  RequestRecord,
  RequestType,
  ShopCategory,
  Supplier,
  SupplierOrder,
  TaskTemplate,
  WebhookEvent,
} from '@/lib/types';

export const CURRENCIES: Currency[] = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'Pound sterling (£)' },
  { code: 'USD', symbol: '$', label: 'US dollar ($)' },
  { code: 'CHF', symbol: 'CHF ', label: 'Swiss franc (CHF)' },
  { code: 'AED', symbol: 'AED ', label: 'UAE dirham (AED)' },
];

const EVENT_ID = 'board_monaco_2027';

/* ---------------------------------------------------------------
   Event
   --------------------------------------------------------------- */

const event: BoardEvent = {
  id: EVENT_ID,
  name: 'BOARD Monaco 2027',
  shortName: 'BOARD 2027',
  venue: 'Grimaldi Forum',
  city: 'Monaco',
  startDate: '2027-03-22',
  endDate: '2027-03-24',
  currency: 'EUR',
  currencySymbol: '€',
  timezone: 'Europe/Monaco',
  tagline: 'Take your seat at the table.',
  sender: {
    name: 'BOARD Operations',
    email: 'operations@boardsummits.com',
    signature: 'BOARD Operations\nGrimaldi Forum, Monaco\nboardsummits.com',
    logo: '',
  },
  terminology: {
    partner: 'Partner',
    partnerPlural: 'Partners',
    partnerPortal: 'Partner Portal',
    participation: 'Participation',
    task: 'Task',
    taskPlural: 'Tasks',
    request: 'Request',
    requestPlural: 'Requests',
  },
};

/* ---------------------------------------------------------------
   Entitlements — the master vocabulary
   --------------------------------------------------------------- */

const entitlements: Entitlement[] = [
  { key: 'has_exhibition_space', label: 'Exhibition space' },
  { key: 'has_turnkey_stand', label: 'Turnkey stand package' },
  /*
   * Raw space — the exhibitor builds their own stand rather than
   * taking the shell scheme. It is the answer to the stand-build
   * question on Form 6.1, and it is what brings the venue's Security
   * Information (6.6) and Safety Questionnaire (6.8) with it. Held as
   * an entitlement rather than read off the form answer so an
   * organiser can set it the moment they know, without waiting for
   * the exhibitor to fill anything in.
   */
  { key: 'has_raw_space', label: 'Raw space (builds their own stand)' },
  { key: 'has_meetings_package', label: 'Meetings package' },
  { key: 'has_content_session', label: 'Content session' },
  { key: 'has_hospitality_activation', label: 'Hospitality activation' },
  { key: 'has_branding_inventory', label: 'Branding inventory' },
  { key: 'requires_stand_approval', label: 'Requires stand approval' },
  { key: 'can_order_av', label: 'Can order AV' },
  { key: 'can_order_furniture', label: 'Can order furniture & carpet' },
  { key: 'can_order_signage', label: 'Can order signage' },
  { key: 'can_order_catering', label: 'Can order catering' },
];

/* ---------------------------------------------------------------
   Suppliers — webhookSecret must never reach a client
   --------------------------------------------------------------- */

const suppliers: Supplier[] = [
  {
    id: 'sup_aztec',
    eventId: EVENT_ID,
    name: 'Aztec',
    category: 'AV & Technical',
    contact: 'Aztec Events Desk',
    notifEmails: ['orders@aztec-events.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/aztec/',
    routingKey: 'board-av',
    webhookSecret: 'whsec_aztec_9f2a41c7',
    active: true,
    approvalDefault: 'auto',
    notes: 'Official AV & technical services partner. Fast confirmation on catalogue items.',
  },
  {
    id: 'sup_ges',
    eventId: EVENT_ID,
    name: 'GES',
    category: 'Stand build, furniture, carpet & electrical',
    contact: 'GES Monaco Operations',
    notifEmails: ['board@ges.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/ges/',
    routingKey: 'board-ges',
    webhookSecret: 'whsec_ges_4b71de90',
    active: true,
    approvalDefault: 'manual',
    notes:
      'Recommended stand builder & general services contractor. Structural items need organiser review.',
  },
  {
    id: 'sup_popshap',
    eventId: EVENT_ID,
    name: 'Popshap',
    category: 'Signage & graphics',
    contact: 'Popshap Studio',
    notifEmails: ['print@popshap.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/popshap/',
    routingKey: 'board-signage',
    webhookSecret: 'whsec_popshap_2c88fa13',
    active: true,
    approvalDefault: 'auto',
    notes: 'Signage & large-format graphics. Requires print-ready artwork.',
  },
  {
    id: 'sup_smr',
    eventId: EVENT_ID,
    name: 'SMR Catering',
    category: 'Catering & hospitality',
    contact: 'Société Monégasque de Restauration',
    notifEmails: ['events@smr.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/smr/',
    routingKey: 'board-catering',
    webhookSecret: 'whsec_smr_77a0be52',
    active: true,
    approvalDefault: 'manual',
    notes: 'Grimaldi Forum catering. Head counts confirmed 14 days out.',
  },
  {
    id: 'sup_riviera',
    eventId: EVENT_ID,
    name: 'Riviera Event Logistics',
    category: 'Logistics & freight',
    contact: 'Riviera Freight Team',
    notifEmails: ['ops@riviera-logistics.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/riviera/',
    routingKey: 'board-logistics',
    webhookSecret: 'whsec_riviera_0d5c9a86',
    active: true,
    approvalDefault: 'quote',
    notes: 'Freight, material handling & storage. Most items are quote-required.',
  },
  {
    id: 'sup_grimaldi',
    eventId: EVENT_ID,
    name: 'Grimaldi Forum',
    category: 'Venue services — electrical, power & internet',
    contact: 'Grimaldi Forum Technical Services',
    notifEmails: ['technical@grimaldiforum.example'],
    webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/grimaldi/',
    routingKey: 'board-venue',
    webhookSecret: 'whsec_grimaldi_a3e1c7d5',
    active: true,
    approvalDefault: 'auto',
    notes:
      'Official venue. Sole provider of mains electrical connections, power and wired internet.',
  },
];

/* ---------------------------------------------------------------
   Shop
   --------------------------------------------------------------- */

const shopCategories: ShopCategory[] = [
  { id: 'cat_av', name: 'AV & technical' },
  { id: 'cat_electrical', name: 'Electrical & lighting' },
  { id: 'cat_furniture', name: 'Furniture & carpet' },
  { id: 'cat_signage', name: 'Signage & graphics' },
  { id: 'cat_catering', name: 'Catering' },
  { id: 'cat_logistics', name: 'Logistics' },
  { id: 'cat_internet', name: 'Internet & connectivity' },
];

const products: Product[] = [
  {
    id: 'prod_screen55',
    image: '/assets/board-bg-3.png',
    eventId: EVENT_ID,
    name: '55" screen on floor stand',
    supplierId: 'sup_aztec',
    categoryId: 'cat_av',
    description: 'Full-HD 55" display on adjustable floor stand, incl. cabling.',
    unit: 'each',
    basePrice: 750,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 8,
    orderDeadline: '2027-02-28',
    leadTimeDays: 10,
    active: true,
    visibility: { requires: 'can_order_av' },
    options: [{ name: 'Mounting', values: ['Floor stand', 'Wall bracket'] }],
    questions: [
      { key: 'installation_location', label: 'Installation location', type: 'short_text', required: true },
      { key: 'onsite_contact', label: 'On-site contact', type: 'short_text', required: true },
    ],
  },
  {
    id: 'prod_screen85',
    eventId: EVENT_ID,
    name: '85" screen on floor stand',
    supplierId: 'sup_aztec',
    categoryId: 'cat_av',
    description: 'Large-format 85" 4K display on floor stand.',
    unit: 'each',
    basePrice: 1200,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 4,
    orderDeadline: '2027-02-28',
    leadTimeDays: 12,
    active: true,
    visibility: { requires: 'can_order_av' },
    options: [],
    questions: [
      { key: 'installation_location', label: 'Installation location', type: 'short_text', required: true },
    ],
  },
  {
    id: 'prod_pa',
    eventId: EVENT_ID,
    name: 'PA & speaker set',
    supplierId: 'sup_aztec',
    categoryId: 'cat_av',
    description: '2× powered speakers, mixer and 1× radio mic.',
    unit: 'set',
    basePrice: 480,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 2,
    orderDeadline: '2027-02-28',
    leadTimeDays: 7,
    active: true,
    visibility: { requires: 'can_order_av' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_lead',
    eventId: EVENT_ID,
    name: 'Lead retrieval licence',
    supplierId: 'sup_aztec',
    categoryId: 'cat_av',
    description: 'App-based lead capture licence for the duration of the event.',
    unit: 'licence',
    basePrice: 260,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 20,
    orderDeadline: '2027-03-10',
    leadTimeDays: 3,
    active: true,
    visibility: {},
    options: [],
    questions: [],
  },
  {
    id: 'prod_rig',
    eventId: EVENT_ID,
    name: 'Custom LED rigging package',
    supplierId: 'sup_aztec',
    categoryId: 'cat_av',
    description: 'Bespoke overhead LED rig — quoted on stand plan.',
    unit: 'package',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 1,
    orderDeadline: '2027-02-15',
    leadTimeDays: 25,
    active: true,
    visibility: { requires: 'can_order_av' },
    options: [],
    questions: [
      { key: 'rig_notes', label: 'Rigging requirements & stand plan notes', type: 'long_text', required: true },
    ],
  },
  {
    id: 'prod_carpet',
    image: '/assets/board-bg-7.png',
    eventId: EVENT_ID,
    name: 'Stand carpet',
    supplierId: 'sup_ges',
    categoryId: 'cat_furniture',
    description: 'Event-grade carpet, supplied & fitted.',
    unit: 'per m²',
    basePrice: 22,
    taxRate: 0.2,
    approvalMode: 'manual',
    minQty: 9,
    maxQty: 200,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'can_order_furniture' },
    options: [{ name: 'Colour', values: ['Rich black', 'Off white', 'Teal', 'Anthracite'] }],
    questions: [
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },
      { key: 'area_m2', label: 'Area (m²)', type: 'number', required: true },
    ],
  },
  {
    id: 'prod_furniture',
    image: '/assets/board-bg-5.png',
    eventId: EVENT_ID,
    name: 'Lounge furniture set',
    supplierId: 'sup_ges',
    categoryId: 'cat_furniture',
    description: '2× armchairs, 1× low table, 1× side unit.',
    unit: 'set',
    basePrice: 650,
    taxRate: 0.2,
    approvalMode: 'manual',
    minQty: 1,
    maxQty: 5,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'can_order_furniture' },
    options: [{ name: 'Finish', values: ['Black / oak', 'White / chrome'] }],
    questions: [],
  },
  {
    id: 'prod_power',
    eventId: EVENT_ID,
    name: '500W mains supply (24h)',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_electrical',
    description: 'Single-phase 500W mains supply with socket, 24-hour. Supplied by the venue.',
    unit: 'each',
    basePrice: 180,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 10,
    orderDeadline: '2027-02-20',
    leadTimeDays: 10,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [{ key: 'location', label: 'Position on stand', type: 'short_text', required: true }],
  },
  {
    id: 'prod_internet',
    eventId: EVENT_ID,
    name: 'Wired internet connection (10 Mbps dedicated)',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_internet',
    description: 'Dedicated wired line with fixed IP. Supplied by the venue.',
    unit: 'connection',
    basePrice: 420,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 4,
    orderDeadline: '2027-02-20',
    leadTimeDays: 10,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [{ key: 'location', label: 'Position on stand', type: 'short_text', required: true }],
  },
  {
    id: 'prod_wifi',
    eventId: EVENT_ID,
    name: 'Premium Wi-Fi access (per device)',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_internet',
    description: 'High-priority venue Wi-Fi, per device, for the event duration.',
    unit: 'device',
    basePrice: 90,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 20,
    orderDeadline: '2027-03-05',
    leadTimeDays: 3,
    active: true,
    visibility: {},
    options: [],
    questions: [],
  },
  {
    id: 'prod_lighting',
    eventId: EVENT_ID,
    name: 'LED spotlight (per unit)',
    supplierId: 'sup_ges',
    categoryId: 'cat_electrical',
    description: 'Arm-mounted LED spot, warm white.',
    unit: 'each',
    basePrice: 45,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 2,
    maxQty: 20,
    orderDeadline: '2027-02-20',
    leadTimeDays: 10,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_banner',
    image: '/assets/board-bg-2.png',
    eventId: EVENT_ID,
    name: 'Printed fabric banner',
    supplierId: 'sup_popshap',
    categoryId: 'cat_signage',
    description: 'Tension-fabric banner, printed from supplied artwork.',
    unit: 'each',
    basePrice: 140,
    taxRate: 0.2,
    approvalMode: 'auto',
    minQty: 1,
    maxQty: 20,
    orderDeadline: '2027-03-01',
    leadTimeDays: 7,
    active: true,
    visibility: { requires: 'can_order_signage' },
    options: [{ name: 'Size', values: ['1×2m', '1×2.5m', '2×3m'] }],
    questions: [
      { key: 'artwork', label: 'Print-ready artwork', type: 'file_upload', required: true },
      { key: 'dimensions', label: 'Confirm finished dimensions', type: 'short_text', required: true },
    ],
  },
  {
    id: 'prod_backwall',
    eventId: EVENT_ID,
    name: 'Branded back-wall graphic',
    supplierId: 'sup_popshap',
    categoryId: 'cat_signage',
    description: 'Full back-wall graphic, printed & installed.',
    unit: 'each',
    basePrice: 890,
    taxRate: 0.2,
    approvalMode: 'manual',
    minQty: 1,
    maxQty: 3,
    orderDeadline: '2027-02-25',
    leadTimeDays: 12,
    active: true,
    visibility: { requires: 'has_branding_inventory' },
    options: [],
    questions: [{ key: 'artwork', label: 'Print-ready artwork', type: 'file_upload', required: true }],
  },
  {
    id: 'prod_catering',
    image: '/assets/board-bg-9.png',
    eventId: EVENT_ID,
    name: 'Networking reception catering',
    supplierId: 'sup_smr',
    categoryId: 'cat_catering',
    description: 'Canapés & drinks reception, per head.',
    unit: 'per head',
    basePrice: 65,
    taxRate: 0.1,
    approvalMode: 'manual',
    minQty: 20,
    maxQty: 300,
    orderDeadline: '2027-03-01',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_hospitality_activation' },
    options: [{ name: 'Menu', values: ['Riviera canapés', 'Premium seafood', 'Vegetarian'] }],
    questions: [
      { key: 'service_time', label: 'Service time', type: 'time', required: true },
      { key: 'location', label: 'Service location', type: 'short_text', required: true },
    ],
  },
  {
    id: 'prod_freight',
    eventId: EVENT_ID,
    name: 'Forklift & material handling',
    supplierId: 'sup_riviera',
    categoryId: 'cat_logistics',
    description: 'On-site forklift with operator — quoted per requirement.',
    unit: 'service',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 1,
    orderDeadline: '2027-03-05',
    leadTimeDays: 5,
    active: true,
    visibility: {},
    options: [],
    questions: [
      {
        key: 'handling_notes',
        label: 'What needs handling? (weights, dimensions, times)',
        type: 'long_text',
        required: true,
      },
    ],
  },
  /* -------------------------------------------------------------
     Grimaldi Forum order form (Form 6.2)

     Anna's Order Form is a catalogue with a quantity box against each
     line, which is a shop rather than a form. Built as products so it
     gets the cart, the order deadlines, the supplier webhook and the
     quote flow, none of which a form would have.

     Every line is quote-required, because the form says so: "Rates
     are set by Grimaldi Forum's current catalogue; a priced
     confirmation follows." So no price is shown, the partner accepts
     or declines the quote, and nothing is confirmed until they do.

     The deadline matches the one the venue's own power and wired
     internet already carry, rather than being invented here. Leaving
     these open-ended would have been worse than a wrong guess: a
     single dateless product keeps the whole shop open forever, which
     the order-deadline tests caught.
     ------------------------------------------------------------- */
  {
    id: 'prod_gf_carpet',
    eventId: EVENT_ID,
    name: 'Short-pile carpet, basic colours',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_furniture',
    description: 'Laid to the stand footprint. Colour is chosen on Form 6.4.',
    unit: 'per m²',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 400,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_gf_flag',
    eventId: EVENT_ID,
    name: 'Double-sided flag sign (60 × 20 cm)',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_signage',
    description: 'Hanging stand identifier. Wording is given on Form 6.4.',
    unit: 'unit',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 10,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_gf_storage',
    eventId: EVENT_ID,
    name: 'Storage 1 m² (panel + lockable door)',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_furniture',
    description: 'Lockable store built into the stand footprint.',
    unit: 'unit',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 6,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [
      {
        key: 'storage_position',
        label: 'Where on the stand should it go?',
        type: 'short_text',
        required: true,
      },
    ],
  },
  {
    id: 'prod_gf_internet',
    eventId: EVENT_ID,
    name: 'Pro internet, 5 MB',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_internet',
    description: 'Wired connection for the run of the event. The venue is the sole provider.',
    unit: 'event package',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 4,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_gf_power',
    eventId: EVENT_ID,
    name: 'Monophase 220V, 1–2 KW box',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_electrical',
    description: 'Mains connection. Mark its position on your stand diagram (Form 6.5).',
    unit: 'unit',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 8,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
  {
    id: 'prod_gf_hostess',
    eventId: EVENT_ID,
    name: 'Bilingual hostess, 8-hour day',
    supplierId: 'sup_grimaldi',
    categoryId: 'cat_logistics',
    description: 'Languages and uniform are set out on Form 6.4.',
    unit: 'per day',
    basePrice: null,
    taxRate: 0.2,
    approvalMode: 'quote',
    minQty: 1,
    maxQty: 12,
    orderDeadline: '2027-02-20',
    leadTimeDays: 14,
    active: true,
    visibility: { requires: 'has_exhibition_space' },
    options: [],
    questions: [],
  },
];

/* ---------------------------------------------------------------
   Forms — field-level visibility is how two partners get
   the same form but see different fields
   --------------------------------------------------------------- */

const forms: FormDef[] = [
  {
    id: 'f_profile',
    eventId: EVENT_ID,
    title: 'Company profile',
    category: 'Onboarding',
    description: 'Tell us about your organisation. Used across the programme and printed materials.',
    dueDate: '2027-01-30',
    assign: { type: 'all' },
    allowResubmit: true,
    fields: [
      { key: 'legal_name', label: 'Legal company name', type: 'short_text', required: true },
      {
        key: 'display_name',
        label: 'Display name',
        type: 'short_text',
        required: true,
        help: 'As it should appear on signage and the delegate app.',
      },
      {
        key: 'sector',
        label: 'Sector',
        type: 'single_select',
        options: ['Technology', 'Financial services', 'Advisory', 'Industrial', 'Other'],
        required: true,
      },
      { key: 'website', label: 'Website', type: 'url', required: false },
      { key: 'logo', label: 'Logo (vector preferred)', type: 'image_upload', required: true },
      {
        key: 'description',
        label: 'Company description',
        type: 'long_text',
        required: true,
        help: '60 words max.',
      },
      { key: 'primary_contact', label: 'Primary contact', type: 'contact', required: true },
      // Bespoke field — visible ONLY to Meridian Partners (acceptance test #5)
      {
        key: 'activation_brief',
        label: 'Bespoke activation concept brief',
        type: 'long_text',
        required: true,
        visibility: { type: 'partner', partners: ['part_c'] },
        help: 'Only shown to bespoke partners.',
      },
    ],
  },
  {
    id: 'f_meetings',
    eventId: EVENT_ID,
    title: 'Meetings participant details',
    category: 'Meetings',
    description: 'Details of the representatives taking part in the meetings programme.',
    dueDate: '2027-02-07',
    assign: { type: 'entitlement', key: 'has_meetings_package' },
    allowResubmit: true,
    fields: [
      { key: 'rep_count', label: 'Number of participating representatives', type: 'number', required: true },
      { key: 'lead_rep', label: 'Lead representative', type: 'contact', required: true },
      {
        key: 'focus_sectors',
        label: 'Sectors of interest',
        type: 'multi_select',
        options: ['Technology', 'Financial services', 'Advisory', 'Industrial', 'Healthcare'],
        required: true,
      },
      { key: 'objectives', label: 'Meeting objectives', type: 'long_text', required: false },
    ],
  },
  {
    id: 'f_speaker',
    eventId: EVENT_ID,
    title: 'Speaker & session details',
    category: 'Content',
    description: 'Confirm your speaker and session information for the programme.',
    dueDate: '2027-02-01',
    assign: { type: 'entitlement', key: 'has_content_session' },
    fields: [
      { key: 'session_title', label: 'Session title', type: 'short_text', required: true },
      { key: 'speaker', label: 'Speaker', type: 'contact', required: true },
      { key: 'bio', label: 'Speaker biography', type: 'long_text', required: true },
      { key: 'headshot', label: 'Speaker headshot', type: 'image_upload', required: true },
      { key: 'av_needs', label: 'AV requirements', type: 'long_text', required: false },
      {
        key: 'presentation_deadline_ack',
        label: 'I understand presentations are due 5 working days before the event.',
        type: 'acknowledgement',
        required: true,
      },
    ],
  },
  {
    id: 'f_passes',
    eventId: EVENT_ID,
    title: 'Delegate pass registration',
    category: 'Registration',
    description: 'Register the named delegates for your allocated passes.',
    dueDate: '2027-03-01',
    assign: { type: 'all' },
    allowResubmit: true,
    fields: [
      { key: 'allocation', label: 'Passes allocated', type: 'number', required: true, readonly: true },
      { key: 'delegate_1', label: 'Delegate 1', type: 'contact', required: true },
      { key: 'delegate_2', label: 'Delegate 2', type: 'contact', required: false },
      { key: 'dietary', label: 'Dietary requirements', type: 'long_text', required: false },
    ],
  },
  /* -------------------------------------------------------------
     The Grimaldi Forum exhibitor manual

     Forms 6.1–6.8 and 2.3, as the venue actually asks them. The
     numbering is theirs and is kept: an exhibitor cross-checking
     against the manual, or a contractor being told to "send us 6.6",
     needs the same reference the venue uses.

     Deadlines are deliberately left unset. The venue's own return
     dates are not in the pack, and a date invented here would start
     chasing partners against a day nobody agreed — a form with no
     resolved date reads "Date to be confirmed" and is never flagged
     overdue, which is the honest state until Anna fills them in.
     ------------------------------------------------------------- */
  {
    id: 'gf_exhibitor',
    eventId: EVENT_ID,
    title: 'Exhibitor information (Form 6.1)',
    category: 'Venue forms',
    description:
      'Compulsory for every exhibitor. Returned alongside the Security Form and Stand Diagram.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_heading', label: 'Exhibiting company', type: 'section_heading' },
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true, help: 'Legal entity name.' },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true, help: 'e.g. B14' },

      { key: 'contacts_heading', label: 'Contacts', type: 'section_heading' },
      {
        key: 'contacts_note',
        label:
          'Three contacts are required: the person preparing and supervising the stand, the person present on site, and the stand contractor.',
        type: 'guidance',
      },
      { key: 'contact_preparing', label: 'Preparing and supervising the stand', type: 'contact', required: true },
      { key: 'contact_preparing_company', label: 'Their company', type: 'short_text', required: false },
      { key: 'contact_onsite', label: 'Present on site', type: 'contact', required: true },
      { key: 'contact_onsite_company', label: 'Their company', type: 'short_text', required: false },
      { key: 'contact_contractor', label: 'Stand contractor', type: 'contact', required: false },
      { key: 'contact_contractor_company', label: 'Their company', type: 'short_text', required: false },

      { key: 'billing_heading', label: 'Billing', type: 'section_heading' },
      { key: 'billing_company', label: 'Billing company name', type: 'short_text', required: true },
      { key: 'vat_number', label: 'VAT number', type: 'short_text', required: false },
      { key: 'billing_address', label: 'Billing address', type: 'short_text', required: true },
      { key: 'billing_locality', label: 'Postcode / City / Country', type: 'short_text', required: true },

      { key: 'build_heading', label: 'Stand build', type: 'section_heading' },
      {
        key: 'stand_build',
        label: 'How will your stand be built?',
        type: 'single_select',
        required: true,
        options: [
          'We have our own booth and will do the set-up',
          'We will use the shell-scheme booth provided by the organisation',
          'We want to contact Grimaldi Forum for a custom-made stand',
        ],
        help: 'Building your own stand is what the venue calls raw space, and it brings Forms 6.6 and 6.8 with it.',
      },
    ],
  },
  {
    id: 'gf_diagram',
    eventId: EVENT_ID,
    title: 'Stand diagram (Form 6.5)',
    category: 'Venue forms',
    description: 'Submit with your orders. One grid square equals one metre.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true, help: 'e.g. B14' },
      {
        key: 'diagram_note',
        label:
          'Mark the position of every ordered connection and fixture on the grid. One grid square equals one metre. Label the neighbouring stand or aisle on all sides.',
        type: 'guidance',
      },
      { key: 'diagram', label: 'Your stand diagram', type: 'document_upload', required: true },
      {
        key: 'technical_notes',
        label: 'Notes for the Grimaldi Forum technical team',
        type: 'long_text',
        required: false,
        help: 'Anything the diagram cannot show.',
      },
    ],
  },
  {
    id: 'gf_additional',
    eventId: EVENT_ID,
    title: 'Additional information (Form 6.4)',
    category: 'Venue forms',
    description: 'On-site staffing schedules, booth setup and technical connectivity.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },

      { key: 'staffing_heading', label: 'Staffing schedules', type: 'section_heading' },
      { key: 'staffing_note', label: 'One row per service. Give the dates, hours and anything the service needs to know.', type: 'guidance' },
      { key: 'hostess', label: 'Hostess — dates, hours, language and uniform', type: 'long_text', required: false },
      { key: 'warehouseman', label: 'Warehouseman — dates and hours', type: 'long_text', required: false },
      { key: 'security_staff', label: 'Security — dates and hours', type: 'long_text', required: false },

      { key: 'setup_heading', label: 'Booth setup', type: 'section_heading' },
      {
        key: 'carpet',
        label: 'Carpet colour',
        type: 'single_select',
        required: false,
        options: [
          'Black (ref 270)',
          'Grey (ref 262)',
          'Red (ref 271)',
          'Navy blue (ref 227)',
          'Blue (ref 265)',
          'Other — see below',
        ],
      },
      { key: 'carpet_other', label: 'Other (custom colour, over 25 m²)', type: 'short_text', required: false, condition: { field: 'carpet', equals: 'Other — see below' } },
      { key: 'signage_text', label: 'Signage text', type: 'short_text', required: false, help: 'Exactly as it should be produced.' },

      { key: 'connectivity_heading', label: 'Technical connectivity', type: 'section_heading' },
      { key: 'av', label: 'AV connection', type: 'single_select', required: false, options: ['PC DVI', 'HDMI'] },
      { key: 'wifi_ssid', label: 'WiFi SSID', type: 'short_text', required: false },
      { key: 'wifi_password', label: 'WiFi password', type: 'short_text', required: false },

      { key: 'signature', label: 'Authorised signature', type: 'short_text', required: true },
      { key: 'signed_date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    id: 'gf_security',
    eventId: EVENT_ID,
    title: 'Security information (Form 6.6)',
    category: 'Venue forms',
    description:
      'Raw-space stands only. Confirms the safety declarations required for booths not fitted by Grimaldi Forum.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_raw_space'] },
    allowResubmit: true,
    fields: [
      { key: 'contractor_heading', label: 'Stand & contractor', type: 'section_heading' },
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'booth_number', label: 'Booth number', type: 'short_text', required: true },
      { key: 'contractor', label: 'Stand-decoration contractor', type: 'short_text', required: true },
      { key: 'contractor_contact', label: 'Contractor contact', type: 'short_text', required: true },

      { key: 'declarations_heading', label: 'Declarations', type: 'section_heading' },
      { key: 'declarations_note', label: 'Select one option per declaration.', type: 'guidance' },
      {
        key: 'devices',
        label: 'Declaration of devices in operation',
        type: 'single_select',
        required: true,
        options: [
          'I declare not to bring or use any device requiring this document.',
          'Enclosed document (see Form 6.7).',
        ],
      },
      {
        key: 'questionnaire',
        label: 'Safety questionnaire',
        type: 'single_select',
        required: true,
        options: [
          'I declare not to bring my own construction materials.',
          'Enclosed document, with certificates for each material.',
        ],
      },
      {
        key: 'electrical',
        label: 'Certificate of electrical compliance',
        type: 'single_select',
        required: true,
        options: [
          'I declare not to install any electrical fitting.',
          'Fittings installed by competent staff, to code.',
        ],
      },
      { key: 'supporting_documents', label: 'Attach supporting documents', type: 'document_upload', required: false },
      { key: 'signature', label: 'Authorised signature', type: 'short_text', required: true },
      { key: 'signed_date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    id: 'gf_equipment',
    eventId: EVENT_ID,
    title: 'Equipment & machinery in operation (Form 6.7)',
    category: 'Venue forms',
    description:
      'Only if applicable. Required for heat or combustion engines, smoke generators, gas, lasers or any machinery in operation.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_heading', label: 'Company', type: 'section_heading' },
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },

      { key: 'equipment_heading', label: 'Equipment declared', type: 'section_heading' },
      { key: 'equipment_note', label: 'Describe each item. Add every one you intend to operate on the stand.', type: 'guidance' },
      { key: 'item_name', label: 'Item / equipment name', type: 'short_text', required: true },
      { key: 'item_purpose', label: 'Purpose / use case', type: 'long_text', required: true },
      { key: 'item_specs', label: 'Specifications (power / fuel / qty)', type: 'long_text', required: true },
      { key: 'item_safety', label: 'Safety measures', type: 'long_text', required: true },
      { key: 'further_items', label: 'Any further items', type: 'long_text', required: false, help: 'One per line, with the same detail as above.' },

      { key: 'compliance_heading', label: 'Compliance checklist', type: 'section_heading' },
      {
        key: 'confirm_screened',
        label:
          'I confirm all machinery is either screened or cased, or set back at least 1 metre from the stand edge.',
        type: 'acknowledgement',
        required: true,
      },
      {
        key: 'confirm_fire_safety',
        label: 'I confirm I have read and will adhere to the fire safety and liability requirements.',
        type: 'acknowledgement',
        required: true,
      },
      { key: 'certificates', label: 'Material safety certificates, where applicable', type: 'document_upload', required: false },
      { key: 'signature', label: 'Authorised signature', type: 'short_text', required: true },
      { key: 'signed_date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    id: 'gf_safety',
    eventId: EVENT_ID,
    title: 'Safety questionnaire (Form 6.8)',
    category: 'Venue forms',
    description:
      'Raw space only. Materials fire rating, required for booths not fitted by Grimaldi Forum.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_raw_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },

      { key: 'materials_heading', label: 'Materials declared', type: 'section_heading' },
      {
        key: 'ratings_note',
        label:
          'French fire ratings: M0 fireproof, M1 non-flammable, M2 low flammability, M3 medium flammability.',
        type: 'guidance',
      },
      {
        key: 'required_note',
        label:
          'Ratings required — booth framework M0/M1 · partition walls M0/M1 · solid hard wood M2/M3 (14 mm min) · resinous wood, plywood, chipboard M2/M3 · melamine-coated panel M2/M3 (7–8 mm min) · partition wall covering M0/M1/M2 · floor covering M3 · ceiling M1/M2 · awning M1/M2 · plastic material M1/M2 · paint water-based · curtains and relief elements M0/M1/M2 · transparent or translucent elements M1/M2 · furniture M0/M1/M2/M3 · artificial flowers M2.',
        type: 'guidance',
      },
      {
        key: 'materials_declared',
        label: 'Materials used, with thickness and rating provided',
        type: 'long_text',
        required: true,
        help: 'One material per line: material, thickness / rating provided, trade mark, position on the diagram, laboratory certificate number.',
      },
      {
        key: 'certificates',
        label: 'Laboratory certificates for every material',
        type: 'document_upload',
        required: true,
      },
      { key: 'signature', label: 'Authorised signature', type: 'short_text', required: true },
      { key: 'signed_date', label: 'Date', type: 'date', required: true },
    ],
  },
  {
    id: 'gf_wideload',
    eventId: EVENT_ID,
    title: 'Wide load escort request (Form 2.3)',
    category: 'Venue forms',
    description:
      'Only for oversized vehicles. A police escort is required above 18.75 m long, 2.60 m wide or 4.30 m high.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_heading', label: 'Company', type: 'section_heading' },
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },
      { key: 'requester_name', label: 'Requester name', type: 'short_text', required: true },
      { key: 'requester_mobile', label: 'Requester mobile', type: 'telephone', required: true },

      { key: 'dimensions_heading', label: 'Vehicle dimensions', type: 'section_heading' },
      {
        key: 'thresholds_note',
        label: 'A police escort is triggered when any one of these thresholds is exceeded: length 18.75 m, width 2.60 m, height 4.30 m.',
        type: 'guidance',
      },
      { key: 'length_m', label: 'Length (m)', type: 'number', required: true },
      { key: 'width_m', label: 'Width (m)', type: 'number', required: true },
      { key: 'height_m', label: 'Height (m)', type: 'number', required: true },
      { key: 'vehicle', label: 'Vehicle type / registration', type: 'short_text', required: true },

      { key: 'movement_heading', label: 'Requested movement', type: 'section_heading' },
      { key: 'movement_note', label: 'Must fall between 21:00 and 07:00.', type: 'guidance' },
      { key: 'arrival_date', label: 'Arrival date', type: 'date', required: true },
      { key: 'arrival_time', label: 'Arrival time', type: 'time', required: true },
      { key: 'departure_date', label: 'Departure date', type: 'date', required: true },
      { key: 'departure_time', label: 'Departure time', type: 'time', required: true },
      { key: 'escort_notes', label: 'Notes for the escort team', type: 'long_text', required: false },
    ],
  },
  {
    id: 'gf_payment',
    eventId: EVENT_ID,
    title: 'Payment (Form 6.3)',
    category: 'Venue forms',
    description: 'Compulsory for every exhibitor. How you will settle your order form total.',
    dueDate: null,
    assign: { type: 'entitlement', keys: ['has_exhibition_space'] },
    allowResubmit: true,
    fields: [
      { key: 'company_name', label: 'Company name', type: 'short_text', required: true },
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },

      { key: 'method_heading', label: 'Payment method', type: 'section_heading' },
      {
        key: 'method',
        label: 'Choose one method',
        type: 'single_select',
        required: true,
        options: ['Bank cheque', 'Bank transfer, in Euro', 'Credit card'],
      },
      {
        key: 'transfer_confirmation',
        label: 'Attach transfer confirmation',
        type: 'document_upload',
        required: false,
        condition: { field: 'method', equals: 'Bank transfer, in Euro' },
      },
      { key: 'signature', label: 'Authorised signature', type: 'short_text', required: true },
      { key: 'signed_date', label: 'Date', type: 'date', required: true },
    ],
  },
];

/* ---------------------------------------------------------------
   Request types
   --------------------------------------------------------------- */

const requestTypes: RequestType[] = [
  {
    id: 'rt_stand_design',
    eventId: EVENT_ID,
    name: 'Stand design approval',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'stand_number', label: 'Stand number', type: 'short_text', required: true },
      { key: 'max_height', label: 'Maximum build height (m)', type: 'number', required: true },
      { key: 'plans', label: 'Design plans (PDF)', type: 'document_upload', required: true },
      { key: 'notes', label: 'Notes', type: 'long_text', required: false },
    ],
  },
  {
    id: 'rt_rigging',
    eventId: EVENT_ID,
    name: 'Rigging approval',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'rig_weight', label: 'Total rig weight (kg)', type: 'number', required: true },
      { key: 'rig_plan', label: 'Rigging plan', type: 'document_upload', required: true },
    ],
  },
  {
    id: 'rt_hosted',
    eventId: EVENT_ID,
    name: 'Hosted event approval',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'event_name', label: 'Function name', type: 'short_text', required: true },
      { key: 'date_time', label: 'Date & time', type: 'short_text', required: true },
      { key: 'headcount', label: 'Expected headcount', type: 'number', required: true },
      { key: 'location', label: 'Preferred location', type: 'short_text', required: false },
      { key: 'concept', label: 'Concept & running order', type: 'long_text', required: true },
    ],
  },
  {
    id: 'rt_vehicle',
    eventId: EVENT_ID,
    name: 'Vehicle access',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'vehicle_reg', label: 'Vehicle registration', type: 'short_text', required: true },
      { key: 'access_window', label: 'Requested access window', type: 'short_text', required: true },
    ],
  },
  {
    id: 'rt_accreditation',
    eventId: EVENT_ID,
    name: 'Additional accreditation',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'names', label: 'Names & roles', type: 'long_text', required: true },
      { key: 'reason', label: 'Reason', type: 'long_text', required: true },
    ],
  },
  {
    id: 'rt_general',
    eventId: EVENT_ID,
    name: 'General operational request',
    ownerDefault: 'BOARD Operations',
    fields: [
      { key: 'summary', label: 'Summary', type: 'short_text', required: true },
      { key: 'detail', label: 'Detail', type: 'long_text', required: true },
    ],
  },
];

/* ---------------------------------------------------------------
   Content — the information centre
   --------------------------------------------------------------- */

const contentCategories: ContentCategory[] = [
  { id: 'cc_dates', name: 'Important dates' },
  { id: 'cc_venue', name: 'Venue & access' },
  { id: 'cc_build', name: 'Build & exhibition' },
  { id: 'cc_brand', name: 'Brand & artwork' },
  { id: 'cc_meetings', name: 'Meetings & content' },
  { id: 'cc_hospitality', name: 'Hospitality' },
  { id: 'cc_help', name: 'Help' },
];

const contentPages: ContentPage[] = [
  {
    id: 'pg_dates',
    eventId: EVENT_ID,
    categoryId: 'cc_dates',
    title: 'Key deadlines',
    updated: '2026-11-02',
    visibility: { type: 'all' },
    requireAck: false,
    published: true,
    body: 'All partner deadlines for BOARD Monaco 2027 in one place. Company profile 30 Jan · Health & safety 14 Feb · Orders close 28 Feb · Delegate registration 1 Mar.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Every partner deadline for **BOARD Monaco 2027** in one place. Dates apply to all partners; module-specific deadlines only appear if your participation includes them. Times are CET.',
      },
      {
        type: 'timeline',
        items: [
          {
            date: '2027-01-30',
            title: 'Company profile complete',
            note: 'Logo, description and key contacts published to the delegate app.',
          },
          {
            date: '2027-02-01',
            title: 'Speaker & session details',
            note: 'Content partners confirm session title, speaker and format.',
          },
          {
            date: '2027-02-05',
            title: 'Stand design rules acknowledged',
            note: 'Required before any stand plans can be reviewed.',
          },
          {
            date: '2027-02-07',
            title: 'Meetings participant details',
            note: 'Meetings partners submit participating representatives.',
          },
          {
            date: '2027-02-10',
            title: 'Stand design submitted for approval',
            note: 'Upload plans and elevations for operations sign-off.',
          },
          {
            date: '2027-02-14',
            title: 'Health & safety declaration',
            note: 'Method statement and risk assessment for all physical stands.',
          },
          {
            date: '2027-02-18',
            title: 'Branding artwork upload',
            note: 'Print-ready artwork to Popshap specification.',
          },
          {
            date: '2027-02-28',
            title: 'Shop orders close',
            note: 'Final date for AV, furniture, electrical and catering orders at standard rates.',
          },
          {
            date: '2027-03-01',
            title: 'Delegate registration closes',
            note: 'Register all named passes in your allocation.',
          },
          {
            date: '2027-03-22',
            title: 'BOARD Monaco 2027 opens',
            note: 'Doors open at the Grimaldi Forum, 09:00 CET.',
          },
        ],
      },
    ],
  },
  {
    id: 'pg_venue',
    eventId: EVENT_ID,
    categoryId: 'cc_venue',
    title: 'Grimaldi Forum — venue guide',
    updated: '2026-10-18',
    visibility: { type: 'all' },
    requireAck: false,
    published: true,
    body: 'Address, loading access, cloakroom and floor levels for the Grimaldi Forum, Monaco.',
    blocks: [
      {
        type: 'paragraph',
        text: 'The **Grimaldi Forum** sits on the seafront at 10 Avenue Princesse Grace, Monaco. All partner build, show and breakdown activity takes place across the Ravel and Camille Blanc levels. Full directions, parking and public-transport options are on the [venue website](https://www.grimaldiforum.com).',
      },
      {
        type: 'image',
        src: '/assets/board-bg-7.png',
        caption: 'Grimaldi Forum — seafront elevation, Ravel entrance.',
      },
      { type: 'heading', text: 'Loading & vehicle access' },
      {
        type: 'paragraph',
        text: 'The goods entrance is on the lower level via Avenue Princesse Grace. All vehicles must be pre-booked into a marshalling slot — unbooked vehicles cannot be admitted during build.',
      },
      {
        type: 'list',
        items: [
          'Goods lift: 4.0m × 2.4m, 5,000kg limit',
          'Maximum vehicle height at the ramp: 3.8m',
          'Marshalling operates from 06:00 on all build days',
          'Cloakroom and partner lounge are on the Ravel level',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Loading slots are limited. Book yours through the Move-in vehicle access request as early as possible — slots are allocated in submission order.',
      },
      { type: 'download', name: 'Grimaldi Forum floor plan (PDF)', note: '2.4 MB · updated 18 Oct 2026' },
    ],
  },
  {
    id: 'pg_access',
    eventId: EVENT_ID,
    categoryId: 'cc_venue',
    title: 'Access & accreditation',
    updated: '2026-10-18',
    visibility: { type: 'all' },
    requireAck: false,
    published: true,
    body: 'How passes, wristbands and contractor access work across build, show and breakdown days.',
  },
  {
    id: 'pg_build',
    eventId: EVENT_ID,
    categoryId: 'cc_build',
    title: 'Build & breakdown schedule',
    updated: '2026-11-20',
    visibility: { type: 'entitlement', key: 'has_exhibition_space' },
    requireAck: false,
    published: true,
    body: 'Move-in from 20 March 07:00. Breakdown from 24 March 18:00. Vehicle marshalling details inside.',
  },
  {
    id: 'pg_standrules',
    eventId: EVENT_ID,
    categoryId: 'cc_build',
    title: 'Stand design & construction rules',
    updated: '2026-11-20',
    visibility: { type: 'entitlement', key: 'has_exhibition_space' },
    requireAck: true,
    published: true,
    body: 'Maximum build height, rigging rules, fire regulations and platform requirements. Acknowledgement required before build.',
    blocks: [
      {
        type: 'callout',
        tone: 'warn',
        text: 'These rules are binding. You must acknowledge them before your stand plans can be approved and before any build activity begins on site.',
      },
      {
        type: 'paragraph',
        text: 'All custom and space-only stands must comply with the following construction standards. Turnkey stands supplied by GES already meet them. If you are appointing your own contractor, share this page with them directly.',
      },
      { type: 'heading', text: 'Build height & structures' },
      {
        type: 'list',
        items: [
          'Standard maximum build height: 4.0m',
          'Anything above 4.0m requires a rigging & structural approval request',
          'Double-decker structures are not permitted',
          'Platforms over 100mm require an access ramp',
        ],
      },
      { type: 'heading', text: 'Fire & materials' },
      {
        type: 'paragraph',
        text: 'All materials must be **inherently flame-retardant or treated to Euroclass B-s1,d0**. Certificates must be uploaded with your Health & safety declaration. Naked flames, pyrotechnics and hazardous substances require separate written approval.',
      },
      {
        type: 'quote',
        text: 'A safe, well-run build protects your team, your neighbours on the floor and the guests you have invited.',
        cite: 'BOARD Operations',
      },
      { type: 'download', name: 'Stand plan submission template (PDF)', note: '1.1 MB · required for approval' },
    ],
  },
  {
    id: 'pg_shipping',
    eventId: EVENT_ID,
    categoryId: 'cc_build',
    title: 'Shipping & logistics',
    updated: '2026-11-05',
    visibility: { type: 'entitlement', key: 'has_exhibition_space' },
    requireAck: false,
    published: true,
    body: 'Deliveries, storage, and the official freight forwarder for on-site handling.',
  },
  {
    id: 'pg_artwork',
    eventId: EVENT_ID,
    categoryId: 'cc_brand',
    title: 'Branding & artwork guidance',
    updated: '2026-11-12',
    visibility: { type: 'entitlement', key: 'has_branding_inventory' },
    requireAck: false,
    published: true,
    body: 'Artwork specifications, print deadlines and placement guidance for all branding inventory.',
    blocks: [
      {
        type: 'paragraph',
        text: 'Your branding inventory is produced by **Popshap**, our signage partner. Supply print-ready artwork to the specifications below by the artwork deadline so we can proof and produce in good time.',
      },
      {
        type: 'image',
        src: '/assets/board-bg-2.png',
        caption: 'BOARD brand gradient — approved for large-format backdrops.',
      },
      { type: 'heading', text: 'Artwork specifications' },
      {
        type: 'list',
        items: [
          'Format: print-ready PDF or packaged AI, CMYK',
          'Resolution: 150 dpi at 100% scale',
          'Bleed: 25mm on all edges',
          'Fonts: outlined or embedded',
          'Colour: supply Pantone references for brand colours',
        ],
      },
      {
        type: 'callout',
        tone: 'info',
        text: 'Artwork deadline is 12 February 2027. Files received after this date cannot be guaranteed for on-site delivery.',
      },
      { type: 'download', name: 'BOARD brand & artwork guidelines (PDF)', note: '3.8 MB · updated 12 Nov 2026' },
    ],
  },
  {
    id: 'pg_meetings',
    eventId: EVENT_ID,
    categoryId: 'cc_meetings',
    title: 'Meetings programme guidance',
    updated: '2026-11-08',
    visibility: { type: 'entitlement', key: 'has_meetings_package' },
    requireAck: false,
    published: true,
    body: 'How the meetings programme runs, profile deadlines and participation guidance.',
  },
  {
    id: 'pg_speaker',
    eventId: EVENT_ID,
    categoryId: 'cc_meetings',
    title: 'Speaker & production guidance',
    updated: '2026-11-08',
    visibility: { type: 'entitlement', key: 'has_content_session' },
    requireAck: false,
    published: true,
    body: 'Presentation format, production timeline and on-stage guidance for content partners.',
  },
  {
    id: 'pg_catering',
    eventId: EVENT_ID,
    categoryId: 'cc_hospitality',
    title: 'Catering & function approvals',
    updated: '2026-11-15',
    visibility: { type: 'entitlement', key: 'has_hospitality_activation' },
    requireAck: false,
    published: true,
    body: 'Venue catering rules and the approval route for any hosted function.',
  },
  {
    id: 'pg_faq',
    eventId: EVENT_ID,
    categoryId: 'cc_help',
    title: 'Frequently asked questions',
    updated: '2026-11-01',
    visibility: { type: 'all' },
    requireAck: false,
    published: true,
    body: 'Answers to the questions partners ask most often.',
  },
  // Private page — Meridian Partners only
  {
    id: 'pg_meridian',
    eventId: EVENT_ID,
    categoryId: 'cc_hospitality',
    title: 'Meridian rooftop activation — private brief',
    updated: '2026-11-22',
    visibility: { type: 'partner', partners: ['part_c'] },
    requireAck: false,
    published: true,
    body: 'Confidential operational brief for the Meridian rooftop activation. Visible only to Meridian Partners.',
  },
];

/* ---------------------------------------------------------------
   Files — the BOARD library
   --------------------------------------------------------------- */

const files: FileAsset[] = [
  {
    id: 'file_logo',
    eventId: EVENT_ID,
    name: 'BOARD Monaco 2027 logo pack.zip',
    kind: 'Event logos',
    size: '4.2 MB',
    visibility: { type: 'all' },
  },
  {
    id: 'file_toolkit',
    eventId: EVENT_ID,
    name: 'Partner marketing toolkit.pdf',
    kind: 'Partner toolkit',
    size: '8.1 MB',
    visibility: { type: 'all' },
  },
  {
    id: 'file_floorplan',
    eventId: EVENT_ID,
    name: 'Exhibition floor plan.pdf',
    kind: 'Floor plans',
    size: '2.6 MB',
    visibility: { type: 'entitlement', key: 'has_exhibition_space' },
  },
  {
    id: 'file_standspec',
    eventId: EVENT_ID,
    name: 'Stand build technical spec.pdf',
    kind: 'Technical specification',
    size: '1.9 MB',
    visibility: { type: 'entitlement', key: 'has_exhibition_space' },
  },
  {
    id: 'file_artworkspec',
    eventId: EVENT_ID,
    name: 'Artwork specification.pdf',
    kind: 'Artwork specifications',
    size: '640 KB',
    visibility: { type: 'entitlement', key: 'has_branding_inventory' },
  },
];

/* ---------------------------------------------------------------
   Task templates — the canonical action list
   --------------------------------------------------------------- */

const taskTemplates: TaskTemplate[] = [
  {
    id: 'tt_profile',
    eventId: EVENT_ID,
    title: 'Complete your company profile',
    category: 'Onboarding',
    module: 'forms',
    priority: 'high',
    required: true,
    dueDate: '2027-01-30',
    requires: null,
    link: { type: 'form', target: 'f_profile' },
    instructions: 'This information is used across signage, the delegate app and printed materials.',
  },
  {
    id: 'tt_passes',
    eventId: EVENT_ID,
    title: 'Register your delegate passes',
    category: 'Registration',
    module: 'forms',
    priority: 'medium',
    required: true,
    dueDate: '2027-03-01',
    requires: null,
    link: { type: 'form', target: 'f_passes' },
    instructions: '',
  },
  {
    id: 'tt_hs',
    eventId: EVENT_ID,
    title: 'Complete the venue safety questionnaire',
    category: 'Exhibition',
    module: 'forms',
    priority: 'high',
    required: true,
    dueDate: '2027-02-14',
    requires: 'has_raw_space',
    link: { type: 'form', target: 'gf_safety' },
    instructions:
      'Grimaldi Forum Form 6.8. Required before any build can begin on a raw-space stand.',
  },
  {
    id: 'tt_stand',
    eventId: EVENT_ID,
    title: 'Submit stand design for approval',
    category: 'Exhibition',
    module: 'requests',
    priority: 'high',
    required: true,
    dueDate: '2027-02-10',
    requires: 'requires_stand_approval',
    link: { type: 'request', target: 'rt_stand_design' },
    instructions: '',
  },
  {
    id: 'tt_rules',
    eventId: EVENT_ID,
    title: 'Read & acknowledge stand design rules',
    category: 'Exhibition',
    module: 'information',
    priority: 'medium',
    required: true,
    dueDate: '2027-02-05',
    requires: 'has_exhibition_space',
    link: { type: 'content', target: 'pg_standrules' },
    instructions: '',
  },
  {
    id: 'tt_meetings',
    eventId: EVENT_ID,
    title: 'Submit meetings participant details',
    category: 'Meetings',
    module: 'forms',
    priority: 'high',
    required: true,
    dueDate: '2027-02-07',
    requires: 'has_meetings_package',
    link: { type: 'form', target: 'f_meetings' },
    instructions: '',
  },
  {
    id: 'tt_artwork',
    eventId: EVENT_ID,
    title: 'Upload your branding artwork',
    category: 'Brand',
    module: 'files',
    priority: 'medium',
    required: true,
    dueDate: '2027-02-18',
    requires: 'has_branding_inventory',
    link: { type: 'upload', target: null },
    instructions: 'Print-ready artwork to the specification in the artwork guidance.',
  },
  {
    id: 'tt_speaker',
    eventId: EVENT_ID,
    title: 'Confirm speaker & session details',
    category: 'Content',
    module: 'forms',
    priority: 'high',
    required: true,
    dueDate: '2027-02-01',
    requires: 'has_content_session',
    link: { type: 'form', target: 'f_speaker' },
    instructions: '',
  },
  {
    id: 'tt_hosted',
    eventId: EVENT_ID,
    title: 'Submit your hosted function plan',
    category: 'Hospitality',
    module: 'requests',
    priority: 'high',
    required: true,
    dueDate: '2027-02-12',
    requires: 'has_hospitality_activation',
    link: { type: 'request', target: 'rt_hosted' },
    instructions: '',
  },
  {
    id: 'tt_av',
    eventId: EVENT_ID,
    title: 'Order essential AV for your stand',
    category: 'Shop',
    module: 'shop',
    priority: 'low',
    required: false,
    dueDate: '2027-02-28',
    requires: 'can_order_av',
    link: { type: 'shop', target: 'cat_av' },
    instructions: 'Optional — but AV books up quickly.',
  },
];

/**
 * Package templates were removed during design — entitlements are
 * toggled directly per partner. Retained empty so the resolution
 * order still supports reintroducing them later.
 */
const packageTemplates: PackageTemplate[] = [];

/* ---------------------------------------------------------------
   Partners
   --------------------------------------------------------------- */

/** Placeholder brand marks, standing in for logos partners upload. */
function mkLogo(name: string, initial: string, mark: string): string {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='420' height='96' viewBox='0 0 420 96'>" +
    `<rect x='0' y='16' width='64' height='64' rx='14' fill='${mark}'/>` +
    `<text x='32' y='60' font-family='Arial,Helvetica,sans-serif' font-size='34' font-weight='700' fill='#0B0D11' text-anchor='middle'>${initial}</text>` +
    `<text x='82' y='58' font-family='Arial,Helvetica,sans-serif' font-size='30' font-weight='300' letter-spacing='0.5' fill='#FFFFFF'>${name}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const partners: Partner[] = [
  {
    id: 'part_a',
    name: 'Helvetica Systems',
    sector: 'Enterprise Tech & AI',
    country: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland',
    billing: {
      entity: 'Helvetica Systems AG',
      address: 'Bahnhofstrasse 1',
      city: 'Zürich',
      postcode: '8001',
      country: 'Switzerland',
      vat: 'CHE-123.456.789',
    },
    logo: mkLogo('Helvetica Systems', 'H', '#31F9E5'),
  },
  {
    id: 'part_b',
    name: 'Northwind Advisory',
    sector: 'Management Consultancy',
    country: '30 St Mary Axe, London EC3A 8BF, United Kingdom',
    billing: {
      entity: 'Northwind Advisory LLP',
      address: '30 St Mary Axe',
      city: 'London',
      postcode: 'EC3A 8BF',
      country: 'United Kingdom',
      vat: 'GB 123 4567 89',
    },
    logo: mkLogo('Northwind Advisory', 'N', '#C8763C'),
  },
  {
    id: 'part_c',
    name: 'Meridian Partners',
    sector: 'Investment',
    country: '15 Avenue Montaigne, 75008 Paris, France',
    billing: {
      entity: 'Meridian Partners SAS',
      address: '15 Avenue Montaigne',
      city: 'Paris',
      postcode: '75008',
      country: 'France',
      vat: 'FR 12 345678901',
    },
    logo: mkLogo('Meridian Partners', 'M', '#F1F1E4'),
  },
];

const partnerUsers: PartnerUser[] = [
  {
    id: 'u_alex',
    partnerId: 'part_a',
    name: 'Alex Morgan',
    email: 'alex@helvetica.example',
    telephone: '+41 44 000 0000',
    role: 'lead',
    permissions: 'all',
  },
  {
    id: 'u_sam',
    partnerId: 'part_a',
    name: 'Sam Doyle',
    email: 'sam@helvetica.example',
    telephone: '',
    role: 'user',
    permissions: {
      tasks: true,
      forms: true,
      shop: true,
      orders: true,
      requests: false,
      profile: false,
      team: false,
    },
  },
  {
    id: 'u_priya',
    partnerId: 'part_b',
    name: 'Priya Shah',
    email: 'priya@northwind.example',
    telephone: '+44 20 0000 0000',
    role: 'lead',
    permissions: 'all',
  },
  {
    id: 'u_jordan',
    partnerId: 'part_c',
    name: 'Jordan Blake',
    email: 'jordan@meridian.example',
    telephone: '+33 1 00 00 00 00',
    role: 'lead',
    permissions: 'all',
  },
  {
    id: 'u_riley',
    partnerId: 'part_c',
    name: 'Riley Chen',
    email: 'riley@meridian.example',
    telephone: '',
    role: 'user',
    permissions: {
      tasks: true,
      forms: true,
      shop: false,
      orders: true,
      requests: true,
      profile: true,
      team: false,
    },
  },
];

/* ---------------------------------------------------------------
   Participations — the personalisation records
   --------------------------------------------------------------- */

const participations: Participation[] = [
  {
    id: 'ep_a',
    eventId: EVENT_ID,
    partnerId: 'part_a',
    reference: 'BP-001',
    standRef: 'A12',
    packageId: null,
    addedEntitlements: [
      'has_exhibition_space',
      'has_raw_space',
      'requires_stand_approval',
      'can_order_av',
      'can_order_furniture',
      'can_order_signage',
    ],
    removedEntitlements: [],
    moduleOverrides: {},
    priceOverrides: [],
    partnerNotes: 'Corner stand confirmed. Power and rigging must clear the aisle.',
    internalNotes: 'Key tech logo. Stand plan slightly over height — watch on approval.',
    leadUserId: 'u_alex',
    allocatedProducts: [],
    requestedFiles: [
      {
        id: 'rf_a1',
        label: 'Public liability insurance certificate',
        due: '2027-02-12',
        required: true,
        file: { name: 'helvetica-liability-2027.pdf', uploadedAt: '2027-01-20T10:00:00Z', by: 'Alex Morgan' },
      },
      { id: 'rf_a2', label: 'Stand contractor method statement', due: '2027-02-14', required: true, file: null },
      {
        id: 'rf_a3',
        label: 'High-resolution logo (SVG or EPS, transparent)',
        due: '2027-01-30',
        required: true,
        file: null,
      },
    ],
    inventory: [
      {
        id: 'inv_a1',
        type: 'Dedicated Space',
        name: 'Corner stand · 6m × 4m',
        description: 'Raw exhibition space, corner position with two open sides.',
        cost: 18000,
        quantity: 1,
        standNumber: 'A12',
        refs: [
          { kind: 'form', id: 'gf_safety' },
          { kind: 'task', id: 'tt_stand' },
          { kind: 'task', id: 'tt_rules' },
        ],
      },
      {
        id: 'inv_a2',
        type: 'Delegate Passes',
        name: 'Associate Pass',
        passType: 'Associate Pass',
        description: 'Full show access',
        cost: 0,
        quantity: 4,
        standNumber: '',
        refs: [{ kind: 'form', id: 'f_passes' }],
      },
    ],
    taskState: {
      tt_rules: { completed: true, completedAt: '2026-12-14T11:02:00Z', completedBy: 'Alex Morgan' },
      tt_stand: { completed: true, completedAt: '2027-01-04T15:40:00Z', completedBy: 'Alex Morgan' },
    },
    formState: {
      f_profile: {
        status: 'approved',
        submittedAt: '2026-12-10T09:20:00Z',
        submittedBy: 'Alex Morgan',
        values: {
          legal_name: 'Helvetica Systems AG',
          display_name: 'Helvetica Systems',
          sector: 'Technology',
          website: 'https://helvetica.example',
          description: 'Infrastructure software for regulated industries.',
        },
      },
      gf_safety: {
        status: 'changes_required',
        submittedAt: '2027-01-08T10:00:00Z',
        submittedBy: 'Sam Doyle',
        feedback:
          'Melamine panel is listed at 5 mm; the venue requires 7–8 mm minimum at M2/M3. Please revise and resubmit with the certificate.',
        values: {
          company_name: 'Helvetica Systems AG',
          stand_number: 'A12',
          materials_declared:
            'Melamine-coated panel, 5 mm, M2, Egger, west wall, cert LNE-2026-114',
        },
      },
    },
    ackState: {},
    passAllocation: 4,
  },
  {
    id: 'ep_b',
    eventId: EVENT_ID,
    partnerId: 'part_b',
    reference: 'BP-002',
    standRef: null,
    packageId: null,
    addedEntitlements: ['has_meetings_package', 'has_branding_inventory', 'can_order_signage'],
    removedEntitlements: [],
    moduleOverrides: {},
    priceOverrides: [],
    partnerNotes: 'Branding placements confirmed: main foyer banner + app splash.',
    internalNotes: 'Upgraded mid-cycle to add branding. No physical stand.',
    leadUserId: 'u_priya',
    allocatedProducts: [],
    inventory: [
      {
        id: 'inv_b1',
        type: 'Curated Introductions',
        name: 'Meetings programme · 12 introductions',
        description:
          'Curated one-to-one introductions with matched senior leaders across the two days.',
        cost: 22000,
        quantity: 12,
        standNumber: '',
        refs: [{ kind: 'form', id: 'f_meetings' }],
      },
      {
        id: 'inv_b2',
        type: 'Branding',
        name: 'Main foyer banner + app splash',
        description:
          'Premium foyer banner placement plus a rotating splash slot in the delegate app.',
        cost: 9500,
        quantity: 1,
        standNumber: '',
        refs: [],
      },
    ],
    taskState: {
      tt_profile: { completed: true, completedAt: '2026-12-18T14:00:00Z', completedBy: 'Priya Shah' },
    },
    formState: {
      f_profile: {
        status: 'submitted',
        submittedAt: '2026-12-18T14:00:00Z',
        submittedBy: 'Priya Shah',
        values: {
          legal_name: 'Northwind Advisory LLP',
          display_name: 'Northwind Advisory',
          sector: 'Advisory',
          logo: 'northwind-logo-vector.svg',
        },
      },
      f_meetings: {
        status: 'submitted',
        submittedAt: '2027-01-09T11:30:00Z',
        submittedBy: 'Priya Shah',
        values: { headshot: 'priya-shah-headshot.jpg' },
      },
    },
    ackState: {},
    requestedFiles: [
      {
        id: 'rf_b1',
        label: 'Print-ready branding artwork (PDF or packaged AI)',
        due: '2027-02-12',
        required: true,
        file: null,
      },
      {
        id: 'rf_b2',
        label: 'High-resolution logo (SVG or EPS, transparent)',
        due: '2027-01-30',
        required: true,
        file: { name: 'northwind-logo-vector.svg', uploadedAt: '2027-01-14T09:15:00Z', by: 'Priya Shah' },
      },
    ],
    passAllocation: 3,
  },
  {
    id: 'ep_c',
    eventId: EVENT_ID,
    partnerId: 'part_c',
    reference: 'BP-003',
    standRef: 'C04',
    packageId: null,
    addedEntitlements: [
      'has_exhibition_space',
      'has_content_session',
      'has_hospitality_activation',
      'has_branding_inventory',
      'can_order_av',
    ],
    removedEntitlements: [],
    moduleOverrides: {},
    // Partner-specific price — acceptance test: a partner-specific product price
    priceOverrides: [{ productId: 'prod_screen85', price: 950 }],
    partnerNotes:
      'Rooftop activation + content session + demo stand. Your dedicated contact is Anna Lewis.',
    internalNotes: 'Highest-value bespoke partner. Custom rooftop function — see private brief.',
    leadUserId: 'u_jordan',
    allocatedProducts: [],
    requestedFiles: [],
    inventory: [
      {
        id: 'inv_c1',
        type: 'Dedicated Space',
        name: 'Demo stand · 8m × 5m',
        description: 'Custom-build demonstration space adjoining the content stage.',
        cost: 26000,
        quantity: 1,
        standNumber: 'C04',
        refs: [{ kind: 'task', id: 'tt_stand' }],
      },
      {
        id: 'inv_c2',
        type: 'Bespoke',
        name: 'Rooftop hosted function',
        description: 'Private rooftop reception for up to 80 guests on the evening of day one.',
        cost: 35000,
        quantity: 1,
        standNumber: '',
        refs: [{ kind: 'task', id: 'tt_hosted' }],
      },
      {
        id: 'inv_c3',
        type: 'Bespoke',
        name: 'Content session · main stage',
        description: '25-minute keynote slot on the main programme.',
        cost: 15000,
        quantity: 1,
        standNumber: '',
        refs: [
          { kind: 'form', id: 'f_speaker' },
          { kind: 'task', id: 'tt_speaker' },
        ],
      },
    ],
    taskState: {},
    formState: {},
    ackState: {},
    formDueDates: { f_speaker: '2027-02-06' },
    passAllocation: 8,
  },
];

/* ---------------------------------------------------------------
   Orders — one parent order, split per supplier
   --------------------------------------------------------------- */

const orders: Order[] = [
  {
    id: 'ord_a1',
    eventId: EVENT_ID,
    participationId: 'ep_a',
    reference: 'BO-2027-00018',
    status: 'submitted',
    submittedAt: '2027-01-12T12:20:00Z',
    billing: {
      legalEntity: 'Helvetica Systems AG',
      address: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland',
      taxNumber: 'CHE-123.456.789',
      invoiceContactName: 'Jamie Smith',
      invoiceContactEmail: 'accounts@helvetica.example',
      poNumber: 'PO-4567',
      internalRef: 'BOOTH-A12',
      notes: 'Invoice the Zürich entity.',
    },
    items: [
      {
        productId: 'prod_screen55',
        name: '55" screen on floor stand',
        supplierId: 'sup_aztec',
        qty: 2,
        unitPrice: 750,
        options: { Mounting: 'Floor stand' },
        answers: { installation_location: 'Stand A12 — back wall', onsite_contact: 'Sam Doyle' },
      },
      {
        productId: 'prod_carpet',
        name: 'Stand carpet',
        supplierId: 'sup_ges',
        qty: 36,
        unitPrice: 22,
        options: { Colour: 'Rich black' },
        answers: { stand_number: 'A12', area_m2: '36' },
      },
    ],
  },
];

const supplierOrders: SupplierOrder[] = [
  {
    id: 'so_a1_aztec',
    orderId: 'ord_a1',
    supplierId: 'sup_aztec',
    reference: 'SO-2027-00041',
    status: 'confirmed',
    submittedAt: '2027-01-12T12:20:00Z',
    confirmedAt: '2027-01-12T12:30:00Z',
    approvalMode: 'auto',
    items: [{ productId: 'prod_screen55', name: '55" screen on floor stand', qty: 2, unitPrice: 750 }],
    subtotal: 1500,
    tax: 300,
    total: 1800,
  },
  {
    id: 'so_a1_ges',
    orderId: 'ord_a1',
    supplierId: 'sup_ges',
    reference: 'SO-2027-00042',
    status: 'under_review',
    submittedAt: '2027-01-12T12:20:00Z',
    confirmedAt: null,
    approvalMode: 'manual',
    items: [{ productId: 'prod_carpet', name: 'Stand carpet', qty: 36, unitPrice: 22 }],
    subtotal: 792,
    tax: 158.4,
    total: 950.4,
  },
];

function buildPayloadStub(eventType: string, supplierOrderId: string) {
  return {
    event_type: eventType,
    note: 'Payload materialised at send time from the supplier order snapshot.',
    supplier_order: { id: supplierOrderId },
  };
}

const webhookEvents: WebhookEvent[] = [
  {
    id: 'evt_01HXYZ',
    eventType: 'supplier_order.confirmed',
    supplierOrderId: 'so_a1_aztec',
    supplierId: 'sup_aztec',
    sentAt: '2027-01-12T12:30:00Z',
    idempotencyKey: 'idem_9f2a41c7a0',
    status: 'delivered',
    attempts: [
      {
        at: '2027-01-12T12:30:00Z',
        responseCode: 200,
        responseBody: '{"status":"success","request_id":"zap_01H..."}',
        ok: true,
      },
    ],
    retryCount: 0,
    payload: buildPayloadStub('supplier_order.confirmed', 'so_a1_aztec'),
  },
  {
    id: 'evt_01HABC',
    eventType: 'supplier_order.quote_requested',
    supplierOrderId: 'so_c_quote',
    supplierId: 'sup_riviera',
    sentAt: '2027-01-18T09:05:00Z',
    idempotencyKey: 'idem_0d5c9a8611',
    status: 'failed',
    attempts: [
      { at: '2027-01-18T09:05:00Z', responseCode: 500, responseBody: '{"error":"internal"}', ok: false },
      { at: '2027-01-18T09:06:30Z', responseCode: 502, responseBody: 'Bad Gateway', ok: false },
    ],
    retryCount: 2,
    payload: buildPayloadStub('supplier_order.quote_requested', 'so_c_quote'),
  },
];

/* ---------------------------------------------------------------
   Requests
   --------------------------------------------------------------- */

const requests: RequestRecord[] = [
  {
    id: 'req_a1',
    eventId: EVENT_ID,
    participationId: 'ep_a',
    typeId: 'rt_stand_design',
    reference: 'RQ-2027-0012',
    status: 'under_review',
    owner: 'Anna Lewis',
    submittedBy: 'Alex Morgan',
    submittedAt: '2027-01-04T15:40:00Z',
    responseAt: null,
    values: {
      stand_number: 'A12',
      max_height: 4,
      notes: 'Double-decker not required. LED header at 3.8m.',
    },
    files: ['Helvetica_stand_v3.pdf'],
    comments: [
      {
        by: 'Alex Morgan',
        role: 'partner',
        at: '2027-01-04T15:40:00Z',
        text: 'Submitting our stand design for approval.',
      },
      {
        by: 'Anna Lewis',
        role: 'organiser',
        at: '2027-01-06T10:12:00Z',
        text: 'Thanks — reviewing with the venue. Header height is close to the limit, confirming.',
      },
    ],
  },
  {
    id: 'req_c1',
    eventId: EVENT_ID,
    participationId: 'ep_c',
    typeId: 'rt_hosted',
    reference: 'RQ-2027-0019',
    status: 'more_info',
    owner: 'Anna Lewis',
    submittedBy: 'Jordan Blake',
    submittedAt: '2027-01-15T11:00:00Z',
    responseAt: '2027-01-16T09:30:00Z',
    values: {
      event_name: 'Meridian rooftop reception',
      date_time: '23 March, 19:00',
      headcount: 120,
      concept: 'Sunset reception on the terrace with live acoustic set.',
    },
    files: [],
    comments: [
      {
        by: 'Jordan Blake',
        role: 'partner',
        at: '2027-01-15T11:00:00Z',
        text: 'Requesting approval for our rooftop reception.',
      },
      {
        by: 'Anna Lewis',
        role: 'organiser',
        at: '2027-01-16T09:30:00Z',
        text: 'Love it. Please confirm the catering supplier and whether you need a noise curfew exemption after 22:00.',
      },
    ],
  },
];

/* ---------------------------------------------------------------
   Notifications, email, audit
   --------------------------------------------------------------- */

const notifications: Notification[] = [
  {
    id: 'n1',
    participationId: 'ep_a',
    at: '2027-01-08T12:00:00Z',
    kind: 'changes_required',
    text: 'Your Health & safety declaration needs changes before it can be approved.',
    read: false,
  },
  {
    id: 'n2',
    participationId: 'ep_a',
    at: '2027-01-12T12:30:00Z',
    kind: 'order',
    text: 'Order BO-2027-00018 submitted. Your AV items are confirmed.',
    read: true,
  },
];

const emailTemplates: EmailTemplate[] = [
  {
    id: 'et_invite',
    name: 'Partner invitation',
    subject: 'You’re invited to the [event] Partner Portal',
    enabled: true,
    body:
      'Hi [first_name],\n\n' +
      'You have been given access to the Partner Portal for [event], on behalf of [partner].\n\n' +
      'Everything we need from you lives there — your tasks and their deadlines, the forms to ' +
      'complete, the files to send us, and everything we have made available for you to download.\n\n' +
      'Use this link to set up your access: [portal_link]\n\n' +
      'The link works once and is just for you, so please do not forward it. If it has expired by ' +
      'the time you get to it, you can ask for a new one from the sign-in page using this email ' +
      'address.\n\n' +
      'If you have any questions, reply to this email and it will reach us.\n\n' +
      '[signature]',
  },
  { id: 'et_submit', name: 'Submission confirmation', subject: 'We’ve received your submission', enabled: true },
  {
    id: 'et_order',
    name: 'Order confirmation',
    subject: 'Your BOARD 2027 order has been submitted',
    enabled: true,
  },
  { id: 'et_changes', name: 'Changes required', subject: 'Action needed: changes required', enabled: true },
  {
    id: 'et_deadline',
    name: 'Deadline reminder',
    category: 'reminder',
    subject: 'Reminder: [task] is due [due]',
    enabled: true,
    body: 'Hi [first_name],\n\nA reminder of what is coming up for [partner] at [event]:\n\n[items]\n\nYou can complete any of these in your Partner Portal: [portal_link]\n\nIf you have any questions, just reply to this email.\n\nThanks,\n[signature]',
  },
  {
    id: 'et_overdue',
    name: 'Overdue reminder',
    category: 'reminder',
    subject: 'Overdue: [task] was due [due]',
    enabled: true,
    body: 'Hi [first_name],\n\nOur records show the following is outstanding for [partner], and some of it is now overdue. Please complete it as soon as you can so we can keep your participation in [event] on track.\n\n[items]\n\nComplete any of these here: [portal_link]\n\nIf any of this is already in hand or you need more time, let us know.\n\nThanks,\n[signature]',
  },
];

const auditLog: AuditEntry[] = [
  {
    id: 'a1',
    at: '2027-01-12T12:30:00Z',
    actor: 'System',
    text: 'Supplier order SO-2027-00041 confirmed — webhook delivered to Aztec (200).',
    partnerId: 'part_a',
  },
  {
    id: 'a2',
    at: '2027-01-08T12:00:00Z',
    actor: 'Anna Lewis',
    text: 'Requested changes on Helvetica Systems Health & safety declaration.',
    partnerId: 'part_a',
  },
  {
    id: 'a3',
    at: '2027-01-06T10:12:00Z',
    actor: 'Anna Lewis',
    text: 'Commented on request RQ-2027-0012 (Helvetica Systems).',
    partnerId: 'part_a',
  },
  {
    id: 'a4',
    at: '2027-01-18T09:06:30Z',
    actor: 'System',
    text: 'Webhook delivery to Riviera Event Logistics failed (502) after 2 attempts.',
    partnerId: 'part_c',
  },
];

const organiserUsers: OrganiserUser[] = [
  {
    id: 'org_anna',
    name: 'Anna Lewis',
    title: 'Operations Coordinator',
    email: 'anna@boardsummits.example',
    role: 'super_admin',
  },
  {
    id: 'org_team',
    name: 'BOARD Operations',
    title: 'Operations team',
    email: 'operations@boardsummits.example',
    // A team member rather than a second super admin, so the
    // permission model is actually exercised by the seed: this
    // account runs the operational side and cannot reach Event
    // settings or Reporting.
    role: 'team',
    permissions: {
      partners: true,
      forms: true,
      tasks: true,
      content: false,
      products: false,
      suppliers: false,
      orders: true,
      requests: true,
      reporting: false,
      settings: false,
    },
  },
];

/* ---------------------------------------------------------------
   Assembled seed
   --------------------------------------------------------------- */

export function seed(): Db {
  // Deep clone so callers can mutate freely without touching the seed.
  return structuredClone({
    version: 1,
    event,
    entitlements,
    suppliers,
    shopCategories,
    products,
    forms,
    requestTypes,
    contentCategories,
    contentPages,
    files,
    taskTemplates,
    packageTemplates,
    partners,
    partnerUsers,
    participations,
    orders,
    supplierOrders,
    webhookEvents,
    requests,
    notifications,
    emailTemplates,
    sentEmails: [],
    auditLog,
    organiserUsers,
    orgAuditSeenAt: null,
  } satisfies Db);
}
