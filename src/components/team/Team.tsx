'use client';

import { clsx } from 'clsx';
import { Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import {
  Button,
  Callout,
  Help,
  Label,
  Panel,
  StatusPill,
  TextInput,
} from '@/components/ui/primitives';
import type { PartnerPermissions } from '@/lib/types';

import {
  inviteColleague,
  makeLead,
  removeColleague,
  setPermission,
} from '@/app/portal/[partnerId]/team/actions';

/* ============================================================
   The partner's team

   The Lead grants access per area. Permissions are shown as
   toggleable chips rather than a matrix — a partner has at most a
   handful of colleagues, and a chip that is on or off is easier to
   read at a glance than a row of checkboxes.
   ============================================================ */

const MODULES: Array<{ key: keyof PartnerPermissions; label: string }> = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'forms', label: 'Forms' },
  { key: 'requests', label: 'Requests' },
  { key: 'shop', label: 'Shop' },
  { key: 'orders', label: 'Orders' },
  { key: 'profile', label: 'Participation' },
  { key: 'team', label: 'Team' },
];

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'lead' | 'user';
  permissions: 'all' | PartnerPermissions;
  status: string;
}

export function Team({
  partnerId,
  members,
}: {
  partnerId: string;
  members: TeamMember[];
}) {
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function invite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteColleague(partnerId, name, email);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setName('');
      setEmail('');
      setInviting(false);
    });
  }

  return (
    <>
      <div className="mb-6">
        {!inviting ? (
          <Button onClick={() => setInviting(true)}>
            <Plus size={14} /> Invite colleague
          </Button>
        ) : (
          <Panel className="max-w-[460px] px-[22px] py-[20px]">
            {error && (
              <Callout tone="warn" className="mb-4">
                {error}
              </Callout>
            )}

            <div className="mb-3">
              <Label htmlFor="t-name" required>
                Full name
              </Label>
              <TextInput id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="mb-1">
              <Label htmlFor="t-email" required>
                Email
              </Label>
              <TextInput
                id="t-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Help>
              They are added straight away with no access to anything. Grant the areas they
              need below. Sign-in by email link is not switched on yet, so no invitation is
              sent.
            </Help>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={invite} disabled={pending}>
                {pending ? 'Adding…' : 'Add colleague'}
              </Button>
              <Button variant="ghost" onClick={() => setInviting(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </Panel>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {members.map((member) => (
          <Member key={member.id} partnerId={partnerId} member={member} />
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------
   One colleague
   --------------------------------------------------------------- */

function Member({ partnerId, member }: { partnerId: string; member: TeamMember }) {
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [pending, startTransition] = useTransition();

  const initials = member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const isLead = member.role === 'lead';
  const perms = member.permissions;

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
      else setConfirmRemove(false);
    });
  }

  return (
    <Panel className="px-[18px] py-[16px]">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-line-3 bg-chip text-[13px] text-ink-3">
          {initials || '—'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] text-ink">{member.name}</span>
            {isLead && <StatusPill tone="good">Partner lead</StatusPill>}
            <StatusPill tone="muted">{member.status}</StatusPill>
          </div>
          <div className="mt-[2px] text-[12px] text-ink-4">{member.email}</div>
        </div>

        {!isLead && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => run(() => makeLead(partnerId, member.id))}
          >
            Make lead
          </Button>
        )}

        {!isLead &&
          (confirmRemove ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={() => run(() => removeColleague(partnerId, member.id))}
              >
                Remove
              </Button>
              <Button size="sm" variant="quiet" onClick={() => setConfirmRemove(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRemove(true)}
              aria-label={`Remove ${member.name}`}
              className="cursor-pointer border-none bg-transparent text-ink-4 hover:text-warn"
            >
              <X size={16} />
            </button>
          ))}
      </div>

      {error && (
        <Callout tone="warn" className="mt-3 ml-[54px]">
          {error}
        </Callout>
      )}

      <div className="mt-3 pl-[54px]">
        {isLead || perms === 'all' ? (
          <p className="text-[12px] text-ink-4">Full access to every area.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => {
              const on = perms[m.key];
              return (
                <button
                  key={m.key}
                  disabled={pending}
                  aria-pressed={on}
                  onClick={() => run(() => setPermission(partnerId, member.id, m.key, !on))}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] disabled:opacity-50',
                    on
                      ? 'border-accent bg-accent-fill text-ink'
                      : 'border-line-4 text-ink-4 hover:text-ink',
                  )}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}
