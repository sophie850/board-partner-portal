-- ============================================================
-- BOARD Partner Portal — sign-in by email link
--
-- One table. A sign-in link is a single-use, short-lived token
-- whose HASH is stored here — never the token itself, so a copy of
-- this table is not a set of working sign-in links.
--
-- There is deliberately no sessions table. A session is a signed
-- cookie, and the signed-in user is re-resolved from partner_users /
-- organiser_users on every request. That means removing somebody
-- from a team ends their access immediately, without a revocation
-- list to maintain or a database round trip in middleware.
-- ============================================================

create table if not exists auth_tokens (
  id           text primary key,
  -- SHA-256 of the token. Unique so a hash collision or a replay of
  -- an already-stored value cannot create a second live link.
  token_hash   text not null unique,
  -- Which table user_id refers to. Emails are unique within each
  -- table but a person could conceivably appear in both.
  kind         text not null check (kind in ('organiser', 'partner')),
  user_id      text not null,
  -- Snapshotted so an expired link can be reasoned about even after
  -- the user record has gone.
  email        text not null,
  -- Where the link should land once used.
  next_path    text not null default '',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  -- Set the moment the link is exchanged. A second use is refused.
  used_at      timestamptz,
  -- Coarse origin, for spotting someone hammering the form. Not an
  -- identifier: behind a proxy this is whatever the edge reports.
  requested_by text not null default ''
);

create index if not exists auth_tokens_email_idx on auth_tokens(email, created_at desc);
create index if not exists auth_tokens_expiry_idx on auth_tokens(expires_at);

comment on table auth_tokens is
  'Single-use sign-in links. Stores the hash, never the token. Rows are safe to delete once expires_at has passed.';

-- ------------------------------------------------------------
-- Same posture as every other table: no browser-facing access
-- ------------------------------------------------------------

alter table auth_tokens enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on auth_tokens from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on auth_tokens from authenticated;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Housekeeping
-- ------------------------------------------------------------
--
-- Spent and expired links are of no further use. The application
-- clears them opportunistically when issuing a new one, so this is
-- only needed if that has not run for a while:
--
--   delete from auth_tokens where expires_at < now() - interval '7 days';

-- ------------------------------------------------------------
-- Re-verify the whole schema
--
-- The same check as 0002, run again so that this migration — and any
-- table added since — cannot quietly leave something open.
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

  raise notice 'Row-level security enabled on every public table, auth_tokens included.';
end;
$$;
