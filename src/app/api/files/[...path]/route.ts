import { NextResponse } from 'next/server';

import { downloadFile } from '@/lib/storage';

/**
 * Serve a stored file.
 *
 * The bucket is private, so this is the only way in — and it sits
 * behind the site's access gate, which is the point: a floor plan or
 * a partner's document should not be readable by anyone who has the
 * URL, only by someone already through the gate.
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const key = path.join('/');

  // Refuse traversal outright rather than relying on the storage
  // layer to normalise it.
  if (!key || key.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await downloadFile(key);

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      // Paths are unguessable and content-stable, so the file itself
      // can be cached hard. Private, because the response is only
      // valid for someone through the gate.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
