-- 4. products — 6 rows
--
-- Form 6.2, which is a catalogue with a quantity box, so it lives in the Shop.
-- Safe to run twice.

insert into products ("id", "event_id", "name", "supplier_id", "category_id", "description", "unit", "base_price", "tax_rate", "approval_mode", "min_qty", "max_qty", "order_deadline", "lead_time_days", "active", "image", "options", "questions", "visibility") values
  ('prod_gf_carpet', 'board_monaco_2027', 'Short-pile carpet, basic colours', 'sup_grimaldi', 'cat_furniture', 'Laid to the stand footprint. Colour is chosen on Form 6.4.', 'per m²', null, 0.2, 'quote'
    '', 1, 400, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_flag', 'board_monaco_2027', 'Double-sided flag sign (60 × 20 cm)', 'sup_grimaldi', 'cat_signage', 'Hanging stand identifier. Wording is given on Form 6.4.', 'unit', null, 0.2, 'quote', 1, 10, '2'
    '027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_storage', 'board_monaco_2027', 'Storage 1 m² (panel + lockable door)', 'sup_grimaldi', 'cat_furniture', 'Lockable store built into the stand footprint.', 'unit', null, 0.2, 'quote', 1, 6, '2'
    '027-02-20', 14, true, null, '[]'::jsonb, '[{"key":"storage_position","label":"Where on the stand should it go?","type":"short_text","required":true}]'::jsonb, '{"requires":"has_exhibition_space"'
    '}'::jsonb),
  ('prod_gf_internet', 'board_monaco_2027', 'Pro internet, 5 MB', 'sup_grimaldi', 'cat_internet', 'Wired connection for the run of the event. The venue is the sole provider.', 'event package', null, 0.2, 'q'
    'uote', 1, 4, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_power', 'board_monaco_2027', 'Monophase 220V, 1–2 KW box', 'sup_grimaldi', 'cat_electrical', 'Mains connection. Mark its position on your stand diagram (Form 6.5).', 'unit', null, 0.2, 'qu'
    'ote', 1, 8, '2027-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb),
  ('prod_gf_hostess', 'board_monaco_2027', 'Bilingual hostess, 8-hour day', 'sup_grimaldi', 'cat_logistics', 'Languages and uniform are set out on Form 6.4.', 'per day', null, 0.2, 'quote', 1, 12, '20'
    '27-02-20', 14, true, null, '[]'::jsonb, '[]'::jsonb, '{"requires":"has_exhibition_space"}'::jsonb)
on conflict (id) do nothing;
