-- 2. forms — 8 rows
--
-- The eight venue forms, numbered as the Grimaldi Forum numbers them.
-- Safe to run twice.

insert into forms ("id", "event_id", "title", "category", "description", "due_date", "assign", "allow_resubmit") values
  ('gf_exhibitor', 'board_monaco_2027', 'Exhibitor information (Form 6.1)', 'Venue forms', 'Compulsory for every exhibitor. Returned alongside the Security Form and Stand Diagram.', null, '{"type":"en'
    'titlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_diagram', 'board_monaco_2027', 'Stand diagram (Form 6.5)', 'Venue forms', 'Submit with your orders. One grid square equals one metre.', null, '{"type":"entitlement","keys":["has_exhibition_spac'
    'e"]}'::jsonb, true),
  ('gf_additional', 'board_monaco_2027', 'Additional information (Form 6.4)', 'Venue forms', 'On-site staffing schedules, booth setup and technical connectivity.', null, '{"type":"entitlement","keys":'
    '["has_exhibition_space"]}'::jsonb, true),
  ('gf_security', 'board_monaco_2027', 'Security information (Form 6.6)', 'Venue forms', 'Raw-space stands only. Confirms the safety declarations required for booths not fitted by Grimaldi Forum.', null, '{'
    '"type":"entitlement","keys":["has_raw_space"]}'::jsonb, true),
  ('gf_equipment', 'board_monaco_2027', 'Equipment & machinery in operation (Form 6.7)', 'Venue forms', 'Only if applicable. Required for heat or combustion engines, smoke generators, gas, lasers or a'
    'ny machinery in operation.', null, '{"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_safety', 'board_monaco_2027', 'Safety questionnaire (Form 6.8)', 'Venue forms', 'Raw space only. Materials fire rating, required for booths not fitted by Grimaldi Forum.', null, '{"type":"entit'
    'lement","keys":["has_raw_space"]}'::jsonb, true),
  ('gf_wideload', 'board_monaco_2027', 'Wide load escort request (Form 2.3)', 'Venue forms', 'Only for oversized vehicles. A police escort is required above 18.75 m long, 2.60 m wide or 4.30 m high.', null, '{'
    '"type":"entitlement","keys":["has_exhibition_space"]}'::jsonb, true),
  ('gf_payment', 'board_monaco_2027', 'Payment (Form 6.3)', 'Venue forms', 'Compulsory for every exhibitor. How you will settle your order form total.', null, '{"type":"entitlement","keys":["has_exhib'
    'ition_space"]}'::jsonb, true)
on conflict (id) do nothing;
