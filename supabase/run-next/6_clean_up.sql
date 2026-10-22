-- STEP 6 of 7 — Remove the test data, switch reminders off
--
-- DESTRUCTIVE. Supabase will warn you. The warning is correct.
-- Run step 5 first and read what it returns.
--
-- Removes: the 3 test companies and their people, the 5 fictional
-- suppliers and their 12 catalogue lines. Switches the two chasing
-- emails off.
--
-- KEEPS: Grimaldi Forum (your real venue) and its 9 products,
-- Anna's 8 forms, the information sheets, and all history.
--
-- Safe to run twice.
--
-- ------------------------------------------------------------

delete from partner_organisations
 where id in ('part_a', 'part_b', 'part_c');

-- ------------------------------------------------------------
-- The five fictional suppliers, and their catalogue
--
-- Each still points at a placeholder Zapier hook and an address
-- ending .example, so an order placed against one reaches nobody.
-- Their products go too: a catalogue line whose supplier does not
-- exist is something a partner can put in a basket and nobody can
-- fulfil.
-- ------------------------------------------------------------

delete from products
 where supplier_id in ('sup_aztec', 'sup_ges', 'sup_popshap', 'sup_smr', 'sup_riviera');

delete from suppliers
 where id in ('sup_aztec', 'sup_ges', 'sup_popshap', 'sup_smr', 'sup_riviera');

-- ------------------------------------------------------------
-- Stop the reminders
--
-- The daily run reads these two templates and sends nothing at all
-- when both are switched off, so this is the whole off switch — the
-- schedule still fires, scans, finds both disabled and stops.
--
-- Reversible from Event settings when you want chasing back on.
-- Transactional email is untouched: a partner who submits a form
-- still gets told it arrived.
-- ------------------------------------------------------------

update email_templates
   set enabled = false,
       updated_at = now()
 where id in ('et_deadline', 'et_overdue');

-- ------------------------------------------------------------
-- What is left
-- ------------------------------------------------------------

select 'sponsors'            as what, count(*)::text as remaining from partner_organisations
union all
select 'suppliers',           count(*)::text from suppliers
union all
select 'products',            count(*)::text from products
union all
select 'reminders switched on',
       count(*)::text
  from email_templates
 where id in ('et_deadline', 'et_overdue') and enabled
 order by what;
