-- ============================================================
-- BOARD Partner Portal — seed data
--
-- Generated from src/data/seed.ts by scripts/generate-seed-sql.ts.
-- Do not edit by hand: regenerate with `npm run seed:sql`.
--
-- Run AFTER the schema (APPLY_TO_SUPABASE.sql). Safe to re-run:
-- every insert is "on conflict do nothing", so it will not
-- overwrite work already done in the portal.
--
-- Three partners prove the personalisation system works. Each holds
-- a different set of entitlements, so each sees a different portal:
--   Helvetica Systems  BP-001  exhibition space, stand A12
--   Northwind Advisory BP-002  meetings + branding, no stand
--   Meridian Partners  BP-003  bespoke: stand C04, content, rooftop
-- ============================================================

begin;


-- ---- event ----
insert into events ("id", "name", "short_name", "venue", "city", "start_date", "end_date", "currency", "currency_symbol", "timezone", "tagline", "sender", "terminology") values
  ('board_monaco_2027', 'BOARD Monaco 2027', 'BOARD 2027', 'Grimaldi Forum', 'Monaco', '2027-03-22', '2027-03-24', 'EUR', '€', 'Europe/Monaco', 'Take your seat at the table.', '{"name":"BOARD Operations","email":"operations@boardsummits.com","signature":"BOARD Operations\nGrimaldi Forum, Monaco\nboardsummits.com","logo":""}'::jsonb, '{"partner":"Partner","partnerPlural":"Partners","partnerPortal":"Partner Portal","participation":"Participation","task":"Task","taskPlural":"Tasks","request":"Request","requestPlural":"Requests"}'::jsonb)
on conflict (id) do nothing;


-- ---- organiser users ----
insert into organiser_users ("id", "name", "title", "email", "role", "permissions") values
  ('org_anna', 'Anna Lewis', 'Operations Coordinator', 'anna@boardsummits.example', 'super_admin', null),
  ('org_team', 'BOARD Operations', 'Operations team', 'operations@boardsummits.example', 'team', '{"partners":true,"forms":true,"tasks":true,"content":false,"products":false,"suppliers":false,"orders":true,"requests":true,"reporting":false,"settings":false}'::jsonb)
on conflict (id) do nothing;


-- ---- entitlements: the master vocabulary ----
insert into entitlements ("key", "event_id", "label") values
  ('has_exhibition_space', 'board_monaco_2027', 'Exhibition space'),
  ('has_turnkey_stand', 'board_monaco_2027', 'Turnkey stand package'),
  ('has_raw_space', 'board_monaco_2027', 'Raw space (builds their own stand)'),
  ('has_meetings_package', 'board_monaco_2027', 'Meetings package'),
  ('has_content_session', 'board_monaco_2027', 'Content session'),
  ('has_hospitality_activation', 'board_monaco_2027', 'Hospitality activation'),
  ('has_branding_inventory', 'board_monaco_2027', 'Branding inventory'),
  ('requires_stand_approval', 'board_monaco_2027', 'Requires stand approval'),
  ('can_order_av', 'board_monaco_2027', 'Can order AV'),
  ('can_order_furniture', 'board_monaco_2027', 'Can order furniture & carpet'),
  ('can_order_signage', 'board_monaco_2027', 'Can order signage'),
  ('can_order_catering', 'board_monaco_2027', 'Can order catering')
on conflict (key) do nothing;


-- ---- suppliers (webhook secrets never leave the server) ----
insert into suppliers ("id", "event_id", "name", "category", "contact", "notif_emails", "webhook_url", "routing_key", "webhook_secret", "active", "approval_default", "notes") values
  ('sup_aztec', 'board_monaco_2027', 'Aztec', 'AV & Technical', 'Aztec Events Desk', '{"orders@aztec-events.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/aztec/', 'board-av', 'whsec_aztec_9f2a41c7', true, 'auto', 'Official AV & technical services partner. Fast confirmation on catalogue items.'),
  ('sup_ges', 'board_monaco_2027', 'GES', 'Stand build, furniture, carpet & electrical', 'GES Monaco Operations', '{"board@ges.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/ges/', 'board-ges', 'whsec_ges_4b71de90', true, 'manual', 'Recommended stand builder & general services contractor. Structural items need organiser review.'),
  ('sup_popshap', 'board_monaco_2027', 'Popshap', 'Signage & graphics', 'Popshap Studio', '{"print@popshap.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/popshap/', 'board-signage', 'whsec_popshap_2c88fa13', true, 'auto', 'Signage & large-format graphics. Requires print-ready artwork.'),
  ('sup_smr', 'board_monaco_2027', 'SMR Catering', 'Catering & hospitality', 'Société Monégasque de Restauration', '{"events@smr.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/smr/', 'board-catering', 'whsec_smr_77a0be52', true, 'manual', 'Grimaldi Forum catering. Head counts confirmed 14 days out.'),
  ('sup_riviera', 'board_monaco_2027', 'Riviera Event Logistics', 'Logistics & freight', 'Riviera Freight Team', '{"ops@riviera-logistics.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/riviera/', 'board-logistics', 'whsec_riviera_0d5c9a86', true, 'quote', 'Freight, material handling & storage. Most items are quote-required.'),
  ('sup_grimaldi', 'board_monaco_2027', 'Grimaldi Forum', 'Venue services — electrical, power & internet', 'Grimaldi Forum Technical Services', '{"technical@grimaldiforum.example"}', 'https://hooks.zapier.com/hooks/catch/1122334/grimaldi/', 'board-venue', 'whsec_grimaldi_a3e1c7d5', true, 'auto', 'Official venue. Sole provider of mains electrical connections, power and wired internet.')
on conflict (id) do nothing;


-- ---- shop ----
insert into shop_categories ("id", "event_id", "name", "position") values
  ('cat_av', 'board_monaco_2027', 'AV & technical', 0),
  ('cat_electrical', 'board_monaco_2027', 'Electrical & lighting', 1),
  ('cat_furniture', 'board_monaco_2027', 'Furniture & carpet', 2),
  ('cat_signage', 'board_monaco_2027', 'Signage & graphics', 3),
  ('cat_catering', 'board_monaco_2027', 'Catering', 4),
  ('cat_logistics', 'board_monaco_2027', 'Logistics', 5),
  ('cat_internet', 'board_monaco_2027', 'Internet & connectivity', 6)
on conflict (id) do nothing;

