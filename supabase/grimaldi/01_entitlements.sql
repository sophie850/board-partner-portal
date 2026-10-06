-- 1. entitlements — 1 row
--
-- Raw space, as a thing a partner can have. Nothing is granted here — see part 7.
-- Safe to run twice.

insert into entitlements ("key", "event_id", "label") values
  ('has_raw_space', 'board_monaco_2027', 'Raw space (builds their own stand)')
on conflict (key) do nothing;
