/* ============================================================
   CSV

   Written by hand rather than pulled in as a dependency: the whole
   format is quoting, and the rules below are the whole of it.
   ============================================================ */

export type CsvCell = string | number | null | undefined;

/**
 * Quote one cell.
 *
 * Everything is quoted rather than only what needs it — a reference
 * like `BO-2027-00018` is safe unquoted, but deciding case by case
 * is how a comma in a partner's name ends up splitting a column.
 */
function cell(value: CsvCell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers.map(cell).join(','), ...rows.map((r) => r.map(cell).join(','))];
  // CRLF, which is what the spec says and what Excel expects.
  return lines.join('\r\n');
}

/**
 * Hand a CSV to the browser as a download.
 *
 * The BOM is there so Excel reads it as UTF-8; without it, a partner
 * name with an accent in it arrives mangled.
 */
export function downloadCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const blob = new Blob(['﻿', toCsv(headers, rows)], {
    type: 'text/csv;charset=utf-8',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