insert into products ("id", "event_id", "name", "supplier_id", "category_id", "description", "unit", "base_price", "tax_rate", "approval_mode", "min_qty", "max_qty", "order_deadline", "lead_time_days", "active", "image", "options", "questions", "visibility") values
  ('prod_screen55', 'board_monaco_2027', '55" screen on floor stand', 'sup_aztec', 'cat_av', 'Full-HD 55" display on adjustable floor stand, incl. cabling.', 'each', 750, 0.2, 'auto', 1, 8, '2027-02-28', 10, true, '/assets/board-bg-3.png', '[{"name":"Mounting","values":["Floor stand","Wall bracket"]}]'::jsonb, '[{"key":"installation_location","label":"Installation location","type":"short_text","required":true},{"key":"onsite_contact","label":"On-site contact","type":"short_text","required":true}]'::jsonb, '{"requires":"can_order_av"}'::jsonb),
  ('prod_screen85', 'board_monaco_2027', '85" screen on floor stand', 'sup_aztec', 'cat_av', 'Large-format 85" 4K display on floor stand.', 'each', 1200, 0.2, 'auto', 1, 4, '2027-02-28', 12, true, null, '[]'::jsonb, '[{"key":"installation_location","label":"Installation location","type":"short_text","required":true}]'::jsonb, '{"requires":"can_order_av"}'::jsonb),
  ('prod_pa', 'board_monaco_2027', 'PA & speaker set', 'sup_aztec', 'cat_av', '2× powered speakers, mixer and 1× radio mic.', 'set', 480, 0.2, 'auto', 1, 2, '2027-02-28', 7, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"can_order_av"}'::jsonb),
  ('prod_lead', 'board_monaco_2027', 'Lead retrieval licence', 'sup_aztec', 'cat_av', 'App-based lead capture licence for the duration of the event.', 'licence', 260, 0.2, 'auto', 1, 20, '2027-03-10', 3, true, null, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
  ('prod_rig', 'board_monaco_2027', 'Custom LED rigging package', 'sup_aztec', 'cat_av', 'Bespoke overhead LED rig — quoted on stand plan.', 'package', null, 0.2, 'quote', 1, 1, '2027-02-15', 25, true, null, '[]'::jsonb, '[{"key":"rig_notes","label":"Rigging requirements & stand plan notes","type":"long_text","required":true}]'::jsonb, '{"requires":"can_order_av"}'::jsonb),
  ('prod_carpet', 'board_monaco_2027', 'Stand carpet', 'sup_ges', 'cat_furniture', 'Event-grade carpet, supplied & fitted.', 'per m²', 22, 0.2, 'manual', 9, 200, '2027-02-20', 14, true, '/assets/board-bg-7.png', '[{"name":"Colour","values":["Rich black","Off white","Teal","Anthracite"]}]'::jsonb, '[{"key":"stand_number","label":"Stand number","type":"short_text","required":true},{"key":"area_m2","label":"Area (m²)","type":"number","required":true}]'::jsonb, '{"requires":"can_order_furniture"}'::jsonb),
  ('prod_furniture', 'board_monaco_2027', 'Lounge furniture set', 'sup_ges', 'cat_furniture', '2× armchairs, 1× low table, 1× side unit.', 'set', 650, 0.2, 'manual', 1, 5, '2027-02-20', 14, true, '/assets/board-bg-5.png', '[{"name":"Finish","values":["Black / oak","White / chrome"]}]'::jsonb, '[]'::jsonb, '{"requires":"can_order_furniture"}'::jsonb),
  ('prod_power', 'board_monaco_2027', '500W mains supply (24h)', 'sup_grimaldi', 'cat_electrical', 'Single-phase 500W mains supply with socket, 24-hour. Supplied by the venue.', 'each', 180, 0.2, 'auto', 1, 10, '2027-02-20', 10, true, null, '[]'::jsonb, '[{"key":"location","label":"Position on stand","type":"short_text","required":true}]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_internet', 'board_monaco_2027', 'Wired internet connection (10 Mbps dedicated)', 'sup_grimaldi', 'cat_internet', 'Dedicated wired line with fixed IP. Supplied by the venue.', 'connection', 420, 0.2, 'auto', 1, 4, '2027-02-20', 10, true, null, '[]'::jsonb, '[{"key":"location","label":"Position on stand","type":"short_text","required":true}]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_wifi', 'board_monaco_2027', 'Premium Wi-Fi access (per device)', 'sup_grimaldi', 'cat_internet', 'High-priority venue Wi-Fi, per device, for the event duration.', 'device', 90, 0.2, 'auto', 1, 20, '2027-03-05', 3, true, null, '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
  ('prod_lighting', 'board_monaco_2027', 'LED spotlight (per unit)', 'sup_ges', 'cat_electrical', 'Arm-mounted LED spot, warm white.', 'each', 45, 0.2, 'auto', 2, 20, '2027-02-20', 10, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_banner', 'board_monaco_2027', 'Printed fabric banner', 'sup_popshap', 'cat_signage', 'Tension-fabric banner, printed from supplied artwork.', 'each', 140, 0.2, 'auto', 1, 20, '2027-03-01', 7, true, '/assets/board-bg-2.png', '[{"name":"Size","values":["1×2m","1×2.5m","2×3m"]}]'::jsonb, '[{"key":"artwork","label":"Print-ready artwork","type":"file_upload","required":true},{"key":"dimensions","label":"Confirm finished dimensions","type":"short_text","required":true}]'::jsonb, '{"requires":"can_order_signage"}'::jsonb),
  ('prod_backwall', 'board_monaco_2027', 'Branded back-wall graphic', 'sup_popshap', 'cat_signage', 'Full back-wall graphic, printed & installed.', 'each', 890, 0.2, 'manual', 1, 3, '2027-02-25', 12, true, null, '[]'::jsonb, '[{"key":"artwork","label":"Print-ready artwork","type":"file_upload","required":true}]'::jsonb, '{"requires":"has_branding_inventory"}'::jsonb),
  ('prod_catering', 'board_monaco_2027', 'Networking reception catering', 'sup_smr', 'cat_catering', 'Canapés & drinks reception, per head.', 'per head', 65, 0.1, 'manual', 20, 300, '2027-03-01', 14, true, '/assets/board-bg-9.png', '[{"name":"Menu","values":["Riviera canapés","Premium seafood","Vegetarian"]}]'::jsonb, '[{"key":"service_time","label":"Service time","type":"time","required":true},{"key":"location","label":"Service location","type":"short_text","required":true}]'::jsonb, '{"requires":"has_hospitality_activation"}'::jsonb),
  ('prod_freight', 'board_monaco_2027', 'Forklift & material handling', 'sup_riviera', 'cat_logistics', 'On-site forklift with operator — quoted per requirement.', 'service', null, 0.2, 'quote', 1, 1, '2027-03-05', 5, true, null, '[]'::jsonb, '[{"key":"handling_notes","label":"What needs handling? (weights, dimensions, times)","type":"long_text","required":true}]'::jsonb, '{}'::jsonb),
  ('prod_gf_carpet', 'board_monaco_2027', 'Short-pile carpet, basic colours', 'sup_grimaldi', 'cat_furniture', 'Laid to the stand footprint. Colour is chosen on Form 6.4.', 'per m²', null, 0.2, 'quote', 1, 400, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_flag', 'board_monaco_2027', 'Double-sided flag sign (60 × 20 cm)', 'sup_grimaldi', 'cat_signage', 'Hanging stand identifier. Wording is given on Form 6.4.', 'unit', null, 0.2, 'quote', 1, 10, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_storage', 'board_monaco_2027', 'Storage 1 m² (panel + lockable door)', 'sup_grimaldi', 'cat_furniture', 'Lockable store built into the stand footprint.', 'unit', null, 0.2, 'quote', 1, 6, '2027-02-20', 14, true, null, '[]'::jsonb, '[{"key":"storage_position","label":"Where on the stand should it go?","type":"short_text","required":true}]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_internet', 'board_monaco_2027', 'Pro internet, 5 MB', 'sup_grimaldi', 'cat_internet', 'Wired connection for the run of the event. The venue is the sole provider.', 'event package', null, 0.2, 'quote', 1, 4, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_power', 'board_monaco_2027', 'Monophase 220V, 1–2 KW box', 'sup_grimaldi', 'cat_electrical', 'Mains connection. Mark its position on your stand diagram (Form 6.5).', 'unit', null, 0.2, 'quote', 1, 8, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_hostess', 'board_monaco_2027', 'Bilingual hostess, 8-hour day', 'sup_grimaldi', 'cat_logistics', 'Languages and uniform are set out on Form 6.4.', 'per day', null, 0.2, 'quote', 1, 12, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb)
on conflict (id) do nothing;


-- ---- forms ----
insert into forms ("id", "event_id", "title", "category", "description", "due_date", "assign", "allow_resubmit") values
  ('f_profile', 'board_monaco_2027', 'Company profile', 'Onboarding', 'Tell us about your organisation. Used across the programme and printed materials.', '2027-01-30', '{"type":"all"}'::jsonb, true),
  ('f_meetings', 'board_monaco_2027', 'Meetings participant details', 'Meetings', 'Details of the representatives taking part in the meetings programme.', '2027-02-07', '{"type":"entitlement","key":"has_meetings_package"}'::jsonb, true),
  ('f_speaker', 'board_monaco_2027', 'Speaker & session details', 'Content', 'Confirm your speaker and session information for the programme.', '2027-02-01', '{"type":"entitlement","key":"has_content_session"}'::jsonb, false),
  ('f_passes', 'board_monaco_2027', 'Delegate pass registration', 'Registration', 'Register the named delegates for your allocated passes.', '2027-03-01', '{"type":"all"}'::jsonb, true),
  ('gf_exhibitor', 'board_monaco_2027', 'Exhibitor information (Form 6.1)', 'Venue forms', 'Compulsory for every exhibitor. Returned alongside the Security Form and Stand Diagram.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_diagram', 'board_monaco_2027', 'Stand diagram (Form 6.5)', 'Venue forms', 'Submit with your orders. One grid square equals one metre.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_additional', 'board_monaco_2027', 'Additional information (Form 6.4)', 'Venue forms', 'On-site staffing schedules, booth setup and technical connectivity.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_security', 'board_monaco_2027', 'Security information (Form 6.6)', 'Venue forms', 'Raw-space stands only. Confirms the safety declarations required for booths not fitted by Grimaldi Forum.', null, '{"type":"entitlement","keys":["has_raw_space"]}'::jsonb, true),
  ('gf_equipment', 'board_monaco_2027', 'Equipment & machinery in operation (Form 6.7)', 'Venue forms', 'Only if applicable. Required for heat or combustion engines, smoke generators, gas, lasers or any machinery in operation.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_safety', 'board_monaco_2027', 'Safety questionnaire (Form 6.8)', 'Venue forms', 'Raw space only. Materials fire rating, required for booths not fitted by Grimaldi Forum.', null, '{"type":"entitlement","keys":["has_raw_space"]}'::jsonb, true),
  ('gf_wideload', 'board_monaco_2027', 'Wide load escort request (Form 2.3)', 'Venue forms', 'Only for oversized vehicles. A police escort is required above 18.75 m long, 2.60 m wide or 4.30 m high.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_payment', 'board_monaco_2027', 'Payment (Form 6.3)', 'Venue forms', 'Compulsory for every exhibitor. How you will settle your order form total.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true)
on conflict (id) do nothing;

insert into form_fields ("id", "form_id", "key", "label", "type", "required", "help", "readonly", "options", "visibility", "condition", "position") values
  ('f_profile__legal_name', 'f_profile', 'legal_name', 'Legal company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('f_profile__display_name', 'f_profile', 'display_name', 'Display name', 'short_text', true, 'As it should appear on signage and the delegate app.', false, '{}', '{}'::jsonb, null, 1),
  ('f_profile__sector', 'f_profile', 'sector', 'Sector', 'single_select', true, '', false, '{"Technology","Financial services","Advisory","Industrial","Other"}', '{}'::jsonb, null, 2),
  ('f_profile__website', 'f_profile', 'website', 'Website', 'url', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('f_profile__logo', 'f_profile', 'logo', 'Logo (vector preferred)', 'image_upload', true, '', false, '{}', '{}'::jsonb, null, 4),
  ('f_profile__description', 'f_profile', 'description', 'Company description', 'long_text', true, '60 words max.', false, '{}', '{}'::jsonb, null, 5),
  ('f_profile__primary_contact', 'f_profile', 'primary_contact', 'Primary contact', 'contact', true, '', false, '{}', '{}'::jsonb, null, 6),
  ('f_profile__activation_brief', 'f_profile', 'activation_brief', 'Bespoke activation concept brief', 'long_text', true, 'Only shown to bespoke partners.', false, '{}', '{"type":"partner","partners":["part_c"]}'::jsonb, null, 7),
  ('f_meetings__rep_count', 'f_meetings', 'rep_count', 'Number of participating representatives', 'number', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('f_meetings__lead_rep', 'f_meetings', 'lead_rep', 'Lead representative', 'contact', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('f_meetings__focus_sectors', 'f_meetings', 'focus_sectors', 'Sectors of interest', 'multi_select', true, '', false, '{"Technology","Financial services","Advisory","Industrial","Healthcare"}', '{}'::jsonb, null, 2),
  ('f_meetings__objectives', 'f_meetings', 'objectives', 'Meeting objectives', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('f_speaker__session_title', 'f_speaker', 'session_title', 'Session title', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('f_speaker__speaker', 'f_speaker', 'speaker', 'Speaker', 'contact', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('f_speaker__bio', 'f_speaker', 'bio', 'Speaker biography', 'long_text', true, '', false, '{}', '{}'::jsonb, null, 2),
  ('f_speaker__headshot', 'f_speaker', 'headshot', 'Speaker headshot', 'image_upload', true, '', false, '{}', '{}'::jsonb, null, 3),
  ('f_speaker__av_needs', 'f_speaker', 'av_needs', 'AV requirements', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 4),
  ('f_speaker__presentation_deadline_ack', 'f_speaker', 'presentation_deadline_ack', 'I understand presentations are due 5 working days before the event.', 'acknowledgement', true, '', false, '{}', '{}'::jsonb, null, 5),
  ('f_passes__allocation', 'f_passes', 'allocation', 'Passes allocated', 'number', true, '', true, '{}', '{}'::jsonb, null, 0),
  ('f_passes__delegate_1', 'f_passes', 'delegate_1', 'Delegate 1', 'contact', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('f_passes__delegate_2', 'f_passes', 'delegate_2', 'Delegate 2', 'contact', false, '', false, '{}', '{}'::jsonb, null, 2),
  ('f_passes__dietary', 'f_passes', 'dietary', 'Dietary requirements', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_exhibitor__company_heading', 'gf_exhibitor', 'company_heading', 'Exhibiting company', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_exhibitor__company_name', 'gf_exhibitor', 'company_name', 'Company name', 'short_text', true, 'Legal entity name.', false, '{}', '{}'::jsonb, null, 1),
  ('gf_exhibitor__stand_number', 'gf_exhibitor', 'stand_number', 'Stand number', 'short_text', true, 'e.g. B14', false, '{}', '{}'::jsonb, null, 2),
  ('gf_exhibitor__contacts_heading', 'gf_exhibitor', 'contacts_heading', 'Contacts', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_exhibitor__contacts_note', 'gf_exhibitor', 'contacts_note', 'Three contacts are required: the person preparing and supervising the stand, the person present on site, and the stand contractor.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_exhibitor__contact_preparing', 'gf_exhibitor', 'contact_preparing', 'Preparing and supervising the stand', 'contact', true, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_exhibitor__contact_preparing_company', 'gf_exhibitor', 'contact_preparing_company', 'Their company', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_exhibitor__contact_onsite', 'gf_exhibitor', 'contact_onsite', 'Present on site', 'contact', true, '', false, '{}', '{}'::jsonb, null, 7),
  ('gf_exhibitor__contact_onsite_company', 'gf_exhibitor', 'contact_onsite_company', 'Their company', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 8),
  ('gf_exhibitor__contact_contractor', 'gf_exhibitor', 'contact_contractor', 'Stand contractor', 'contact', false, '', false, '{}', '{}'::jsonb, null, 9),
  ('gf_exhibitor__contact_contractor_company', 'gf_exhibitor', 'contact_contractor_company', 'Their company', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 10),
  ('gf_exhibitor__billing_heading', 'gf_exhibitor', 'billing_heading', 'Billing', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 11),
  ('gf_exhibitor__billing_company', 'gf_exhibitor', 'billing_company', 'Billing company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 12),
  ('gf_exhibitor__vat_number', 'gf_exhibitor', 'vat_number', 'VAT number', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 13),
  ('gf_exhibitor__billing_address', 'gf_exhibitor', 'billing_address', 'Billing address', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 14),
  ('gf_exhibitor__billing_locality', 'gf_exhibitor', 'billing_locality', 'Postcode / City / Country', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 15),
  ('gf_exhibitor__build_heading', 'gf_exhibitor', 'build_heading', 'Stand build', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 16),
  ('gf_exhibitor__stand_build', 'gf_exhibitor', 'stand_build', 'How will your stand be built?', 'single_select', true, 'Building your own stand is what the venue calls raw space, and it brings Forms 6.6 and 6.8 with it.', false, '{"We have our own booth and will do the set-up","We will use the shell-scheme booth provided by the organisation","We want to contact Grimaldi Forum for a custom-made stand"}', '{}'::jsonb, null, 17),
  ('gf_diagram__company_name', 'gf_diagram', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_diagram__stand_number', 'gf_diagram', 'stand_number', 'Stand number', 'short_text', true, 'e.g. B14', false, '{}', '{}'::jsonb, null, 1),
  ('gf_diagram__diagram_note', 'gf_diagram', 'diagram_note', 'Mark the position of every ordered connection and fixture on the grid. One grid square equals one metre. Label the neighbouring stand or aisle on all sides.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_diagram__diagram', 'gf_diagram', 'diagram', 'Your stand diagram', 'document_upload', true, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_diagram__technical_notes', 'gf_diagram', 'technical_notes', 'Notes for the Grimaldi Forum technical team', 'long_text', false, 'Anything the diagram cannot show.', false, '{}', '{}'::jsonb, null, 4),
  ('gf_additional__company_name', 'gf_additional', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_additional__stand_number', 'gf_additional', 'stand_number', 'Stand number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_additional__staffing_heading', 'gf_additional', 'staffing_heading', 'Staffing schedules', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_additional__staffing_note', 'gf_additional', 'staffing_note', 'One row per service. Give the dates, hours and anything the service needs to know.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_additional__hostess', 'gf_additional', 'hostess', 'Hostess — dates, hours, language and uniform', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_additional__warehouseman', 'gf_additional', 'warehouseman', 'Warehouseman — dates and hours', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_additional__security_staff', 'gf_additional', 'security_staff', 'Security — dates and hours', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_additional__setup_heading', 'gf_additional', 'setup_heading', 'Booth setup', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 7),
  ('gf_additional__carpet', 'gf_additional', 'carpet', 'Carpet colour', 'single_select', false, '', false, '{"Black (ref 270)","Grey (ref 262)","Red (ref 271)","Navy blue (ref 227)","Blue (ref 265)","Other — see below"}', '{}'::jsonb, null, 8),
  ('gf_additional__carpet_other', 'gf_additional', 'carpet_other', 'Other (custom colour, over 25 m²)', 'short_text', false, '', false, '{}', '{}'::jsonb, '{"field":"carpet","equals":"Other — see below"}'::jsonb, 9),
  ('gf_additional__signage_text', 'gf_additional', 'signage_text', 'Signage text', 'short_text', false, 'Exactly as it should be produced.', false, '{}', '{}'::jsonb, null, 10),
  ('gf_additional__connectivity_heading', 'gf_additional', 'connectivity_heading', 'Technical connectivity', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 11),
  ('gf_additional__av', 'gf_additional', 'av', 'AV connection', 'single_select', false, '', false, '{"PC DVI","HDMI"}', '{}'::jsonb, null, 12),
  ('gf_additional__wifi_ssid', 'gf_additional', 'wifi_ssid', 'WiFi SSID', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 13),
  ('gf_additional__wifi_password', 'gf_additional', 'wifi_password', 'WiFi password', 'short_text', false, '', false, '{}', '{}'::jsonb, null, 14),
  ('gf_additional__signature', 'gf_additional', 'signature', 'Authorised signature', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 15),
  ('gf_additional__signed_date', 'gf_additional', 'signed_date', 'Date', 'date', true, '', false, '{}', '{}'::jsonb, null, 16),
  ('gf_security__contractor_heading', 'gf_security', 'contractor_heading', 'Stand & contractor', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_security__company_name', 'gf_security', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_security__booth_number', 'gf_security', 'booth_number', 'Booth number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_security__contractor', 'gf_security', 'contractor', 'Stand-decoration contractor', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_security__contractor_contact', 'gf_security', 'contractor_contact', 'Contractor contact', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_security__declarations_heading', 'gf_security', 'declarations_heading', 'Declarations', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_security__declarations_note', 'gf_security', 'declarations_note', 'Select one option per declaration.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_security__devices', 'gf_security', 'devices', 'Declaration of devices in operation', 'single_select', true, '', false, '{"I declare not to bring or use any device requiring this document.","Enclosed document (see Form 6.7)."}', '{}'::jsonb, null, 7),
  ('gf_security__questionnaire', 'gf_security', 'questionnaire', 'Safety questionnaire', 'single_select', true, '', false, '{"I declare not to bring my own construction materials.","Enclosed document, with certificates for each material."}', '{}'::jsonb, null, 8),
  ('gf_security__electrical', 'gf_security', 'electrical', 'Certificate of electrical compliance', 'single_select', true, '', false, '{"I declare not to install any electrical fitting.","Fittings installed by competent staff, to code."}', '{}'::jsonb, null, 9),
  ('gf_security__supporting_documents', 'gf_security', 'supporting_documents', 'Attach supporting documents', 'document_upload', false, '', false, '{}', '{}'::jsonb, null, 10),
  ('gf_security__signature', 'gf_security', 'signature', 'Authorised signature', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 11),
  ('gf_security__signed_date', 'gf_security', 'signed_date', 'Date', 'date', true, '', false, '{}', '{}'::jsonb, null, 12),
  ('gf_equipment__company_heading', 'gf_equipment', 'company_heading', 'Company', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_equipment__company_name', 'gf_equipment', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_equipment__stand_number', 'gf_equipment', 'stand_number', 'Stand number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_equipment__equipment_heading', 'gf_equipment', 'equipment_heading', 'Equipment declared', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_equipment__equipment_note', 'gf_equipment', 'equipment_note', 'Describe each item. Add every one you intend to operate on the stand.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_equipment__item_name', 'gf_equipment', 'item_name', 'Item / equipment name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_equipment__item_purpose', 'gf_equipment', 'item_purpose', 'Purpose / use case', 'long_text', true, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_equipment__item_specs', 'gf_equipment', 'item_specs', 'Specifications (power / fuel / qty)', 'long_text', true, '', false, '{}', '{}'::jsonb, null, 7),
  ('gf_equipment__item_safety', 'gf_equipment', 'item_safety', 'Safety measures', 'long_text', true, '', false, '{}', '{}'::jsonb, null, 8),
  ('gf_equipment__further_items', 'gf_equipment', 'further_items', 'Any further items', 'long_text', false, 'One per line, with the same detail as above.', false, '{}', '{}'::jsonb, null, 9),
  ('gf_equipment__compliance_heading', 'gf_equipment', 'compliance_heading', 'Compliance checklist', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 10),
  ('gf_equipment__confirm_screened', 'gf_equipment', 'confirm_screened', 'I confirm all machinery is either screened or cased, or set back at least 1 metre from the stand edge.', 'acknowledgement', true, '', false, '{}', '{}'::jsonb, null, 11),
  ('gf_equipment__confirm_fire_safety', 'gf_equipment', 'confirm_fire_safety', 'I confirm I have read and will adhere to the fire safety and liability requirements.', 'acknowledgement', true, '', false, '{}', '{}'::jsonb, null, 12),
  ('gf_equipment__certificates', 'gf_equipment', 'certificates', 'Material safety certificates, where applicable', 'document_upload', false, '', false, '{}', '{}'::jsonb, null, 13),
  ('gf_equipment__signature', 'gf_equipment', 'signature', 'Authorised signature', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 14),
  ('gf_equipment__signed_date', 'gf_equipment', 'signed_date', 'Date', 'date', true, '', false, '{}', '{}'::jsonb, null, 15),
  ('gf_safety__company_name', 'gf_safety', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_safety__stand_number', 'gf_safety', 'stand_number', 'Stand number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_safety__materials_heading', 'gf_safety', 'materials_heading', 'Materials declared', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_safety__ratings_note', 'gf_safety', 'ratings_note', 'French fire ratings: M0 fireproof, M1 non-flammable, M2 low flammability, M3 medium flammability.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_safety__required_note', 'gf_safety', 'required_note', 'Ratings required — booth framework M0/M1 · partition walls M0/M1 · solid hard wood M2/M3 (14 mm min) · resinous wood, plywood, chipboard M2/M3 · melamine-coated panel M2/M3 (7–8 mm min) · partition wall covering M0/M1/M2 · floor covering M3 · ceiling M1/M2 · awning M1/M2 · plastic material M1/M2 · paint water-based · curtains and relief elements M0/M1/M2 · transparent or translucent elements M1/M2 · furniture M0/M1/M2/M3 · artificial flowers M2.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_safety__materials_declared', 'gf_safety', 'materials_declared', 'Materials used, with thickness and rating provided', 'long_text', true, 'One material per line: material, thickness / rating provided, trade mark, position on the diagram, laboratory certificate number.', false, '{}', '{}'::jsonb, null, 5),
  ('gf_safety__certificates', 'gf_safety', 'certificates', 'Laboratory certificates for every material', 'document_upload', true, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_safety__signature', 'gf_safety', 'signature', 'Authorised signature', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 7),
  ('gf_safety__signed_date', 'gf_safety', 'signed_date', 'Date', 'date', true, '', false, '{}', '{}'::jsonb, null, 8),
  ('gf_wideload__company_heading', 'gf_wideload', 'company_heading', 'Company', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_wideload__company_name', 'gf_wideload', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_wideload__stand_number', 'gf_wideload', 'stand_number', 'Stand number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_wideload__requester_name', 'gf_wideload', 'requester_name', 'Requester name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 3),
  ('gf_wideload__requester_mobile', 'gf_wideload', 'requester_mobile', 'Requester mobile', 'telephone', true, '', false, '{}', '{}'::jsonb, null, 4),
  ('gf_wideload__dimensions_heading', 'gf_wideload', 'dimensions_heading', 'Vehicle dimensions', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_wideload__thresholds_note', 'gf_wideload', 'thresholds_note', 'A police escort is triggered when any one of these thresholds is exceeded: length 18.75 m, width 2.60 m, height 4.30 m.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 6),
  ('gf_wideload__length_m', 'gf_wideload', 'length_m', 'Length (m)', 'number', true, '', false, '{}', '{}'::jsonb, null, 7),
  ('gf_wideload__width_m', 'gf_wideload', 'width_m', 'Width (m)', 'number', true, '', false, '{}', '{}'::jsonb, null, 8),
  ('gf_wideload__height_m', 'gf_wideload', 'height_m', 'Height (m)', 'number', true, '', false, '{}', '{}'::jsonb, null, 9),
  ('gf_wideload__vehicle', 'gf_wideload', 'vehicle', 'Vehicle type / registration', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 10),
  ('gf_wideload__movement_heading', 'gf_wideload', 'movement_heading', 'Requested movement', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 11),
  ('gf_wideload__movement_note', 'gf_wideload', 'movement_note', 'Must fall between 21:00 and 07:00.', 'guidance', false, '', false, '{}', '{}'::jsonb, null, 12),
  ('gf_wideload__arrival_date', 'gf_wideload', 'arrival_date', 'Arrival date', 'date', true, '', false, '{}', '{}'::jsonb, null, 13),
  ('gf_wideload__arrival_time', 'gf_wideload', 'arrival_time', 'Arrival time', 'time', true, '', false, '{}', '{}'::jsonb, null, 14),
  ('gf_wideload__departure_date', 'gf_wideload', 'departure_date', 'Departure date', 'date', true, '', false, '{}', '{}'::jsonb, null, 15),
  ('gf_wideload__departure_time', 'gf_wideload', 'departure_time', 'Departure time', 'time', true, '', false, '{}', '{}'::jsonb, null, 16),
  ('gf_wideload__escort_notes', 'gf_wideload', 'escort_notes', 'Notes for the escort team', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 17),
  ('gf_payment__company_name', 'gf_payment', 'company_name', 'Company name', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 0),
  ('gf_payment__stand_number', 'gf_payment', 'stand_number', 'Stand number', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('gf_payment__method_heading', 'gf_payment', 'method_heading', 'Payment method', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 2),
  ('gf_payment__method', 'gf_payment', 'method', 'Choose one method', 'single_select', true, '', false, '{"Bank cheque","Bank transfer, in Euro","Credit card"}', '{}'::jsonb, null, 3),
  ('gf_payment__transfer_confirmation', 'gf_payment', 'transfer_confirmation', 'Attach transfer confirmation', 'document_upload', false, '', false, '{}', '{}'::jsonb, '{"field":"method","equals":"Bank transfer, in Euro"}'::jsonb, 4),
  ('gf_payment__signature', 'gf_payment', 'signature', 'Authorised signature', 'short_text', true, '', false, '{}', '{}'::jsonb, null, 5),
  ('gf_payment__signed_date', 'gf_payment', 'signed_date', 'Date', 'date', true, '', false, '{}', '{}'::jsonb, null, 6)
on conflict (id) do nothing;


-- ---- request types ----
insert into request_types ("id", "event_id", "name", "owner_default", "fields") values
  ('rt_stand_design', 'board_monaco_2027', 'Stand design approval', 'BOARD Operations', '[{"key":"stand_number","label":"Stand number","type":"short_text","required":true},{"key":"max_height","label":"Maximum build height (m)","type":"number","required":true},{"key":"plans","label":"Design plans (PDF)","type":"document_upload","required":true},{"key":"notes","label":"Notes","type":"long_text","required":false}]'::jsonb),
  ('rt_rigging', 'board_monaco_2027', 'Rigging approval', 'BOARD Operations', '[{"key":"rig_weight","label":"Total rig weight (kg)","type":"number","required":true},{"key":"rig_plan","label":"Rigging plan","type":"document_upload","required":true}]'::jsonb),
  ('rt_hosted', 'board_monaco_2027', 'Hosted event approval', 'BOARD Operations', '[{"key":"event_name","label":"Function name","type":"short_text","required":true},{"key":"date_time","label":"Date & time","type":"short_text","required":true},{"key":"headcount","label":"Expected headcount","type":"number","required":true},{"key":"location","label":"Preferred location","type":"short_text","required":false},{"key":"concept","label":"Concept & running order","type":"long_text","required":true}]'::jsonb),
  ('rt_vehicle', 'board_monaco_2027', 'Vehicle access', 'BOARD Operations', '[{"key":"vehicle_reg","label":"Vehicle registration","type":"short_text","required":true},{"key":"access_window","label":"Requested access window","type":"short_text","required":true}]'::jsonb),
  ('rt_accreditation', 'board_monaco_2027', 'Additional accreditation', 'BOARD Operations', '[{"key":"names","label":"Names & roles","type":"long_text","required":true},{"key":"reason","label":"Reason","type":"long_text","required":true}]'::jsonb),
  ('rt_general', 'board_monaco_2027', 'General operational request', 'BOARD Operations', '[{"key":"summary","label":"Summary","type":"short_text","required":true},{"key":"detail","label":"Detail","type":"long_text","required":true}]'::jsonb)
on conflict (id) do nothing;


-- ---- content ----
insert into content_categories ("id", "event_id", "name", "position") values
  ('cc_dates', 'board_monaco_2027', 'Important dates', 0),
  ('cc_venue', 'board_monaco_2027', 'Venue & access', 1),
  ('cc_build', 'board_monaco_2027', 'Build & exhibition', 2),
  ('cc_brand', 'board_monaco_2027', 'Brand & artwork', 3),
  ('cc_meetings', 'board_monaco_2027', 'Meetings & content', 4),
  ('cc_hospitality', 'board_monaco_2027', 'Hospitality', 5),
  ('cc_help', 'board_monaco_2027', 'Help', 6)
on conflict (id) do nothing;

insert into content_pages ("id", "event_id", "category_id", "title", "body", "blocks", "cover", "visibility", "require_ack", "published", "related_tasks", "related_forms", "updated") values
  ('pg_dates', 'board_monaco_2027', 'cc_dates', 'Key deadlines', 'All partner deadlines for BOARD Monaco 2027 in one place. Company profile 30 Jan · Health & safety 14 Feb · Orders close 28 Feb · Delegate registration 1 Mar.', '[{"type":"paragraph","text":"Every partner deadline for **BOARD Monaco 2027** in one place. Dates apply to all partners; module-specific deadlines only appear if your participation includes them. Times are CET."},{"type":"timeline","items":[{"date":"2027-01-30","title":"Company profile complete","note":"Logo, description and key contacts published to the delegate app."},{"date":"2027-02-01","title":"Speaker & session details","note":"Content partners confirm session title, speaker and format."},{"date":"2027-02-05","title":"Stand design rules acknowledged","note":"Required before any stand plans can be reviewed."},{"date":"2027-02-07","title":"Meetings participant details","note":"Meetings partners submit participating representatives."},{"date":"2027-02-10","title":"Stand design submitted for approval","note":"Upload plans and elevations for operations sign-off."},{"date":"2027-02-14","title":"Health & safety declaration","note":"Method statement and risk assessment for all physical stands."},{"date":"2027-02-18","title":"Branding artwork upload","note":"Print-ready artwork to Popshap specification."},{"date":"2027-02-28","title":"Shop orders close","note":"Final date for AV, furniture, electrical and catering orders at standard rates."},{"date":"2027-03-01","title":"Delegate registration closes","note":"Register all named passes in your allocation."},{"date":"2027-03-22","title":"BOARD Monaco 2027 opens","note":"Doors open at the Grimaldi Forum, 09:00 CET."}]}]'::jsonb, null, '{"type":"all"}'::jsonb, false, true, '{}', '{}', '2026-11-02'),
  ('pg_venue', 'board_monaco_2027', 'cc_venue', 'Grimaldi Forum — venue guide', 'Address, loading access, cloakroom and floor levels for the Grimaldi Forum, Monaco.', '[{"type":"paragraph","text":"The **Grimaldi Forum** sits on the seafront at 10 Avenue Princesse Grace, Monaco. All partner build, show and breakdown activity takes place across the Ravel and Camille Blanc levels. Full directions, parking and public-transport options are on the [venue website](https://www.grimaldiforum.com)."},{"type":"image","src":"/assets/board-bg-7.png","caption":"Grimaldi Forum — seafront elevation, Ravel entrance."},{"type":"heading","text":"Loading & vehicle access"},{"type":"paragraph","text":"The goods entrance is on the lower level via Avenue Princesse Grace. All vehicles must be pre-booked into a marshalling slot — unbooked vehicles cannot be admitted during build."},{"type":"list","items":["Goods lift: 4.0m × 2.4m, 5,000kg limit","Maximum vehicle height at the ramp: 3.8m","Marshalling operates from 06:00 on all build days","Cloakroom and partner lounge are on the Ravel level"]},{"type":"callout","tone":"info","text":"Loading slots are limited. Book yours through the Move-in vehicle access request as early as possible — slots are allocated in submission order."},{"type":"download","name":"Grimaldi Forum floor plan (PDF)","note":"2.4 MB · updated 18 Oct 2026"}]'::jsonb, null, '{"type":"all"}'::jsonb, false, true, '{}', '{}', '2026-10-18'),
  ('pg_access', 'board_monaco_2027', 'cc_venue', 'Access & accreditation', 'How passes, wristbands and contractor access work across build, show and breakdown days.', '[]'::jsonb, null, '{"type":"all"}'::jsonb, false, true, '{}', '{}', '2026-10-18'),
  ('pg_build', 'board_monaco_2027', 'cc_build', 'Build & breakdown schedule', 'Move-in from 20 March 07:00. Breakdown from 24 March 18:00. Vehicle marshalling details inside.', '[]'::jsonb, null, '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb, false, true, '{}', '{}', '2026-11-20'),
  ('pg_standrules', 'board_monaco_2027', 'cc_build', 'Stand design & construction rules', 'Maximum build height, rigging rules, fire regulations and platform requirements. Acknowledgement required before build.', '[{"type":"callout","tone":"warn","text":"These rules are binding. You must acknowledge them before your stand plans can be approved and before any build activity begins on site."},{"type":"paragraph","text":"All custom and space-only stands must comply with the following construction standards. Turnkey stands supplied by GES already meet them. If you are appointing your own contractor, share this page with them directly."},{"type":"heading","text":"Build height & structures"},{"type":"list","items":["Standard maximum build height: 4.0m","Anything above 4.0m requires a rigging & structural approval request","Double-decker structures are not permitted","Platforms over 100mm require an access ramp"]},{"type":"heading","text":"Fire & materials"},{"type":"paragraph","text":"All materials must be **inherently flame-retardant or treated to Euroclass B-s1,d0**. Certificates must be uploaded with your Health & safety declaration. Naked flames, pyrotechnics and hazardous substances require separate written approval."},{"type":"quote","text":"A safe, well-run build protects your team, your neighbours on the floor and the guests you have invited.","cite":"BOARD Operations"},{"type":"download","name":"Stand plan submission template (PDF)","note":"1.1 MB · required for approval"}]'::jsonb, null, '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb, true, true, '{}', '{}', '2026-11-20'),
  ('pg_shipping', 'board_monaco_2027', 'cc_build', 'Shipping & logistics', 'Deliveries, storage, and the official freight forwarder for on-site handling.', '[]'::jsonb, null, '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb, false, true, '{}', '{}', '2026-11-05'),
  ('pg_artwork', 'board_monaco_2027', 'cc_brand', 'Branding & artwork guidance', 'Artwork specifications, print deadlines and placement guidance for all branding inventory.', '[{"type":"paragraph","text":"Your branding inventory is produced by **Popshap**, our signage partner. Supply print-ready artwork to the specifications below by the artwork deadline so we can proof and produce in good time."},{"type":"image","src":"/assets/board-bg-2.png","caption":"BOARD brand gradient — approved for large-format backdrops."},{"type":"heading","text":"Artwork specifications"},{"type":"list","items":["Format: print-ready PDF or packaged AI, CMYK","Resolution: 150 dpi at 100% scale","Bleed: 25mm on all edges","Fonts: outlined or embedded","Colour: supply Pantone references for brand colours"]},{"type":"callout","tone":"info","text":"Artwork deadline is 12 February 2027. Files received after this date cannot be guaranteed for on-site delivery."},{"type":"download","name":"BOARD brand & artwork guidelines (PDF)","note":"3.8 MB · updated 12 Nov 2026"}]'::jsonb, null, '{"type":"entitlement","key":"has_branding_inventory"}'::jsonb, false, true, '{}', '{}', '2026-11-12'),
  ('pg_meetings', 'board_monaco_2027', 'cc_meetings', 'Meetings programme guidance', 'How the meetings programme runs, profile deadlines and participation guidance.', '[]'::jsonb, null, '{"type":"entitlement","key":"has_meetings_package"}'::jsonb, false, true, '{}', '{}', '2026-11-08'),
  ('pg_speaker', 'board_monaco_2027', 'cc_meetings', 'Speaker & production guidance', 'Presentation format, production timeline and on-stage guidance for content partners.', '[]'::jsonb, null, '{"type":"entitlement","key":"has_content_session"}'::jsonb, false, true, '{}', '{}', '2026-11-08'),
  ('pg_catering', 'board_monaco_2027', 'cc_hospitality', 'Catering & function approvals', 'Venue catering rules and the approval route for any hosted function.', '[]'::jsonb, null, '{"type":"entitlement","key":"has_hospitality_activation"}'::jsonb, false, true, '{}', '{}', '2026-11-15'),
  ('pg_faq', 'board_monaco_2027', 'cc_help', 'Frequently asked questions', 'Answers to the questions partners ask most often.', '[]'::jsonb, null, '{"type":"all"}'::jsonb, false, true, '{}', '{}', '2026-11-01'),
  ('pg_meridian', 'board_monaco_2027', 'cc_hospitality', 'Meridian rooftop activation — private brief', 'Confidential operational brief for the Meridian rooftop activation. Visible only to Meridian Partners.', '[]'::jsonb, null, '{"type":"partner","partners":["part_c"]}'::jsonb, false, true, '{}', '{}', '2026-11-22'),
  ('pg_gf_deliveries', 'board_monaco_2027', 'cc_venue', 'Deliveries & logistics', 'Grimaldi Forum Monaco receives parcels subject to availability. Deliveries that miss the conditions below are refused at the bay.', '[{"type":"paragraph","text":"Grimaldi Forum Monaco receives parcels subject to availability. Deliveries that miss the conditions below are refused at the bay."},{"type":"table","columns":["Bay","Level","Serves"],"rows":[["Quai S2","Level −4","Open daily for Ravel, Diaghilev, Guelfe, Génois, Indigo, Verrière, Atrium/Foyer −2. Includes bus parking, E3 unloading (zone verte) and logistic zone E3."],["Quai E3","Level −1","Galerie Diaghilev, Patio area, Pinède (during events only)."],["Quai B / G1","External","Avenue Princesse Grâce."]]},{"type":"list","items":["Sent less than 8 days before opening.","Volume no greater than 1 m³, maximum height 1.80 m.","Compulsory label naming the event, the exhibition hall and the correct delivery bay.","Parcels received at the delivery bay are not delivered to booths ; that is the exhibitor''s responsibility. Trolleys are provided.","DDU (delivery duty unpaid) shipments are not accepted. Grimaldi Forum is not liable for items lost or damaged before receipt.","No storage is offered for empty crates or packaging; remove them as installation progresses, via the agreed forwarding agent if needed.","Waste container placement and removal is available at the exhibitor''s expense.","Grimaldi Forum cleans before opening and after dismantling, plus daily cleaning of aisles and common areas. Daily booth cleaning is billed to the exhibitor unless the organiser states otherwise.","Leave the space clear of all structures and materials, including carpet, at close. Unclaimed rubbish is removed at the exhibitor''s cost."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_transport', 'board_monaco_2027', 'cc_venue', 'Transport & parking', 'Monaco restricts heavy goods movement and offers no truck parking. Plan vehicle movements before you travel.', '[{"type":"paragraph","text":"Monaco restricts heavy goods movement and offers no truck parking. Plan vehicle movements before you travel."},{"type":"paragraph","text":"Truck parking is not possible anywhere in the Principality. Grimaldi Forum organises access to the delivery docks only; each exhibitor must make their own truck-parking arrangements outside Monaco and contact the exhibitors advisor for guidance."},{"type":"paragraph","text":"Parking des Salines, at the Monaco entrance on the Jardin Exotique side, offers long-term rates: 15 min–4 h €7.50 (against €14.90 elsewhere) and 4–12 h €11 (against €24 elsewhere). A bus line connects it to the Grimaldi Forum at the Portier stop, plus a ten minute walk."},{"type":"table","columns":["Public car park","Address"],"rows":[["Parking public du Testimonio","73 avenue Princesse Grace"],["Parking public du Larvotto","39 avenue Princesse Grace"],["Parking public du Grimaldi Forum","4 avenue Princesse Grace"],["Parking public du Portier","Rond point du Portier"],["Parking public Louis II","35 Boulevard Louis II"]]},{"type":"list","items":["Heavy goods vehicles over 3.5 tonnes GVW are prohibited daily 08:00–09:00 .","At all other times they are restricted to approved access and departure itineraries. Movement outside those itineraries is prohibited anywhere in the Principality.","Grimaldi Forum strongly advises using its approved transport suppliers for on-site product transport.","Venue access points: Esplanade · Staff entrance · Quai A (S2) · Quai B (G1) · Trucks parking · Diaghilev & MC6 · Quai E3."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_technical', 'board_monaco_2027', 'cc_build', 'Technical specifications', 'Goods lift capacities and floor loading limits for the Grimaldi Forum halls. Check both before specifying a build.', '[{"type":"paragraph","text":"Goods lift capacities and floor loading limits for the Grimaldi Forum halls. Check both before specifying a build."},{"type":"table","columns":["Hall","Live load (t)","Cabin W×D×H (m)","Passage W×H (m)"],"rows":[["MC1","4.50","2.00 × 3.95 × 2.20","1.58 × 2.08"],["MC2","4.80","2.00 × 4.30 × 2.20","1.58 × 2.08"],["MC4","4.125","2.00 × 3.80 × 2.20","1.94 × 2.08"],["MC6","4.05","1.80 × 4.00 × 3.40","1.58 × 3.48"],["MC8","4.25","2.00 × 3.80 × 3.60","1.98 × 3.49"],["MC20 (extension)","4.40","2.00 × 4.10 × 2.50","2.00 × 2.50"],["MC21 (extension)","4.50","2.50 × 5.50 × 2.50","2.50 × 2.50"]]},{"type":"table","columns":["Area","Limit"],"rows":[["Diaghilev (mezzanine, upper & lower)","500 kg/m²"],["Guelfe & Génois (2nd floor)","400 kg/m²"],["Ravel (1st floor)","1000 kg/m²"],["Foyer (lower ground floor)","500 kg/m²"],["Esplanade (floor 0)","1000 kg/m²"],["Indigo (1st floor)","500 kg/m²"],["Hall (floor 0)","500 kg/m²"],["Le Carré · Galerie Diaghilev · Hall Pinède · Salles Patio","500 kg/m²"],["Parvis Emeraude","1000 kg/m²"]]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_safety', 'board_monaco_2027', 'cc_build', 'Stand safety rules', 'Booths designed or fitted by exhibitors must comply with public-building fire and panic-risk rules and the Chief Fire Safety Officer''s instructions.', '[{"type":"paragraph","text":"Booths designed or fitted by exhibitors must comply with public-building fire and panic-risk rules and the Chief Fire Safety Officer''s instructions."},{"type":"paragraph","text":"Installation by professionals only. The exhibitor owns responsibility from the supply box outward and must complete the electrical security information form. The box must stay inaccessible to the public but reachable by staff. Power runs during opening hours only; 24-hour supply requires an Operations Department request."},{"type":"table","columns":["Forbidden","Compulsory","Recommended"],"rows":[["Modifying the supply box · conductors under 1.5 mm² · H03VH-H cable below 500V · spliced cables · unprotected connections · two-pole 6A multi-sockets · unsecured sockets · non-NFC-15-150 discharge lamps","Permanent staff access to the supply box, power off when unmanned if locked · earth connection on Class 1 equipment · halogen lamps at 2.25 m or above with a glass safety shield · Class 2 double-insulated equipment · C2-rated cable and sockets on illuminating garlands","Three-pin multiple sockets and adaptors, 10A/16A"]]},{"type":"list","items":["French fire ratings apply: M0 fireproof, M1 non-flammable, M2 low flammability, M3 medium flammability, M4 flammable. Certificates must match the exact structure, adhesive and wall-covering combination used.","White lettering on green is reserved for general safety signage, never for booth signs.","Under Monaco''s Ministerial Decree No. 2017-893, every stand entrance must be threshold-free or have an inclined threshold. An elevation of 2 cm or less must be rounded or bevelled; up to 4 cm is allowed with a gentle slope, maximum 33%, across its full height. Successive steps are prohibited, and furniture and signage must be usable by people with reduced mobility.","Booth layout must never hide exit or emergency signage, or obstruct extinguishers, hose cabinets, glass-breaking tools or emergency phones.","Where a stand has a height derogation beyond the standard limit, decoration finishes are mandatory on the back of the stand.","Storing wood, paper, straw, cardboard or packaging in the exhibition areas, the booths, the areas behind them or the cabins is strictly forbidden. Gas and flammable liquids are absolutely forbidden inside the Grimaldi Forum.","Vehicles on booths: fuel kept on reserve, around 5 litres; never start the engine during assembly, operation or dismantling. If the hood is open, battery terminals must be protected and inaccessible; otherwise the hood stays closed.","Machines with moving parts, hot surfaces or sharp edges need guarding or casing, or a 1 m aisle setback with a barrier. Hydraulic-jack displays need a secondary mechanical safety device, and all machines must be stabilised against tipping.","PPE is mandatory in any work situation requiring it, per Sovereign Ordinance No. 3.706. Grimaldi Forum can halt work it deems dangerous.","All booths must be finished before the Safety Committee''s inspection, the day before or the morning of opening. The exhibitor or a qualified representative must be present with certificates. The Committee can ban use of the booth, enforced immediately; no liability is accepted for a closure caused by non-compliance."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_induction', 'board_monaco_2027', 'cc_build', 'Emergency & site induction', 'Brief every member of your team before they enter the halls. Post this sheet on your stand during build-up.', '[{"type":"paragraph","text":"Brief every member of your team before they enter the halls. Post this sheet on your stand during build-up."},{"type":"paragraph","text":"Risk Assessment and Method Statements are a legal requirement."},{"type":"list","items":["Look for hazards: equipment, heavy lifting, working at height.","Decide who could be harmed and how.","Evaluate risks and implement control measures: eliminate, isolate or reduce.","Responsible person: name and emergency mobile number for the on-site supervisor.","Erection and timetable: detailed build sequence, hours required and personnel count.","Stability: methods for structural support, with calculations.","Children under 16 are strictly not permitted in the halls during build-up and breakdown, for health and safety reasons.","Smoking is not allowed anywhere on site.","24/7 in-house security with video surveillance. Individual booth surveillance can be ordered separately. Badges are produced by the organiser.","Exhibitors must carry civil and third-party liability insurance, plus cover for goods entrusted to them, including a waiver of recourse against Grimaldi Forum Monaco and its insurers. Written proof is due before opening.","A cloakroom operates during public opening days, with a standard charge per item. Concierge support is available for taxis, restaurants, theatre and airport transfers.","Animals are forbidden without Grimaldi Forum''s prior written authorisation."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_suppliers', 'board_monaco_2027', 'cc_venue', 'Agreed suppliers', 'Customs procedures and on-site lifting must go through one of the forwarding agents below. Contact suppliers directly; orders are between you and them.', '[{"type":"paragraph","text":"Customs procedures and on-site lifting must go through one of the forwarding agents below. Contact suppliers directly; orders are between you and them."},{"type":"table","columns":["Category","Supplier","Contact"],"rows":[["Booth catering","SARL Favi Traiteur","+33 4 92 28 35 28 · commercial@pavillontraiteur.com"],["Water fountains","Essence Exhibition Services","+33 4 93 95 97 34 · essence.services@orange.fr"],["Computer equipment rental","Key4Events","+377 97 97 56 01 · marie.lecomte@key4events.com"],["Furniture rental","Caroli Expo","+377 97 98 50 00 · info.caroliexpo@groupecaroli.mc"],["Furniture rental (alt.)","Alive","+33 1 34 38 33 10 · paris-nord@group-alive.com"],["Plants rental","Green Plus (SARL Narmino)","+377 97 70 28 50 · info@greenplus.mc"],["Flower rental","Gastaldi Fleurs","+377 97 70 41 27 · info@gastaldimonaco.com"],["Flower rental (alt.)","Narmino Sorasio","+377 93 50 54 05 · monte-carlo@narminosorasio.com"],["VAT refund","Mathez Monaco International","+377 93 101 330 · onsite@mathez-monaco.com"],["Music & performance rights","SACEM Monaco","+377 93 50 96 48 · dl.monaco@sacem.fr"],["Forwarding agent · on-site lifting","Office Maritime Monégasque","+377 92 05 76 15 · log@omm-monaco.com"],["Forwarding agent (alt.)","Monaco Logistique","+377 97 97 23 33 · j.bizi@monacologistique.mc"],["Bespoke booth design","Grimaldi Forum (Hervé Masson)","+377 99 99 22 25 · hmasson@grimaldiforum.com"],["Exhibitors advisors","Paloma Maas / Matthieu Testory","+377 99 99 22 17 / 18 · email TBC"]]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_green', 'board_monaco_2027', 'cc_venue', 'Act Green', 'Grimaldi Forum runs an ISO 14001:2015-aligned environmental programme. Exhibitors are asked to work with it.', '[{"type":"paragraph","text":"Grimaldi Forum runs an ISO 14001:2015-aligned environmental programme. Exhibitors are asked to work with it."},{"type":"list","items":["Energy-efficient systems and seawater cooling.","100% renewable-energy consumption.","A signed staff charter of CSR good practices.","Eco-labelled products and low-consumption lighting.","Recycling of carpet, signage and wood.","Sort waste into the containers provided during set-up.","Leave waste sorted in the aisles every evening.","Remove empty crates and packaging as installation progresses.","Specify reusable structures and graphics where you can.","Order large waste or wood bins on estimate if you need them."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24')
on conflict (id) do nothing;


-- ---- files: the BOARD library ----
insert into files ("id", "event_id", "name", "kind", "size", "url", "visibility") values
  ('file_logo', 'board_monaco_2027', 'BOARD Monaco 2027 logo pack.zip', 'Event logos', '4.2 MB', null, '{"type":"all"}'::jsonb),
  ('file_toolkit', 'board_monaco_2027', 'Partner marketing toolkit.pdf', 'Partner toolkit', '8.1 MB', null, '{"type":"all"}'::jsonb),
  ('file_floorplan', 'board_monaco_2027', 'Exhibition floor plan.pdf', 'Floor plans', '2.6 MB', null, '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb),
  ('file_standspec', 'board_monaco_2027', 'Stand build technical spec.pdf', 'Technical specification', '1.9 MB', null, '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb),
  ('file_artworkspec', 'board_monaco_2027', 'Artwork specification.pdf', 'Artwork specifications', '640 KB', null, '{"type":"entitlement","key":"has_branding_inventory"}'::jsonb)
on conflict (id) do nothing;


-- ---- task templates ----
insert into task_templates ("id", "event_id", "title", "description", "category", "module", "priority", "required", "due_date", "requires", "link_type", "link_target", "instructions", "attachments") values
  ('tt_profile', 'board_monaco_2027', 'Complete your company profile', '', 'Onboarding', 'forms', 'high', true, '2027-01-30', '{}', 'form', 'f_profile', 'This information is used across signage, the delegate app and printed materials.', '{}'),
  ('tt_passes', 'board_monaco_2027', 'Register your delegate passes', '', 'Registration', 'forms', 'medium', true, '2027-03-01', '{}', 'form', 'f_passes', '', '{}'),
  ('tt_hs', 'board_monaco_2027', 'Complete the venue safety questionnaire', '', 'Exhibition', 'forms', 'high', true, '2027-02-14', '{"has_raw_space"}', 'form', 'gf_safety', 'Grimaldi Forum Form 6.8. Required before any build can begin on a raw-space stand.', '{}'),
  ('tt_stand', 'board_monaco_2027', 'Submit stand design for approval', '', 'Exhibition', 'requests', 'high', true, '2027-02-10', '{"requires_stand_approval"}', 'request', 'rt_stand_design', '', '{}'),
  ('tt_rules', 'board_monaco_2027', 'Read & acknowledge stand design rules', '', 'Exhibition', 'information', 'medium', true, '2027-02-05', '{"has_exhibition_space"}', 'content', 'pg_standrules', '', '{}'),
  ('tt_meetings', 'board_monaco_2027', 'Submit meetings participant details', '', 'Meetings', 'forms', 'high', true, '2027-02-07', '{"has_meetings_package"}', 'form', 'f_meetings', '', '{}'),
  ('tt_artwork', 'board_monaco_2027', 'Upload your branding artwork', '', 'Brand', 'files', 'medium', true, '2027-02-18', '{"has_branding_inventory"}', 'upload', null, 'Print-ready artwork to the specification in the artwork guidance.', '{}'),
  ('tt_speaker', 'board_monaco_2027', 'Confirm speaker & session details', '', 'Content', 'forms', 'high', true, '2027-02-01', '{"has_content_session"}', 'form', 'f_speaker', '', '{}'),
  ('tt_hosted', 'board_monaco_2027', 'Submit your hosted function plan', '', 'Hospitality', 'requests', 'high', true, '2027-02-12', '{"has_hospitality_activation"}', 'request', 'rt_hosted', '', '{}'),
  ('tt_av', 'board_monaco_2027', 'Order essential AV for your stand', '', 'Shop', 'shop', 'low', false, '2027-02-28', '{"can_order_av"}', 'shop', 'cat_av', 'Optional — but AV books up quickly.', '{}')
on conflict (id) do nothing;


-- ---- partners ----
insert into partner_organisations ("id", "name", "sector", "country", "billing", "logo", "logo_light") values
  ('part_a', 'Helvetica Systems', 'Enterprise Tech & AI', 'Bahnhofstrasse 1, 8001 Zürich, Switzerland', '{"entity":"Helvetica Systems AG","address":"Bahnhofstrasse 1","city":"Zürich","postcode":"8001","country":"Switzerland","vat":"CHE-123.456.789"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D''http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg''%20width%3D''420''%20height%3D''96''%20viewBox%3D''0%200%20420%2096''%3E%3Crect%20x%3D''0''%20y%3D''16''%20width%3D''64''%20height%3D''64''%20rx%3D''14''%20fill%3D''%2331F9E5''%2F%3E%3Ctext%20x%3D''32''%20y%3D''60''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''34''%20font-weight%3D''700''%20fill%3D''%230B0D11''%20text-anchor%3D''middle''%3EH%3C%2Ftext%3E%3Ctext%20x%3D''82''%20y%3D''58''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''30''%20font-weight%3D''300''%20letter-spacing%3D''0.5''%20fill%3D''%23FFFFFF''%3EHelvetica%20Systems%3C%2Ftext%3E%3C%2Fsvg%3E', null),
  ('part_b', 'Northwind Advisory', 'Management Consultancy', '30 St Mary Axe, London EC3A 8BF, United Kingdom', '{"entity":"Northwind Advisory LLP","address":"30 St Mary Axe","city":"London","postcode":"EC3A 8BF","country":"United Kingdom","vat":"GB 123 4567 89"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D''http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg''%20width%3D''420''%20height%3D''96''%20viewBox%3D''0%200%20420%2096''%3E%3Crect%20x%3D''0''%20y%3D''16''%20width%3D''64''%20height%3D''64''%20rx%3D''14''%20fill%3D''%23C8763C''%2F%3E%3Ctext%20x%3D''32''%20y%3D''60''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''34''%20font-weight%3D''700''%20fill%3D''%230B0D11''%20text-anchor%3D''middle''%3EN%3C%2Ftext%3E%3Ctext%20x%3D''82''%20y%3D''58''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''30''%20font-weight%3D''300''%20letter-spacing%3D''0.5''%20fill%3D''%23FFFFFF''%3ENorthwind%20Advisory%3C%2Ftext%3E%3C%2Fsvg%3E', null),
  ('part_c', 'Meridian Partners', 'Investment', '15 Avenue Montaigne, 75008 Paris, France', '{"entity":"Meridian Partners SAS","address":"15 Avenue Montaigne","city":"Paris","postcode":"75008","country":"France","vat":"FR 12 345678901"}'::jsonb, 'data:image/svg+xml,%3Csvg%20xmlns%3D''http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg''%20width%3D''420''%20height%3D''96''%20viewBox%3D''0%200%20420%2096''%3E%3Crect%20x%3D''0''%20y%3D''16''%20width%3D''64''%20height%3D''64''%20rx%3D''14''%20fill%3D''%23F1F1E4''%2F%3E%3Ctext%20x%3D''32''%20y%3D''60''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''34''%20font-weight%3D''700''%20fill%3D''%230B0D11''%20text-anchor%3D''middle''%3EM%3C%2Ftext%3E%3Ctext%20x%3D''82''%20y%3D''58''%20font-family%3D''Arial%2CHelvetica%2Csans-serif''%20font-size%3D''30''%20font-weight%3D''300''%20letter-spacing%3D''0.5''%20fill%3D''%23FFFFFF''%3EMeridian%20Partners%3C%2Ftext%3E%3C%2Fsvg%3E', null)
on conflict (id) do nothing;

insert into partner_users ("id", "partner_id", "name", "email", "telephone", "role", "permissions", "invited_at", "accepted_at") values
  ('u_alex', 'part_a', 'Alex Morgan', 'alex@helvetica.example', '+41 44 000 0000', 'lead', '"all"'::jsonb, null, null),
  ('u_sam', 'part_a', 'Sam Doyle', 'sam@helvetica.example', '', 'user', '{"tasks":true,"forms":true,"shop":true,"orders":true,"requests":false,"profile":false,"team":false}'::jsonb, null, null),
  ('u_priya', 'part_b', 'Priya Shah', 'priya@northwind.example', '+44 20 0000 0000', 'lead', '"all"'::jsonb, null, null),
  ('u_jordan', 'part_c', 'Jordan Blake', 'jordan@meridian.example', '+33 1 00 00 00 00', 'lead', '"all"'::jsonb, null, null),
  ('u_riley', 'part_c', 'Riley Chen', 'riley@meridian.example', '', 'user', '{"tasks":true,"forms":true,"shop":false,"orders":true,"requests":true,"profile":true,"team":false}'::jsonb, null, null)
on conflict (id) do nothing;


-- ---- participation: the personalisation records ----
insert into event_participations ("id", "event_id", "partner_id", "reference", "stand_ref", "package_id", "added_entitlements", "removed_entitlements", "module_overrides", "form_due_dates", "task_due_dates", "task_state", "form_state", "ack_state", "contract_name", "contract_url", "partner_notes", "internal_notes", "lead_user_id", "pass_allocation", "marketing", "suspended") values
  ('ep_a', 'board_monaco_2027', 'part_a', 'BP-001', 'A12', null, '{"has_exhibition_space","has_raw_space","requires_stand_approval","can_order_av","can_order_furniture","can_order_signage"}', '{}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"tt_rules":{"completed":true,"completedAt":"2026-12-14T11:02:00Z","completedBy":"Alex Morgan"},"tt_stand":{"completed":true,"completedAt":"2027-01-04T15:40:00Z","completedBy":"Alex Morgan"}}'::jsonb, '{"f_profile":{"status":"approved","submittedAt":"2026-12-10T09:20:00Z","submittedBy":"Alex Morgan","values":{"legal_name":"Helvetica Systems AG","display_name":"Helvetica Systems","sector":"Technology","website":"https://helvetica.example","description":"Infrastructure software for regulated industries."}},"gf_safety":{"status":"changes_required","submittedAt":"2027-01-08T10:00:00Z","submittedBy":"Sam Doyle","feedback":"Melamine panel is listed at 5 mm; the venue requires 7–8 mm minimum at M2/M3. Please revise and resubmit with the certificate.","values":{"company_name":"Helvetica Systems AG","stand_number":"A12","materials_declared":"Melamine-coated panel, 5 mm, M2, Egger, west wall, cert LNE-2026-114"}}}'::jsonb, '{}'::jsonb, null, null, 'Corner stand confirmed. Power and rigging must clear the aisle.', 'Key tech logo. Stand plan slightly over height — watch on approval.', 'u_alex', 4, '{}'::jsonb, false),
  ('ep_b', 'board_monaco_2027', 'part_b', 'BP-002', null, null, '{"has_meetings_package","has_branding_inventory","can_order_signage"}', '{}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"tt_profile":{"completed":true,"completedAt":"2026-12-18T14:00:00Z","completedBy":"Priya Shah"}}'::jsonb, '{"f_profile":{"status":"submitted","submittedAt":"2026-12-18T14:00:00Z","submittedBy":"Priya Shah","values":{"legal_name":"Northwind Advisory LLP","display_name":"Northwind Advisory","sector":"Advisory","logo":"northwind-logo-vector.svg"}},"f_meetings":{"status":"submitted","submittedAt":"2027-01-09T11:30:00Z","submittedBy":"Priya Shah","values":{"headshot":"priya-shah-headshot.jpg"}}}'::jsonb, '{}'::jsonb, null, null, 'Branding placements confirmed: main foyer banner + app splash.', 'Upgraded mid-cycle to add branding. No physical stand.', 'u_priya', 3, '{}'::jsonb, false),
  ('ep_c', 'board_monaco_2027', 'part_c', 'BP-003', 'C04', null, '{"has_exhibition_space","has_content_session","has_hospitality_activation","has_branding_inventory","can_order_av"}', '{}', '{}'::jsonb, '{"f_speaker":"2027-02-06"}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, null, null, 'Rooftop activation + content session + demo stand. Your dedicated contact is Anna Lewis.', 'Highest-value bespoke partner. Custom rooftop function — see private brief.', 'u_jordan', 8, '{}'::jsonb, false)
on conflict (id) do nothing;

insert into partner_inventory ("id", "participation_id", "type", "name", "description", "cost", "quantity", "stand_number", "pass_type", "refs", "position") values
  ('inv_a1', 'ep_a', 'Dedicated Space', 'Corner stand · 6m × 4m', 'Raw exhibition space, corner position with two open sides.', 18000, 1, 'A12', null, '[{"kind":"form","id":"gf_safety"},{"kind":"task","id":"tt_stand"},{"kind":"task","id":"tt_rules"}]'::jsonb, 0),
  ('inv_a2', 'ep_a', 'Delegate Passes', 'Associate Pass', 'Full show access', 0, 4, '', 'Associate Pass', '[{"kind":"form","id":"f_passes"}]'::jsonb, 1),
  ('inv_b1', 'ep_b', 'Curated Introductions', 'Meetings programme · 12 introductions', 'Curated one-to-one introductions with matched senior leaders across the two days.', 22000, 12, '', null, '[{"kind":"form","id":"f_meetings"}]'::jsonb, 0),
  ('inv_b2', 'ep_b', 'Branding', 'Main foyer banner + app splash', 'Premium foyer banner placement plus a rotating splash slot in the delegate app.', 9500, 1, '', null, '[]'::jsonb, 1),
  ('inv_c1', 'ep_c', 'Dedicated Space', 'Demo stand · 8m × 5m', 'Custom-build demonstration space adjoining the content stage.', 26000, 1, 'C04', null, '[{"kind":"task","id":"tt_stand"}]'::jsonb, 0),
  ('inv_c2', 'ep_c', 'Bespoke', 'Rooftop hosted function', 'Private rooftop reception for up to 80 guests on the evening of day one.', 35000, 1, '', null, '[{"kind":"task","id":"tt_hosted"}]'::jsonb, 1),
  ('inv_c3', 'ep_c', 'Bespoke', 'Content session · main stage', '25-minute keynote slot on the main programme.', 15000, 1, '', null, '[{"kind":"form","id":"f_speaker"},{"kind":"task","id":"tt_speaker"}]'::jsonb, 2)
on conflict (id) do nothing;

insert into partner_requested_files ("id", "participation_id", "label", "due", "required", "file_name", "file_url", "uploaded_at", "uploaded_by", "position") values
  ('rf_a1', 'ep_a', 'Public liability insurance certificate', '2027-02-12', true, 'helvetica-liability-2027.pdf', null, '2027-01-20T10:00:00Z', 'Alex Morgan', 0),
  ('rf_a2', 'ep_a', 'Stand contractor method statement', '2027-02-14', true, null, null, null, null, 1),
  ('rf_a3', 'ep_a', 'High-resolution logo (SVG or EPS, transparent)', '2027-01-30', true, null, null, null, null, 2),
  ('rf_b1', 'ep_b', 'Print-ready branding artwork (PDF or packaged AI)', '2027-02-12', true, null, null, null, null, 0),
  ('rf_b2', 'ep_b', 'High-resolution logo (SVG or EPS, transparent)', '2027-01-30', true, 'northwind-logo-vector.svg', null, '2027-01-14T09:15:00Z', 'Priya Shah', 1)
on conflict (id) do nothing;

insert into partner_price_overrides ("participation_id", "product_id", "price") values
  ('ep_c', 'prod_screen85', 950)
on conflict (participation_id, product_id) do nothing;


-- ---- orders ----
insert into orders ("id", "event_id", "participation_id", "reference", "status", "submitted_at", "billing", "invoice_status") values
  ('ord_a1', 'board_monaco_2027', 'ep_a', 'BO-2027-00018', 'submitted', '2027-01-12T12:20:00Z', '{"legalEntity":"Helvetica Systems AG","address":"Bahnhofstrasse 1, 8001 Zürich, Switzerland","taxNumber":"CHE-123.456.789","invoiceContactName":"Jamie Smith","invoiceContactEmail":"accounts@helvetica.example","poNumber":"PO-4567","internalRef":"BOOTH-A12","notes":"Invoice the Zürich entity."}'::jsonb, '')
on conflict (id) do nothing;

insert into order_items ("id", "order_id", "product_id", "name", "supplier_id", "qty", "unit_price", "options", "answers", "position") values
  ('ord_a1__0', 'ord_a1', 'prod_screen55', '55" screen on floor stand', 'sup_aztec', 2, 750, '{"Mounting":"Floor stand"}'::jsonb, '{"installation_location":"Stand A12 — back wall","onsite_contact":"Sam Doyle"}'::jsonb, 0),
  ('ord_a1__1', 'ord_a1', 'prod_carpet', 'Stand carpet', 'sup_ges', 36, 22, '{"Colour":"Rich black"}'::jsonb, '{"stand_number":"A12","area_m2":"36"}'::jsonb, 1)
on conflict (id) do nothing;

insert into supplier_orders ("id", "order_id", "supplier_id", "reference", "status", "approval_mode", "submitted_at", "confirmed_at", "subtotal", "tax", "total", "quote") values
  ('so_a1_aztec', 'ord_a1', 'sup_aztec', 'SO-2027-00041', 'confirmed', 'auto', '2027-01-12T12:20:00Z', '2027-01-12T12:30:00Z', 1500, 300, 1800, null),
  ('so_a1_ges', 'ord_a1', 'sup_ges', 'SO-2027-00042', 'under_review', 'manual', '2027-01-12T12:20:00Z', null, 792, 158.4, 950.4, null)
on conflict (id) do nothing;

insert into supplier_order_items ("id", "supplier_order_id", "product_id", "name", "qty", "unit_price", "position") values
  ('so_a1_aztec__0', 'so_a1_aztec', 'prod_screen55', '55" screen on floor stand', 2, 750, 0),
  ('so_a1_ges__0', 'so_a1_ges', 'prod_carpet', 'Stand carpet', 36, 22, 0)
on conflict (id) do nothing;


-- ---- requests ----
insert into requests ("id", "event_id", "participation_id", "type_id", "reference", "status", "owner", "submitted_by", "submitted_at", "response_at", "values", "files") values
  ('req_a1', 'board_monaco_2027', 'ep_a', 'rt_stand_design', 'RQ-2027-0012', 'under_review', 'Anna Lewis', 'Alex Morgan', '2027-01-04T15:40:00Z', null, '{"stand_number":"A12","max_height":4,"notes":"Double-decker not required. LED header at 3.8m."}'::jsonb, '{"Helvetica_stand_v3.pdf"}'),
  ('req_c1', 'board_monaco_2027', 'ep_c', 'rt_hosted', 'RQ-2027-0019', 'more_info', 'Anna Lewis', 'Jordan Blake', '2027-01-15T11:00:00Z', '2027-01-16T09:30:00Z', '{"event_name":"Meridian rooftop reception","date_time":"23 March, 19:00","headcount":120,"concept":"Sunset reception on the terrace with live acoustic set."}'::jsonb, '{}')
on conflict (id) do nothing;

insert into request_comments ("id", "request_id", "author", "role", "body", "files", "created_at") values
  ('req_a1__c0', 'req_a1', 'Alex Morgan', 'partner', 'Submitting our stand design for approval.', '{}', '2027-01-04T15:40:00Z'),
  ('req_a1__c1', 'req_a1', 'Anna Lewis', 'organiser', 'Thanks — reviewing with the venue. Header height is close to the limit, confirming.', '{}', '2027-01-06T10:12:00Z'),
  ('req_c1__c0', 'req_c1', 'Jordan Blake', 'partner', 'Requesting approval for our rooftop reception.', '{}', '2027-01-15T11:00:00Z'),
  ('req_c1__c1', 'req_c1', 'Anna Lewis', 'organiser', 'Love it. Please confirm the catering supplier and whether you need a noise curfew exemption after 22:00.', '{}', '2027-01-16T09:30:00Z')
on conflict (id) do nothing;


-- ---- webhook log ----
insert into webhook_events ("id", "event_type", "supplier_order_id", "supplier_id", "idempotency_key", "signature", "status", "retry_count", "payload", "sent_at") values
  ('evt_01HXYZ', 'supplier_order.confirmed', 'so_a1_aztec', 'sup_aztec', 'idem_9f2a41c7a0', '', 'delivered', 0, '{"event_type":"supplier_order.confirmed","note":"Payload materialised at send time from the supplier order snapshot.","supplier_order":{"id":"so_a1_aztec"}}'::jsonb, '2027-01-12T12:30:00Z'),
  ('evt_01HABC', 'supplier_order.quote_requested', 'so_c_quote', 'sup_riviera', 'idem_0d5c9a8611', '', 'failed', 2, '{"event_type":"supplier_order.quote_requested","note":"Payload materialised at send time from the supplier order snapshot.","supplier_order":{"id":"so_c_quote"}}'::jsonb, '2027-01-18T09:05:00Z')
on conflict (id) do nothing;

insert into webhook_delivery_attempts ("id", "webhook_event_id", "attempted_at", "response_code", "response_body", "ok") values
  ('evt_01HXYZ__a0', 'evt_01HXYZ', '2027-01-12T12:30:00Z', 200, '{"status":"success","request_id":"zap_01H..."}', true),
  ('evt_01HABC__a0', 'evt_01HABC', '2027-01-18T09:05:00Z', 500, '{"error":"internal"}', false),
  ('evt_01HABC__a1', 'evt_01HABC', '2027-01-18T09:06:30Z', 502, 'Bad Gateway', false)
on conflict (id) do nothing;


-- ---- notifications, email, audit ----
insert into notifications ("id", "participation_id", "kind", "body", "read", "target", "created_at") values
  ('n1', 'ep_a', 'changes_required', 'Your Health & safety declaration needs changes before it can be approved.', false, null, '2027-01-08T12:00:00Z'),
  ('n2', 'ep_a', 'order', 'Order BO-2027-00018 submitted. Your AV items are confirmed.', true, null, '2027-01-12T12:30:00Z')
on conflict (id) do nothing;

insert into email_templates ("id", "event_id", "name", "subject", "body", "category", "enabled") values
  ('et_invite', 'board_monaco_2027', 'Partner invitation', 'You’re invited to the [event] Partner Portal', 'Hi [first_name],

You have been given access to the Partner Portal for [event], on behalf of [partner].

Everything we need from you lives there — your tasks and their deadlines, the forms to complete, the files to send us, and everything we have made available for you to download.

Use this link to set up your access: [portal_link]

The link works once and is just for you, so please do not forward it. If it has expired by the time you get to it, you can ask for a new one from the sign-in page using this email address.

If you have any questions, reply to this email and it will reach us.

[signature]', '', true),
  ('et_submit', 'board_monaco_2027', 'Submission confirmation', 'We’ve received your submission', '', '', true),
  ('et_order', 'board_monaco_2027', 'Order confirmation', 'Your BOARD 2027 order has been submitted', '', '', true),
  ('et_changes', 'board_monaco_2027', 'Changes required', 'Action needed: changes required', '', '', true),
  ('et_deadline', 'board_monaco_2027', 'Deadline reminder', 'Reminder: [task] is due [due]', 'Hi [first_name],

A reminder of what is coming up for [partner] at [event]:

[items]

You can complete any of these in your Partner Portal: [portal_link]

If you have any questions, just reply to this email.

Thanks,
[signature]', 'reminder', true),
  ('et_overdue', 'board_monaco_2027', 'Overdue reminder', 'Overdue: [task] was due [due]', 'Hi [first_name],

Our records show the following is outstanding for [partner], and some of it is now overdue. Please complete it as soon as you can so we can keep your participation in [event] on track.

[items]

Complete any of these here: [portal_link]

If any of this is already in hand or you need more time, let us know.

Thanks,
[signature]', 'reminder', true)
on conflict (id) do nothing;

insert into audit_log ("id", "event_id", "partner_id", "actor", "body", "created_at") values
  ('a1', 'board_monaco_2027', 'part_a', 'System', 'Supplier order SO-2027-00041 confirmed — webhook delivered to Aztec (200).', '2027-01-12T12:30:00Z'),
  ('a2', 'board_monaco_2027', 'part_a', 'Anna Lewis', 'Requested changes on Helvetica Systems Health & safety declaration.', '2027-01-08T12:00:00Z'),
  ('a3', 'board_monaco_2027', 'part_a', 'Anna Lewis', 'Commented on request RQ-2027-0012 (Helvetica Systems).', '2027-01-06T10:12:00Z'),
  ('a4', 'board_monaco_2027', 'part_c', 'System', 'Webhook delivery to Riviera Event Logistics failed (502) after 2 attempts.', '2027-01-18T09:06:30Z')
on conflict (id) do nothing;


commit;

-- ============================================================
-- Verify: every count below should be non-zero.
-- ============================================================
select
  (select count(*) from events)               as events,
  (select count(*) from entitlements)         as entitlements,
  (select count(*) from suppliers)            as suppliers,
  (select count(*) from products)             as products,
  (select count(*) from forms)                as forms,
  (select count(*) from form_fields)          as form_fields,
  (select count(*) from content_pages)        as content_pages,
  (select count(*) from task_templates)       as tasks,
  (select count(*) from partner_organisations) as partners,
  (select count(*) from event_participations) as participations;
