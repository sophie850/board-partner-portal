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

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const seedPath = join(root, 'supabase', 'SEED_SUPABASE.sql');
const outPath = join(root, 'supabase', 'APPLY_GRIMALDI_FORUM.sql');
const partsDir = join(root, 'supabase', 'grimaldi');

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

/**
 * The longest line we are willing to emit.
 *
 * 194 is the longest line in APPLY_TO_SUPABASE.sql, which is the one
 * file this database is known to have accepted through the Supabase
 * SQL console. One content page's blocks run to 3,630 characters on
 * a single line, which is the only structural difference left
 * between what works and what does not, so it goes.
 */
const MAX_LINE = 200;

/**
 * Break over-long lines without changing a single byte of data.
 *
 * Two string constants separated by whitespace containing at least
 * one newline are concatenated by PostgreSQL — standard SQL, and the
 * reason this is a reformatting rather than an edit. No operator is
 * introduced and no value changes: 'abc' newline 'def' *is* 'abcdef'
 * as far as the parser is concerned.
 *
 * Only breaks inside a string literal, and never between the two
 * halves of a doubled quote, which is how a literal escapes one.
 */
function wrap(sql: string): string {
  return sql
    .split('\n')
    .map((line) => (line.length <= MAX_LINE ? line : breakUp(line)))
    .join('\n');
}

function breakUp(line: string): string {
  // A comment cannot be broken this way, and none of ours is long.
  if (line.trimStart().startsWith('--')) return line;

  let out = '';
  let since = 0;
  let inString = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === "'") {
      if (inString && line[i + 1] === "'") {
        // An escaped quote. Both halves travel together.
        out += "''";
        since += 2;
        i += 1;
        continue;
      }
      inString = !inString;
      out += ch;
      since += 1;
      continue;
    }

    out += ch;
    since += 1;

    if (inString && since >= MAX_LINE) {
      out += "'\n    '";
      since = 6;
    }
  }

  return out;
}

const blocks = blocksOf(readFileSync(seedPath, 'utf8'));
/** One ready-to-run insert per table, keyed by table. */
const sections: Record<string, string> = {};
const counts: Array<[string, number]> = [];

for (const table of ORDER) {
  const block = blocks.find((b) => b.table === table);
  if (!block) throw new Error(`The seed has no ${table} block — has its shape changed?`);

  const rows = block.rows.filter((r) => WANTED[table].test(r));
  if (!rows.length) throw new Error(`No ${table} rows matched. Refusing to write a file that does nothing.`);

  counts.push([table, rows.length]);

  // The last row carries a comma from the seed; it must not here.
  const body = rows.map((r) => r.replace(/,\s*$/, '')).join(',\n');
  sections[table] = wrap(`${block.header}\n${body}\n${block.tail}`);
}

