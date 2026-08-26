import { requireArea } from '@/lib/auth/session';
import { RequestInbox, type InboxRequest } from '@/components/requests/RequestInbox';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  answerText,
  fmtDateTime,
  isPresentationField,
  statusLabel,
  statusTone,
  uploadAnswer,
} from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

const OPEN_STATES = new Set(['submitted', 'under_review', 'more_info']);

/** How urgently each state wants an organiser's attention. */
const URGENCY: Record<string, number> = {
  submitted: 0,
  under_review: 1,
  more_info: 2,
};

export default async function OrganiserRequests() {
  await requireArea('requests', '/organiser/requests');

  const db = await getDb();

  const requests: InboxRequest[] = db.requests
    .map((r) => {
      const type = db.requestTypes.find((x) => x.id === r.typeId);
      const part = db.participations.find((p) => p.id === r.participationId);
      const partner = db.partners.find((p) => p.id === part?.partnerId);

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
        needsPartner: r.status === 'more_info',
        partnerName: partner?.name ?? 'Unknown partner',
        partnerId: part?.partnerId ?? '',
      };
    })
    .sort((a, b) => {
      // Unlooked-at first, then by age within each state.
      const ua = URGENCY[a.status] ?? 9;
      const ub = URGENCY[b.status] ?? 9;
      if (ua !== ub) return ua - ub;
      return a.submittedLabel < b.submittedLabel ? 1 : -1;
    });

  const owners = [
    ...new Set([
      ...db.organiserUsers.map((u) => u.name),
      ...db.requestTypes.map((t) => t.ownerDefault).filter(Boolean),
    ]),
  ].sort();

  return (
    <Rise>
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Requests</PageTitle>
      <p className="mt-2 mb-6 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything partners have raised, newest and least-looked-at first. Every decision you
        record is added to the partner&rsquo;s thread, so they see the reason and not only the
        outcome.
      </p>

      <RequestInbox requests={requests} owners={owners} />
    </Rise>
  );
}
