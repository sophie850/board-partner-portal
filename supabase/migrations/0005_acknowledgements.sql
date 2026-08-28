-- ============================================================
-- BOARD Partner Portal — content acknowledgements
--
-- A content page can be marked "requires acknowledgement", and a
-- task can link to it with type 'ack'. Both already existed; there
-- was nowhere to record that a partner had actually acknowledged
-- one, so the flag did nothing and the partner saw a note saying so.
--
-- Stored as JSONB on the participation, keyed by page id, matching
-- task_state and form_state. Same shape, same place, loaded with the
-- participation rather than needing a join — and every per-partner
-- override already lives on this row.
-- ============================================================

alter table event_participations
  add column if not exists ack_state jsonb not null default '{}'::jsonb;

comment on column event_participations.ack_state is
  'Content acknowledgements, keyed by content page id: { "pg_x": { "at": iso, "by": "Name" } }.';

-- ------------------------------------------------------------
-- Re-verify the whole schema
-- ------------------------------------------------------------

do $$
declare
  unprotected text[];
begin
  select array_agg(c.relname order by c.relname)
    into unprotected
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;

  if unprotected is not null then
    raise exception
      'Row-level security is not enabled on: %. Refusing to leave these open.',
      array_to_string(unprotected, ', ');
  end if;

  raise notice 'Row-level security enabled on every public table.';
end;
$$;
