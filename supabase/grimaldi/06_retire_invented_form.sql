-- 6. Retire the Health & safety declaration BOARD invented
--
-- Forms 6.6 and 6.8 are the real thing. The task that pointed at
-- the invented form now points at 6.8, any answers already given
-- are carried across rather than dropped, and only then is the
-- form deleted.
--
-- Run this only after parts 1 to 5, which is where 6.8 comes from.
-- Safe to run twice.

insert into task_templates ("id", "event_id", "title", "description", "category", "module", "priority", "required", "due_date", "requires", "link_type", "link_target", "instructions", "attachments") values
  ('tt_hs', 'board_monaco_2027', 'Complete the venue safety questionnaire', '', 'Exhibition', 'forms', 'high', true, '2027-02-14', '{"has_raw_space"}', 'form', 'gf_safety', 'Grimaldi Forum Form 6.8. R'
    'equired before any build can begin on a raw-space stand.', '{}')
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
delete from forms where id = 'f_hs';
