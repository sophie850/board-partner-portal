'use server';

import { revalidatePath } from 'next/cache';

import { requireSupabase } from '@/lib/db/client';
import type { Id, VisibilityRule } from '@/lib/types';

/* ============================================================
   Entitlements — write operations

   Including the reverse editor: attaching or detaching an
   entitlement from the surfaces it gates, edited from the
   entitlement's side rather than item by item.
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath('/organiser/entitlements');
  revalidatePath('/organiser', 'layout');
  revalidatePath('/portal', 'layout');
}

/** Keys are referenced from rules and arrays, so they never change. */
export async function saveEntitlement(key: string, label: string): Promise<ActionResult> {
  if (!label.trim()) return { ok: false, error: 'Give the entitlement a label.' };

  try {
    const { error } = await requireSupabase()
      .from('entitlements')
      .upsert({ key, event_id: EVENT_ID, label: label.trim() }, { onConflict: 'key' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save.' };
  }

  revalidateAll();
  return { ok: true };
}

export async function createEntitlement(label: string): Promise<ActionResult> {
  const trimmed = label.trim();
  if (!trimmed) return { ok: false, error: 'Give the entitlement a label.' };

  // A readable key derived from the label, in the convention the
  // seed already uses. Keys are permanent, so this is generated once.
  const key = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

  if (!key) return { ok: false, error: 'That label does not produce a usable key.' };

  try {
    const client = requireSupabase();

    const { data: existing } = await client
      .from('entitlements')
      .select('key')
      .eq('key', key)
      .maybeSingle();

    if (existing) return { ok: false, error: `An entitlement with the key "${key}" already exists.` };

    const { error } = await client
      .from('entitlements')
      .insert({ key, event_id: EVENT_ID, label: trimmed });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not create.' };
  }

  revalidateAll();
  return { ok: true };
}

/**
 * Only removable when nothing uses it.
 *
 * Deleting a key that is still referenced would silently change who
 * can see what — a rule requiring a key that no longer exists stops
 * matching, so content could vanish or appear without anyone
 * touching it. The caller checks usage first; this is the backstop.
 */
export async function deleteEntitlement(key: string): Promise<ActionResult> {
  try {
    const client = requireSupabase();

    const [{ data: parts }, { data: tasks }] = await Promise.all([
      client.from('event_participations').select('id').contains('added_entitlements', [key]),
      client.from('task_templates').select('id').contains('requires', [key]),
    ]);

    const inUse = (parts?.length ?? 0) + (tasks?.length ?? 0);
    if (inUse > 0) {
      return {
        ok: false,
        error: `That entitlement is still in use by ${inUse} record(s). Detach it everywhere first.`,
      };
    }

    const { error } = await client.from('entitlements').delete().eq('key', key);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete.' };
  }

  revalidateAll();
  return { ok: true };
}

/* ---------------------------------------------------------------
   The reverse editor
   --------------------------------------------------------------- */

export type GatedSurface = 'products' | 'content_pages' | 'files' | 'form_fields' | 'task_templates';

const TABLE: Record<GatedSurface, { table: string; column: string }> = {
  products: { table: 'products', column: 'visibility' },
  content_pages: { table: 'content_pages', column: 'visibility' },
  files: { table: 'files', column: 'visibility' },
  form_fields: { table: 'form_fields', column: 'visibility' },
  task_templates: { table: 'task_templates', column: 'requires' },
};

/**
 * Attach or detach one entitlement from one item.
 *
 * Rules are multi-key and ANY-of, so this adds to or removes from
 * the existing key set rather than replacing the rule — unticking
 * one entitlement must not silently widen an item to everybody,
 * which is exactly the bug the design notes called out.
 */
export async function setGating(
  surface: GatedSurface,
  itemId: Id,
  key: string,
  attached: boolean,
): Promise<ActionResult> {
  const { table, column } = TABLE[surface];

  try {
    const client = requireSupabase();

    const { data, error } = await client
      .from(table)
      .select(column)
      .eq('id', itemId)
      .single();

    if (error) return { ok: false, error: error.message };

    // Tasks store gating as a plain text[]; everything else uses the
    // shared JSONB rule shape.
    if (column === 'requires') {
      const current: string[] = (data as unknown as { requires: string[] })?.requires ?? [];
      const next = attached
        ? [...new Set([...current, key])]
        : current.filter((k) => k !== key);

      const { error: writeError } = await client
        .from(table)
        .update({ requires: next })
        .eq('id', itemId);
      if (writeError) return { ok: false, error: writeError.message };
    } else {
      const rule = ((data as unknown as { visibility: VisibilityRule })?.visibility ??
        {}) as VisibilityRule;

      const current = Array.isArray(rule.keys)
        ? rule.keys
        : rule.key
          ? [rule.key]
          : rule.requires
            ? [rule.requires]
            : [];

      const next = attached
        ? [...new Set([...current, key])]
        : current.filter((k) => k !== key);

      // With no keys left the item is open to everyone, which is the
      // honest meaning of "gated by nothing".
      const nextRule: VisibilityRule =
        next.length === 0 ? { type: 'all' } : { type: 'entitlement', keys: next };

      const { error: writeError } = await client
        .from(table)
        .update({ visibility: nextRule })
        .eq('id', itemId);
      if (writeError) return { ok: false, error: writeError.message };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not update gating.' };
  }

  revalidateAll();
  return { ok: true };
}
