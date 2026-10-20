# The Google Sheets snapshot

A copy of everything partners have given us, in a spreadsheet, outside
the portal and outside Supabase — so losing either does not lose the
answers people spent a fortnight collecting.

It runs nightly at 02:00 UTC and can be run by hand at any time.

## What lands in the sheet

One tab each, replaced in full on every run:

| Tab | One row per |
|---|---|
| **Partners** | partner — package, stand, lead, whether they have signed in |
| **Form answers** | *answer* — partner, form, question, answer, status |
| **Tasks** | task — what is outstanding, done, or marked not needed |
| **Orders** | order line — product, supplier, quantity, price |
| **Requests** | request raised, with its answers and status |
| **Files** | file asked for, whether it arrived, and a link to it |
| **Team** | person, with their role and whether they have accepted |
| **About** | when the export ran |

Tabs you add yourself are left alone. Only the eight above are touched,
so this can live in a spreadsheet you already use.

### Why answers are one per row

Forms gain and lose questions constantly. A column per question either
breaks or — worse — silently shifts everybody's data one column left the
day somebody reorders a question, and nobody notices until the data is
needed. One row per answer survives all of it, and a pivot table turns
it back into a grid whenever a human wants one.

### Why a snapshot, not a feed

Every run sends the whole picture and replaces the tabs, rather than
appending each submission as it happens. A feed sounds more responsive
and is worse for this job: one failed POST goes missing permanently and
nobody finds out until the backup is needed. A snapshot that fails
tonight is simply correct again tomorrow. It also keeps up with edits,
reviews and withdrawals, which an append-only log never does.

## Setting it up

About five minutes, once.

**1. Make the spreadsheet.** A new Google Sheet, named whatever you
like. Nothing needs to be in it.

**2. Add the script.** In that sheet: **Extensions → Apps Script**.
Delete whatever is in the editor and paste the contents of
[`sheets-apps-script.gs`](./sheets-apps-script.gs).

**3. Generate a secret** and put it in two places. In a terminal:

```
openssl rand -base64 32
```

Paste what it **prints** — not the command — into the `SECRET` line at
the top of the script, and save.

**4. Deploy it.** **Deploy → New deployment → Web app**.

- *Execute as*: **Me**
- *Who has access*: **Anyone**

"Anyone" is the part people get wrong, and it is what makes the POST
reach the script rather than a Google sign-in page. It is not as open as
it sounds: the URL is unguessable and the script verifies a signature
before it writes anything, so holding the URL alone is not enough.

Copy the deployment URL — it ends `/exec`.

**5. Tell the portal.** In Netlify → Site configuration → Environment
variables:

| Variable | Value |
|---|---|
| `SHEETS_WEBHOOK_URL` | the `/exec` deployment URL |
| `SHEETS_WEBHOOK_SECRET` | the same secret you pasted into the script |

Redeploy. Netlify bakes environment variables in at deploy time, so a
new variable does nothing until the next build.

**6. Run it once by hand** to prove it works, replacing the two values:

```
curl -X POST https://board-partner-portal.netlify.app/api/cron/sheets \
  -H "authorization: Bearer YOUR_CRON_SECRET"
```

A good run answers with the tab names and row counts. Anything else
says what went wrong, and the commonest answer names the deployment
access level above.

## Running it

- **Nightly**, at 02:00 UTC, by `netlify/functions/sheets-export.mts`.
- **By hand**, with the `curl` above, whenever you want the sheet
  brought up to date — before a meeting, or after a batch of
  submissions.

Running it twice changes nothing: it replaces the tabs with the current
picture either way.

## What it is not

It is a **copy**, not a sync. Editing the sheet changes nothing in the
portal, and your edits are overwritten on the next run. If you want to
work in the sheet, work in a copy of it or in a tab of your own.

It contains **personal data** — names, email addresses, telephone
numbers and whatever partners have written in their answers. Share it
the way you would share any file holding those.
