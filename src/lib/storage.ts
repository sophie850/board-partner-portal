import 'server-only';

import { requireSupabase } from '@/lib/db/client';

/* ============================================================
   File storage

   One private bucket, reached only with the secret key. Files are
   served back through /api/files/*, which sits behind the site's
   access gate — so a stored file is never reachable by URL alone.
   ============================================================ */

export const BUCKET = 'board-assets';

/** 25 MB, matching the bucket's own limit. */
export const MAX_BYTES = 25 * 1024 * 1024;

/**
 * What may be uploaded, by purpose.
 *
 * Checked server-side on every upload. The bucket enforces the same
 * list, but a rejection there is an opaque error — checking here
 * lets us say what was wrong.
 */
export const ACCEPTED: Record<string, { mime: string[]; label: string }> = {
  image: {
    mime: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'],
    label: 'PNG, JPEG, WebP, GIF or SVG',
  },
  document: {
    mime: [
      'application/pdf',
      'application/zip',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/postscript',
    ],
    label: 'PDF, ZIP, Word, Excel or AI/EPS',
  },
};

export type UploadPurpose = keyof typeof ACCEPTED;

/**
 * A storage path that cannot be guessed and cannot escape its
 * folder.
 *
 * The original name is kept only as a readable suffix — the random
 * prefix is what makes the path unguessable, and any path
 * separators or traversal sequences in the supplied name are
 * stripped rather than trusted.
 */
export function storagePath(folder: string, originalName: string): string {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'misc';

  const cleaned = originalName
    .replace(/[/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-60);

  const random =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  return `${safeFolder}/${random}-${cleaned || 'file'}`;
}

/** The app URL a stored path is served from. */
export function publicPathFor(storageKey: string): string {
  return `/api/files/${storageKey}`;
}

/** Recover the storage key from an app URL, or null if it is not one. */
export function storageKeyFrom(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = '/api/files/';
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

export interface StoredFile {
  /** Key within the bucket. */
  key: string;
  /** App-relative URL to render or link to. */
  url: string;
  name: string;
  size: number;
  contentType: string;
}

export async function uploadFile(
  file: File,
  folder: string,
  purpose: UploadPurpose,
): Promise<{ ok: true; file: StoredFile } | { ok: false; error: string }> {
  const accepted = ACCEPTED[purpose];

  if (!accepted.mime.includes(file.type)) {
    return {
      ok: false,
      error: `That file type is not accepted here. Use ${accepted.label}.`,
    };
  }

  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `That file is ${mb} MB. The limit is 25 MB.` };
  }

  if (file.size === 0) {
    return { ok: false, error: 'That file is empty.' };
  }

  const key = storagePath(folder, file.name);

  const { error } = await requireSupabase()
    .storage.from(BUCKET)
    .upload(key, file, {
      contentType: file.type,
      // Paths are unguessable, so a collision means something is
      // wrong; fail rather than silently overwrite.
      upsert: false,
    });

  if (error) {
    const missingBucket = /bucket.*not found/i.test(error.message);
    return {
      ok: false,
      error: missingBucket
        ? 'The storage bucket does not exist yet. Run supabase/migrations/0003_storage.sql.'
        : error.message,
    };
  }

  return {
    ok: true,
    file: {
      key,
      url: publicPathFor(key),
      name: file.name,
      size: file.size,
      contentType: file.type,
    },
  };
}

export async function downloadFile(key: string) {
  return requireSupabase().storage.from(BUCKET).download(key);
}

export async function removeFile(key: string) {
  return requireSupabase().storage.from(BUCKET).remove([key]);
}
