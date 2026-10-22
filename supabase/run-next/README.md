# Run these in order

Seven files, numbered. Open Supabase → **SQL Editor**, paste one file,
press Run, read what comes back, then move to the next.

**Every one is safe to run twice.** If you lose your place, run
`1_where_am_i.sql` again — it tells you which steps are still needed.
If you are unsure whether you already did something, just do it.

---

### 1 — `1_where_am_i.sql`
Reads only. Prints a list of the remaining steps and whether each is
`DONE` or `NEEDED`. **Start here, and come back to it whenever you
lose track.**

### 2 — `2_file_uploads.sql`
Creates the private bucket every upload goes into. Without it, any
file a partner sends you fails.
*You should see:* `INSERT 0 1`.

### 3 — `3_reminder_table.sql`
Creates the table that stops a partner being chased twice for the same
deadline. You are switching reminders off in step 6, but the table
needs to exist for when you switch them back on.
*You should see:* a notice reading `Row-level security enabled on every public table.`

### 4 — `4_submission_emails.sql`
Adds the column that holds who gets emailed when a form is submitted.
**Must come before step 7.**
*You should see:* the same row-level-security notice.

### 5 — `5_preview_the_clean_up.sql`
Reads only. Shows exactly what step 6 will delete.

**Stop and read this one.** You should see 3 test companies, their 4
people, their 3 participations, 5 fictional suppliers, their 12
catalogue lines, and one line confirming Grimaldi Forum is kept.
If anything in that list is real, **stop and tell me.**

### 6 — `6_clean_up.sql`
Removes the test companies and fictional suppliers, and switches the
two chasing emails off.

Supabase will warn you that this is destructive. **That warning is
correct** — go ahead only once step 5 showed you nothing real.

*You should see:* a small table reading `sponsors 0`, `suppliers 1`,
`products 9`, `reminders switched on 0`.

### 7 — `7_tell_anna.sql`
Points all eight Grimaldi forms at anna@boardsummits.com, so she gets
an email with the answers whenever one is submitted.
*You should see:* `UPDATE 8` the first time, `UPDATE 0` after that
(which means it was already done, not that it failed).

---

## Then run step 1 once more

Everything should read `DONE`. That is the whole list finished.

## What this does not do

- It does not send anything to anybody. Email still needs the
  `boardsummits.com` domain verified at Resend — until then nothing
  reaches any address but your own.
- It does not hide the shop. That is a switch on each partner's
  **Configure** screen in the portal, under **Modules**.
- It does not turn off `AUTH_DEV_SHOW_LINK`. That is an environment
  variable in Netlify, not something SQL can reach.
