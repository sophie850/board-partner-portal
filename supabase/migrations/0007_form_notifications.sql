-- ============================================================
-- BOARD Partner Portal — who hears about a submission
--
-- Until now a submitted form told the partner it had arrived and
-- told nobody at BOARD. The answers sat in the organiser's Forms
-- screen waiting to be noticed, which is fine for a form somebody
-- is watching and useless for a venue questionnaire with a return
-- date attached to it.
--
-- Per form rather than one address for the event, because the
-- people waiting on one form are not the people waiting on another:
-- the Grimaldi Forum's safety questionnaire and a marketing profile
-- go to different desks.
--
-- The list is also the switch. No addresses, no email.
-- ============================================================

alter table forms
  add column if not exists notify_emails text[] not null default '{}';

comment on column forms.notify_emails is
  'Addresses told when this form is submitted. Empty means nobody is told, '
  'which is the off switch — there is no separate enabled flag.';

-- ------------------------------------------------------------
-- Re-verify the posture of the whole schema, as every migration does
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
