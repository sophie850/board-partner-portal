-- ============================================================
-- BOARD Partner Portal — the Grimaldi Forum exhibitor pack
--
-- Run this in the Supabase SQL editor against the LIVE database.
--
-- GENERATED FILE — do not edit by hand. It is built from
-- supabase/SEED_SUPABASE.sql by scripts/generate-grimaldi-sql.ts,
-- so the rows cannot drift from the fixtures the application uses.
-- Regenerate with: npm run grimaldi:sql
--
-- Why this exists. The seed only ever adds: every statement in it is
-- "on conflict do nothing", which is right for an empty project and
-- useless for a running one, because it silently skips anything that
-- needs to change. Retiring a form is mostly change, so the parts
-- that cannot be an insert are written out below as themselves.
--
-- Safe to run twice. Every statement is idempotent.
--
-- It does NOT decide who has raw space. That is a commercial fact
-- about each partner, not something to infer. Part four lists where
-- everyone stands. To grant it, either use the organiser portal, or
-- run this with the partner id filled in and a semicolon on the end
--
--   update event_participations
--      set added_entitlements = array_append(added_entitlements, 'has_raw_space'),
--          updated_at = now()
--    where partner_id = 'part_xxx'
--      and not (added_entitlements @> array['has_raw_space'])
--
-- No comment in this file ends in a semicolon, on purpose. Some SQL
-- consoles split a script on semicolons before sending it, and one
-- inside a comment hands the database a fragment made of nothing but
-- commented-out lines.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. What is new
--
-- 1 entitlements, 8 forms, 103 form_fields, 6 products, 7 content_pages.
--
-- The products hang off supplier 'sup_grimaldi' and the existing
-- shop categories, all of which predate this file. If any insert
-- fails on a foreign key, that is the thing to check first.
-- ------------------------------------------------------------

insert into entitlements ("key", "event_id", "label") values
  ('has_raw_space', 'board_monaco_2027', 'Raw space (builds their own stand)')
on conflict (key) do nothing;

insert into forms ("id", "event_id", "title", "category", "description", "due_date", "assign", "allow_resubmit") values
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

insert into products ("id", "event_id", "name", "supplier_id", "category_id", "description", "unit", "base_price", "tax_rate", "approval_mode", "min_qty", "max_qty", "order_deadline", "lead_time_days", "active", "image", "options", "questions", "visibility") values
  ('prod_gf_carpet', 'board_monaco_2027', 'Short-pile carpet, basic colours', 'sup_grimaldi', 'cat_furniture', 'Laid to the stand footprint. Colour is chosen on Form 6.4.', 'per m²', null, 0.2, 'quote', 1, 400, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_flag', 'board_monaco_2027', 'Double-sided flag sign (60 × 20 cm)', 'sup_grimaldi', 'cat_signage', 'Hanging stand identifier. Wording is given on Form 6.4.', 'unit', null, 0.2, 'quote', 1, 10, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_storage', 'board_monaco_2027', 'Storage 1 m² (panel + lockable door)', 'sup_grimaldi', 'cat_furniture', 'Lockable store built into the stand footprint.', 'unit', null, 0.2, 'quote', 1, 6, '2027-02-20', 14, true, null, '[]'::jsonb, '[{"key":"storage_position","label":"Where on the stand should it go?","type":"short_text","required":true}]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_internet', 'board_monaco_2027', 'Pro internet, 5 MB', 'sup_grimaldi', 'cat_internet', 'Wired connection for the run of the event. The venue is the sole provider.', 'event package', null, 0.2, 'quote', 1, 4, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_power', 'board_monaco_2027', 'Monophase 220V, 1–2 KW box', 'sup_grimaldi', 'cat_electrical', 'Mains connection. Mark its position on your stand diagram (Form 6.5).', 'unit', null, 0.2, 'quote', 1, 8, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_hostess', 'board_monaco_2027', 'Bilingual hostess, 8-hour day', 'sup_grimaldi', 'cat_logistics', 'Languages and uniform are set out on Form 6.4.', 'per day', null, 0.2, 'quote', 1, 12, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb)
on conflict (id) do nothing;

