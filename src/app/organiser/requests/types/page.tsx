import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { RequestTypeList, type TypeView } from '@/components/requests/RequestTypeEditor';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { requireArea } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { terms } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

export default async function RequestTypes() {
  await requireArea('requests', '/organiser/requests/types');

  const db = await getDb();
  const t = terms(db);

  const types: TypeView[] = db.requestTypes.map((rt) => ({
    ...rt,
    used: db.requests.filter((r) => r.typeId === rt.id).length,
  }));

  // Whoever could pick one of these up. Existing owners are included
  // so a name typed before this screen existed is not lost.
  const owners = Array.from(
    new Set([
      ...db.organiserUsers.map((u) => u.name),
      ...db.requestTypes.map((rt) => rt.ownerDefault),
    ]),
  )
    .filter(Boolean)
    .sort();

  return (
    <Rise>
      <Link
        href="/organiser/requests"
        className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> {t.requests}
      </Link>

      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Request types</PageTitle>
      <p className="mt-2 mb-6 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        What a partner can raise with you, and what they have to tell you when they do.
        Asking the right questions here is what turns a request from “can we talk about
        passes?” into something you can act on without a reply.
      </p>

      <RequestTypeList
        types={types}
        owners={owners}
        entitlements={db.entitlements}
        partners={db.partners}
      />
    </Rise>
  );
}
