import { notFound } from 'next/navigation';

import { TaskEditor } from '@/components/tasks/TaskEditor';
import { getDb } from '@/lib/db/store';

import { deleteTask, saveTask } from '../actions';

export const dynamic = 'force-dynamic';

/** `/organiser/tasks/new` creates; `/organiser/tasks/<id>` edits. */
export default async function TaskEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await getDb();

  const isNew = id === 'new';
  const task = isNew ? null : (db.taskTemplates.find((t) => t.id === id) ?? null);

  if (!isNew && !task) notFound();

  return (
    <TaskEditor
      task={task}
      entitlements={db.entitlements}
      forms={db.forms}
      pages={db.contentPages}
      requestTypes={db.requestTypes}
      shopCategories={db.shopCategories}
      onSave={saveTask}
      onDelete={isNew ? undefined : deleteTask}
    />
  );
}
