-- ============================================================
-- BOARD Partner Portal — scheduled reminders
--
-- Reminders run on a timer, and a timer that fires twice — a retry,
-- an overlapping run, somebody pressing the button by hand — must
-- not mean a partner is chased twice for the same thing.
--
-- The unit of chasing is an *item*: this task, this deadline, the
-- three-day warning. The unit of email is a *partner*: everything
-- owed goes out in one message, because eight emails at 08:00 is
-- how a partner learns to filter you.
--
-- Those two are deliberately not the same row. Keeping the claim
-- separate from the email is what lets one message cover six items,
-- and what lets a send that failed be tried again tomorrow instead
-- of being silently marked as chased.
-- ============================================================

create table if not exists reminder_claims (
  -- kind:participation:item:due:window — see reminderKey().
  id               text primary key,
  event_id         text not null references events(id) on delete cascade,
  participation_id text not null references event_participations(id) on delete cascade,
  -- The task or form. Not a foreign key: it may be either, and a
  -- deleted one should leave its claim behind rather than cascade.
  item_id          text not null,
  due_date         date not null,
  kind             text not null check (kind in ('deadline', 'overdue')),
  window_key       text not null,
  -- The message it went out in, once one has. Null while in flight.
  sent_email_id    text references sent_emails(id) on delete set null,
  claimed_at       timestamptz not null default now()
);

comment on table reminder_claims is
  'One row per thing a partner has been chased about. The primary key is the claim: '
  'inserting is how a run proves it got there first.';

create index if not exists reminder_claims_participation_idx
  on reminder_claims(participation_id, claimed_at desc);

-- ------------------------------------------------------------
-- Same posture as every other table: on, with no policies, so the
-- browser key reaches nothing and all access runs server-side.
-- ------------------------------------------------------------

alter table reminder_claims enable row level security;

revoke all on reminder_claims from anon, authenticated;

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
