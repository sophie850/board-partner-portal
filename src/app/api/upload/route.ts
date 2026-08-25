import { NextResponse, type NextRequest } from 'next/server';

import { uploadFile, type UploadPurpose } from '@/lib/storage';

/**
 * Accept one file and store it.
 *
 * Sits behind the site's access gate like every other route, so
 * only someone already through the gate can upload. Type and size
 * are checked server-side — the accept attribute on an input is a
 * convenience for the person choosing a file, not a control.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: 'Expected a file upload.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file was included.' }, { status: 400 });
  }

  const purpose = (form.get('purpose') as UploadPurpose) ?? 'image';
  if (purpose !== 'image' && purpose !== 'document') {
    return NextResponse.json({ ok: false, error: 'Unknown upload purpose.' }, { status: 400 });
  }

  const folder = String(form.get('folder') ?? 'misc');

  const result = await uploadFile(file, folder, purpose);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, file: result.file });
}
