-- 3. Tell Anna when a venue form comes in
--
-- Run migrations/0007_form_notifications.sql first — it adds the
-- column this sets.
--
-- Until now a submitted form told the partner it had arrived and
-- told nobody at BOARD. The answers sat in the organiser's Forms
-- screen waiting to be noticed, which is fine for a form somebody is
-- watching and useless for a venue questionnaire with a return date.
--
-- Safe to run twice. Changeable afterwards per form, on the form's
-- own edit screen, without coming back here.

update forms
   set notify_emails = array['anna@boardsummits.com'],
       updated_at    = now()
 where id in (
   'gf_exhibitor',   -- 6.1  Exhibitor information
   'gf_payment',     -- 6.3  Payment
   'gf_additional',  -- 6.4  Additional services
   'gf_diagram',     -- 6.5  Stand diagram
   'gf_security',    -- 6.6  Security
   'gf_equipment',   -- 6.7  Equipment
   'gf_safety',      -- 6.8  Safety
   'gf_wideload'     -- 2.3  Wide load
 )
   and not (notify_emails @> array['anna@boardsummits.com']);

-- What is now set, and what is still silent.

select case when cardinality(notify_emails) = 0
            then 'nobody is told'
            else array_to_string(notify_emails, ', ')
       end                                   as told_on_submission,
       count(*)                              as forms,
       string_agg(id, ', ' order by id)      as which
  from forms
 group by 1
 order by 1;
