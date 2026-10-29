-- STEP 9 — The three email addresses, set correctly
--
-- Now that partners.boardsummits.com is verified at Resend.
--
--   From        anna@partners.boardsummits.com   — must be on the
--               verified domain, or Resend refuses to send at all
--   Replies to  anna@boardsummits.com            — a mailbox
--               somebody actually reads
--   Shown as    anna@boardsummits.com            — the "Need help?"
--               line in every partner's sidebar
--
-- Safe to run twice.
--
-- ------------------------------------------------------------

update events
   set sender = coalesce(sender, '{}'::jsonb)
                || jsonb_build_object(
                     'email',        'anna@partners.boardsummits.com',
                     'replyTo',      'anna@boardsummits.com',
                     'supportEmail', 'anna@boardsummits.com'
                   ),
       updated_at = now()
 where coalesce(sender ->> 'email', '')        is distinct from 'anna@partners.boardsummits.com'
    or coalesce(sender ->> 'replyTo', '')      is distinct from 'anna@boardsummits.com'
    or coalesce(sender ->> 'supportEmail', '') is distinct from 'anna@boardsummits.com';

select sender ->> 'email'        as sent_from,
       sender ->> 'replyTo'      as replies_go_to,
       sender ->> 'supportEmail' as shown_to_partners,
       sender ->> 'name'         as from_name
  from events;
