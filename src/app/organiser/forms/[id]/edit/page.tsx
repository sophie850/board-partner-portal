import { notFound } from 'next/navigation';

import { FormBuilder } from '@/components/forms/FormBuilder';
import { getDb } from '@/lib/db/store';

import { deleteForm, saveForm } from '../../actions';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** `/organiser/forms/new/edit` creates; `/organiser/forms/<id>/edit` edits. */
export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireArea('forms', '/organiser/forms/[id]/edit');

  const { id } = await params;
  const db = await getDb();

  const isNew = id === 'new';
  const form = isNew ? null : (db.forms.find((f) => f.id === id) ?? null);

  if (!isNew && !form) notFound();

  return (
    <FormBuilder
      form={form}
      entitlements={db.entitlements}
      partners={db.partners}
      onSave={saveForm}
      onDelete={isNew ? undefined : deleteForm}
    />
  );
}
