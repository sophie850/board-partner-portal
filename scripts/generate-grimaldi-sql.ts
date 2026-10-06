/* ============================================================
   Generate the SQL that puts Anna's venue pack into a live
   database.

   The seed is for an empty project. This is for the one that is
   already running, where every insert is "on conflict do nothing"
   and so silently skips anything that has to *change* — which is
   most of what retiring a form involves.

   Generated from supabase/SEED_SUPABASE.sql rather than written by
   hand, so the rows cannot drift from the fixtures they came from.

   Run: npm run grimaldi:sql
   ============================================================ */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const seedPath = join(root, 'supabase', 'SEED_SUPABASE.sql');
const outPath = join(root, 'supabase', 'APPLY_GRIMALDI_FORUM.sql');

interface Block {
  table: string;
  header: string;
  rows: string[];
  tail: string;
}

/** The seed, split back into one block per table. */
function blocksOf(sql: string): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;

  for (const line of sql.split('\n')) {
    if (line.startsWith('insert into ')) {
      cur = { table: line.match(/^insert into (\w+)/)![1], header: line, rows: [], tail: '' };
    } else if (cur && line.startsWith('on conflict')) {
      cur.tail = line;
      out.push(cur);
      cur = null;
    } else if (cur && line.trim().startsWith('(')) {
      cur.rows.push(line);
    }
  }

  return out;
}

/** Anna's rows, by the id convention each table uses. */
const WANTED: Record<string, RegExp> = {
  entitlements: /^\s*\('has_raw_space'/,
  forms: /^\s*\('gf_/,
  form_fields: /^\s*\('gf_/,
  products: /^\s*\('prod_gf_/,
  content_pages: /^\s*\('pg_gf_/,
};

/** The order matters: a form's fields cannot land before the form. */
const ORDER = ['entitlements', 'forms', 'form_fields', 'products', 'content_pages'];

const blocks = blocksOf(readFileSync(seedPath, 'utf8'));
const parts: string[] = [];
const counts: Array<[string, number]> = [];

for (const table of ORDER) {
  const block = blocks.find((b) => b.table === table);
  if (!block) throw new Error(`The seed has no ${table} block — has its shape changed?`);

  const rows = block.rows.filter((r) => WANTED[table].test(r));
  if (!rows.length) throw new Error(`No ${table} rows matched. Refusing to write a file that does nothing.`);

  counts.push([table, rows.length]);

  // The last row carries a comma from the seed; it must not here.
  const body = rows.map((r) => r.replace(/,\s*$/, '')).join(',\n');
  parts.push(`${block.header}\n${body}\n${block.tail}`);
}

/** The task template that pointed at the retired form, as it is now. */
const taskRow = blocks
  .find((b) => b.table === 'task_templates')!
  .rows.find((r) => /^\s*\('tt_hs'/.test(r))!
  .replace(/,\s*$/, '');

const taskHeader = blocks.find((b) => b.table === 'task_templates')!.header;

const sql = `-- ============================================================
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
-- ${counts.map(([t, n]) => `${n} ${t}`).join(', ')}.
--
-- The products hang off supplier 'sup_grimaldi' and the existing
-- shop categories, all of which predate this file. If any insert
-- fails on a foreign key, that is the thing to check first.
-- ------------------------------------------------------------

${parts.join('\n\n')}

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

${taskHeader}
${taskRow}
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
`;

writeFileSync(outPath, sql);

console.log(`Wrote ${outPath}`);
for (const [table, n] of counts) console.log(`  ${String(n).padStart(4)}  ${table}`);
