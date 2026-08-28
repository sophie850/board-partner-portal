import { FolderOpen } from 'lucide-react';

import { LibraryManager, type LibraryRow } from '@/components/files/LibraryManager';
import { Eyebrow, EmptyState, PageTitle, Rise } from '@/components/ui/primitives';
import { requireArea } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { visibilityLabel } from '@/lib/resolvers';

/**
 * The file library.
 *
 * Gated on Content — publishing a document to partners and
 * publishing a page to partners are the same job, and whoever is
 * trusted with one is trusted with the other.
 */
export const dynamic = 'force-dynamic';

export default async function OrganiserFiles() {
  await requireArea('content', '/organiser/files');

  const db = await getDb();

  const files: LibraryRow[] = [...db.files]
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))
    .map((f) => ({ ...f, reach: visibilityLabel(db, f.visibility) }));

  const restricted = files.filter(
    (f) => f.visibility && f.visibility.type && f.visibility.type !== 'all',
  ).length;

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>File library</PageTitle>
      <p className="mt-2 mb-6 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything you make available for partners to download. Each file carries a
        visibility rule, so a stand build specification reaches the partners with
        exhibition space and nobody else.
      </p>

      {files.length > 0 && (
        <div className="mb-6 flex gap-5 text-[12.5px] text-ink-4">
          <span>
            <span className="text-ink">{files.length}</span>{' '}
            {files.length === 1 ? 'file' : 'files'}
          </span>
          {restricted > 0 && (
            <span>
              <span className="text-ink">{restricted}</span> restricted
            </span>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} />}
          title="Nothing in the library yet"
          body="Start with what every partner needs — the event logo pack and the marketing toolkit — then add the floor plan and build specifications gated to partners with exhibition space."
        />
      ) : null}

      <LibraryManager
        files={files}
        entitlements={db.entitlements}
        partners={db.partners}
      />
    </Rise>
  );
}
