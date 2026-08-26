'use client';

import { clsx } from 'clsx';
import { Inbox } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Thread, type RequestView } from '@/components/requests/RequestsPanel';
import {
  Button,
  Callout,
  EmptyState,
  Help,
  Label,
  Select,
  TextArea,
} from '@/components/ui/primitives';
import type { RequestStatus } from '@/lib/types';

import { assignRequest, setRequestStatus } from '@/app/organiser/requests/actions';

/* ============================================================
   The requests inbox

   Sorted by who is waiting rather than by date: a request the
   partner has already answered is more urgent than one raised
   yesterday that nobody has looked at.
   ============================================================ */

export interface InboxRequest extends RequestView {
  partnerName: string;
  partnerId: string;
}

const FILTERS: Array<{ key: string; label: string; match: (r: InboxRequest) => boolean }> = [
  { key: 'open', label: 'Open', match: (r) => r.open },
  {
    key: 'waiting',
    label: 'Waiting on the partner',
    match: (r) => r.status === 'more_info',
  },
  { key: 'closed', label: 'Closed', match: (r) => !r.open },
  { key: 'all', label: 'All', match: () => true },
];

/** What an organiser can move a request to, and what it means. */
const DECISIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: 'under_review', label: 'Under review' },
  { value: 'more_info', label: 'Ask the partner for more' },
  { value: 'approved', label: 'Approve' },
  { value: 'rejected', label: 'Reject' },
  { value: 'closed', label: 'Close' },
];

export function RequestInbox({
  requests,
  owners,
}: {
  requests: InboxRequest[];
  owners: string[];
}) {
  const [filter, setFilter] = useState('open');

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const shown = requests.filter(active.match);

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = requests.filter(f.match).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={f.key === filter}
              className={clsx(
                'cursor-pointer rounded-pill border px-[14px] py-[7px] text-[12.5px]',
                f.key === filter
                  ? 'border-accent bg-accent-fill text-ink'
                  : 'border-line-4 text-ink-3 hover:text-ink',
              )}
            >
              {f.label}
              <span className="ml-2 text-ink-4">{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Inbox size={22} />}
          title="Nothing here"
          body={
            filter === 'open'
              ? 'No open requests. Anything a partner raises lands here.'
              : 'No requests match this filter.'
          }
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {shown.map((request) => (
            <div key={request.id}>
              <div className="mb-[6px] px-[18px] text-[11.5px] tracking-[0.06em] text-ink-4 uppercase">
                {request.partnerName}
              </div>
              <Thread request={request} role="organiser" showReply={false}>
                <Controls request={request} owners={owners} />
              </Thread>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Deciding
   --------------------------------------------------------------- */

function Controls({
  request,
  owners,
}: {
  request: InboxRequest;
  owners: string[];
}) {
  const [status, setStatus] = useState<RequestStatus>(request.status as RequestStatus);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsMessage = status === 'more_info' || status === 'rejected';
  const changed = status !== request.status;

  function apply() {
    setError(null);
    startTransition(async () => {
      const result = await setRequestStatus(request.id, status, message);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage('');
    });
  }

  function reassign(owner: string) {
    setError(null);
    startTransition(async () => {
      const result = await assignRequest(request.id, owner);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="rounded-lg border border-line-2 bg-panel px-[16px] py-[14px]">
      {error && (
        <Callout tone="warn" className="mb-3">
          {error}
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor={`s-${request.id}`}>Move to</Label>
          <Select
            id={`s-${request.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value as RequestStatus)}
          >
            {DECISIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor={`o-${request.id}`}>Owner</Label>
          <Select
            id={`o-${request.id}`}
            value={request.owner}
            onChange={(e) => reassign(e.target.value)}
            disabled={pending}
          >
            {/* The current owner may not be on the team list — a
                request assigned to somebody since removed should not
                silently jump to whoever is first. */}
            {!owners.includes(request.owner) && request.owner && (
              <option value={request.owner}>{request.owner}</option>
            )}
            {owners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3">
        <Label htmlFor={`m-${request.id}`} required={needsMessage}>
          Message to the partner
        </Label>
        <TextArea
          id={`m-${request.id}`}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            status === 'more_info'
              ? 'What do you need from them?'
              : status === 'rejected'
                ? 'Why this cannot go ahead.'
                : 'Optional — sent with the decision.'
          }
        />
        <Help>
          Whatever you write is added to the thread and is visible to the partner.
        </Help>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={apply} disabled={pending || (!changed && !message.trim())}>
          {pending ? 'Saving…' : changed ? 'Apply decision' : 'Send message'}
        </Button>
      </div>
    </div>
  );
}
