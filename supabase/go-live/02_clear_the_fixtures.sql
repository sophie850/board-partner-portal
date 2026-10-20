-- 2. Clear the fixtures, and stop the chasing
--
-- Run 01_preview.sql first and read what it returns.
--
-- DESTRUCTIVE. The console will warn you, and it is right to.
-- Safe to run twice.
--
-- Three things, in an order that matters: the sponsors go first
-- because order_items hold their suppliers with "on delete restrict",
-- so a supplier cannot be removed while a fixture order still points
-- at it.
--
-- Grimaldi Forum is deliberately kept. It is the venue, not a
-- fixture, and it carries the nine real catalogue lines including
-- the six from Anna's Form 6.2.

-- ------------------------------------------------------------
-- The three fictional sponsors
--
-- Everything hanging off them goes with them: their people, their
-- participation, package lines, file requests, price overrides,
-- orders and requests all cascade. Audit entries and sent email
-- survive with the partner column emptied, so the history of what
-- was done is not rewritten.
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
