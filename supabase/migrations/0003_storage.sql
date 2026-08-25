-- ============================================================
-- BOARD Partner Portal — file storage
--
-- One PRIVATE bucket. Nothing in it is reachable by URL alone.
--
-- Why private rather than public: the content library holds floor
-- plans, stand technical specs and partner artwork, and later it
-- will hold documents partners submit. A public bucket makes every
-- one of those readable by anyone who has or guesses the URL, for
-- ever, outside the portal's access control.
--
-- Instead, files are served through /api/files/*, which sits behind
-- the same gate as the rest of the site and streams from storage
-- using the secret key. That keeps URLs stable and permanent (no
-- signed-link expiry to manage) while keeping access gated.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'board-assets',
  'board-assets',
  false,
  26214400, -- 25 MB
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/postscript'
  ]
)
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public             = excluded.public;

-- No policies on storage.objects for this bucket.
--
-- The application reaches storage with the secret key, whose role
-- holds BYPASSRLS, so it needs none. Leaving the bucket without
-- policies means the browser publishable key can neither read nor
-- write it — the same posture as every table in 0002_rls.sql.

-- Verify:
--   select id, public, file_size_limit from storage.buckets
--   where id = 'board-assets';
-- Expect one row, public = false.
