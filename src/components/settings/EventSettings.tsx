'use client';

import { clsx } from 'clsx';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import {
  Button,
  Callout,
  Help,
  Label,
  Panel,
  Select,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import type {
  Currency,
  EventSender,
  OrganiserPermissions,
  Terminology,
} from '@/lib/types';

import {
  createEmailTemplate,
  deleteEmailTemplate,
  saveCurrency,
  saveEmailTemplate,
  saveEventProfile,
  saveSender,
  saveTerminology,
  setOrganiserPermission,
} from '@/app/organiser/settings/actions';

/* ============================================================
   Event settings

   Sections rather than one long form, because these are five
   unrelated jobs. Each field saves when it loses focus — there is
   no Save button to forget, and nothing here is destructive.
   ============================================================ */

export interface SettingsData {
  profile: {
    name: string;
    shortName: string;
    venue: string;
    city: string;
    startDate: string;
    endDate: string;
    timezone: string;
    tagline: string;
    currency: string;
  };
  terminology: Terminology;
  sender: EventSender;
  templates: Array<{
    id: string;
    name: string;
    subject: string;
    body: string;
    enabled: boolean;
    category: string;
  }>;
  team: Array<{
    id: string;
    name: string;
    title: string;
    email: string;
    role: 'super_admin' | 'team';
    permissions: Partial<OrganiserPermissions>;
  }>;
  outbox: Array<{
    id: string;
    subject: string;
    to: string;
    partner: string;
    whenLabel: string;
    status: string;
  }>;
  outboxTotal: number;
}

const AREAS: Array<{ key: keyof OrganiserPermissions; label: string }> = [
  { key: 'partners', label: 'Partners' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'forms', label: 'Forms' },
  { key: 'content', label: 'Content' },
  { key: 'products', label: 'Products' },
  { key: 'suppliers', label: 'Suppliers' },
  { key: 'orders', label: 'Orders' },
  { key: 'requests', label: 'Requests' },
  { key: 'reporting', label: 'Reporting' },
  { key: 'settings', label: 'Event settings' },
];

/** Only singulars are edited; the plurals are inferred in `terms()`. */
const TERMS: Array<{ key: keyof Terminology; label: string; help: string }> = [
  { key: 'partner', label: 'Partner', help: 'Sponsor, Exhibitor, Member…' },
  { key: 'partnerPortal', label: 'Portal name', help: 'What the partner-facing side is called' },
  { key: 'participation', label: 'Participation', help: 'Package, Involvement…' },
  { key: 'task', label: 'Task', help: 'Action, To-do…' },
  { key: 'request', label: 'Request', help: 'Enquiry, Application…' },
];

export function EventSettings({
  data,
  currencies,
}: {
  data: SettingsData;
  currencies: Currency[];
}) {
  const [open, setOpen] = useState<string | null>('profile');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
    });
  }

  const section = (key: string, title: string, detail: string, body: React.ReactNode) => (
    <Panel key={key} className="overflow-hidden p-0">
      <button
        onClick={() => setOpen(open === key ? null : key)}
        aria-expanded={open === key}
        className="flex w-full cursor-pointer items-center gap-4 border-none bg-transparent px-[20px] py-[16px] text-left"
      >
        <ChevronRight
          size={15}
          className={clsx('shrink-0 text-ink-4 transition-transform', open === key && 'rotate-90')}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] text-ink">{title}</div>
          <div className="mt-[2px] text-[11.5px] text-ink-4">{detail}</div>
        </div>
      </button>
      {open === key && (
        <div className="border-t border-line bg-inset px-[20px] py-[20px]">{body}</div>
      )}
    </Panel>
  );

  return (
    <div className="flex flex-col gap-3">
      {error && <Callout tone="warn">{error}</Callout>}

      {section(
        'profile',
        'Event profile',
        'Name, venue, dates and currency — these appear throughout both portals',
        <Profile data={data.profile} currencies={currencies} run={run} />,
      )}

      {section(
        'terms',
        'Terminology',
        'What this event calls its partners, tasks and requests',
        <Terms terminology={data.terminology} run={run} />,
      )}

      {section(
        'team',
        'The BOARD team',
        `${data.team.length} ${data.team.length === 1 ? 'person' : 'people'} · what each can reach`,
        <TeamSection team={data.team} run={run} />,
      )}

      {section(
        'email',
        'Email',
        `${data.templates.length} templates · ${data.outboxTotal} logged`,
        <EmailSection data={data} run={run} />,
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   Event profile
   --------------------------------------------------------------- */

type Runner = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>) => void;

function Profile({
  data,
  currencies,
  run,
}: {
  data: SettingsData['profile'];
  currencies: Currency[];
  run: Runner;
}) {
  const [form, setForm] = useState(data);

  const field = (
    key: keyof SettingsData['profile'],
    label: string,
    type = 'text',
  ) => (
    <div>
      <Label htmlFor={`ev-${key}`}>{label}</Label>
      <TextInput
        id={`ev-${key}`}
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        onBlur={() => run(() => saveEventProfile({ [key]: form[key] }))}
      />
    </div>
  );

  return (
    <div className="grid max-w-[720px] grid-cols-2 gap-4 max-md:grid-cols-1">
      <div className="col-span-2 max-md:col-span-1">{field('name', 'Event name')}</div>
      {field('shortName', 'Short name')}
      {field('tagline', 'Tagline')}
      {field('venue', 'Venue')}
      {field('city', 'City')}
      {field('startDate', 'Starts', 'date')}
      {field('endDate', 'Ends', 'date')}
      {field('timezone', 'Time zone')}

      <div>
        <Label htmlFor="ev-currency">Currency</Label>
        <Select
          id="ev-currency"
          value={form.currency}
          onChange={(e) => {
            const code = e.target.value;
            setForm((f) => ({ ...f, currency: code }));
            run(() => saveCurrency(code));
          }}
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </Select>
        <Help>Changes how every price is shown. It does not convert existing figures.</Help>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Terminology
   --------------------------------------------------------------- */

function Terms({
  terminology,
  run,
}: {
  terminology: Terminology;
  run: Runner;
}) {
  const [form, setForm] = useState(terminology);

  return (
    <div className="max-w-[620px]">
      <p className="mb-4 max-w-[58ch] text-[12.5px] leading-relaxed text-ink-4">
        Enter the singular only — plurals are worked out from it, so “Sponsor” becomes
        “Sponsors” and “Enquiry” becomes “Enquiries”. These words appear in navigation,
        headings and body copy on both sides.
      </p>

      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {TERMS.map((term) => (
          <div key={term.key}>
            <Label htmlFor={`tm-${term.key}`}>{term.label}</Label>
            <TextInput
              id={`tm-${term.key}`}
              value={form[term.key] ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, [term.key]: e.target.value }))}
              onBlur={() => run(() => saveTerminology({ [term.key]: form[term.key] }))}
            />
            <Help>{term.help}</Help>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   The team
   --------------------------------------------------------------- */

function TeamSection({ team, run }: { team: SettingsData['team']; run: Runner }) {
  return (
    <div className="flex flex-col gap-3">
      {team.map((user) => (
        <div
          key={user.id}
          className="rounded-lg border border-line-2 bg-panel px-[16px] py-[14px]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] text-ink">{user.name}</span>
                {user.role === 'super_admin' && (
                  <StatusPill tone="good">Super admin</StatusPill>
                )}
              </div>
              <div className="mt-[2px] text-[11.5px] text-ink-4">
                {[user.title, user.email].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          <div className="mt-3">
            {user.role === 'super_admin' ? (
              <p className="text-[12px] text-ink-4">Access to everything, including this page.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {AREAS.map((area) => {
                  const on = Boolean(user.permissions[area.key]);
                  return (
                    <button
                      key={area.key}
                      aria-pressed={on}
                      onClick={() =>
                        run(() => setOrganiserPermission(user.id, area.key, !on))
                      }
                      className={clsx(
                        'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px]',
                        on
                          ? 'border-accent bg-accent-fill text-ink'
                          : 'border-line-4 text-ink-4 hover:text-ink',
                      )}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}

      <Help>
        Sign-in by email link is not switched on yet, so these permissions are recorded but
        not yet enforced at the door.
      </Help>
    </div>
  );
}

/* ---------------------------------------------------------------
   Email
   --------------------------------------------------------------- */

function EmailSection({ data, run }: { data: SettingsData; run: Runner }) {
  const [sender, setSender] = useState(data.sender);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-7">
      <Callout>
        No email provider is connected yet, so nothing is actually sent. Templates and the
        sender identity are stored ready for when one is, and the log below records what
        would have gone out.
      </Callout>

      {/* ---- sender ---- */}
      <section>
        <div className="mb-3 text-[12px] tracking-[0.12em] text-ink-4 uppercase">
          Sender identity
        </div>
        <div className="grid max-w-[620px] grid-cols-2 gap-4 max-md:grid-cols-1">
          <div>
            <Label htmlFor="sn-name">From name</Label>
            <TextInput
              id="sn-name"
              value={sender.name ?? ''}
              onChange={(e) => setSender((s) => ({ ...s, name: e.target.value }))}
              onBlur={() => run(() => saveSender({ name: sender.name }))}
            />
          </div>
          <div>
            <Label htmlFor="sn-email">From address</Label>
            <TextInput
              id="sn-email"
              type="email"
              value={sender.email ?? ''}
              onChange={(e) => setSender((s) => ({ ...s, email: e.target.value }))}
              onBlur={() => run(() => saveSender({ email: sender.email }))}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="sn-sig">Signature</Label>
            <TextArea
              id="sn-sig"
              rows={2}
              value={sender.signature ?? ''}
              onChange={(e) => setSender((s) => ({ ...s, signature: e.target.value }))}
              onBlur={() => run(() => saveSender({ signature: sender.signature }))}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="sn-logo">Logo</Label>
            <div className="flex flex-wrap items-center gap-3">
              {sender.logo && (
                <div
                  className="h-[44px] w-[100px] shrink-0 rounded-md border border-line-3 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url('${sender.logo}')` }}
                />
              )}
              <div className="min-w-[200px] flex-1">
                <FileUpload
                  purpose="image"
                  folder="email"
                  compact
                  label={sender.logo ? 'Replace logo' : 'Choose a logo'}
                  onUploaded={(f) => {
                    setSender((s) => ({ ...s, logo: f.url }));
                    run(() => saveSender({ logo: f.url }));
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- templates ---- */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12px] tracking-[0.12em] text-ink-4 uppercase">Templates</span>
          {!adding && (
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
              <Plus size={13} /> New reminder
            </Button>
          )}
        </div>

        {adding && (
          <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-line-2 bg-panel px-[16px] py-[14px]">
            <div className="min-w-[240px] flex-1">
              <Label htmlFor="tpl-name">Template name</Label>
              <TextInput
                id="tpl-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                run(() => createEmailTemplate(newName));
                setNewName('');
                setAdding(false);
              }}
            >
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {data.templates.map((template) => (
            <Template key={template.id} template={template} run={run} />
          ))}
        </div>
      </section>

      {/* ---- outbox ---- */}
      <section>
        <div className="mb-3 text-[12px] tracking-[0.12em] text-ink-4 uppercase">
          Recently logged
        </div>
        {data.outbox.length === 0 ? (
          <p className="text-[12.5px] text-ink-4">Nothing logged yet.</p>
        ) : (
          <div className="flex flex-col gap-[6px]">
            {data.outbox.map((mail) => (
              <div
                key={mail.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-line-2 bg-panel px-[14px] py-[10px] text-[12.5px]"
              >
                <span className="min-w-0 flex-1 truncate text-ink">{mail.subject}</span>
                <span className="shrink-0 text-ink-4">{mail.to || 'no address'}</span>
                {mail.partner && <span className="shrink-0 text-ink-4">{mail.partner}</span>}
                <span className="shrink-0 text-ink-4">{mail.whenLabel}</span>
                <StatusPill tone={mail.status === 'sent' ? 'good' : 'warn'}>
                  {mail.status}
                </StatusPill>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Template({
  template,
  run,
}: {
  template: SettingsData['templates'][number];
  run: Runner;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(template);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="rounded-lg border border-line-2 bg-panel">
      <div className="flex flex-wrap items-center gap-3 px-[16px] py-[12px]">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] text-ink">{form.name}</span>
            <StatusPill tone={form.category === 'reminder' ? 'info' : 'muted'}>
              {form.category || 'system'}
            </StatusPill>
          </div>
          <div className="mt-[2px] truncate text-[11.5px] text-ink-4">
            {form.subject || 'No subject yet'}
          </div>
        </button>

        <button
          role="switch"
          aria-checked={form.enabled}
          aria-label={`${form.enabled ? 'Disable' : 'Enable'} ${form.name}`}
          onClick={() => {
            const next = !form.enabled;
            setForm((f) => ({ ...f, enabled: next }));
            run(() => saveEmailTemplate(template.id, { enabled: next }));
          }}
          className={clsx(
            'relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-pill border-none p-0 transition-colors',
            form.enabled ? 'bg-brand' : 'bg-line-4',
          )}
        >
          <span
            className={clsx(
              'absolute top-[2px] h-[18px] w-[18px] rounded-pill bg-ink transition-[left]',
              form.enabled ? 'left-[20px]' : 'left-[2px]',
            )}
          />
        </button>
      </div>

      {open && (
        <div className="border-t border-line px-[16px] py-[14px]">
          <div className="mb-3">
            <Label htmlFor={`t-name-${template.id}`}>Name</Label>
            <TextInput
              id={`t-name-${template.id}`}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onBlur={() => run(() => saveEmailTemplate(template.id, { name: form.name }))}
            />
          </div>
          <div className="mb-3">
            <Label htmlFor={`t-subj-${template.id}`}>Subject</Label>
            <TextInput
              id={`t-subj-${template.id}`}
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              onBlur={() => run(() => saveEmailTemplate(template.id, { subject: form.subject }))}
            />
          </div>
          <div>
            <Label htmlFor={`t-body-${template.id}`}>Body</Label>
            <TextArea
              id={`t-body-${template.id}`}
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              onBlur={() => run(() => saveEmailTemplate(template.id, { body: form.body }))}
            />
            <Help>
              Tokens: [first_name] [contact_name] [partner] [task] [due] [event]
              [portal_link] [sender] [sender_email] [signature]
            </Help>
          </div>

          {template.category === 'reminder' && (
            <div className="mt-4 border-t border-line pt-3">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[12.5px] text-ink-2">
                    Delete “{form.name}” permanently?
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => run(() => deleteEmailTemplate(template.id))}
                  >
                    Delete
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> Delete template
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
