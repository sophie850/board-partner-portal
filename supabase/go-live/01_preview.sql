-- 1. What the clean-up will remove. Reads only, changes nothing.
--
-- Run this before 02 and read the counts. If anything here is a real
-- sponsor or a real supplier, stop.

select 'sponsor to delete'            as what,
       p.id                           as which,
       p.name                         as detail
  from partner_organisations p
 where p.id in ('part_a', 'part_b', 'part_c')

union all

select 'their people, deleted with them',
       u.id,
       u.name || ' · ' || u.email
  from partner_users u
 where u.partner_id in ('part_a', 'part_b', 'part_c')

union all

select 'their participation, deleted with them',
       ep.id,
       ep.reference
  from event_participations ep
 where ep.partner_id in ('part_a', 'part_b', 'part_c')

union all

select 'supplier to delete',
       s.id,
       s.name || ' · ' || coalesce(nullif(s.webhook_url, ''), 'no webhook')
  from suppliers s
 where s.id in ('sup_aztec', 'sup_ges', 'sup_popshap', 'sup_smr', 'sup_riviera')

union all

select 'its catalogue, deleted with it',
       pr.id,
       pr.name
  from products pr
 where pr.supplier_id in ('sup_aztec', 'sup_ges', 'sup_popshap', 'sup_smr', 'sup_riviera')

union all

select 'SUPPLIER KEPT — the venue is real',
       s.id,
       s.name || ' · ' || (select count(*) from products where supplier_id = s.id)::text || ' products kept'
  from suppliers s
 where s.id = 'sup_grimaldi'

 order by what, which;
