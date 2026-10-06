-- Optional. Reads only, changes nothing.
--
-- Run this before 06 to see exactly what 06 will touch. Three rows
-- come back, one per thing at risk.

select 'form to be deleted' as what,
       id                   as which,
       title                as detail
  from forms
 where id = 'f_hs'

union all

select 'its fields, deleted with it',
       id,
       label
  from form_fields
 where form_id = 'f_hs'

union all

select 'task to be re-pointed',
       id,
       'currently sends partners to: ' || coalesce(link_target, 'nothing')
  from task_templates
 where id = 'tt_hs'

union all

select 'answers to be carried across to 6.8',
       ep.id,
       p.name
  from event_participations ep
  join partner_organisations p on p.id = ep.partner_id
 where jsonb_exists(ep.form_state, 'f_hs')

order by what, which;
