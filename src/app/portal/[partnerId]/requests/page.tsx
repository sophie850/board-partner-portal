import { notFound } from 'next/navigation';

import { RequestsPanel, type RequestView } from '@/components/requests/RequestsPanel';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  answerText,
  fmtDateTime,
  isPresentationField,
  statusLabel,
  statusTone,
  terms,
  uploadAnswer,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

/** Threads a partner can still add to. */
const OPEN_STATES = new Set(['submitted', 'under_review', 'more_info']);

export default async function PartnerRequests({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  const t = terms(db);
  const lead = db.partnerUsers.find((u) => u.id === part.leadUserId);

  const requests: RequestView[] = db.requests
    .filter((r) => r.participationId === part.id)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
    .map((r) => {
      const type = db.requestTypes.find((x) => x.id === r.typeId);

      return {
        id: r.id,
        reference: r.reference,
        typeName: type?.name ?? 'Request',
        status: r.status,
        statusLabel: statusLabel(r.status),
        statusTone: statusTone(r.status),
        submittedLabel: fmtDateTime(r.submittedAt),
        owner: r.owner,
        answers: (type?.fields ?? [])
          .filter((f) => !isPresentationField(f.type))
          .map((f) => {
            const upload = uploadAnswer(r.values[f.key]);
            return {
              label: f.label,
              value: answerText(r.values[f.key]),
              url: upload?.url,
            };
          })
          .filter((a) => a.value !== '—'),
        comments: (r.comments ?? []).map((c) => ({
          by: c.by,
          role: c.role,
          atLabel: fmtDateTime(c.at),
          text: c.text,
        })),
        open: OPEN_STATES.has(r.status),
        // The BOARD team has asked for something back.
        needsPartner: r.status === 'more_info',
      };
    });

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>Requests</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Anything you need that is not covered elsewhere in the portal. Each request is a
        conversation with the BOARD team — you can add to it until it is closed.
      </p>

      <RequestsPanel
        partnerId={partnerId}
        participationId={part.id}
        requests={requests}
        types={db.requestTypes}
        submittedBy={lead?.name ?? 'Partner'}
      />
    </Rise>
  );
}
