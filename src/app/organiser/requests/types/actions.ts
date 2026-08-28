'use server';

import { revalidatePath } from 'next/cache';

import { guardOrganiser } from '@/lib/auth/session';
import { requireSupabase } from '@/lib/db/client';
import { requestTypeToRow } from '@/lib/db/mappers';
import { getDbOrError, mintId } from '@/lib/db/store';
import type { FormField, Id, RequestType } from '@/lib/types';

/* ============================================================
   Request types — write operations

   A request type is the shape of a question a partner can raise:
   its name, who on the BOARD team picks it up by default, and the
   fields they fill in. Everything else in the portal had an editor;
   these were fixed at whatever the seed created, which meant the
   only way to let partners ask about something new was a database
   migration.
   ============================================================ */

const EVENT_ID = 'board_monaco_2027';

export interface RequestTypeInput {
  id?: Id;
  name: string;
  ownerDefault: string;
  fields: FormField[];
}

export type ActionResult = { ok: true; id: Id } | { ok: false; error: string };

function revalidateTypes() {
  revalidatePath('/organiser/requests');
  revalidatePath('/organiser/requests/types');
  // Partners choose from these when raising a request.
  revalidatePath('/portal', 'layout');
}

export async function saveRequestType(input: RequestTypeInput): Promise<ActionResult> {
  const refused = await guardOrganiser('requests');
  if (refused) return refused;

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'Give the request type a name.' };

  const unlabelled = input.fields.filter((f) => !f.label.trim()).length;
  if (unlabelled > 0) {
    return {
      ok: false,
      error:
        unlabelled === 1
          ? 'One field has no label. A partner cannot answer a question that has not been asked.'
          : `${unlabelled} fields have no label. A partner cannot answer a question that has not been asked.`,
    };
  }

  const id = input.id ?? mintId('rt');

  const type: RequestType = {
    id,
    eventId: EVENT_ID,
    name,
    ownerDefault: input.ownerDefault.trim(),
    fields: input.fields,
  };

  try {
    const { error } = await requireSupabase()
      .from('request_types')
      .upsert(requestTypeToRow(type), { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save the type.' };
  }

  revalidateTypes();
  return { ok: true, id };
}

/**
 * Delete a type nobody has used.
 *
 * Requests already raised under a type keep pointing at it — the
 * schema sets `type_id` to null rather than cascading, so deleting
 * would not destroy them, but it would leave an inbox full of
 * requests labelled "Request" with their answers unreadable, since
 * the field labels live on the type. Refusing while any exist is
 * the honest behaviour; the alternative is silent data loss that
 * only shows up months later.
 */
export async function deleteRequestType(id: Id): Promise<ActionResult> {
  const refused = await guardOrganiser('requests');
  if (refused) return refused;

  const loaded = await getDbOrError();
  if (!loaded.ok) return loaded;

  const inUse = loaded.db.requests.filter((r) => r.typeId === id).length;
  if (inUse > 0) {
    return {
      ok: false,
      error:
        `${inUse} ${inUse === 1 ? 'request has' : 'requests have'} been raised under this ` +
        'type, and deleting it would make their answers unreadable. Rename it instead.',
    };
  }

  try {
    const { error } = await requireSupabase().from('request_types').delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not delete the type.' };
  }

  revalidateTypes();
  return { ok: true, id };
}
