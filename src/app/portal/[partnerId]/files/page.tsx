import { FolderOpen } from 'lucide-react';
import { notFound } from 'next/navigation';

import {
  FileLibrary,
  RequestedFiles,
  type LibraryFile,
  type RequestedSlot,
} from '@/components/files/RequestedFiles';
import {
  EmptyState,
  Eyebrow,
  PageTitle,
  Rise,
  SectionTitle,
} from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { fmtDate, fmtDateTime, isOverdue, ruleMatches, terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function PartnerFiles({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const lead = db.partnerUsers.find((u) => u.id === part.leadUserId);

  const slots: RequestedSlot[] = (part.requestedFiles ?? []).map((f) => ({
    id: f.id,
    label: f.label,
    dueLabel: f.due ? fmtDate(f.due) : null,
    // A slot that has been filled is never overdue, whenever it arrived.
    overdue: isOverdue(f.due, Boolean(f.file)),
    required: f.required,
    file: f.file
      ? {
          name: f.file.name,
          url: f.file.url ?? '',
          uploadedLabel: fmtDateTime(f.file.uploadedAt),
          by: f.file.by,
        }
      : null,
  }));

  /*
   * The library is filtered here rather than in the browser. A file
   * restricted to sponsors should not be listed for an exhibitor at
   * all, even greyed out.
   */
  const library: LibraryFile[] = db.files
    .filter((f) => ruleMatches(db, f.visibility, part))
    .map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      size: f.size,
      url: f.url ?? null,
    }));

  const outstanding = slots.filter((s) => !s.file && s.required).length;

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Files &amp; assets</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        What the BOARD team needs from you, and everything they have made available to you.
        {outstanding > 0 &&
          ` ${outstanding} ${outstanding === 1 ? 'file is' : 'files are'} still needed.`}
      </p>

      {slots.length > 0 && (
        <section className="mb-9">
          <SectionTitle className="mb-3">Files we need from you</SectionTitle>
          <RequestedFiles
            partnerId={partnerId}
            slots={slots}
            uploadedBy={lead?.name ?? 'Partner'}
          />
        </section>
      )}

      <section>
        <SectionTitle className="mb-3">Available to download</SectionTitle>
        {library.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={22} />}
            title="Nothing to download yet"
            body="Floor plans, brand assets and technical specifications appear here as the BOARD team publishes them."
          />
        ) : (
          <FileLibrary files={library} />
        )}
      </section>

      {slots.length === 0 && library.length === 0 && (
        <p className="mt-6 text-[12.5px] text-ink-4">
          If you were expecting something here, your BOARD contact can check what your
          participation includes.
        </p>
      )}
    </Rise>
  );
}
