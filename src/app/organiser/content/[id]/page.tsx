import { notFound } from 'next/navigation';

import { ContentEditor } from '@/components/content/ContentEditor';
import { getDb } from '@/lib/db/store';

import { deleteContentPage, saveContentPage } from '../actions';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * One route serves both create and edit: `/organiser/content/new`
 * falls through to `[id]` with the literal id "new". Keeping it as a
 * single route means the editor has one code path, and a draft URL
 * is shareable and refresh-safe rather than trapped in a modal.
 */
export default async function ContentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('content', '/organiser/content/[id]');

  const { id } = await params;
  const db = await getDb();

  const isNew = id === 'new';
  const page = isNew ? null : (db.contentPages.find((p) => p.id === id) ?? null);

  if (!isNew && !page) notFound();

  return (
    <ContentEditor
      page={page}
      categories={db.contentCategories}
      entitlements={db.entitlements}
      partners={db.partners}
      onSave={saveContentPage}
      onDelete={isNew ? undefined : deleteContentPage}
    />
  );
}
