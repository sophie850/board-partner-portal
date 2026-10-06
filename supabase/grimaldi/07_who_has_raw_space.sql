-- 7. Where everyone stands. Changes nothing.

select p.name                                            as partner,
       ep.reference,
       ep.stand_ref,
       ep.added_entitlements @> array['has_raw_space']    as has_raw_space
  from event_participations ep
  join partner_organisations p on p.id = ep.partner_id
 order by p.name;