insert into content_pages ("id", "event_id", "category_id", "title", "body", "blocks", "cover", "visibility", "require_ack", "published", "related_tasks", "related_forms", "updated") values
  ('pg_gf_deliveries', 'board_monaco_2027', 'cc_venue', 'Deliveries & logistics', 'Grimaldi Forum Monaco receives parcels subject to availability. Deliveries that miss the conditions below are refused at the bay.', '[{"type":"paragraph","text":"Grimaldi Forum Monaco receives parcels subject to availability. Deliveries that miss the conditions below are refused at the bay."},{"type":"table","columns":["Bay","Level","Serves"],"rows":[["Quai S2","Level −4","Open daily for Ravel, Diaghilev, Guelfe, Génois, Indigo, Verrière, Atrium/Foyer −2. Includes bus parking, E3 unloading (zone verte) and logistic zone E3."],["Quai E3","Level −1","Galerie Diaghilev, Patio area, Pinède (during events only)."],["Quai B / G1","External","Avenue Princesse Grâce."]]},{"type":"list","items":["Sent less than 8 days before opening.","Volume no greater than 1 m³, maximum height 1.80 m.","Compulsory label naming the event, the exhibition hall and the correct delivery bay.","Parcels received at the delivery bay are not delivered to booths ; that is the exhibitor''s responsibility. Trolleys are provided.","DDU (delivery duty unpaid) shipments are not accepted. Grimaldi Forum is not liable for items lost or damaged before receipt.","No storage is offered for empty crates or packaging; remove them as installation progresses, via the agreed forwarding agent if needed.","Waste container placement and removal is available at the exhibitor''s expense.","Grimaldi Forum cleans before opening and after dismantling, plus daily cleaning of aisles and common areas. Daily booth cleaning is billed to the exhibitor unless the organiser states otherwise.","Leave the space clear of all structures and materials, including carpet, at close. Unclaimed rubbish is removed at the exhibitor''s cost."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_transport', 'board_monaco_2027', 'cc_venue', 'Transport & parking', 'Monaco restricts heavy goods movement and offers no truck parking. Plan vehicle movements before you travel.', '[{"type":"paragraph","text":"Monaco restricts heavy goods movement and offers no truck parking. Plan vehicle movements before you travel."},{"type":"paragraph","text":"Truck parking is not possible anywhere in the Principality. Grimaldi Forum organises access to the delivery docks only; each exhibitor must make their own truck-parking arrangements outside Monaco and contact the exhibitors advisor for guidance."},{"type":"paragraph","text":"Parking des Salines, at the Monaco entrance on the Jardin Exotique side, offers long-term rates: 15 min–4 h €7.50 (against €14.90 elsewhere) and 4–12 h €11 (against €24 elsewhere). A bus line connects it to the Grimaldi Forum at the Portier stop, plus a ten minute walk."},{"type":"table","columns":["Public car park","Address"],"rows":[["Parking public du Testimonio","73 avenue Princesse Grace"],["Parking public du Larvotto","39 avenue Princesse Grace"],["Parking public du Grimaldi Forum","4 avenue Princesse Grace"],["Parking public du Portier","Rond point du Portier"],["Parking public Louis II","35 Boulevard Louis II"]]},{"type":"list","items":["Heavy goods vehicles over 3.5 tonnes GVW are prohibited daily 08:00–09:00 .","At all other times they are restricted to approved access and departure itineraries. Movement outside those itineraries is prohibited anywhere in the Principality.","Grimaldi Forum strongly advises using its approved transport suppliers for on-site product transport.","Venue access points: Esplanade · Staff entrance · Quai A (S2) · Quai B (G1) · Trucks parking · Diaghilev & MC6 · Quai E3."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_technical', 'board_monaco_2027', 'cc_build', 'Technical specifications', 'Goods lift capacities and floor loading limits for the Grimaldi Forum halls. Check both before specifying a build.', '[{"type":"paragraph","text":"Goods lift capacities and floor loading limits for the Grimaldi Forum halls. Check both before specifying a build."},{"type":"table","columns":["Hall","Live load (t)","Cabin W×D×H (m)","Passage W×H (m)"],"rows":[["MC1","4.50","2.00 × 3.95 × 2.20","1.58 × 2.08"],["MC2","4.80","2.00 × 4.30 × 2.20","1.58 × 2.08"],["MC4","4.125","2.00 × 3.80 × 2.20","1.94 × 2.08"],["MC6","4.05","1.80 × 4.00 × 3.40","1.58 × 3.48"],["MC8","4.25","2.00 × 3.80 × 3.60","1.98 × 3.49"],["MC20 (extension)","4.40","2.00 × 4.10 × 2.50","2.00 × 2.50"],["MC21 (extension)","4.50","2.50 × 5.50 × 2.50","2.50 × 2.50"]]},{"type":"table","columns":["Area","Limit"],"rows":[["Diaghilev (mezzanine, upper & lower)","500 kg/m²"],["Guelfe & Génois (2nd floor)","400 kg/m²"],["Ravel (1st floor)","1000 kg/m²"],["Foyer (lower ground floor)","500 kg/m²"],["Esplanade (floor 0)","1000 kg/m²"],["Indigo (1st floor)","500 kg/m²"],["Hall (floor 0)","500 kg/m²"],["Le Carré · Galerie Diaghilev · Hall Pinède · Salles Patio","500 kg/m²"],["Parvis Emeraude","1000 kg/m²"]]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_safety', 'board_monaco_2027', 'cc_build', 'Stand safety rules', 'Booths designed or fitted by exhibitors must comply with public-building fire and panic-risk rules and the Chief Fire Safety Officer''s instructions.', '[{"type":"paragraph","text":"Booths designed or fitted by exhibitors must comply with public-building fire and panic-risk rules and the Chief Fire Safety Officer''s instructions."},{"type":"paragraph","text":"Installation by professionals only. The exhibitor owns responsibility from the supply box outward and must complete the electrical security information form. The box must stay inaccessible to the public but reachable by staff. Power runs during opening hours only; 24-hour supply requires an Operations Department request."},{"type":"table","columns":["Forbidden","Compulsory","Recommended"],"rows":[["Modifying the supply box · conductors under 1.5 mm² · H03VH-H cable below 500V · spliced cables · unprotected connections · two-pole 6A multi-sockets · unsecured sockets · non-NFC-15-150 discharge lamps","Permanent staff access to the supply box, power off when unmanned if locked · earth connection on Class 1 equipment · halogen lamps at 2.25 m or above with a glass safety shield · Class 2 double-insulated equipment · C2-rated cable and sockets on illuminating garlands","Three-pin multiple sockets and adaptors, 10A/16A"]]},{"type":"list","items":["French fire ratings apply: M0 fireproof, M1 non-flammable, M2 low flammability, M3 medium flammability, M4 flammable. Certificates must match the exact structure, adhesive and wall-covering combination used.","White lettering on green is reserved for general safety signage, never for booth signs.","Under Monaco''s Ministerial Decree No. 2017-893, every stand entrance must be threshold-free or have an inclined threshold. An elevation of 2 cm or less must be rounded or bevelled; up to 4 cm is allowed with a gentle slope, maximum 33%, across its full height. Successive steps are prohibited, and furniture and signage must be usable by people with reduced mobility.","Booth layout must never hide exit or emergency signage, or obstruct extinguishers, hose cabinets, glass-breaking tools or emergency phones.","Where a stand has a height derogation beyond the standard limit, decoration finishes are mandatory on the back of the stand.","Storing wood, paper, straw, cardboard or packaging in the exhibition areas, the booths, the areas behind them or the cabins is strictly forbidden. Gas and flammable liquids are absolutely forbidden inside the Grimaldi Forum.","Vehicles on booths: fuel kept on reserve, around 5 litres; never start the engine during assembly, operation or dismantling. If the hood is open, battery terminals must be protected and inaccessible; otherwise the hood stays closed.","Machines with moving parts, hot surfaces or sharp edges need guarding or casing, or a 1 m aisle setback with a barrier. Hydraulic-jack displays need a secondary mechanical safety device, and all machines must be stabilised against tipping.","PPE is mandatory in any work situation requiring it, per Sovereign Ordinance No. 3.706. Grimaldi Forum can halt work it deems dangerous.","All booths must be finished before the Safety Committee''s inspection, the day before or the morning of opening. The exhibitor or a qualified representative must be present with certificates. The Committee can ban use of the booth, enforced immediately; no liability is accepted for a closure caused by non-compliance."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_induction', 'board_monaco_2027', 'cc_build', 'Emergency & site induction', 'Brief every member of your team before they enter the halls. Post this sheet on your stand during build-up.', '[{"type":"paragraph","text":"Brief every member of your team before they enter the halls. Post this sheet on your stand during build-up."},{"type":"paragraph","text":"Risk Assessment and Method Statements are a legal requirement."},{"type":"list","items":["Look for hazards: equipment, heavy lifting, working at height.","Decide who could be harmed and how.","Evaluate risks and implement control measures: eliminate, isolate or reduce.","Responsible person: name and emergency mobile number for the on-site supervisor.","Erection and timetable: detailed build sequence, hours required and personnel count.","Stability: methods for structural support, with calculations.","Children under 16 are strictly not permitted in the halls during build-up and breakdown, for health and safety reasons.","Smoking is not allowed anywhere on site.","24/7 in-house security with video surveillance. Individual booth surveillance can be ordered separately. Badges are produced by the organiser.","Exhibitors must carry civil and third-party liability insurance, plus cover for goods entrusted to them, including a waiver of recourse against Grimaldi Forum Monaco and its insurers. Written proof is due before opening.","A cloakroom operates during public opening days, with a standard charge per item. Concierge support is available for taxis, restaurants, theatre and airport transfers.","Animals are forbidden without Grimaldi Forum''s prior written authorisation."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_suppliers', 'board_monaco_2027', 'cc_venue', 'Agreed suppliers', 'Customs procedures and on-site lifting must go through one of the forwarding agents below. Contact suppliers directly; orders are between you and them.', '[{"type":"paragraph","text":"Customs procedures and on-site lifting must go through one of the forwarding agents below. Contact suppliers directly; orders are between you and them."},{"type":"table","columns":["Category","Supplier","Contact"],"rows":[["Booth catering","SARL Favi Traiteur","+33 4 92 28 35 28 · commercial@pavillontraiteur.com"],["Water fountains","Essence Exhibition Services","+33 4 93 95 97 34 · essence.services@orange.fr"],["Computer equipment rental","Key4Events","+377 97 97 56 01 · marie.lecomte@key4events.com"],["Furniture rental","Caroli Expo","+377 97 98 50 00 · info.caroliexpo@groupecaroli.mc"],["Furniture rental (alt.)","Alive","+33 1 34 38 33 10 · paris-nord@group-alive.com"],["Plants rental","Green Plus (SARL Narmino)","+377 97 70 28 50 · info@greenplus.mc"],["Flower rental","Gastaldi Fleurs","+377 97 70 41 27 · info@gastaldimonaco.com"],["Flower rental (alt.)","Narmino Sorasio","+377 93 50 54 05 · monte-carlo@narminosorasio.com"],["VAT refund","Mathez Monaco International","+377 93 101 330 · onsite@mathez-monaco.com"],["Music & performance rights","SACEM Monaco","+377 93 50 96 48 · dl.monaco@sacem.fr"],["Forwarding agent · on-site lifting","Office Maritime Monégasque","+377 92 05 76 15 · log@omm-monaco.com"],["Forwarding agent (alt.)","Monaco Logistique","+377 97 97 23 33 · j.bizi@monacologistique.mc"],["Bespoke booth design","Grimaldi Forum (Hervé Masson)","+377 99 99 22 25 · hmasson@grimaldiforum.com"],["Exhibitors advisors","Paloma Maas / Matthieu Testory","+377 99 99 22 17 / 18 · email TBC"]]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24'),
  ('pg_gf_green', 'board_monaco_2027', 'cc_venue', 'Act Green', 'Grimaldi Forum runs an ISO 14001:2015-aligned environmental programme. Exhibitors are asked to work with it.', '[{"type":"paragraph","text":"Grimaldi Forum runs an ISO 14001:2015-aligned environmental programme. Exhibitors are asked to work with it."},{"type":"list","items":["Energy-efficient systems and seawater cooling.","100% renewable-energy consumption.","A signed staff charter of CSR good practices.","Eco-labelled products and low-consumption lighting.","Recycling of carpet, signage and wood.","Sort waste into the containers provided during set-up.","Leave waste sorted in the aisles every evening.","Remove empty crates and packaging as installation progresses.","Specify reusable structures and graphics where you can.","Order large waste or wood bins on estimate if you need them."]}]'::jsonb, null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, false, true, '{}', '{}', '2026-09-24')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 2. Re-point the safety task at the venue's own form
