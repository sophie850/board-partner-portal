/* ============================================================
   BOARD Partner Portal — prototype data model + resolvers
   ------------------------------------------------------------
   Schema-shaped seed data (mirrors the relational tables in the
   spec) plus the personalisation resolver. Everything is keyed by
   eventId so the event can later be duplicated. In production this
   maps to Postgres tables with row-level security; here it lives in
   localStorage as an illustrative "database".
   Precedence for effective config: partner override > package > event default.
   ============================================================ */

const CURRENCY = { code: 'EUR', symbol: '€' };
export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'Pound sterling (£)' },
  { code: 'USD', symbol: '$', label: 'US dollar ($)' },
  { code: 'CHF', symbol: 'CHF ', label: 'Swiss franc (CHF)' },
  { code: 'AED', symbol: 'AED ', label: 'UAE dirham (AED)' },
];

export function money(n) {
  const db = (typeof window !== 'undefined') && window.__BOARD_DB;
  const sym = (db && db.event && db.event.currencySymbol) || CURRENCY.symbol;
  return sym + Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

/* ---------- Seed ---------- */
export function seed() {
  const event = {
    id: 'board_monaco_2027',
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
    // Default sender identity + signature for outbound email (editable in Event settings)
    sender: {
      name: 'BOARD Operations',
      email: 'operations@boardsummits.com',
      signature: 'BOARD Operations\nGrimaldi Forum, Monaco\nboardsummits.com',
      logo: '',
    },
    // Terminology is editable at event level (spec §3)
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

  // Reusable entitlement catalogue (organiser can add keys with no code change)
  const entitlements = [
    { key: 'has_exhibition_space', label: 'Exhibition space' },
    { key: 'has_turnkey_stand', label: 'Turnkey stand package' },
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

  const suppliers = [
    { id: 'sup_aztec', eventId: event.id, name: 'Aztec', category: 'AV & Technical', contact: 'Aztec Events Desk', notifEmails: ['orders@aztec-events.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/aztec/', routingKey: 'board-av', webhookSecret: 'whsec_aztec_9f2a41c7', active: true, approvalDefault: 'auto', notes: 'Official AV & technical services partner. Fast confirmation on catalogue items.' },
    { id: 'sup_ges', eventId: event.id, name: 'GES', category: 'Stand build, furniture, carpet & electrical', contact: 'GES Monaco Operations', notifEmails: ['board@ges.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/ges/', routingKey: 'board-ges', webhookSecret: 'whsec_ges_4b71de90', active: true, approvalDefault: 'manual', notes: 'Recommended stand builder & general services contractor. Structural items need organiser review.' },
    { id: 'sup_popshap', eventId: event.id, name: 'Popshap', category: 'Signage & graphics', contact: 'Popshap Studio', notifEmails: ['print@popshap.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/popshap/', routingKey: 'board-signage', webhookSecret: 'whsec_popshap_2c88fa13', active: true, approvalDefault: 'auto', notes: 'Signage & large-format graphics. Requires print-ready artwork.' },
    { id: 'sup_smr', eventId: event.id, name: 'SMR Catering', category: 'Catering & hospitality', contact: 'Société Monégasque de Restauration', notifEmails: ['events@smr.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/smr/', routingKey: 'board-catering', webhookSecret: 'whsec_smr_77a0be52', active: true, approvalDefault: 'manual', notes: 'Grimaldi Forum catering. Head counts confirmed 14 days out.' },
    { id: 'sup_riviera', eventId: event.id, name: 'Riviera Event Logistics', category: 'Logistics & freight', contact: 'Riviera Freight Team', notifEmails: ['ops@riviera-logistics.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/riviera/', routingKey: 'board-logistics', webhookSecret: 'whsec_riviera_0d5c9a86', active: true, approvalDefault: 'quote', notes: 'Freight, material handling & storage. Most items are quote-required.' },
    { id: 'sup_grimaldi', eventId: event.id, name: 'Grimaldi Forum', category: 'Venue services — electrical, power & internet', contact: 'Grimaldi Forum Technical Services', notifEmails: ['technical@grimaldiforum.example'], webhookUrl: 'https://hooks.zapier.com/hooks/catch/1122334/grimaldi/', routingKey: 'board-venue', webhookSecret: 'whsec_grimaldi_a3e1c7d5', active: true, approvalDefault: 'auto', notes: 'Official venue. Sole provider of mains electrical connections, power and wired internet.' },
  ];

  const shopCategories = [
    { id: 'cat_av', name: 'AV & technical' },
    { id: 'cat_electrical', name: 'Electrical & lighting' },
    { id: 'cat_furniture', name: 'Furniture & carpet' },
    { id: 'cat_signage', name: 'Signage & graphics' },
    { id: 'cat_catering', name: 'Catering' },
    { id: 'cat_logistics', name: 'Logistics' },
    { id: 'cat_internet', name: 'Internet & connectivity' },
  ];

  // approvalMode: 'auto' | 'manual' | 'quote'; visibility.requires = entitlement key
  const products = [
    { id: 'prod_screen55', image: 'assets/board-bg-3.png', eventId: event.id, name: '55" screen on floor stand', supplierId: 'sup_aztec', categoryId: 'cat_av', description: 'Full-HD 55" display on adjustable floor stand, incl. cabling.', unit: 'each', basePrice: 750, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 8, orderDeadline: '2027-02-28', leadTimeDays: 10, active: true, visibility: { requires: 'can_order_av' }, options: [{ name: 'Mounting', values: ['Floor stand', 'Wall bracket'] }], questions: [{ key: 'installation_location', label: 'Installation location', type: 'short_text', required: true }, { key: 'onsite_contact', label: 'On-site contact', type: 'short_text', required: true }] },
    { id: 'prod_screen85', eventId: event.id, name: '85" screen on floor stand', supplierId: 'sup_aztec', categoryId: 'cat_av', description: 'Large-format 85" 4K display on floor stand.', unit: 'each', basePrice: 1200, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 4, orderDeadline: '2027-02-28', leadTimeDays: 12, active: true, visibility: { requires: 'can_order_av' }, options: [], questions: [{ key: 'installation_location', label: 'Installation location', type: 'short_text', required: true }] },
    { id: 'prod_pa', eventId: event.id, name: 'PA & speaker set', supplierId: 'sup_aztec', categoryId: 'cat_av', description: '2× powered speakers, mixer and 1× radio mic.', unit: 'set', basePrice: 480, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 2, orderDeadline: '2027-02-28', leadTimeDays: 7, active: true, visibility: { requires: 'can_order_av' }, options: [], questions: [] },
    { id: 'prod_lead', eventId: event.id, name: 'Lead retrieval licence', supplierId: 'sup_aztec', categoryId: 'cat_av', description: 'App-based lead capture licence for the duration of the event.', unit: 'licence', basePrice: 260, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 20, orderDeadline: '2027-03-10', leadTimeDays: 3, active: true, visibility: {}, options: [], questions: [] },
    { id: 'prod_rig', eventId: event.id, name: 'Custom LED rigging package', supplierId: 'sup_aztec', categoryId: 'cat_av', description: 'Bespoke overhead LED rig — quoted on stand plan.', unit: 'package', basePrice: null, taxRate: 0.2, approvalMode: 'quote', minQty: 1, maxQty: 1, orderDeadline: '2027-02-15', leadTimeDays: 25, active: true, visibility: { requires: 'can_order_av' }, options: [], questions: [{ key: 'rig_notes', label: 'Rigging requirements & stand plan notes', type: 'long_text', required: true }] },
    { id: 'prod_carpet', image: 'assets/board-bg-7.png', eventId: event.id, name: 'Stand carpet', supplierId: 'sup_ges', categoryId: 'cat_furniture', description: 'Event-grade carpet, supplied & fitted.', unit: 'per m²', basePrice: 22, taxRate: 0.2, approvalMode: 'manual', minQty: 9, maxQty: 200, orderDeadline: '2027-02-20', leadTimeDays: 14, active: true, visibility: { requires: 'can_order_furniture' }, options: [{ name: 'Colour', values: ['Rich black', 'Off white', 'Teal', 'Anthracite'] }], questions: [{ key: 'stand_number', label: 'Stand number', type: 'short_text', required: true }, { key: 'area_m2', label: 'Area (m²)', type: 'number', required: true }] },
    { id: 'prod_furniture', image: 'assets/board-bg-5.png', eventId: event.id, name: 'Lounge furniture set', supplierId: 'sup_ges', categoryId: 'cat_furniture', description: '2× armchairs, 1× low table, 1× side unit.', unit: 'set', basePrice: 650, taxRate: 0.2, approvalMode: 'manual', minQty: 1, maxQty: 5, orderDeadline: '2027-02-20', leadTimeDays: 14, active: true, visibility: { requires: 'can_order_furniture' }, options: [{ name: 'Finish', values: ['Black / oak', 'White / chrome'] }], questions: [] },
    { id: 'prod_power', eventId: event.id, name: '500W mains supply (24h)', supplierId: 'sup_grimaldi', categoryId: 'cat_electrical', description: 'Single-phase 500W mains supply with socket, 24-hour. Supplied by the venue.', unit: 'each', basePrice: 180, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 10, orderDeadline: '2027-02-20', leadTimeDays: 10, active: true, visibility: { requires: 'has_exhibition_space' }, options: [], questions: [{ key: 'location', label: 'Position on stand', type: 'short_text', required: true }] },
    { id: 'prod_internet', eventId: event.id, name: 'Wired internet connection (10 Mbps dedicated)', supplierId: 'sup_grimaldi', categoryId: 'cat_internet', description: 'Dedicated wired line with fixed IP. Supplied by the venue.', unit: 'connection', basePrice: 420, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 4, orderDeadline: '2027-02-20', leadTimeDays: 10, active: true, visibility: { requires: 'has_exhibition_space' }, options: [], questions: [{ key: 'location', label: 'Position on stand', type: 'short_text', required: true }] },
    { id: 'prod_wifi', eventId: event.id, name: 'Premium Wi-Fi access (per device)', supplierId: 'sup_grimaldi', categoryId: 'cat_internet', description: 'High-priority venue Wi-Fi, per device, for the event duration.', unit: 'device', basePrice: 90, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 20, orderDeadline: '2027-03-05', leadTimeDays: 3, active: true, visibility: {}, options: [], questions: [] },
    { id: 'prod_lighting', eventId: event.id, name: 'LED spotlight (per unit)', supplierId: 'sup_ges', categoryId: 'cat_electrical', description: 'Arm-mounted LED spot, warm white.', unit: 'each', basePrice: 45, taxRate: 0.2, approvalMode: 'auto', minQty: 2, maxQty: 20, orderDeadline: '2027-02-20', leadTimeDays: 10, active: true, visibility: { requires: 'has_exhibition_space' }, options: [], questions: [] },
    { id: 'prod_banner', image: 'assets/board-bg-2.png', eventId: event.id, name: 'Printed fabric banner', supplierId: 'sup_popshap', categoryId: 'cat_signage', description: 'Tension-fabric banner, printed from supplied artwork.', unit: 'each', basePrice: 140, taxRate: 0.2, approvalMode: 'auto', minQty: 1, maxQty: 20, orderDeadline: '2027-03-01', leadTimeDays: 7, active: true, visibility: { requires: 'can_order_signage' }, options: [{ name: 'Size', values: ['1×2m', '1×2.5m', '2×3m'] }], questions: [{ key: 'artwork', label: 'Print-ready artwork', type: 'file_upload', required: true }, { key: 'dimensions', label: 'Confirm finished dimensions', type: 'short_text', required: true }] },
    { id: 'prod_backwall', eventId: event.id, name: 'Branded back-wall graphic', supplierId: 'sup_popshap', categoryId: 'cat_signage', description: 'Full back-wall graphic, printed & installed.', unit: 'each', basePrice: 890, taxRate: 0.2, approvalMode: 'manual', minQty: 1, maxQty: 3, orderDeadline: '2027-02-25', leadTimeDays: 12, active: true, visibility: { requires: 'has_branding_inventory' }, options: [], questions: [{ key: 'artwork', label: 'Print-ready artwork', type: 'file_upload', required: true }] },
    { id: 'prod_catering', image: 'assets/board-bg-9.png', eventId: event.id, name: 'Networking reception catering', supplierId: 'sup_smr', categoryId: 'cat_catering', description: 'Canapés & drinks reception, per head.', unit: 'per head', basePrice: 65, taxRate: 0.1, approvalMode: 'manual', minQty: 20, maxQty: 300, orderDeadline: '2027-03-01', leadTimeDays: 14, active: true, visibility: { requires: 'has_hospitality_activation' }, options: [{ name: 'Menu', values: ['Riviera canapés', 'Premium seafood', 'Vegetarian'] }], questions: [{ key: 'service_time', label: 'Service time', type: 'time', required: true }, { key: 'location', label: 'Service location', type: 'short_text', required: true }] },
    { id: 'prod_freight', eventId: event.id, name: 'Forklift & material handling', supplierId: 'sup_riviera', categoryId: 'cat_logistics', description: 'On-site forklift with operator — quoted per requirement.', unit: 'service', basePrice: null, taxRate: 0.2, approvalMode: 'quote', minQty: 1, maxQty: 1, orderDeadline: '2027-03-05', leadTimeDays: 5, active: true, visibility: {}, options: [], questions: [{ key: 'handling_notes', label: 'What needs handling? (weights, dimensions, times)', type: 'long_text', required: true }] },
  ];

  /* ----- Forms (configurable field system) ----- */
  const forms = [
    {
      id: 'f_profile', eventId: event.id, title: 'Company profile', category: 'Onboarding',
      description: 'Tell us about your organisation. Used across the programme and printed materials.',
      dueDate: '2027-01-30', assign: { type: 'all' }, allowResubmit: true,
      fields: [
        { key: 'legal_name', label: 'Legal company name', type: 'short_text', required: true },
        { key: 'display_name', label: 'Display name', type: 'short_text', required: true, help: 'As it should appear on signage and the delegate app.' },
        { key: 'sector', label: 'Sector', type: 'single_select', options: ['Technology', 'Financial services', 'Advisory', 'Industrial', 'Other'], required: true },
        { key: 'website', label: 'Website', type: 'url', required: false },
        { key: 'logo', label: 'Logo (vector preferred)', type: 'image_upload', required: true },
        { key: 'description', label: 'Company description', type: 'long_text', required: true, help: '60 words max.' },
        { key: 'primary_contact', label: 'Primary contact', type: 'contact', required: true },
        // Bespoke field — visible ONLY to Partner C (acceptance test #5)
        { key: 'activation_brief', label: 'Bespoke activation concept brief', type: 'long_text', required: true, visibility: { type: 'partner', partners: ['part_c'] }, help: 'Only shown to bespoke partners.' },
      ],
    },
    {
      id: 'f_hs', eventId: event.id, title: 'Health & safety declaration', category: 'Exhibition',
      description: 'Required for all partners with a physical stand presence.',
      dueDate: '2027-02-14', assign: { type: 'entitlement', key: 'has_exhibition_space' },
      fields: [
        { key: 'sec_docs', label: 'Documentation', type: 'section_heading' },
        { key: 'method_statement', label: 'Method statement', type: 'document_upload', required: true },
        { key: 'risk_assessment', label: 'Risk assessment', type: 'document_upload', required: true },
        { key: 'sec_contractor', label: 'Contractor', type: 'section_heading' },
        { key: 'uses_contractor', label: 'Are you appointing an external stand contractor?', type: 'yes_no', required: true },
        // Conditional: only when uses_contractor === true
        { key: 'contractor_name', label: 'Contractor name', type: 'short_text', required: true, condition: { field: 'uses_contractor', equals: true } },
        { key: 'contractor_contact', label: 'Contractor contact', type: 'contact', required: true, condition: { field: 'uses_contractor', equals: true } },
        { key: 'contractor_insurance', label: 'Contractor insurance certificate', type: 'document_upload', required: true, condition: { field: 'uses_contractor', equals: true } },
        { key: 'elec_ack', label: 'I confirm all electrical work will be certified to venue standard.', type: 'acknowledgement', required: true },
      ],
    },
    {
      id: 'f_meetings', eventId: event.id, title: 'Meetings participant details', category: 'Meetings',
      description: 'Details of the representatives taking part in the meetings programme.',
      dueDate: '2027-02-07', assign: { type: 'entitlement', key: 'has_meetings_package' }, allowResubmit: true,
      fields: [
        { key: 'rep_count', label: 'Number of participating representatives', type: 'number', required: true },
        { key: 'lead_rep', label: 'Lead representative', type: 'contact', required: true },
        { key: 'focus_sectors', label: 'Sectors of interest', type: 'multi_select', options: ['Technology', 'Financial services', 'Advisory', 'Industrial', 'Healthcare'], required: true },
        { key: 'objectives', label: 'Meeting objectives', type: 'long_text', required: false },
      ],
    },
    {
      id: 'f_speaker', eventId: event.id, title: 'Speaker & session details', category: 'Content',
      description: 'Confirm your speaker and session information for the programme.',
      dueDate: '2027-02-01', assign: { type: 'entitlement', key: 'has_content_session' },
      fields: [
        { key: 'session_title', label: 'Session title', type: 'short_text', required: true },
        { key: 'speaker', label: 'Speaker', type: 'contact', required: true },
        { key: 'bio', label: 'Speaker biography', type: 'long_text', required: true },
        { key: 'headshot', label: 'Speaker headshot', type: 'image_upload', required: true },
        { key: 'av_needs', label: 'AV requirements', type: 'long_text', required: false },
        { key: 'presentation_deadline_ack', label: 'I understand presentations are due 5 working days before the event.', type: 'acknowledgement', required: true },
      ],
    },
    {
      id: 'f_passes', eventId: event.id, title: 'Delegate pass registration', category: 'Registration',
      description: 'Register the named delegates for your allocated passes.',
      dueDate: '2027-03-01', assign: { type: 'all' }, allowResubmit: true,
      fields: [
        { key: 'allocation', label: 'Passes allocated', type: 'number', required: true, readonly: true },
        { key: 'delegate_1', label: 'Delegate 1', type: 'contact', required: true },
        { key: 'delegate_2', label: 'Delegate 2', type: 'contact', required: false },
        { key: 'dietary', label: 'Dietary requirements', type: 'long_text', required: false },
      ],
    },
  ];

  /* ----- Request types (configurable, spec §6.5) ----- */
  const requestTypes = [
    { id: 'rt_stand_design', eventId: event.id, name: 'Stand design approval', ownerDefault: 'BOARD Operations', fields: [{ key: 'stand_number', label: 'Stand number', type: 'short_text', required: true }, { key: 'max_height', label: 'Maximum build height (m)', type: 'number', required: true }, { key: 'plans', label: 'Design plans (PDF)', type: 'document_upload', required: true }, { key: 'notes', label: 'Notes', type: 'long_text', required: false }] },
    { id: 'rt_rigging', eventId: event.id, name: 'Rigging approval', ownerDefault: 'BOARD Operations', fields: [{ key: 'rig_weight', label: 'Total rig weight (kg)', type: 'number', required: true }, { key: 'rig_plan', label: 'Rigging plan', type: 'document_upload', required: true }] },
    { id: 'rt_hosted', eventId: event.id, name: 'Hosted event approval', ownerDefault: 'BOARD Operations', fields: [{ key: 'event_name', label: 'Function name', type: 'short_text', required: true }, { key: 'date_time', label: 'Date & time', type: 'short_text', required: true }, { key: 'headcount', label: 'Expected headcount', type: 'number', required: true }, { key: 'location', label: 'Preferred location', type: 'short_text', required: false }, { key: 'concept', label: 'Concept & running order', type: 'long_text', required: true }] },
    { id: 'rt_vehicle', eventId: event.id, name: 'Vehicle access', ownerDefault: 'BOARD Operations', fields: [{ key: 'vehicle_reg', label: 'Vehicle registration', type: 'short_text', required: true }, { key: 'access_window', label: 'Requested access window', type: 'short_text', required: true }] },
    { id: 'rt_accreditation', eventId: event.id, name: 'Additional accreditation', ownerDefault: 'BOARD Operations', fields: [{ key: 'names', label: 'Names & roles', type: 'long_text', required: true }, { key: 'reason', label: 'Reason', type: 'long_text', required: true }] },
    { id: 'rt_general', eventId: event.id, name: 'General operational request', ownerDefault: 'BOARD Operations', fields: [{ key: 'summary', label: 'Summary', type: 'short_text', required: true }, { key: 'detail', label: 'Detail', type: 'long_text', required: true }] },
  ];

  /* ----- Content (information centre) ----- */
  const contentCategories = [
    { id: 'cc_dates', name: 'Important dates' },
    { id: 'cc_venue', name: 'Venue & access' },
    { id: 'cc_build', name: 'Build & exhibition' },
    { id: 'cc_brand', name: 'Brand & artwork' },
    { id: 'cc_meetings', name: 'Meetings & content' },
    { id: 'cc_hospitality', name: 'Hospitality' },
    { id: 'cc_help', name: 'Help' },
  ];
  const contentPages = [
    { id: 'pg_dates', eventId: event.id, categoryId: 'cc_dates', title: 'Key deadlines', updated: '2026-11-02', visibility: { type: 'all' }, requireAck: false, body: 'All partner deadlines for BOARD Monaco 2027 in one place. Company profile 30 Jan · Health & safety 14 Feb · Orders close 28 Feb · Delegate registration 1 Mar.', blocks: [
      { type: 'paragraph', text: 'Every partner deadline for **BOARD Monaco 2027** in one place. Dates apply to all partners; module-specific deadlines only appear if your participation includes them. Times are CET.' },
      { type: 'timeline', items: [
        { date: '2027-01-30', title: 'Company profile complete', note: 'Logo, description and key contacts published to the delegate app.' },
        { date: '2027-02-01', title: 'Speaker & session details', note: 'Content partners confirm session title, speaker and format.' },
        { date: '2027-02-05', title: 'Stand design rules acknowledged', note: 'Required before any stand plans can be reviewed.' },
        { date: '2027-02-07', title: 'Meetings participant details', note: 'Meetings partners submit participating representatives.' },
        { date: '2027-02-10', title: 'Stand design submitted for approval', note: 'Upload plans and elevations for operations sign-off.' },
        { date: '2027-02-14', title: 'Health & safety declaration', note: 'Method statement and risk assessment for all physical stands.' },
        { date: '2027-02-18', title: 'Branding artwork upload', note: 'Print-ready artwork to Popshap specification.' },
        { date: '2027-02-28', title: 'Shop orders close', note: 'Final date for AV, furniture, electrical and catering orders at standard rates.' },
        { date: '2027-03-01', title: 'Delegate registration closes', note: 'Register all named passes in your allocation.' },
        { date: '2027-03-22', title: 'BOARD Monaco 2027 opens', note: 'Doors open at the Grimaldi Forum, 09:00 CET.' }
      ] }
    ] },
    { id: 'pg_venue', eventId: event.id, categoryId: 'cc_venue', title: 'Grimaldi Forum — venue guide', updated: '2026-10-18', visibility: { type: 'all' }, requireAck: false, body: 'Address, loading access, cloakroom and floor levels for the Grimaldi Forum, Monaco.', blocks: [
      { type: 'paragraph', text: 'The **Grimaldi Forum** sits on the seafront at 10 Avenue Princesse Grace, Monaco. All partner build, show and breakdown activity takes place across the Ravel and Camille Blanc levels. Full directions, parking and public-transport options are on the [venue website](https://www.grimaldiforum.com).' },
      { type: 'image', src: 'assets/board-bg-7.png', caption: 'Grimaldi Forum — seafront elevation, Ravel entrance.' },
      { type: 'heading', text: 'Loading & vehicle access' },
      { type: 'paragraph', text: 'The goods entrance is on the lower level via Avenue Princesse Grace. All vehicles must be pre-booked into a marshalling slot — unbooked vehicles cannot be admitted during build.' },
      { type: 'list', items: ['Goods lift: 4.0m × 2.4m, 5,000kg limit', 'Maximum vehicle height at the ramp: 3.8m', 'Marshalling operates from 06:00 on all build days', 'Cloakroom and partner lounge are on the Ravel level'] },
      { type: 'callout', tone: 'info', text: 'Loading slots are limited. Book yours through the Move-in vehicle access request as early as possible — slots are allocated in submission order.' },
      { type: 'download', name: 'Grimaldi Forum floor plan (PDF)', note: '2.4 MB · updated 18 Oct 2026' }
    ] },
    { id: 'pg_access', eventId: event.id, categoryId: 'cc_venue', title: 'Access & accreditation', updated: '2026-10-18', visibility: { type: 'all' }, requireAck: false, body: 'How passes, wristbands and contractor access work across build, show and breakdown days.' },
    { id: 'pg_build', eventId: event.id, categoryId: 'cc_build', title: 'Build & breakdown schedule', updated: '2026-11-20', visibility: { type: 'entitlement', key: 'has_exhibition_space' }, requireAck: false, body: 'Move-in from 20 March 07:00. Breakdown from 24 March 18:00. Vehicle marshalling details inside.' },
    { id: 'pg_standrules', eventId: event.id, categoryId: 'cc_build', title: 'Stand design & construction rules', updated: '2026-11-20', visibility: { type: 'entitlement', key: 'has_exhibition_space' }, requireAck: true, body: 'Maximum build height, rigging rules, fire regulations and platform requirements. Acknowledgement required before build.', blocks: [
      { type: 'callout', tone: 'warn', text: 'These rules are binding. You must acknowledge them before your stand plans can be approved and before any build activity begins on site.' },
      { type: 'paragraph', text: 'All custom and space-only stands must comply with the following construction standards. Turnkey stands supplied by GES already meet them. If you are appointing your own contractor, share this page with them directly.' },
      { type: 'heading', text: 'Build height & structures' },
      { type: 'list', items: ['Standard maximum build height: 4.0m', 'Anything above 4.0m requires a rigging & structural approval request', 'Double-decker structures are not permitted', 'Platforms over 100mm require an access ramp'] },
      { type: 'heading', text: 'Fire & materials' },
      { type: 'paragraph', text: 'All materials must be **inherently flame-retardant or treated to Euroclass B-s1,d0**. Certificates must be uploaded with your Health & safety declaration. Naked flames, pyrotechnics and hazardous substances require separate written approval.' },
      { type: 'quote', text: 'A safe, well-run build protects your team, your neighbours on the floor and the guests you have invited.', cite: 'BOARD Operations' },
      { type: 'download', name: 'Stand plan submission template (PDF)', note: '1.1 MB · required for approval' }
    ] },
    { id: 'pg_shipping', eventId: event.id, categoryId: 'cc_build', title: 'Shipping & logistics', updated: '2026-11-05', visibility: { type: 'entitlement', key: 'has_exhibition_space' }, requireAck: false, body: 'Deliveries, storage, and the official freight forwarder for on-site handling.' },
    { id: 'pg_artwork', eventId: event.id, categoryId: 'cc_brand', title: 'Branding & artwork guidance', updated: '2026-11-12', visibility: { type: 'entitlement', key: 'has_branding_inventory' }, requireAck: false, body: 'Artwork specifications, print deadlines and placement guidance for all branding inventory.', blocks: [
      { type: 'paragraph', text: 'Your branding inventory is produced by **Popshap**, our signage partner. Supply print-ready artwork to the specifications below by the artwork deadline so we can proof and produce in good time.' },
      { type: 'image', src: 'assets/board-bg-2.png', caption: 'BOARD brand gradient — approved for large-format backdrops.' },
      { type: 'heading', text: 'Artwork specifications' },
      { type: 'list', items: ['Format: print-ready PDF or packaged AI, CMYK', 'Resolution: 150 dpi at 100% scale', 'Bleed: 25mm on all edges', 'Fonts: outlined or embedded', 'Colour: supply Pantone references for brand colours'] },
      { type: 'callout', tone: 'info', text: 'Artwork deadline is 12 February 2027. Files received after this date cannot be guaranteed for on-site delivery.' },
      { type: 'download', name: 'BOARD brand & artwork guidelines (PDF)', note: '3.8 MB · updated 12 Nov 2026' }
    ] },
    { id: 'pg_meetings', eventId: event.id, categoryId: 'cc_meetings', title: 'Meetings programme guidance', updated: '2026-11-08', visibility: { type: 'entitlement', key: 'has_meetings_package' }, requireAck: false, body: 'How the meetings programme runs, profile deadlines and participation guidance.' },
    { id: 'pg_speaker', eventId: event.id, categoryId: 'cc_meetings', title: 'Speaker & production guidance', updated: '2026-11-08', visibility: { type: 'entitlement', key: 'has_content_session' }, requireAck: false, body: 'Presentation format, production timeline and on-stage guidance for content partners.' },
    { id: 'pg_catering', eventId: event.id, categoryId: 'cc_hospitality', title: 'Catering & function approvals', updated: '2026-11-15', visibility: { type: 'entitlement', key: 'has_hospitality_activation' }, requireAck: false, body: 'Venue catering rules and the approval route for any hosted function.' },
    { id: 'pg_faq', eventId: event.id, categoryId: 'cc_help', title: 'Frequently asked questions', updated: '2026-11-01', visibility: { type: 'all' }, requireAck: false, body: 'Answers to the questions partners ask most often.' },
    // Private page for Partner C only
    { id: 'pg_meridian', eventId: event.id, categoryId: 'cc_hospitality', title: 'Meridian rooftop activation — private brief', updated: '2026-11-22', visibility: { type: 'partner', partners: ['part_c'] }, requireAck: false, body: 'Confidential operational brief for the Meridian rooftop activation. Visible only to Meridian Partners.' },
  ];

  /* ----- Files & assets ----- */
  const files = [
    { id: 'file_logo', eventId: event.id, name: 'BOARD Monaco 2027 logo pack.zip', kind: 'Event logos', size: '4.2 MB', visibility: { type: 'all' } },
    { id: 'file_toolkit', eventId: event.id, name: 'Partner marketing toolkit.pdf', kind: 'Partner toolkit', size: '8.1 MB', visibility: { type: 'all' } },
    { id: 'file_floorplan', eventId: event.id, name: 'Exhibition floor plan.pdf', kind: 'Floor plans', size: '2.6 MB', visibility: { type: 'entitlement', key: 'has_exhibition_space' } },
    { id: 'file_standspec', eventId: event.id, name: 'Stand build technical spec.pdf', kind: 'Technical specification', size: '1.9 MB', visibility: { type: 'entitlement', key: 'has_exhibition_space' } },
    { id: 'file_artworkspec', eventId: event.id, name: 'Artwork specification.pdf', kind: 'Artwork specifications', size: '640 KB', visibility: { type: 'entitlement', key: 'has_branding_inventory' } },
  ];

  /* ----- Task templates (spec §7.4) ----- */
  const taskTemplates = [
    { id: 'tt_profile', eventId: event.id, title: 'Complete your company profile', category: 'Onboarding', module: 'forms', priority: 'high', required: true, dueDate: '2027-01-30', requires: null, link: { type: 'form', target: 'f_profile' }, instructions: 'This information is used across signage, the delegate app and printed materials.' },
    { id: 'tt_passes', eventId: event.id, title: 'Register your delegate passes', category: 'Registration', module: 'forms', priority: 'medium', required: true, dueDate: '2027-03-01', requires: null, link: { type: 'form', target: 'f_passes' }, instructions: '' },
    { id: 'tt_hs', eventId: event.id, title: 'Submit health & safety declaration', category: 'Exhibition', module: 'forms', priority: 'high', required: true, dueDate: '2027-02-14', requires: 'has_exhibition_space', link: { type: 'form', target: 'f_hs' }, instructions: 'Required before any build can begin.' },
    { id: 'tt_stand', eventId: event.id, title: 'Submit stand design for approval', category: 'Exhibition', module: 'requests', priority: 'high', required: true, dueDate: '2027-02-10', requires: 'requires_stand_approval', link: { type: 'request', target: 'rt_stand_design' }, instructions: '' },
    { id: 'tt_rules', eventId: event.id, title: 'Read & acknowledge stand design rules', category: 'Exhibition', module: 'information', priority: 'medium', required: true, dueDate: '2027-02-05', requires: 'has_exhibition_space', link: { type: 'content', target: 'pg_standrules' }, instructions: '' },
    { id: 'tt_meetings', eventId: event.id, title: 'Submit meetings participant details', category: 'Meetings', module: 'forms', priority: 'high', required: true, dueDate: '2027-02-07', requires: 'has_meetings_package', link: { type: 'form', target: 'f_meetings' }, instructions: '' },
    { id: 'tt_artwork', eventId: event.id, title: 'Upload your branding artwork', category: 'Brand', module: 'files', priority: 'medium', required: true, dueDate: '2027-02-18', requires: 'has_branding_inventory', link: { type: 'upload', target: null }, instructions: 'Print-ready artwork to the specification in the artwork guidance.' },
    { id: 'tt_speaker', eventId: event.id, title: 'Confirm speaker & session details', category: 'Content', module: 'forms', priority: 'high', required: true, dueDate: '2027-02-01', requires: 'has_content_session', link: { type: 'form', target: 'f_speaker' }, instructions: '' },
    { id: 'tt_hosted', eventId: event.id, title: 'Submit your hosted function plan', category: 'Hospitality', module: 'requests', priority: 'high', required: true, dueDate: '2027-02-12', requires: 'has_hospitality_activation', link: { type: 'request', target: 'rt_hosted' }, instructions: '' },
    { id: 'tt_av', eventId: event.id, title: 'Order essential AV for your stand', category: 'Shop', module: 'shop', priority: 'low', required: false, dueDate: '2027-02-28', requires: 'can_order_av', link: { type: 'shop', target: 'cat_av' }, instructions: 'Optional — but AV books up quickly.' },
  ];

  /* ----- Package templates ----- */
  const packageTemplates = [
    { id: 'pkg_space', eventId: event.id, name: 'Space-only exhibition partner', entitlements: ['has_exhibition_space', 'requires_stand_approval', 'can_order_av', 'can_order_furniture', 'can_order_signage'], notes: 'You have exhibition space. Your stand is built by you or your appointed contractor.' },
    { id: 'pkg_turnkey', eventId: event.id, name: 'Turnkey exhibition partner', entitlements: ['has_exhibition_space', 'has_turnkey_stand', 'can_order_av'], notes: 'Your shell-scheme stand is provided. Add AV and extras as needed.' },
    { id: 'pkg_meetings', eventId: event.id, name: 'Meetings partner', entitlements: ['has_meetings_package'], notes: 'You take part in the curated meetings programme.' },
    { id: 'pkg_content', eventId: event.id, name: 'Content partner', entitlements: ['has_content_session'], notes: 'You hold a content session on the programme.' },
    { id: 'pkg_branding', eventId: event.id, name: 'Branding partner', entitlements: ['has_branding_inventory', 'can_order_signage'], notes: 'You hold branding inventory across the venue.' },
    { id: 'pkg_hospitality', eventId: event.id, name: 'Hospitality partner', entitlements: ['has_hospitality_activation', 'can_order_catering'], notes: 'You host a function during the event.' },
    { id: 'pkg_bespoke', eventId: event.id, name: 'Bespoke partner', entitlements: [], notes: 'A tailored package — configured per partner.' },
  ];

  /* ----- Partner organisations, participations & users ----- */
  // Placeholder brand logos (stand-ins for logos partners upload on their company profile).
  const mkLogo = (name, initial, mark) => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='420' height='96' viewBox='0 0 420 96'>"
      + "<rect x='0' y='16' width='64' height='64' rx='14' fill='" + mark + "'/>"
      + "<text x='32' y='60' font-family='Arial,Helvetica,sans-serif' font-size='34' font-weight='700' fill='#0B0D11' text-anchor='middle'>" + initial + "</text>"
      + "<text x='82' y='58' font-family='Arial,Helvetica,sans-serif' font-size='30' font-weight='300' letter-spacing='0.5' fill='#FFFFFF'>" + name + "</text></svg>";
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  };
  const partners = [
    { id: 'part_a', name: 'Helvetica Systems', sector: 'Enterprise Tech & AI', country: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland', billing: { entity: 'Helvetica Systems AG', address: 'Bahnhofstrasse 1', city: 'Zürich', postcode: '8001', country: 'Switzerland', vat: 'CHE-123.456.789' }, logo: mkLogo('Helvetica Systems', 'H', '#31F9E5') },
    { id: 'part_b', name: 'Northwind Advisory', sector: 'Management Consultancy', country: '30 St Mary Axe, London EC3A 8BF, United Kingdom', billing: { entity: 'Northwind Advisory LLP', address: '30 St Mary Axe', city: 'London', postcode: 'EC3A 8BF', country: 'United Kingdom', vat: 'GB 123 4567 89' }, logo: mkLogo('Northwind Advisory', 'N', '#C8763C') },
    { id: 'part_c', name: 'Meridian Partners', sector: 'Investment', country: '15 Avenue Montaigne, 75008 Paris, France', billing: { entity: 'Meridian Partners SAS', address: '15 Avenue Montaigne', city: 'Paris', postcode: '75008', country: 'France', vat: 'FR 12 345678901' }, logo: mkLogo('Meridian Partners', 'M', '#F1F1E4') },
  ];

  const partnerUsers = [
    { id: 'u_alex', partnerId: 'part_a', name: 'Alex Morgan', email: 'alex@helvetica.example', telephone: '+41 44 000 0000', role: 'lead', permissions: 'all' },
    { id: 'u_sam', partnerId: 'part_a', name: 'Sam Doyle', email: 'sam@helvetica.example', telephone: '', role: 'user', permissions: { tasks: true, forms: true, shop: true, orders: true, requests: false, profile: false, team: false } },
    { id: 'u_priya', partnerId: 'part_b', name: 'Priya Shah', email: 'priya@northwind.example', telephone: '+44 20 0000 0000', role: 'lead', permissions: 'all' },
    { id: 'u_jordan', partnerId: 'part_c', name: 'Jordan Blake', email: 'jordan@meridian.example', telephone: '+33 1 00 00 00 00', role: 'lead', permissions: 'all' },
    { id: 'u_riley', partnerId: 'part_c', name: 'Riley Chen', email: 'riley@meridian.example', telephone: '', role: 'user', permissions: { tasks: true, forms: true, shop: false, orders: true, requests: true, profile: true, team: false } },
  ];

  // taskState / formState keyed by templateId / formId to seed the story
  const participations = [
    {
      id: 'ep_a', eventId: event.id, partnerId: 'part_a', reference: 'BP-001', standRef: 'A12',
      packageId: null, addedEntitlements: ['has_exhibition_space', 'requires_stand_approval', 'can_order_av', 'can_order_furniture', 'can_order_signage'], removedEntitlements: [],
      moduleOverrides: {}, priceOverrides: [],
      partnerNotes: 'Corner stand confirmed. Power and rigging must clear the aisle.',
      internalNotes: 'Key tech logo. Stand plan slightly over height — watch on approval.',
      leadUserId: 'u_alex',
      allocatedProducts: [],
      requestedFiles: [
        { id: 'rf_a1', label: 'Public liability insurance certificate', due: '2027-02-12', required: true, file: { name: 'helvetica-liability-2027.pdf', uploadedAt: '2027-01-20T10:00:00Z', by: 'Alex Morgan' } },
        { id: 'rf_a2', label: 'Stand contractor method statement', due: '2027-02-14', required: true, file: null },
        { id: 'rf_a3', label: 'High-resolution logo (SVG or EPS, transparent)', due: '2027-01-30', required: true, file: null },
      ],
      inventory: [
        { id: 'inv_a1', type: 'Dedicated Space', name: 'Corner stand · 6m × 4m', description: 'Raw exhibition space, corner position with two open sides.', cost: 18000, quantity: 1, standNumber: 'A12', refs: [{ kind: 'form', id: 'f_hs' }, { kind: 'task', id: 'tt_stand' }, { kind: 'task', id: 'tt_rules' }] },
        { id: 'inv_a2', type: 'Delegate Passes', name: 'Associate Pass', passType: 'Associate Pass', description: 'Full show access', cost: 0, quantity: 4, standNumber: '', refs: [{ kind: 'form', id: 'f_passes' }] },
      ],
      taskState: {
        tt_rules: { completed: true, completedAt: '2026-12-14T11:02:00Z', completedBy: 'Alex Morgan' },
        tt_stand: { completed: true, completedAt: '2027-01-04T15:40:00Z', completedBy: 'Alex Morgan' },
      },
      formState: {
        f_profile: { status: 'approved', submittedAt: '2026-12-10T09:20:00Z', submittedBy: 'Alex Morgan', values: { legal_name: 'Helvetica Systems AG', display_name: 'Helvetica Systems', sector: 'Technology', website: 'https://helvetica.example', description: 'Infrastructure software for regulated industries.' } },
        f_hs: { status: 'changes_required', submittedAt: '2027-01-08T10:00:00Z', submittedBy: 'Sam Doyle', feedback: 'Risk assessment is missing the working-at-height section. Please revise and resubmit.', values: { uses_contractor: true, contractor_name: 'AlpEvents GmbH' } },
      },
      passAllocation: 4,
    },
    {
      id: 'ep_b', eventId: event.id, partnerId: 'part_b', reference: 'BP-002', standRef: null,
      packageId: null,
      addedEntitlements: ['has_meetings_package', 'has_branding_inventory', 'can_order_signage'], removedEntitlements: [],
      moduleOverrides: {}, priceOverrides: [],
      partnerNotes: 'Branding placements confirmed: main foyer banner + app splash.',
      internalNotes: 'Upgraded mid-cycle to add branding. No physical stand.',
      leadUserId: 'u_priya',
      allocatedProducts: [],
      inventory: [
        { id: 'inv_b1', type: 'Curated Introductions', name: 'Meetings programme · 12 introductions', description: 'Curated one-to-one introductions with matched senior leaders across the two days.', cost: 22000, quantity: 12, standNumber: '', refs: [{ kind: 'form', id: 'f_meetings' }] },
        { id: 'inv_b2', type: 'Branding', name: 'Main foyer banner + app splash', description: 'Premium foyer banner placement plus a rotating splash slot in the delegate app.', cost: 9500, quantity: 1, standNumber: '', refs: [] },
      ],
      taskState: {
        tt_profile: { completed: true, completedAt: '2026-12-18T14:00:00Z', completedBy: 'Priya Shah' },
      },
      formState: {
        f_profile: { status: 'submitted', submittedAt: '2026-12-18T14:00:00Z', submittedBy: 'Priya Shah', values: { legal_name: 'Northwind Advisory LLP', display_name: 'Northwind Advisory', sector: 'Advisory', logo: 'northwind-logo-vector.svg' } },
        f_meetings: { status: 'submitted', submittedAt: '2027-01-09T11:30:00Z', submittedBy: 'Priya Shah', values: { headshot: 'priya-shah-headshot.jpg' } },
      },
      requestedFiles: [
        { id: 'rf_b1', label: 'Print-ready branding artwork (PDF or packaged AI)', due: '2027-02-12', required: true, file: null },
        { id: 'rf_b2', label: 'High-resolution logo (SVG or EPS, transparent)', due: '2027-01-30', required: true, file: { name: 'northwind-logo-vector.svg', uploadedAt: '2027-01-14T09:15:00Z', by: 'Priya Shah' } },
      ],
      passAllocation: 3,
    },
    {
      id: 'ep_c', eventId: event.id, partnerId: 'part_c', reference: 'BP-003', standRef: 'C04',
      packageId: null,
      addedEntitlements: ['has_exhibition_space', 'has_content_session', 'has_hospitality_activation', 'has_branding_inventory', 'can_order_av'], removedEntitlements: [],
      moduleOverrides: {},
      // Partner-specific price override (acceptance: partner-specific product price)
      priceOverrides: [{ productId: 'prod_screen85', price: 950 }],
      partnerNotes: 'Rooftop activation + content session + demo stand. Your dedicated contact is Anna Lewis.',
      internalNotes: 'Highest-value bespoke partner. Custom rooftop function — see private brief.',
      leadUserId: 'u_jordan',
      allocatedProducts: [],
      inventory: [
        { id: 'inv_c1', type: 'Dedicated Space', name: 'Demo stand · 8m × 5m', description: 'Custom-build demonstration space adjoining the content stage.', cost: 26000, quantity: 1, standNumber: 'C04', refs: [{ kind: 'task', id: 'tt_stand' }] },
        { id: 'inv_c2', type: 'Bespoke', name: 'Rooftop hosted function', description: 'Private rooftop reception for up to 80 guests on the evening of day one.', cost: 35000, quantity: 1, standNumber: '', refs: [{ kind: 'task', id: 'tt_hosted' }] },
        { id: 'inv_c3', type: 'Bespoke', name: 'Content session · main stage', description: '25-minute keynote slot on the main programme.', cost: 15000, quantity: 1, standNumber: '', refs: [{ kind: 'form', id: 'f_speaker' }, { kind: 'task', id: 'tt_speaker' }] },
      ],
      taskState: {
      },
      formState: {},
      formDueDates: { f_speaker: '2027-02-06' },
      passAllocation: 8,
    },
  ];

  /* ----- Orders, supplier orders & webhook log ----- */
  const orders = [
    {
      id: 'ord_a1', eventId: event.id, participationId: 'ep_a', reference: 'BO-2027-00018',
      status: 'submitted', submittedAt: '2027-01-12T12:20:00Z',
      billing: { legalEntity: 'Helvetica Systems AG', address: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland', taxNumber: 'CHE-123.456.789', invoiceContactName: 'Jamie Smith', invoiceContactEmail: 'accounts@helvetica.example', poNumber: 'PO-4567', internalRef: 'BOOTH-A12', notes: 'Invoice the Zürich entity.' },
      items: [
        { productId: 'prod_screen55', name: '55" screen on floor stand', supplierId: 'sup_aztec', qty: 2, unitPrice: 750, options: { Mounting: 'Floor stand' }, answers: { installation_location: 'Stand A12 — back wall', onsite_contact: 'Sam Doyle' } },
        { productId: 'prod_carpet', name: 'Stand carpet', supplierId: 'sup_ges', qty: 36, unitPrice: 22, options: { Colour: 'Rich black' }, answers: { stand_number: 'A12', area_m2: '36' } },
      ],
    },
  ];

  const supplierOrders = [
    { id: 'so_a1_aztec', orderId: 'ord_a1', supplierId: 'sup_aztec', reference: 'SO-2027-00041', status: 'confirmed', submittedAt: '2027-01-12T12:20:00Z', confirmedAt: '2027-01-12T12:30:00Z', approvalMode: 'auto', items: [{ productId: 'prod_screen55', name: '55" screen on floor stand', qty: 2, unitPrice: 750 }], subtotal: 1500, tax: 300, total: 1800 },
    { id: 'so_a1_ges', orderId: 'ord_a1', supplierId: 'sup_ges', reference: 'SO-2027-00042', status: 'under_review', submittedAt: '2027-01-12T12:20:00Z', confirmedAt: null, approvalMode: 'manual', items: [{ productId: 'prod_carpet', name: 'Stand carpet', qty: 36, unitPrice: 22 }], subtotal: 792, tax: 158.4, total: 950.4 },
  ];

  const webhookEvents = [
    {
      id: 'evt_01HXYZ', eventType: 'supplier_order.confirmed', supplierOrderId: 'so_a1_aztec', supplierId: 'sup_aztec',
      sentAt: '2027-01-12T12:30:00Z', idempotencyKey: 'idem_9f2a41c7a0', status: 'delivered',
      attempts: [{ at: '2027-01-12T12:30:00Z', responseCode: 200, responseBody: '{"status":"success","request_id":"zap_01H..."}', ok: true }],
      retryCount: 0,
      payload: buildPayloadStub('supplier_order.confirmed', 'so_a1_aztec'),
    },
    {
      id: 'evt_01HABC', eventType: 'supplier_order.quote_requested', supplierOrderId: 'so_c_quote', supplierId: 'sup_riviera',
      sentAt: '2027-01-18T09:05:00Z', idempotencyKey: 'idem_0d5c9a8611', status: 'failed',
      attempts: [
        { at: '2027-01-18T09:05:00Z', responseCode: 500, responseBody: '{"error":"internal"}', ok: false },
        { at: '2027-01-18T09:06:30Z', responseCode: 502, responseBody: 'Bad Gateway', ok: false },
      ],
      retryCount: 2,
      payload: buildPayloadStub('supplier_order.quote_requested', 'so_c_quote'),
    },
  ];

  /* ----- Requests (instances) ----- */
  const requests = [
    { id: 'req_a1', eventId: event.id, participationId: 'ep_a', typeId: 'rt_stand_design', reference: 'RQ-2027-0012', status: 'under_review', owner: 'Anna Lewis', submittedBy: 'Alex Morgan', submittedAt: '2027-01-04T15:40:00Z', responseAt: null, values: { stand_number: 'A12', max_height: 4, notes: 'Double-decker not required. LED header at 3.8m.' }, files: ['Helvetica_stand_v3.pdf'], comments: [{ by: 'Alex Morgan', role: 'partner', at: '2027-01-04T15:40:00Z', text: 'Submitting our stand design for approval.' }, { by: 'Anna Lewis', role: 'organiser', at: '2027-01-06T10:12:00Z', text: 'Thanks — reviewing with the venue. Header height is close to the limit, confirming.' }] },
    { id: 'req_c1', eventId: event.id, participationId: 'ep_c', typeId: 'rt_hosted', reference: 'RQ-2027-0019', status: 'more_info', owner: 'Anna Lewis', submittedBy: 'Jordan Blake', submittedAt: '2027-01-15T11:00:00Z', responseAt: '2027-01-16T09:30:00Z', values: { event_name: 'Meridian rooftop reception', date_time: '23 March, 19:00', headcount: 120, concept: 'Sunset reception on the terrace with live acoustic set.' }, files: [], comments: [{ by: 'Jordan Blake', role: 'partner', at: '2027-01-15T11:00:00Z', text: 'Requesting approval for our rooftop reception.' }, { by: 'Anna Lewis', role: 'organiser', at: '2027-01-16T09:30:00Z', text: 'Love it. Please confirm the catering supplier and whether you need a noise curfew exemption after 22:00.' }] },
  ];

  const notifications = [
    { id: 'n1', participationId: 'ep_a', at: '2027-01-08T12:00:00Z', kind: 'changes_required', text: 'Your Health & safety declaration needs changes before it can be approved.', read: false },
    { id: 'n2', participationId: 'ep_a', at: '2027-01-12T12:30:00Z', kind: 'order', text: 'Order BO-2027-00018 submitted. Your AV items are confirmed.', read: true },
  ];

  const emailTemplates = [
    { id: 'et_invite', name: 'Partner invitation', subject: 'You’re invited to the BOARD Monaco 2027 Partner Portal', enabled: true },
    { id: 'et_submit', name: 'Submission confirmation', subject: 'We’ve received your submission', enabled: true },
    { id: 'et_order', name: 'Order confirmation', subject: 'Your BOARD 2027 order has been submitted', enabled: true },
    { id: 'et_changes', name: 'Changes required', subject: 'Action needed: changes required', enabled: true },
    { id: 'et_deadline', name: 'Deadline reminder', category: 'reminder', subject: 'Reminder: [task] is due [due]', enabled: true,
      body: 'Hi [first_name],\n\nA quick reminder that “[task]” is due [due] for [partner] at [event].\n\nYou can complete it any time in your Partner Portal: [portal_link]\n\nIf you have any questions, just reply to this email.\n\nThanks,\n[signature]' },
    { id: 'et_overdue', name: 'Overdue reminder', category: 'reminder', subject: 'Overdue: [task] was due [due]', enabled: true,
      body: 'Hi [first_name],\n\nOur records show that “[task]” for [partner] was due [due] and is now overdue. Please complete it as soon as possible so we can keep your participation in [event] on track.\n\nComplete it here: [portal_link]\n\nIf this is already in hand or you need more time, let us know.\n\nThanks,\n[signature]' },
  ];

  const auditLog = [
    { id: 'a1', at: '2027-01-12T12:30:00Z', actor: 'System', text: 'Supplier order SO-2027-00041 confirmed — webhook delivered to Aztec (200).' },
    { id: 'a2', at: '2027-01-08T12:00:00Z', actor: 'Anna Lewis', text: 'Requested changes on Helvetica Systems Health & safety declaration.' },
    { id: 'a3', at: '2027-01-06T10:12:00Z', actor: 'Anna Lewis', text: 'Commented on request RQ-2027-0012 (Helvetica Systems).' },
    { id: 'a4', at: '2027-01-18T09:06:30Z', actor: 'System', text: 'Webhook delivery to Riviera Event Logistics failed (502) after 2 attempts.' },
  ];

  const organiserUsers = [
    { id: 'org_anna', name: 'Anna Lewis', title: 'Operations Coordinator', email: 'anna@boardsummits.example', role: 'super_admin' },
    { id: 'org_team', name: 'BOARD Operations', title: 'Operations team', email: 'operations@boardsummits.example', role: 'super_admin' },
  ];

  return {
    version: 1,
    event, entitlements, suppliers, shopCategories, products, forms, requestTypes,
    contentCategories, contentPages, files, taskTemplates, packageTemplates,
    partners, partnerUsers, participations, orders, supplierOrders, webhookEvents,
    requests, notifications, emailTemplates, auditLog, organiserUsers,
    sentEmails: [],
  };
}

function buildPayloadStub(eventType, supplierOrderId) {
  return { event_type: eventType, note: 'Payload materialised at send time from the supplier order snapshot.', supplier_order: { id: supplierOrderId } };
}

/* ============================================================
   Resolvers — the personalisation engine
   ============================================================ */

export function entitlementSet(part) {
  const db = window.__BOARD_DB;
  const pkg = db.packageTemplates.find((p) => p.id === part.packageId);
  const set = new Set(pkg ? pkg.entitlements : []);
  (part.addedEntitlements || []).forEach((k) => set.add(k));
  (part.removedEntitlements || []).forEach((k) => set.delete(k));
  return set;
}

// Returns entitlements with provenance for the admin "effective config" view
export function entitlementsWithSource(db, part) {
  const out = [];
  const all = new Set([...(part.addedEntitlements || [])]);
  all.forEach((k) => {
    if ((part.removedEntitlements || []).includes(k)) return;
    out.push({ key: k, source: 'override' });
  });
  return out;
}

export function hasEnt(part, key) {
  return entitlementSet(part).has(key);
}

// Normalise the set of entitlement keys carried by a visibility rule.
// Supports the multi-key shape { keys:[...] } and the legacy single-key
// shapes { key } / { requires } so old data still resolves.
export function entKeys(rule) {
  if (!rule) return [];
  if (Array.isArray(rule.keys)) return rule.keys;
  const k = rule.key || rule.requires;
  return k ? [k] : [];
}

// A partner satisfies an entitlement rule when it holds ANY of the listed keys.
export function hasAnyEnt(part, keys) {
  if (!keys || !keys.length) return true;
  return keys.some((k) => hasEnt(part, k));
}

// Visibility rule check shared by forms fields, products, content, files
export function ruleMatches(rule, part) {
  if (!rule || rule.type === 'all' || Object.keys(rule).length === 0) return true;
  if (rule.type === 'entitlement' || rule.requires || rule.keys) {
    return hasAnyEnt(part, entKeys(rule));
  }
  if (rule.type === 'package') return (rule.packages || []).includes(part.packageId);
  if (rule.type === 'partner') return (rule.partners || []).includes(part.partnerId);
  if (rule.type === 'except') return !(rule.partners || []).includes(part.partnerId);
  return true;
}

export function productVisible(product, part) {
  if (!product.active) return false;
  return ruleMatches(product.visibility, part);
}

export function priceFor(part, product) {
  const o = (part.priceOverrides || []).find((p) => p.productId === product.id);
  return o ? o.price : product.basePrice;
}

export function fieldVisible(field, part, values) {
  if (field.visibility && !ruleMatches(field.visibility, part)) return false;
  if (field.condition) {
    const v = values ? values[field.condition.field] : undefined;
    if (v !== field.condition.equals) return false;
  }
  return true;
}

export function formApplies(form, part) {
  return ruleMatches(form.assign, part);
}

export function contentVisible(page, part) {
  return ruleMatches(page.visibility, part);
}

export function taskApplies(tpl, part) {
  const keys = Array.isArray(tpl.requires) ? tpl.requires : (tpl.requires ? [tpl.requires] : []);
  return hasAnyEnt(part, keys);
}

// Resolve the ordered task list for a participation, merging template + seeded state
export function resolveTasks(db, part) {
  return db.taskTemplates
    .filter((t) => taskApplies(t, part))
    .map((t) => {
      const st = (part.taskState && part.taskState[t.id]) || {};
      const override = part.taskDueDates && part.taskDueDates[t.id];
      const dueDate = override || t.dueDate || null;
      return { ...t, ...st, dueDate, deadlineOverridden: !!override, completed: !!st.completed };
    });
}

export function resolveForms(db, part) {
  return db.forms.filter((f) => formApplies(f, part)).map((f) => {
    const st = (part.formState && part.formState[f.id]) || { status: 'not_started' };
    const override = part.formDueDates && part.formDueDates[f.id];
    const dueDate = override || f.dueDate || null;
    return { ...f, dueDate, deadlineOverridden: !!override, state: st };
  });
}

export function visibleModules(db, part, user) {
  const base = [
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
  // Shop/orders only if the partner can order something
  const canShop = ['can_order_av', 'can_order_furniture', 'can_order_signage', 'can_order_catering', 'has_exhibition_space', 'has_hospitality_activation', 'has_branding_inventory']
    .some((k) => hasEnt(part, k));
  // Partner-User module permissions. Lead (or no specific user) sees everything the org allows.
  // Info-only modules are always visible; the rest map to a permission key.
  const perm = user && user.permissions && user.permissions !== 'all' ? user.permissions : null;
  const alwaysOn = { dashboard: 1, timeline: 1, information: 1, files: 1 };
  const permKey = { tasks: 'tasks', forms: 'forms', requests: 'requests', shop: 'shop', orders: 'orders', participation: 'profile', promote: 'profile', team: 'team' };
  return base.filter((m) => {
    if (part.moduleOverrides && part.moduleOverrides[m.key] === false) return false;
    if ((m.key === 'shop' || m.key === 'orders') && !canShop) return false;
    if (perm && !alwaysOn[m.key]) { const k = permKey[m.key]; if (k && !perm[k]) return false; }
    return true;
  });
}

/* ---------- Persistence ---------- */
const KEY = 'board_portal_db_v2';

export function loadDb() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch (e) { /* ignore */ }
  const db = seed();
  save(db);
  return db;
}

/* Non-destructive migration: backfill seed content blocks onto stored pages
   that predate the block-based content model, without touching partner data. */
function migrate(db) {
  try {
    const s = seed();
    if (!db._promoCopyReset) {
      (db.participations || []).forEach((p) => { if (p.marketing) { ['eyebrow', 'headline', 'sub', 'detail', 'caption'].forEach((k) => { delete p.marketing[k]; }); } });
      db._promoCopyReset = true;
    }
    if (Array.isArray(db.contentPages)) {
      db.contentPages.forEach((p) => {
        if (!Array.isArray(p.blocks) || !p.blocks.length) {
          const sp = s.contentPages.find((x) => x.id === p.id);
          if (sp && Array.isArray(sp.blocks) && sp.blocks.length) p.blocks = sp.blocks;
        }
      });
    }
    // Backfill form-level config flags added after first seed (does not touch submissions).
    if (Array.isArray(db.forms)) {
      db.forms.forEach((f) => {
        const sf = s.forms.find((x) => x.id === f.id);
        if (sf && f.allowResubmit === undefined && sf.allowResubmit !== undefined) f.allowResubmit = sf.allowResubmit;
      });
    }
    // Backfill seed participation inventory (does not touch inventory the organiser has added).
    if (Array.isArray(db.participations)) {
      db.participations.forEach((p) => {
        if (!Array.isArray(p.inventory) || !p.inventory.length) {
          const sp = s.participations.find((x) => x.id === p.id);
          if (sp && Array.isArray(sp.inventory) && sp.inventory.length) p.inventory = sp.inventory;
        }
        // Rename legacy inventory type and drop the old manual 'Extras' items (Extras is now derived from orders).
        if (Array.isArray(p.inventory)) {
          p.inventory.forEach((it) => { if (it.type === 'Exhibition Space') it.type = 'Dedicated Space'; });
          p.inventory = p.inventory.filter((it) => it.type !== 'Extras');
        }
        // Backfill seeded requested files (does not touch files the organiser has added).
        if (!Array.isArray(p.requestedFiles) || !p.requestedFiles.length) {
          const sp = s.participations.find((x) => x.id === p.id);
          p.requestedFiles = (sp && Array.isArray(sp.requestedFiles)) ? sp.requestedFiles : [];
        }
        // Backfill seeded form-upload field values (so "Your uploads" reflects submitted files).
        const sp2 = s.participations.find((x) => x.id === p.id);
        if (sp2 && sp2.formState && p.formState) {
          Object.keys(sp2.formState).forEach((fid) => {
            const seedF = sp2.formState[fid], curF = p.formState[fid];
            if (curF && seedF && seedF.values) {
              curF.values = curF.values || {};
              Object.keys(seedF.values).forEach((k) => { if (curF.values[k] === undefined) curF.values[k] = seedF.values[k]; });
            } else if (!curF && seedF) { p.formState[fid] = seedF; }
          });
        }
      });
    }
    // Dissolve legacy package templates into direct per-partner entitlements.
    if (Array.isArray(db.participations) && Array.isArray(db.packageTemplates)) {
      db.participations.forEach((p) => {
        if (p.packageId) {
          const pkg = db.packageTemplates.find((k) => k.id === p.packageId);
          const added = new Set(p.addedEntitlements || []);
          if (pkg) pkg.entitlements.forEach((k) => { if (!(p.removedEntitlements || []).includes(k)) added.add(k); });
          p.addedEntitlements = [...added];
          p.removedEntitlements = [];
          p.packageId = null;
        }
      });
    }
    // Backfill structured billing from the flat country string.
    if (Array.isArray(db.partners)) {
      db.partners.forEach((p) => {
        if (!p.billing) {
          const sp = s.partners.find((x) => x.id === p.id);
          p.billing = (sp && sp.billing) ? sp.billing : { entity: p.name || '', address: (p.country && p.country !== '—') ? p.country : '', city: '', postcode: '', country: '', vat: '' };
        }
      });
    }
    // Backfill plural terminology keys added after first seed.
    if (!Array.isArray(db.sentEmails)) db.sentEmails = [];
    if (db.event && !db.event.sender) db.event.sender = { name: 'BOARD Operations', email: 'operations@boardsummits.com', signature: 'BOARD Operations\nGrimaldi Forum, Monaco\nboardsummits.com', logo: '' };
    // Backfill reminder-template bodies/categories added after first seed.
    if (Array.isArray(db.emailTemplates)) {
      const seedT = s.emailTemplates;
      const byId = {}; db.emailTemplates.forEach((t) => { byId[t.id] = t; });
      seedT.forEach((st) => {
        if (!byId[st.id]) { db.emailTemplates.push({ ...st }); return; }
        const t = byId[st.id];
        if (st.category && !t.category) t.category = st.category;
        if (st.body && t.body === undefined) t.body = st.body;
        // Refresh old reminder sign-off (pre-signature-token) to the editable [signature] version.
        if (t.body && /Thanks,\n\[sender\]\nBOARD Operations/.test(t.body)) {
          t.body = t.body.replace(/Thanks,\n\[sender\]\nBOARD Operations/, 'Thanks,\n[signature]');
        }
      });
    }
    if (db.orgAuditSeenAt === undefined) {
      const latest = (db.auditLog || []).reduce((m, a) => Math.max(m, new Date(a.at).getTime() || 0), 0);
      db.orgAuditSeenAt = latest ? new Date(latest).toISOString() : null;
    }
    if (db.event && db.event.terminology) {
      const t = db.event.terminology;
      if (!t.partnerPlural) t.partnerPlural = t.partner ? (t.partner + 's') : 'Partners';
      if (!t.taskPlural) t.taskPlural = t.task ? (t.task + 's') : 'Tasks';
      if (!t.requestPlural) t.requestPlural = t.request ? (t.request + 's') : 'Requests';
    }
    if (Array.isArray(db.partners)) {
      db.partners.forEach((p) => {
        if (!p.logo) { const sp = s.partners.find((x) => x.id === p.id); if (sp && sp.logo) p.logo = sp.logo; }
      });
    }
    if (Array.isArray(db.products)) {
      db.products.forEach((p) => {
        if (!p.image) { const sp = s.products.find((x) => x.id === p.id); if (sp && sp.image) p.image = sp.image; }
      });
    }
  } catch (e) { /* ignore */ }
  return db;
}

export function save(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignore */ }
}

export function resetDb() {
  const db = seed();
  save(db);
  return db;
}
