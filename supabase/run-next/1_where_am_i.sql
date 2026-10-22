-- STEP 1 of 7 — Where am I?
--
-- Reads only. Changes nothing. Safe to run at any time, as often as
-- you like.
--
-- Run this first. It tells you which of the remaining steps still
-- need doing, so you never have to remember or guess. Run it again
-- after each step to watch the list turn to DONE.

select '2'                                            as step,
       'File uploads (storage bucket)'                 as what,
       case when exists (select 1 from storage.buckets where id = 'board-assets')
            then 'DONE' else 'NEEDED' end              as state

union all

select '3',
       'Reminder table (reminder_claims)',
       case when to_regclass('public.reminder_claims') is not null
            then 'DONE' else 'NEEDED' end

union all

select '4',
       'Submission emails (notify_emails column)',
       case when exists (
              select 1 from information_schema.columns
               where table_schema = 'public'
                 and table_name   = 'forms'
                 and column_name  = 'notify_emails')
            then 'DONE' else 'NEEDED' end

union all

select '6',
       'Test companies removed',
       case when (select count(*) from partner_organisations
                   where id in ('part_a', 'part_b', 'part_c')) = 0
            then 'DONE'
            else (select count(*)::text from partner_organisations
                   where id in ('part_a', 'part_b', 'part_c')) || ' still there' end

union all

select '6',
       'Fictional suppliers removed',
       case when (select count(*) from suppliers
                   where id in ('sup_aztec','sup_ges','sup_popshap','sup_smr','sup_riviera')) = 0
            then 'DONE'
            else (select count(*)::text from suppliers
                   where id in ('sup_aztec','sup_ges','sup_popshap','sup_smr','sup_riviera')) || ' still there' end

union all

select '6',
       'Reminders switched off',
       case when (select count(*) from email_templates
                   where id in ('et_deadline','et_overdue') and enabled) = 0
            then 'DONE' else 'still ON' end

union all

-- to_jsonb on the row rather than naming the column, so this still
-- runs before step 4 has added it.
select '7',
       'Anna told about venue forms',
       case when (select count(*) from forms f
                   where jsonb_exists(to_jsonb(f), 'notify_emails')
                     and to_jsonb(f)->>'notify_emails' like '%anna@boardsummits.com%') = 8
            then 'DONE'
            else 'NEEDED' end

 order by step, what;