--
-- 'tt_hs' asked for a Health & safety declaration that BOARD had
-- invented before Anna's pack arrived. Forms 6.6 and 6.8 are the
-- real thing, so the task now sends partners to 6.8 and applies
-- only to raw space.
--
-- This one is an update, not an insert, which is exactly what the
-- seed could not do. Note that it overwrites any wording the BOARD
-- team has edited on this task in the organiser portal — it has to,
-- because the form it used to point at is deleted in part three.
-- ------------------------------------------------------------

insert into task_templates ("id", "event_id", "title", "description", "category", "module", "priority", "required", "due_date", "requires", "link_type", "link_target", "instructions", "attachments") values
  ('tt_hs', 'board_monaco_2027', 'Complete the venue safety questionnaire', '', 'Exhibition', 'forms', 'high', true, '2027-02-14', '{"has_raw_space"}', 'form', 'gf_safety', 'Grimaldi Forum Form 6.8. Required before any build can begin on a raw-space stand.', '{}')
on conflict (id) do update set
  title        = excluded.title,
  description  = excluded.description,
  category     = excluded.category,
  module       = excluded.module,
  priority     = excluded.priority,
  required     = excluded.required,
  due_date     = excluded.due_date,
  requires     = excluded.requires,
  link_type    = excluded.link_type,
  link_target  = excluded.link_target,
  instructions = excluded.instructions,
  attachments  = excluded.attachments,
  updated_at   = now();

