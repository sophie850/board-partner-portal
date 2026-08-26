import { requireModule } from '@/lib/auth/session';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FormFiller } from '@/components/forms/FormFiller';
import { Eyebrow, PageTitle, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  entitlementSet,
  fmtDate,
  NO_DATE_LABEL,
  resolveForms,
  statusLabel,
  statusTone,
  visibleFields,
} from '@/lib/resolvers';
import type { FormSubmission } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PartnerFormPage({
  params,
}: {
  params: Promise<{ partnerId: string; formId: string }>;
}) {
  const { partnerId, formId } = await params;
  await requireModule(partnerId, 'forms');
  const db = await getDb();

  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!part) notFound();

  // Resolved rather than raw, so the deadline already reflects any
  // per-partner override and the submission state is merged in.
  const form = resolveForms(db, part).find((f) => f.id === formId);

  // A form this partner is not assigned must 404 exactly like one
  // that does not exist.
  if (!form) notFound();

  const submission: FormSubmission = form.state;
  const base = `/portal/${partnerId}`;

  // Entitlement-gated fields are filtered here, on the server, so a
  // field this partner may not see never reaches the browser at all.
  // Conditional fields stay in, and resolve live as they answer.
  const allowed = visibleFields(db, form, part).map((f) => f.key);
  const serverVisible = {
    ...form,
    fields: form.fields.filter(
      (f) => allowed.includes(f.key) || Boolean(f.condition),
    ),
  };

  const lead = db.partnerUsers.find((u) => u.id === part.leadUserId);

  return (
    <Rise className="mx-auto max-w-[720px]">
      <Link
        href={`${base}/forms`}
        className="mb-5 inline-flex items-center gap-2 text-[12.5px] text-ink-3 no-underline hover:text-ink"
      >
        <ArrowLeft size={14} /> Forms
      </Link>

      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          {form.category && <Eyebrow className="mb-2">{form.category}</Eyebrow>}
          <PageTitle>{form.title}</PageTitle>
        </div>
        <StatusPill tone={statusTone(submission.status)}>
          {statusLabel(submission.status)}
        </StatusPill>
      </div>

      {form.description && (
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
          {form.description}
        </p>
      )}

      <div className="mt-3 mb-8 text-[12px] text-ink-4">
        {form.dueDate ? `Due ${fmtDate(form.dueDate)}` : NO_DATE_LABEL}
        {form.deadlineOverridden && ' · date set for you'}
        {submission.submittedAt &&
          ` · Submitted ${fmtDate(submission.submittedAt)} by ${submission.submittedBy ?? '—'}`}
      </div>

      <FormFiller
        partnerId={partnerId}
        participation={part}
        form={serverVisible}
        submission={submission}
        entitlementKeys={[...entitlementSet(db, part)]}
      />
    </Rise>
  );
}
