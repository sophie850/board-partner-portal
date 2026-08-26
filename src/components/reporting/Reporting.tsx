'use client';

import { Download } from 'lucide-react';

import { Button, Eyebrow, Panel, SectionTitle, StatusPill } from '@/components/ui/primitives';
import { downloadCsv, type CsvCell } from '@/lib/csv';

/* ============================================================
   Reporting

   Each figure on this page has an export beneath it, holding the
   rows the figure was calculated from. A number an organiser cannot
   take away and check is a number they have to trust.
   ============================================================ */

export interface Report {
  key: string;
  title: string;
  description: string;
  filename: string;
  headers: string[];
  rows: CsvCell[][];
  /** What is shown on the page above the export. */
  summary: Array<{ label: string; value: string; detail?: string; pct?: number }>;
}

export function Reporting({ reports }: { reports: Report[] }) {
  return (
    <div className="flex flex-col gap-8">
      {reports.map((report) => (
        <section key={report.key}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionTitle>{report.title}</SectionTitle>
              <p className="mt-1 max-w-[60ch] text-[12.5px] text-ink-4">
                {report.description}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={report.rows.length === 0}
              onClick={() => downloadCsv(report.filename, report.headers, report.rows)}
            >
              <Download size={13} />
              {report.rows.length === 0
                ? 'Nothing to export'
                : `Export ${report.rows.length} ${report.rows.length === 1 ? 'row' : 'rows'}`}
            </Button>
          </div>

          {report.summary.length === 0 ? (
            <Panel className="px-[20px] py-[16px] text-[13px] text-ink-4">
              {/* Some reports are row-level detail with nothing
                  meaningful to summarise — saying "no data" when
                  there are rows to export would be wrong. */}
              {report.rows.length > 0
                ? `Row-level detail — ${report.rows.length} ${report.rows.length === 1 ? 'row' : 'rows'} in the export.`
                : 'No data yet.'}
            </Panel>
          ) : (
            <Panel className="px-[6px] py-[6px]">
              {report.summary.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-wrap items-center gap-4 border-b border-line px-[16px] py-[13px] last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink">{row.label}</div>
                    {row.detail && (
                      <div className="mt-[2px] text-[11.5px] text-ink-4">{row.detail}</div>
                    )}
                  </div>

                  {row.pct !== undefined && (
                    <div className="flex w-[140px] shrink-0 items-center gap-3 max-md:w-[90px]">
                      <div className="h-[5px] flex-1 overflow-hidden rounded-pill bg-inset">
                        <div
                          className="h-full rounded-pill bg-accent"
                          style={{ width: `${Math.max(2, row.pct)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-[11.5px] text-ink-4">{row.pct}%</span>
                    </div>
                  )}

                  <div className="shrink-0 text-[13.5px] text-ink-2">{row.value}</div>
                </div>
              ))}
            </Panel>
          )}
        </section>
      ))}
    </div>
  );
}

/** The headline figures, above the reports. */
export function Headlines({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: 'good' | 'warn' }>;
}) {
  return (
    <div className="mb-9 grid grid-cols-4 gap-3 max-md:grid-cols-2">
      {items.map((item) => (
        <Panel key={item.label} className="px-[18px] py-[16px]">
          <Eyebrow className="mb-2 tracking-[0.1em]">{item.label}</Eyebrow>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-light text-ink">{item.value}</span>
            {item.tone === 'warn' && <StatusPill tone="warn">Check</StatusPill>}
          </div>
        </Panel>
      ))}
    </div>
  );
}
