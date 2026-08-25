'use server';

import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import { contentPageToRow } from '@/lib/db/mappers';
import { mintId } from '@/lib/db/store';
import type { ContentBlock, ContentPage, Id, VisibilityRule } from '@/lib/types';

/* ============================================================
   Content — write operations

   Server actions, so the secret key stays on the server and the
   browser never holds database credentials. Every action revalidates
   the affected paths, so an edit is visible immediately in both the
   organiser list and the partner-facing information centre.
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface ContentPageInput {
  id?: Id;
  title: string;
  categoryId: Id;
  blocks: ContentBlock[];
  body: string;
  cover?: string | null;
  visibility: VisibilityRule;
  requireAck: boolean;
  published: boolean;
}

export type ActionResult =
  | { ok: true; id: Id }
  | { ok: false; error: string };

function revalidateContent(id?: Id) {
  revalidatePath('/organiser/content');
  if (id) revalidatePath(`/organiser/content/${id}`);
  // The partner-facing information centre reads the same rows.
  revalidatePath('/portal', 'layout');
}

/** Create or update a page. */
export async function saveContentPage(input: ContentPageInput): Promise<ActionResult> {
  const title = input.title.trim();
  if (!title) return { ok: false, error: 'Give the page a title before saving.' };
  if (!input.categoryId) return { ok: false, error: 'Choose a category for the page.' };

  const id = input.id ?? mintId('pg');

  const page: ContentPage = {
    id,
    eventId: EVENT_ID,
    categoryId: input.categoryId,
    title,
    body: input.body,
    blocks: input.blocks,
    cover: input.cover ?? undefined,
    visibility: input.visibility,
    requireAck: input.requireAck,
    published: input.published,
    // Stamped server-side so "last updated" cannot be back-dated
    // from a client with a wrong clock.
    updated: new Date().toISOString().slice(0, 10),
  };

  try {
    const { error } = await requireSupabase()
      .from('content_pages')
      .upsert(contentPageToRow(page), { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the page.' };
  }

  revalidateContent(id);
  return { ok: true, id };
}

/** Publish / unpublish without opening the editor. */
export async function toggleContentPublished(id: Id, published: boolean): Promise<ActionResult> {
  try {
    const { error } = await requireSupabase()
      .from('content_pages')
      .update({ published })
      .eq('id', id);

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update the page.' };
  }

  revalidateContent(id);
  return { ok: true, id };
}

/** Destructive: the caller must confirm before reaching this. */
export async function deleteContentPage(id: Id): Promise<ActionResult> {
  try {
    const { error } = await requireSupabase().from('content_pages').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the page.' };
  }

  revalidateContent();
  return { ok: true, id };
}

/* ---------------------------------------------------------------
   Categories
   --------------------------------------------------------------- */

export async function saveContentCategory(name: string, id?: Id): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Give the category a name.' };

  const categoryId = id ?? mintId('cc');

  try {
    const { error } = await requireSupabase()
      .from('content_categories')
      .upsert({ id: categoryId, event_id: EVENT_ID, name: trimmed }, { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the category.' };
  }

  revalidateContent();
  return { ok: true, id: categoryId };
}

/**
 * Deleting a category leaves its pages in place — the schema sets
 * category_id to null rather than cascading, so an accidental delete
 * cannot take a body of written content with it.
 */
export async function deleteContentCategory(id: Id): Promise<ActionResult> {
  try {
    const { error } = await requireSupabase().from('content_categories').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the category.' };
  }

  revalidateContent();
  return { ok: true, id };
}
