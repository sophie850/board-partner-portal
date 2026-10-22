-- STEP 8 — The address partners are told to contact
--
-- Changes what the portal sidebar shows under "Need help? Contact".
--
-- It does NOT change the From address on outgoing email. Those were
-- the same field until now, which is why the sidebar was showing
-- onboarding@resend.dev: that address was set so Resend would accept
-- sends while the domain was being verified, and the sidebar had no
-- choice but to show it.
--
-- Safe to run twice.
--
-- ------------------------------------------------------------

update events
   set sender = coalesce(sender, '{}'::jsonb)
                || jsonb_build_object('supportEmail', 'anna@boardsummits.com'),
       updated_at = now()
 where sender ->> 'supportEmail' is distinct from 'anna@boardsummits.com';

-- What each address is now doing.

select sender ->> 'email'                                  as from_address_resend_must_accept,
       coalesce(sender ->> 'supportEmail', sender ->> 'email') as shown_to_partners
  from events;
