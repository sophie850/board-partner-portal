'use server';

import { revalidatePath } from 'next/cache';

import { guardOrganiser } from '@/lib/auth/session';
import { requireSupabase } from '@/lib/db/client';
import { fileToRow } from '@/lib/db/mappers';
import { getDbOrError, mintId } from '@/lib/db/store';
import { removeFile, storageKeyFrom } from '@/lib/storage';
import type { FileAsset, Id, VisibilityRule } from '@/lib/types';

/* ============================================================
   The file library — write operations

   Floor plans, brand assets, technical specifications: everything
   the BOARD team hands out rather than asks for. The visibility
   rule is the whole point — a stand build spec is no use to a
   partner without exhibition space, and an early draft of the
   floor plan reaching the wrong people costs somebody a morning.

   Gated on the Content permission rather than one of its own.
   Publishing a document to partners and publishing a page to
   partners are the same job, and inventing a twelfth permission to
   split them would be a schema change for no gain.
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface FileInput {
  id?: Id;
  name: string;
  kind: string;
  size: string;
  url?: string | null;
  visibility: VisibilityRule;
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateFiles() {
  revalidatePath('/organiser/files');
  revalidatePath('/organiser/entitlements');
  // Partners read the same rows on their Files screen.
  revalidatePath('/portal', 'layout');
}

/** Create or update one library file. */
export async function saveFile(input: FileInput): Promise<ActionResult> {
  const refused = await guardOrganiser('content');
  if (refused) return refused;

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Give the file a name before saving.' };

  const kind = input.kind.trim();
  if (!kind) return { ok: false, error: 'Say what kind of file this is.' };

  const rule = input.visibility ?? { type: 'all' };
  if (rule.type === 'entitlement' && !(rule.keys ?? []).length) {
    return { ok: false, error: 'Choose at least one entitlement, or set it to all partners.' };
  }
  if (rule.type === 'partner' && !(rule.partners ?? []).length) {
    return { ok: false, error: 'Choose at least one partner, or the file reaches nobody.' };
  }

  const id = input.id ?? mintId('file');

  const asset: FileAsset = {
    id,
    eventId: EVENT_ID,
    name,
    kind,
    size: input.size.trim(),
    url: input.url ?? undefined,
    visibility: rule,
  };

  try {
    const { error } = await requireSupabase()
      .from('files')
      .upsert(fileToRow(asset), { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the file.' };
  }

  revalidateFiles();
  return { ok: true, id };
}

/**
 * Remove a file from the library, and from storage with it.
 *
 * The stored object goes too — an unlisted file still sitting on a
 * public URL is exactly the thing an organiser thinks they have
 * deleted. If the object cannot be removed the row still goes: a
 * listed file nobody can reach is worse than an orphaned object,
 * which costs only disk.
 */
export async function deleteFile(id: Id): Promise<ActionResult> {
  const refused = await guardOrganiser('content');
  if (refused) return refused;

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;

  const existing = loaded.db.files.find((f) => f.id === id);

  try {
    const { error } = await requireSupabase().from('files').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };

    const key = storageKeyFrom(existing?.url);
    if (key) await removeFile(key);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the file.' };
  }

  revalidateFiles();
  return { ok: true, id };
}
