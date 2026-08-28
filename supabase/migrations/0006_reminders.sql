-- ============================================================
-- BOARD Partner Portal — scheduled reminders
--
-- Reminders run on a timer, and a timer that fires twice — a retry,
-- an overlapping run, somebody pressing the button by hand — must
-- not mean a partner is chased twice for the same thing.
--
-- So a reminder claims its slot before it sends. `dedupe_key` names
-- exactly what is being sent about ("this task, this deadline, the
-- three-day warning"), and the unique index means the second claim
-- loses. That is the whole mechanism: the database decides, not the
-- code, so two runs racing cannot both win.
--
-- The status 'sending' is the claim itself. A row left in that state
-- is a send that was claimed and then never completed — the process
-- died mid-flight — and it shows in the outbox as exactly that,
-- rather than silently looking sent.
-- ============================================================

alter table sent_emails
  add column if not exists dedupe_key text;

comment on column sent_emails.dedupe_key is
  'Identifies what a scheduled message is about, so it is sent once. Null for one-off sends.';

-- Partial, so the many one-off sends with no key do not collide.
create unique index if not exists sent_emails_dedupe_idx
  on sent_emails(dedupe_key)
  where dedupe_key is not null;

-- ------------------------------------------------------------
-- Widen the status vocabulary to include the claim
-- ------------------------------------------------------------

alter table sent_emails
  drop constraint if exists sent_emails_status_check;

alter table sent_emails
  add constraint sent_emails_status_check
  check (status in ('sent', 'failed', 'sending'));

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
