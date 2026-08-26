'use client';

import { clsx } from 'clsx';
import { MessageSquarePlus, Plus, Send } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { FieldRenderer } from '@/components/forms/FieldRenderer';
import {
  Button,
  Callout,
  EmptyState,
  Eyebrow,
  Panel,
  StatusPill,
  TextArea,
} from '@/components/ui/primitives';
import type { FieldValue, FormField, FormValues, RequestType } from '@/lib/types';

import { addComment, submitRequest } from '@/app/portal/[partnerId]/requests/actions';

/* ============================================================
   Requests, from the partner's side

   A request is an open question to the BOARD team. The thread is
   the point — a status alone tells the partner nothing about what
   was actually said.
   ============================================================ */

export interface RequestView {
  id: string;
  reference: string;
  typeName: string;
  status: string;
  statusLabel: string;
  statusTone: 'good' | 'warn' | 'neutral' | 'muted';
  submittedLabel: string;
  owner: string;
  /** `url` is set when the answer is an uploaded file. */
  answers: Array<{ label: string; value: string; url?: string }>;
  comments: Array<{
    by: string;
    role: 'partner' | 'organiser';
    atLabel: string;
    text: string;
  }>;
  /** Closed threads are read-only. */
  open: boolean;
  /** True while the BOARD team is waiting on this partner. */
  needsPartner: boolean;
}

