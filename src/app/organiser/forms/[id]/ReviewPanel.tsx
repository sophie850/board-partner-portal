'use client';

import { useState, useTransition } from 'react';

import { Button, Callout, TextArea } from '@/components/ui/primitives';
import type { Id } from '@/lib/types';

import { reviewSubmission, type ReviewDecision } from '../actions';

/**
 * Approve, request changes, or reject one submission.
 *
 * Requesting changes forces a message, because that message is the
 * entire explanation the partner receives — an empty one means they
 * resubmit the same thing and everyone loses a round trip.
 */
export function ReviewPanel({
  participationId,
  formId,
}: {
  participationId: Id;
  formId: Id;
}) {
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(decision: ReviewDecision) {
    setError(null);

    if (decision === 'rejected') {
      const ok = window.confirm(
        'Reject this submission? The partner will need to be told separately what to do next.',
      );
      if (!ok) return;
    }

    startTransition(async () => {
      // Reviewer is hard-coded until authentication lands; at that
      // point it comes from the signed-in organiser.
      const result = await reviewSubmission(
        participationId,
        formId,
        decision,
        feedback,
        'BOARD Operations',
      );
      if (!result.ok) setError(result.error);
      else setFeedback('');
    });
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      {error && (
        <Callout tone="warn" className="mb-3">
          {error}
        </Callout>
      )}

      <TextArea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        rows={2}
        placeholder="What needs changing? Required if you are requesting changes."
        aria-label="Review feedback"
        className="mb-3 text-[13px]"
      />

      <div className="flex flex-wrap gap-[10px]">
        <Button size="sm" onClick={() => decide('approved')} disabled={pending}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => decide('changes_required')}
          disabled={pending}
        >
          Request changes
        </Button>
        <Button size="sm" variant="quiet" onClick={() => decide('rejected')} disabled={pending}>
          Reject
        </Button>
      </div>
    </div>
  );
}