-- ------------------------------------------------------------
-- 3. Retire the invented form
--
-- Any answers already given against it are carried over to 6.8
-- rather than dropped — a partner who filled it in should not be
-- asked again. Moved first, because deleting the form takes its
-- fields with it.
-- ------------------------------------------------------------

-- jsonb_exists() rather than the question-mark operator,
-- deliberately. The two mean the same thing to PostgreSQL, but a
-- bare question mark is a bind placeholder to a great many database
-- clients, including the one behind the Supabase SQL editor. It
-- mangles the statement before PostgreSQL ever sees it, and reports
-- a syntax error at end of input pointing at nothing. The function
-- form cannot be mistaken for anything.
update event_participations
   set form_state = (form_state - 'f_hs')
                    || jsonb_build_object('gf_safety', form_state -> 'f_hs'),
       updated_at = now()
 where jsonb_exists(form_state, 'f_hs')
   and not jsonb_exists(form_state, 'gf_safety');

-- Nothing to carry over, so just drop the key.
update event_participations
   set form_state = form_state - 'f_hs',
       updated_at = now()
 where jsonb_exists(form_state, 'f_hs');

delete from form_fields where form_id = 'f_hs';
delete from forms where id = 'f_hs';

commit;

-- ------------------------------------------------------------
-- 4. Who has raw space
--
-- Nothing above grants it. Forms 6.6 and 6.8 apply only to partners
-- building their own stand rather than taking the shell scheme, and
-- which partners those are is a commercial fact. Guessing would
-- either hide a form somebody must complete or chase somebody for
-- one that does not apply to them.
--
-- So this last statement only shows you where everyone stands. Set
-- it in the organiser portal under the partner's entitlements, or
-- with the statement given at the top of this file.
-- ------------------------------------------------------------

select p.name                                            as partner,
       ep.reference,
       ep.stand_ref,
       ep.added_entitlements @> array['has_raw_space']    as has_raw_space
  from event_participations ep
  join partner_organisations p on p.id = ep.partner_id
 order by p.name;