/** The task template that pointed at the retired form, as it is now. */
const taskRow = blocks
  .find((b) => b.table === 'task_templates')!
  .rows.find((r) => /^\s*\('tt_hs'/.test(r))!
  .replace(/,\s*$/, '');

const taskHeader = blocks.find((b) => b.table === 'task_templates')!.header;

/**
 * Everything the invented form's retirement involves.
 *
 * Shared verbatim between the one-file version and the pieces, so
 * the two cannot say different things.
 *
 * jsonb_exists() rather than the question-mark operator throughout:
 * the two mean the same thing to PostgreSQL, but a bare question
 * mark is a bind placeholder to a great many database clients, and
 * the function form cannot be mistaken for anything.
 */
const retirement = wrap(`${taskHeader}
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

-- Carry across answers already given, so a partner who filled the
-- old form in is not asked the same questions twice.
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

-- Last, because deleting the form takes its fields with it.
delete from form_fields where form_id = 'f_hs';
delete from forms where id = 'f_hs';`);

/** Who has raw space. Reads only. */
const listing = `select p.name                                            as partner,
       ep.reference,
       ep.stand_ref,
       ep.added_entitlements @> array['has_raw_space']    as has_raw_space
  from event_participations ep
  join partner_organisations p on p.id = ep.partner_id
 order by p.name;`;

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

-- ------------------------------------------------------------
-- 1. What is new
--
-- ${counts.map(([t, n]) => `${n} ${t}`).join(', ')}.
--
-- The products hang off supplier 'sup_grimaldi' and the existing
-- shop categories, all of which predate this file. If any insert
-- fails on a foreign key, that is the thing to check first.
-- ------------------------------------------------------------

${ORDER.map((t) => sections[t]).join('\n\n')}

-- ------------------------------------------------------------
-- 2. Retire the form BOARD invented, and re-point its task
--
-- 'tt_hs' asked for a Health & safety declaration written before
-- Anna's pack arrived. Forms 6.6 and 6.8 are the real thing, so the
-- task now sends partners to 6.8 and applies only to raw space.
--
-- These are updates and deletes, which is exactly what the seed
-- could not do. Note the first overwrites any wording the BOARD team
-- has edited on this task in the organiser portal — it has to,
-- because the form it used to point at is deleted below.
-- ------------------------------------------------------------

${retirement}

-- ------------------------------------------------------------
-- 3. Who has raw space
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

${listing}
`;

writeFileSync(outPath, sql);

console.log(`Wrote ${outPath}`);
for (const [table, n] of counts) console.log(`  ${String(n).padStart(4)}  ${table}`);

/* ------------------------------------------------------------
   The same thing, in pieces.

   One 41 KB paste is a single point of failure: when a console
   refuses it, there is nothing in the error to say which part it
   objected to. These are small enough to paste by hand and run one
   at a time, so a failure names itself.

   Each is independently idempotent and they go in order — a form's
   fields cannot land before the form.
   ------------------------------------------------------------ */

mkdirSync(partsDir, { recursive: true });

const PART_NOTES: Record<string, string> = {
  entitlements:
    'Raw space, as a thing a partner can have. Nothing is granted here — see part 7.',
  forms: 'The eight venue forms, numbered as the Grimaldi Forum numbers them.',
  form_fields: 'Their questions. The largest part by far, and the slowest to run.',
  products: 'Form 6.2, which is a catalogue with a quantity box, so it lives in the Shop.',
  content_pages: 'The exhibitor information sheets.',
};

const parts: Array<[string, string]> = [];

ORDER.forEach((table, i) => {
  const n = counts.find(([t]) => t === table)![1];
  parts.push([
    `${String(i + 1).padStart(2, '0')}_${table}.sql`,
    `-- ${i + 1}. ${table} — ${n} row${n === 1 ? '' : 's'}\n--\n-- ${PART_NOTES[table]}\n-- Safe to run twice.\n\n${sections[table]}\n`,
  ]);
});

parts.push([
  '06_retire_invented_form.sql',
  `-- 6. Retire the Health & safety declaration BOARD invented\n` +
    `--\n` +
    `-- Forms 6.6 and 6.8 are the real thing. The task that pointed at\n` +
    `-- the invented form now points at 6.8, any answers already given\n` +
    `-- are carried across rather than dropped, and only then is the\n` +
    `-- form deleted.\n` +
    `--\n` +
    `-- Run this only after parts 1 to 5, which is where 6.8 comes from.\n` +
    `-- Safe to run twice.\n\n${retirement}\n`,
]);

parts.push(['07_who_has_raw_space.sql', `-- 7. Where everyone stands. Changes nothing.\n\n${listing}\n`]);

parts.push([
  '00_canary.sql',
  `-- Run this first, on its own.\n` +
    `--\n` +
    `-- If this fails with "syntax error at end of input" then the\n` +
    `-- console is not receiving the SQL at all, and nothing about the\n` +
    `-- other files will fix it.\n\n` +
    `select 'the editor is receiving SQL' as canary;\n`,
]);

for (const [name, body] of parts) writeFileSync(join(partsDir, name), body);

console.log(`\nWrote ${parts.length} pieces to ${partsDir}`);
for (const [name] of parts.sort()) console.log(`  ${name}`);
