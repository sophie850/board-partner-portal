/**
 * BOARD Partner Portal — the spreadsheet end of the export.
 *
 * Paste this into the Apps Script editor of the Google Sheet you
 * want the portal to write to, set SECRET below, and deploy it as a
 * web app. Setting it up is five minutes and is written out in
 * docs/sheets-export.md.
 *
 * What it does: accepts one signed POST carrying the whole workbook,
 * and replaces each named tab with what it was given. Tabs it has
 * never seen are created. Tabs the portal did not send are left
 * alone, so anything you keep in this spreadsheet of your own
 * survives an export.
 *
 * It verifies an HMAC-SHA256 signature over `timestamp.body` before
 * writing anything, so the deployment URL leaking is not enough on
 * its own to let somebody overwrite your records.
 */

/** Must match SHEETS_WEBHOOK_SECRET in Netlify. Generate with: openssl rand -base64 32 */
const SECRET = 'PASTE_THE_SAME_SECRET_HERE';

/** Reject anything older than this, so a captured request cannot be replayed. */
const MAX_AGE_SECONDS = 600;

function doPost(e) {
  try {
    const body = e.postData.contents;
    const timestamp = headerOf(e, 'x-board-timestamp');
    const signature = headerOf(e, 'x-board-signature');

    if (!timestamp || !signature) return reply(false, 'Missing signature headers');

    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!isFinite(age) || age > MAX_AGE_SECONDS) return reply(false, 'Stale request');

    if (!signatureMatches(SECRET, timestamp, body, signature)) {
      return reply(false, 'Bad signature');
    }

    const payload = JSON.parse(body);
    const tabs = payload.tabs || [];
    const book = SpreadsheetApp.getActiveSpreadsheet();
    const written = [];

    for (let i = 0; i < tabs.length; i++) {
      written.push(writeTab(book, tabs[i]));
    }

    return reply(true, 'Written', written);
  } catch (err) {
    return reply(false, String(err));
  }
}

/** One tab, replaced. */
function writeTab(book, tab) {
  const rows = tab.rows || [];
  const header = tab.header || [];
  const width = Math.max(header.length, 1);

  let sheet = book.getSheetByName(tab.name);
  if (!sheet) sheet = book.insertSheet(tab.name);

  sheet.clear();

  // Everything in one write. Cell-by-cell is what turns a thousand
  // rows into a six-minute timeout.
  const grid = [header].concat(
    rows.map(function (r) {
      const padded = r.slice(0, width);
      while (padded.length < width) padded.push('');
      // Leading = or + would be read as a formula, and an answer
      // beginning with one is a partner's text, not a calculation.
      return padded.map(function (cell) {
        const s = cell === null || cell === undefined ? '' : String(cell);
        return /^[=+\-@]/.test(s) ? "'" + s : s;
      });
    }),
  );

  sheet.getRange(1, 1, grid.length, width).setValues(grid);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.setFrozenRows(1);

  return { name: tab.name, rows: rows.length };
}

function headerOf(e, name) {
  const headers = (e && e.headers) || {};
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() === name) return headers[keys[i]];
  }
  // Apps Script has exposed request headers under different shapes
  // over the years. Parameters are the documented fallback.
  return (e && e.parameter && e.parameter[name]) || '';
}

function signatureMatches(secret, timestamp, body, given) {
  const bytes = Utilities.computeHmacSha256Signature(timestamp + '.' + body, secret);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = (bytes[i] < 0 ? bytes[i] + 256 : bytes[i]).toString(16);
    hex += b.length === 1 ? '0' + b : b;
  }

  if (hex.length !== given.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function reply(ok, message, tabs) {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: ok, message: message, tabs: tabs || [] }),
  ).setMimeType(ContentService.MimeType.JSON);
}
