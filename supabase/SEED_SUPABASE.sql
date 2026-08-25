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
  ('org_team', 'BOARD Operations', 'Operations team', 'operations@boardsummits.example', 'super_admin', null)
on conflict (id) do nothing;


-- ---- entitlements: the master vocabulary ----
insert into entitlements ("key", "event_id", "label") values
  ('has_exhibition_space', 'board_monaco_2027', 'Exhibition space'),
  ('has_turnkey_stand', 'board_monaco_2027', 'Turnkey stand package'),
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
  ('prod_freight', 'board_monaco_2027', 'Forklift & material handling', 'sup_riviera', 'cat_logistics', 'On-site forklift with operator — quoted per requirement.', 'service', null, 0.2, 'quote', 1, 1, '2027-03-05', 5, true, null, '[]'::jsonb, '[{"key":"handling_notes","label":"What needs handling? (weights, dimensions, times)","type":"long_text","required":true}]'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;


-- ---- forms ----
insert into forms ("id", "event_id", "title", "category", "description", "due_date", "assign", "allow_resubmit") values
  ('f_profile', 'board_monaco_2027', 'Company profile', 'Onboarding', 'Tell us about your organisation. Used across the programme and printed materials.', '2027-01-30', '{"type":"all"}'::jsonb, true),
  ('f_hs', 'board_monaco_2027', 'Health & safety declaration', 'Exhibition', 'Required for all partners with a physical stand presence.', '2027-02-14', '{"type":"entitlement","key":"has_exhibition_space"}'::jsonb, false),
  ('f_meetings', 'board_monaco_2027', 'Meetings participant details', 'Meetings', 'Details of the representatives taking part in the meetings programme.', '2027-02-07', '{"type":"entitlement","key":"has_meetings_package"}'::jsonb, true),
  ('f_speaker', 'board_monaco_2027', 'Speaker & session details', 'Content', 'Confirm your speaker and session information for the programme.', '2027-02-01', '{"type":"entitlement","key":"has_content_session"}'::jsonb, false),
  ('f_passes', 'board_monaco_2027', 'Delegate pass registration', 'Registration', 'Register the named delegates for your allocated passes.', '2027-03-01', '{"type":"all"}'::jsonb, true)
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
  ('f_hs__sec_docs', 'f_hs', 'sec_docs', 'Documentation', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 0),
  ('f_hs__method_statement', 'f_hs', 'method_statement', 'Method statement', 'document_upload', true, '', false, '{}', '{}'::jsonb, null, 1),
  ('f_hs__risk_assessment', 'f_hs', 'risk_assessment', 'Risk assessment', 'document_upload', true, '', false, '{}', '{}'::jsonb, null, 2),
  ('f_hs__sec_contractor', 'f_hs', 'sec_contractor', 'Contractor', 'section_heading', false, '', false, '{}', '{}'::jsonb, null, 3),
  ('f_hs__uses_contractor', 'f_hs', 'uses_contractor', 'Are you appointing an external stand contractor?', 'yes_no', true, '', false, '{}', '{}'::jsonb, null, 4),
  ('f_hs__contractor_name', 'f_hs', 'contractor_name', 'Contractor name', 'short_text', true, '', false, '{}', '{}'::jsonb, '{"field":"uses_contractor","equals":true}'::jsonb, 5),
  ('f_hs__contractor_contact', 'f_hs', 'contractor_contact', 'Contractor contact', 'contact', true, '', false, '{}', '{}'::jsonb, '{"field":"uses_contractor","equals":true}'::jsonb, 6),
  ('f_hs__contractor_insurance', 'f_hs', 'contractor_insurance', 'Contractor insurance certificate', 'document_upload', true, '', false, '{}', '{}'::jsonb, '{"field":"uses_contractor","equals":true}'::jsonb, 7),
  ('f_hs__elec_ack', 'f_hs', 'elec_ack', 'I confirm all electrical work will be certified to venue standard.', 'acknowledgement', true, '', false, '{}', '{}'::jsonb, null, 8),
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
  ('f_passes__dietary', 'f_passes', 'dietary', 'Dietary requirements', 'long_text', false, '', false, '{}', '{}'::jsonb, null, 3)
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
  ('pg_meridian', 'board_monaco_2027', 'cc_hospitality', 'Meridian rooftop activation — private brief', 'Confidential operational brief for the Meridian rooftop activation. Visible only to Meridian Partners.', '[]'::jsonb, null, '{"type":"partner","partners":["part_c"]}'::jsonb, false, true, '{}', '{}', '2026-11-22')
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
  ('tt_hs', 'board_monaco_2027', 'Submit health & safety declaration', '', 'Exhibition', 'forms', 'high', true, '2027-02-14', '{"has_exhibition_space"}', 'form', 'f_hs', 'Required before any build can begin.', '{}'),
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
insert into event_participations ("id", "event_id", "partner_id", "reference", "stand_ref", "package_id", "added_entitlements", "removed_entitlements", "module_overrides", "form_due_dates", "task_due_dates", "task_state", "form_state", "contract_name", "contract_url", "partner_notes", "internal_notes", "lead_user_id", "pass_allocation", "marketing", "suspended") values
  ('ep_a', 'board_monaco_2027', 'part_a', 'BP-001', 'A12', null, '{"has_exhibition_space","requires_stand_approval","can_order_av","can_order_furniture","can_order_signage"}', '{}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"tt_rules":{"completed":true,"completedAt":"2026-12-14T11:02:00Z","completedBy":"Alex Morgan"},"tt_stand":{"completed":true,"completedAt":"2027-01-04T15:40:00Z","completedBy":"Alex Morgan"}}'::jsonb, '{"f_profile":{"status":"approved","submittedAt":"2026-12-10T09:20:00Z","submittedBy":"Alex Morgan","values":{"legal_name":"Helvetica Systems AG","display_name":"Helvetica Systems","sector":"Technology","website":"https://helvetica.example","description":"Infrastructure software for regulated industries."}},"f_hs":{"status":"changes_required","submittedAt":"2027-01-08T10:00:00Z","submittedBy":"Sam Doyle","feedback":"Risk assessment is missing the working-at-height section. Please revise and resubmit.","values":{"uses_contractor":true,"contractor_name":"AlpEvents GmbH"}}}'::jsonb, null, null, 'Corner stand confirmed. Power and rigging must clear the aisle.', 'Key tech logo. Stand plan slightly over height — watch on approval.', 'u_alex', 4, '{}'::jsonb, false),
  ('ep_b', 'board_monaco_2027', 'part_b', 'BP-002', null, null, '{"has_meetings_package","has_branding_inventory","can_order_signage"}', '{}', '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{"tt_profile":{"completed":true,"completedAt":"2026-12-18T14:00:00Z","completedBy":"Priya Shah"}}'::jsonb, '{"f_profile":{"status":"submitted","submittedAt":"2026-12-18T14:00:00Z","submittedBy":"Priya Shah","values":{"legal_name":"Northwind Advisory LLP","display_name":"Northwind Advisory","sector":"Advisory","logo":"northwind-logo-vector.svg"}},"f_meetings":{"status":"submitted","submittedAt":"2027-01-09T11:30:00Z","submittedBy":"Priya Shah","values":{"headshot":"priya-shah-headshot.jpg"}}}'::jsonb, null, null, 'Branding placements confirmed: main foyer banner + app splash.', 'Upgraded mid-cycle to add branding. No physical stand.', 'u_priya', 3, '{}'::jsonb, false),
  ('ep_c', 'board_monaco_2027', 'part_c', 'BP-003', 'C04', null, '{"has_exhibition_space","has_content_session","has_hospitality_activation","has_branding_inventory","can_order_av"}', '{}', '{}'::jsonb, '{"f_speaker":"2027-02-06"}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, null, null, 'Rooftop activation + content session + demo stand. Your dedicated contact is Anna Lewis.', 'Highest-value bespoke partner. Custom rooftop function — see private brief.', 'u_jordan', 8, '{}'::jsonb, false)
on conflict (id) do nothing;

insert into partner_inventory ("id", "participation_id", "type", "name", "description", "cost", "quantity", "stand_number", "pass_type", "refs", "position") values
  ('inv_a1', 'ep_a', 'Dedicated Space', 'Corner stand · 6m × 4m', 'Raw exhibition space, corner position with two open sides.', 18000, 1, 'A12', null, '[{"kind":"form","id":"f_hs"},{"kind":"task","id":"tt_stand"},{"kind":"task","id":"tt_rules"}]'::jsonb, 0),
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
  ('et_invite', 'board_monaco_2027', 'Partner invitation', 'You’re invited to the BOARD Monaco 2027 Partner Portal', '', '', true),
  ('et_submit', 'board_monaco_2027', 'Submission confirmation', 'We’ve received your submission', '', '', true),
  ('et_order', 'board_monaco_2027', 'Order confirmation', 'Your BOARD 2027 order has been submitted', '', '', true),
  ('et_changes', 'board_monaco_2027', 'Changes required', 'Action needed: changes required', '', '', true),
  ('et_deadline', 'board_monaco_2027', 'Deadline reminder', 'Reminder: [task] is due [due]', 'Hi [first_name],

A quick reminder that “[task]” is due [due] for [partner] at [event].

You can complete it any time in your Partner Portal: [portal_link]

If you have any questions, just reply to this email.

Thanks,
[signature]', 'reminder', true),
  ('et_overdue', 'board_monaco_2027', 'Overdue reminder', 'Overdue: [task] was due [due]', 'Hi [first_name],

Our records show that “[task]” for [partner] was due [due] and is now overdue. Please complete it as soon as possible so we can keep your participation in [event] on track.

Complete it here: [portal_link]

If this is already in hand or you need more time, let us know.

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