export function RequestsPanel({
  partnerId,
  participationId,
  requests,
  types,
  submittedBy,
}: {
  partnerId: string;
  participationId: string;
  requests: RequestView[];
  types: RequestType[];
  submittedBy: string;
}) {
  const [composing, setComposing] = useState(false);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {types.length > 0 && !composing && (
          <Button onClick={() => setComposing(true)}>
            <Plus size={14} /> New request
          </Button>
        )}
      </div>

      {composing && (
        <NewRequest
          partnerId={partnerId}
          participationId={participationId}
          types={types}
          submittedBy={submittedBy}
          onDone={() => setComposing(false)}
        />
      )}

      {requests.length === 0 && !composing ? (
        <EmptyState
          icon={<MessageSquarePlus size={22} />}
          title="No requests yet"
          body={
            types.length > 0
              ? 'Raise a request when you need something that is not covered elsewhere in the portal — a change to your stand, extra passes, an exception to a rule.'
              : 'There are no request types set up for this event yet. Your BOARD contact can help in the meantime.'
          }
        />
      ) : (
        <div className="flex flex-col gap-[10px]">
          {requests.map((request) => (
            <Thread
              key={request.id}
              request={request}
              author={submittedBy}
              role="partner"
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Raising one
   --------------------------------------------------------------- */

function NewRequest({
  partnerId,
  participationId,
  types,
  submittedBy,
  onDone,
}: {
  partnerId: string;
  participationId: string;
  types: RequestType[];
  submittedBy: string;
  onDone: () => void;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const type = types.find((t) => t.id === typeId);

  // Conditions resolve as the partner types, the same as a form.
  const fields = useMemo<FormField[]>(() => {
    if (!type) return [];
    return type.fields.filter(
      (f) => !f.condition || values[f.condition.field] === f.condition.equals,
    );
  }, [type, values]);

  function send() {
    if (!type) return;
    setError(null);

    const found: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.required) return;
      const v = values[f.key];
      const empty =
        v === undefined ||
        v === null ||
        v === '' ||
        (Array.isArray(v) && v.length === 0) ||
        (f.type === 'acknowledgement' && v !== true);
      if (empty) found[f.key] = 'This is needed before the request can be sent.';
    });

    setErrors(found);
    if (Object.keys(found).length) return;

    startTransition(async () => {
      const result = await submitRequest(
        partnerId,
        participationId,
        typeId,
        values,
        [],
        submittedBy,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <Panel className="mb-6 px-[22px] py-[20px]">
      <Eyebrow className="mb-4 tracking-[0.12em]">New request</Eyebrow>

      {error && (
        <Callout tone="warn" className="mb-4">
          {error}
        </Callout>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTypeId(t.id);
              setValues({});
              setErrors({});
            }}
            aria-pressed={t.id === typeId}
            className={clsx(
              'cursor-pointer rounded-pill border px-[14px] py-[7px] text-[12.5px]',
              t.id === typeId
                ? 'border-accent bg-accent-fill text-ink'
                : 'border-line-4 text-ink-3 hover:text-ink',
            )}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {fields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key] as FieldValue}
            error={errors[field.key]}
            uploadFolder="requests"
            onChange={(v) => setValues((current) => ({ ...current, [field.key]: v }))}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <Button onClick={send} disabled={pending || !type}>
          {pending ? 'Sending…' : 'Send request'}
        </Button>
        <Button variant="ghost" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        {type?.ownerDefault && (
          <span className="text-[12px] text-ink-4">Goes to {type.ownerDefault}.</span>
        )}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------
   The thread
   --------------------------------------------------------------- */

export function Thread({
  request,
  author,
  role,
  showReply = true,
  children,
}: {
  request: RequestView;
  author: string;
  role: 'partner' | 'organiser';
  /**
   * The inbox supplies its own message box as part of recording a
   * decision, so it turns this one off — two boxes that both post to
   * the same thread is a choice nobody should have to make.
   */
  showReply?: boolean;
  /** Organiser-only controls, rendered in place of the reply box. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await addComment(request.id, author, role, reply);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setReply('');
    });
  }

  return (
    <Panel className="overflow-hidden p-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full cursor-pointer flex-wrap items-center gap-4 border-none bg-transparent px-[18px] py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-ink">{request.typeName}</span>
            <span className="text-[11.5px] text-ink-4">{request.reference}</span>
          </div>
          <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
            <span>{request.submittedLabel}</span>
            {request.owner && (
              <>
                <span aria-hidden>·</span>
                <span>with {request.owner}</span>
              </>
            )}
            {request.comments.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span>
                  {request.comments.length}{' '}
                  {request.comments.length === 1 ? 'message' : 'messages'}
                </span>
              </>
            )}
          </div>
        </div>

        {request.needsPartner && role === 'partner' && (
          <StatusPill tone="warn">Needs your answer</StatusPill>
        )}
        <StatusPill tone={request.statusTone}>{request.statusLabel}</StatusPill>
      </button>

      {open && (
        <div className="border-t border-line bg-inset px-[18px] py-[18px]">
          {request.answers.length > 0 && (
            <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] max-md:grid-cols-1">
              {request.answers.map((a) => (
                <div key={a.label}>
                  <dt className="text-[11.5px] text-ink-4">{a.label}</dt>
                  <dd className="mt-[2px] whitespace-pre-wrap text-ink-2">
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent no-underline hover:underline"
                      >
                        {a.value}
                      </a>
                    ) : (
                      a.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {request.comments.length > 0 && (
            <div className="mb-5 flex flex-col gap-3">
              {request.comments.map((c, i) => (
                <div
                  key={i}
                  className={clsx(
                    'rounded-lg border px-[15px] py-[12px]',
                    c.role === 'organiser'
                      ? 'border-brand-line bg-brand-fill'
                      : 'border-line-2 bg-panel',
                  )}
                >
                  <div className="mb-1 flex flex-wrap items-baseline gap-2 text-[11.5px] text-ink-4">
                    <span className="text-ink-2">{c.by}</span>
                    <span>{c.role === 'organiser' ? 'BOARD team' : 'Partner'}</span>
                    <span aria-hidden>·</span>
                    <span>{c.atLabel}</span>
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-ink-2">
                    {c.text}
                  </p>
                </div>
              ))}
            </div>
          )}

          {children}

          {error && (
            <Callout tone="warn" className="mb-3">
              {error}
            </Callout>
          )}

          {request.open && showReply ? (
            <div>
              <TextArea
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  role === 'partner'
                    ? 'Add anything else the BOARD team should know…'
                    : 'Reply to the partner…'
                }
              />
              <div className="mt-3">
                <Button size="sm" onClick={send} disabled={pending || !reply.trim()}>
                  <Send size={13} /> {pending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>
          ) : request.open ? null : (
            <p className="text-[12.5px] text-ink-4">
              {role === 'partner'
                ? 'This request is closed. Raise a new one if something has changed.'
                : 'This request is closed. Moving it back to review reopens it for the partner.'}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
