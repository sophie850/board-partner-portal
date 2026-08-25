'use client';

import { clsx } from 'clsx';
import { Check, FileText, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import type {
  BillingDetails,
  Entitlement,
  FormDef,
  InventoryItem,
  InventoryType,
  Participation,
  Partner,
  PartnerUser,
  RequestedFile,
  TaskTemplate,
} from '@/lib/types';

import {
  saveContract,
  saveInventory,
  saveLead,
  saveParticipation,
  savePartnerDetails,
  saveRequestedFiles,
} from '@/app/organiser/partners/actions';

/* ============================================================
   Partner configuration

   Sections save independently. Configuration spans several tables
   and one screen can hold a lot of unrelated edits — saving the lot
   in one go means an error in the package loses the billing address
   too.
   ============================================================ */

const SECTORS = [
  'Enterprise Tech & AI',
  'Management Consultancy',
  'Investment',
  'Financial services',
  'Industrial',
  'Healthcare',
  'Legal',
  'Other',
];

const INVENTORY_TYPES: InventoryType[] = [
  'Dedicated Space',
  'Curated Introductions',
  'Branding',
  'Bespoke',
  'Delegate Passes',
];

/** Pass types autofill their description — they are fixed products. */
const PASS_TYPES: Record<string, string> = {
  'Associate Pass': 'Full show access',
  'Service Pass': 'For service staff working on stands only',
};

export function PartnerConfigure({
  partner,
  participation,
  lead,
  entitlements,
  forms,
  tasks,
}: {
  partner: Partner;
  participation: Participation;
  lead: PartnerUser | null;
  entitlements: Entitlement[];
  forms: FormDef[];
  tasks: TaskTemplate[];
}) {
  return (
    <div className="flex flex-col gap-[18px]">
      <CompanyDetails partner={partner} />
      <LeadContact partnerId={partner.id} lead={lead} />
      <Contract partnerId={partner.id} participation={participation} />
      <Package partnerId={partner.id} participation={participation} forms={forms} tasks={tasks} />
      <Entitlements
        partnerId={partner.id}
        participation={participation}
        entitlements={entitlements}
      />
      <Deadlines
        partnerId={partner.id}
        participation={participation}
        forms={forms}
        tasks={tasks}
      />
      <RequestedFiles partnerId={partner.id} participation={participation} />
      <Notes partnerId={partner.id} participation={participation} />
    </div>
  );
}

/* ---------------------------------------------------------------
   Section shell, with its own save state
   --------------------------------------------------------------- */

function Section({
  title,
  description,
  children,
  onSave,
  action,
  dirty,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave?: () => Promise<{ ok: boolean; error?: string }>;
  action?: React.ReactNode;
  dirty?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function save() {
    if (!onSave) return;
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await onSave();
      if (!result.ok) {
        setError(result.error ?? 'Could not save.');
        return;
      }
      setSaved(true);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <section className="rounded-xl border border-line-2 bg-panel px-[22px] py-5">
      <div className="mb-[14px] flex items-start justify-between gap-4">
        <div>
          <Eyebrow className="tracking-[0.12em]">{title}</Eyebrow>
          {description && (
            <p className="mt-[6px] max-w-[62ch] text-[12px] leading-relaxed text-ink-4">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>

      {error && (
        <Callout tone="warn" className="mb-4">
          {error}
        </Callout>
      )}

      {children}

      {onSave && (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
          <Button size="sm" onClick={save} disabled={pending || dirty === false}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
          {saved && (
            <span className="flex items-center gap-[6px] text-[12px] text-accent">
              <Check size={13} /> Saved
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------
   Company details
   --------------------------------------------------------------- */

function CompanyDetails({ partner }: { partner: Partner }) {
  const [name, setName] = useState(partner.name);
  const [sector, setSector] = useState(partner.sector);
  const [billing, setBilling] = useState<BillingDetails>({
    entity: partner.billing?.entity ?? '',
    address: partner.billing?.address ?? '',
    city: partner.billing?.city ?? '',
    postcode: partner.billing?.postcode ?? '',
    country: partner.billing?.country ?? '',
    vat: partner.billing?.vat ?? '',
  });

  const patch = (p: Partial<BillingDetails>) => setBilling((b) => ({ ...b, ...p }));

  return (
    <Section
      title="Company details"
      onSave={() => savePartnerDetails(partner.id, { name, sector, billing })}
    >
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div className="col-span-2 max-md:col-span-1">
          <Label htmlFor="org-name" required>
            Organisation name
          </Label>
          <TextInput id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="org-sector">Sector</Label>
          <Select id="org-sector" value={sector} onChange={(e) => setSector(e.target.value)}>
            {!SECTORS.includes(sector) && sector && <option value={sector}>{sector}</option>}
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="org-vat">VAT / tax number</Label>
          <TextInput
            id="org-vat"
            value={billing.vat}
            onChange={(e) => patch({ vat: e.target.value })}
            placeholder="e.g. FR 12 345678901"
          />
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <Eyebrow className="mb-3 tracking-[0.1em]">Billing address</Eyebrow>
        <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="bill-entity">Legal billing entity</Label>
            <TextInput
              id="bill-entity"
              value={billing.entity}
              onChange={(e) => patch({ entity: e.target.value })}
              placeholder="e.g. Helvetica Systems AG"
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="bill-address">Address</Label>
            <TextInput
              id="bill-address"
              value={billing.address}
              onChange={(e) => patch({ address: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bill-city">City</Label>
            <TextInput
              id="bill-city"
              value={billing.city}
              onChange={(e) => patch({ city: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="bill-postcode">Postcode</Label>
            <TextInput
              id="bill-postcode"
              value={billing.postcode}
              onChange={(e) => patch({ postcode: e.target.value })}
            />
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <Label htmlFor="bill-country">Country</Label>
            <TextInput
              id="bill-country"
              value={billing.country}
              onChange={(e) => patch({ country: e.target.value })}
            />
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------
   Partner lead
   --------------------------------------------------------------- */

function LeadContact({ partnerId, lead }: { partnerId: string; lead: PartnerUser | null }) {
  const [name, setName] = useState(lead?.name ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [telephone, setTelephone] = useState(lead?.telephone ?? '');

  return (
    <Section
      title="Main contact & portal access"
      description="The Partner Lead. They can invite colleagues and set what each can see."
      onSave={() => saveLead(partnerId, lead?.id ?? null, { name, email, telephone })}
    >
      <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
        <div className="col-span-2 max-md:col-span-1">
          <Label htmlFor="lead-name" required>
            Contact name
          </Label>
          <TextInput
            id="lead-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
          />
        </div>
        <div>
          <Label htmlFor="lead-email" required>
            Email
          </Label>
          <TextInput
            id="lead-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="lead-phone">Telephone</Label>
          <TextInput
            id="lead-phone"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+44 …"
          />
        </div>
      </div>
      <Help>
        Invitations are not sent yet — that needs the email provider and magic-link sign-in.
        Saving the contact now means it is ready when they are.
      </Help>
    </Section>
  );
}

/* ---------------------------------------------------------------
   Signed agreement
   --------------------------------------------------------------- */

function Contract({
  partnerId,
  participation,
}: {
  partnerId: string;
  participation: Participation;
}) {
  const router = useRouter();
  const [contract, setContract] = useState(participation.contract ?? null);
  const [, startTransition] = useTransition();

  function store(next: { name: string; url: string } | null) {
    setContract(next ? { name: next.name, dataUrl: next.url } : null);
    startTransition(async () => {
      await saveContract(partnerId, participation.id, next);
      router.refresh();
    });
  }

  return (
    <Section
      title="Signed agreement"
      description="Shown to the partner in My participation, so they always have their contract to hand."
    >
      {contract?.name ? (
        <div className="flex items-center gap-3 rounded-md border border-line-3 bg-inset px-[13px] py-[10px]">
          <FileText size={16} className="shrink-0 text-accent" />
          <a
            href={contract.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-[13px] text-accent no-underline"
          >
            {contract.name}
          </a>
          <button
            onClick={() => {
              if (window.confirm('Remove the signed agreement? The partner will no longer see it.'))
                store(null);
            }}
            className="shrink-0 cursor-pointer border-none bg-transparent text-[12px] text-warn"
          >
            Remove
          </button>
        </div>
      ) : (
        <FileUpload
          purpose="document"
          folder="contracts"
          label="Upload the signed agreement (PDF)"
          onUploaded={(f) => store({ name: f.name, url: f.url })}
        />
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------
   Package
   --------------------------------------------------------------- */

function Package({
  partnerId,
  participation,
  forms,
  tasks,
}: {
  partnerId: string;
  participation: Participation;
  forms: FormDef[];
  tasks: TaskTemplate[];
}) {
  const [items, setItems] = useState<InventoryItem[]>(participation.inventory ?? []);

  function add() {
    setItems((xs) => [
      ...xs,
      {
        id: '',
        type: 'Dedicated Space',
        name: '',
        description: '',
        cost: 0,
        quantity: 1,
        standNumber: '',
        refs: [],
      },
    ]);
  }

  function update(index: number, patch: Partial<InventoryItem>) {
    setItems((xs) => xs.map((x, i) => (i === index ? { ...x, ...patch } : x)));
  }

  return (
    <Section
      title="Package"
      description="Everything this partner has purchased or been allocated, line by line. Shown to them in My participation."
      onSave={() => saveInventory(partnerId, participation.id, items)}
      action={
        <button
          onClick={add}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill bg-brand px-4 py-2 text-[12.5px] text-on-brand"
        >
          <Plus size={14} /> Add item
        </button>
      }
    >
      {items.length === 0 ? (
        <p className="text-[12.5px] text-ink-4">
          No items yet. Add dedicated space, introductions, branding, bespoke or delegate
          passes.
        </p>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {items.map((item, i) => (
            <InventoryRow
              key={i}
              item={item}
              index={i}
              forms={forms}
              tasks={tasks}
              onChange={(p) => update(i, p)}
              onRemove={() => setItems((xs) => xs.filter((_, k) => k !== i))}
            />
          ))}
        </div>
      )}
    </Section>
  );
}

function InventoryRow({
  item,
  index,
  forms,
  tasks,
  onChange,
  onRemove,
}: {
  item: InventoryItem;
  index: number;
  forms: FormDef[];
  tasks: TaskTemplate[];
  onChange: (p: Partial<InventoryItem>) => void;
  onRemove: () => void;
}) {
  const isPasses = item.type === 'Delegate Passes';
  const isSpace = item.type === 'Dedicated Space';

  const small =
    'w-full rounded-sm border border-line-4 bg-panel px-[11px] py-[9px] text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  function toggleRef(kind: 'task' | 'form', id: string) {
    const has = (item.refs ?? []).some((r) => r.kind === kind && r.id === id);
    onChange({
      refs: has
        ? (item.refs ?? []).filter((r) => !(r.kind === kind && r.id === id))
        : [...(item.refs ?? []), { kind, id }],
    });
  }

  return (
    <div className="rounded-lg border border-line-3 bg-inset px-[18px] py-4">
      <div className="mb-3 flex items-start gap-3 max-md:flex-wrap">
        <select
          className={clsx(small, 'w-[190px] shrink-0 cursor-pointer max-md:w-full')}
          value={item.type}
          onChange={(e) => {
            const type = e.target.value as InventoryType;
            // Switching to passes replaces the free-text name with a
            // fixed product, so clear anything that no longer applies.
            onChange(
              type === 'Delegate Passes'
                ? {
                    type,
                    passType: 'Associate Pass',
                    name: 'Associate Pass',
                    description: PASS_TYPES['Associate Pass'],
                    standNumber: '',
                  }
                : { type, passType: undefined },
            );
          }}
          aria-label={`Item ${index + 1} type`}
        >
          {INVENTORY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {isPasses ? (
          <select
            className={clsx(small, 'min-w-0 flex-1 cursor-pointer')}
            value={item.passType ?? 'Associate Pass'}
            onChange={(e) =>
              onChange({
                passType: e.target.value,
                name: e.target.value,
                description: PASS_TYPES[e.target.value] ?? '',
              })
            }
            aria-label={`Item ${index + 1} pass type`}
          >
            {Object.keys(PASS_TYPES).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : (
          <input
            className={clsx(small, 'min-w-0 flex-1')}
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Item name, e.g. Corner stand · 6m × 4m"
            aria-label={`Item ${index + 1} name`}
          />
        )}

        <button
          onClick={onRemove}
          aria-label={`Remove item ${index + 1}`}
          className="flex h-[34px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-warn-line bg-transparent text-warn hover:bg-warn-fill"
        >
          <X size={14} />
        </button>
      </div>

      {isSpace && (
        <div className="mb-3">
          <Label htmlFor={`stand-${index}`}>Stand number</Label>
          <input
            id={`stand-${index}`}
            className={clsx(small, 'w-[180px]')}
            value={item.standNumber}
            onChange={(e) => onChange({ standNumber: e.target.value })}
            placeholder="e.g. A12"
          />
        </div>
      )}

      {isPasses ? (
        <div className="mb-3 text-[12.5px] text-ink-3">{item.description}</div>
      ) : (
        <textarea
          className={clsx(small, 'mb-3 resize-y')}
          rows={2}
          value={item.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Description"
          aria-label={`Item ${index + 1} description`}
        />
      )}

      <div className="mb-3 flex gap-3">
        <div className="flex-1">
          <Label htmlFor={`cost-${index}`}>Price (€, exc. tax)</Label>
          <input
            id={`cost-${index}`}
            type="number"
            min={0}
            className={small}
            value={item.cost}
            onChange={(e) => onChange({ cost: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="w-[120px]">
          <Label htmlFor={`qty-${index}`}>Quantity</Label>
          <input
            id={`qty-${index}`}
            type="number"
            min={1}
            className={small}
            value={item.quantity}
            onChange={(e) => onChange({ quantity: Number(e.target.value) || 1 })}
          />
        </div>
      </div>

      <div>
        <Label>Related {`${'tasks'} & forms`}</Label>
        <div className="flex flex-wrap gap-2">
          {tasks.map((t) => {
            const on = (item.refs ?? []).some((r) => r.kind === 'task' && r.id === t.id);
            return (
              <button
                key={t.id}
                onClick={() => toggleRef('task', t.id)}
                aria-pressed={on}
                className={clsx(
                  'cursor-pointer rounded-pill border px-[11px] py-[5px] text-[11.5px]',
                  on
                    ? 'border-accent-line bg-accent-fill text-accent'
                    : 'border-line-3 text-ink-4 hover:text-ink',
                )}
              >
                {t.title}
              </button>
            );
          })}
          {forms.map((f) => {
            const on = (item.refs ?? []).some((r) => r.kind === 'form' && r.id === f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleRef('form', f.id)}
                aria-pressed={on}
                className={clsx(
                  'cursor-pointer rounded-pill border px-[11px] py-[5px] text-[11.5px]',
                  on
                    ? 'border-brand-line bg-brand-fill text-info'
                    : 'border-line-3 text-ink-4 hover:text-ink',
                )}
              >
                {f.title}
              </button>
            );
          })}
        </div>
        <Help>
          These become clickable chips on the partner&rsquo;s package card, and set the
          &ldquo;next deadline&rdquo; shown against the item.
        </Help>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Entitlements
   --------------------------------------------------------------- */

function Entitlements({
  partnerId,
  participation,
  entitlements,
}: {
  partnerId: string;
  participation: Participation;
  entitlements: Entitlement[];
}) {
  const [keys, setKeys] = useState<string[]>(participation.addedEntitlements ?? []);

  return (
    <Section
      title="Entitlements"
      description="What this partner is entitled to. These decide which modules, tasks, forms, form fields, pages, files and products they see."
      onSave={() =>
        saveParticipation(partnerId, participation.id, {
          addedEntitlements: keys,
          formDueDates: participation.formDueDates ?? {},
          taskDueDates: participation.taskDueDates ?? {},
          partnerNotes: participation.partnerNotes,
          internalNotes: participation.internalNotes,
          passAllocation: participation.passAllocation,
          standRef: participation.standRef,
        })
      }
    >
      <div className="flex flex-wrap gap-2">
        {entitlements.map((e) => {
          const on = keys.includes(e.key);
          return (
            <button
              key={e.key}
              onClick={() =>
                setKeys((ks) => (on ? ks.filter((k) => k !== e.key) : [...ks, e.key]))
              }
              aria-pressed={on}
              className={clsx(
                'cursor-pointer rounded-pill border px-[13px] py-[7px] text-[12.5px] transition-colors',
                on
                  ? 'border-accent-line bg-accent-fill text-accent'
                  : 'border-line-3 bg-transparent text-ink-3 hover:text-ink',
              )}
            >
              {e.label}
            </button>
          );
        })}
      </div>
      <Help>
        {keys.length === 0
          ? 'No entitlements — this partner will see only the always-on modules.'
          : `${keys.length} of ${entitlements.length} enabled.`}
      </Help>
    </Section>
  );
}

/* ---------------------------------------------------------------
   Deadlines
   --------------------------------------------------------------- */

function Deadlines({
  partnerId,
  participation,
  forms,
  tasks,
}: {
  partnerId: string;
  participation: Participation;
  forms: FormDef[];
  tasks: TaskTemplate[];
}) {
  const [facet, setFacet] = useState<'forms' | 'tasks'>('forms');
  const [formDates, setFormDates] = useState<Record<string, string>>(
    participation.formDueDates ?? {},
  );
  const [taskDates, setTaskDates] = useState<Record<string, string>>(
    participation.taskDueDates ?? {},
  );

  const rows =
    facet === 'forms'
      ? forms.map((f) => ({ id: f.id, title: f.title, fallback: f.dueDate }))
      : tasks.map((t) => ({ id: t.id, title: t.title, fallback: t.dueDate }));

  const dates = facet === 'forms' ? formDates : taskDates;
  const setDates = facet === 'forms' ? setFormDates : setTaskDates;

  return (
    <Section
      title="Deadlines"
      description="Override any date for this partner. Leave blank to use the event default; an item with no date anywhere shows as “Date to be confirmed” and is never flagged overdue."
      onSave={() =>
        saveParticipation(partnerId, participation.id, {
          addedEntitlements: participation.addedEntitlements ?? [],
          formDueDates: formDates,
          taskDueDates: taskDates,
          partnerNotes: participation.partnerNotes,
          internalNotes: participation.internalNotes,
          passAllocation: participation.passAllocation,
          standRef: participation.standRef,
        })
      }
      action={
        <div className="flex shrink-0 gap-2">
          {(['forms', 'tasks'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFacet(f)}
              className={clsx(
                'cursor-pointer rounded-pill border px-[14px] py-[6px] text-[12px] capitalize',
                facet === f
                  ? 'border-accent-line bg-accent-fill text-accent'
                  : 'border-line-3 text-ink-3 hover:text-ink',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-[9px]">
        {rows.map((row) => {
          const override = dates[row.id] ?? '';
          return (
            <div
              key={row.id}
              className="flex items-center gap-3 rounded-md border border-line-2 bg-inset px-[14px] py-[10px] max-md:flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-ink">{row.title}</div>
                <div className="mt-[2px] text-[11.5px] text-ink-4">
                  {override
                    ? 'Set for this partner'
                    : row.fallback
                      ? `Event default · ${row.fallback}`
                      : 'No date set — “Date to be confirmed”'}
                </div>
              </div>
              <input
                type="date"
                value={override}
                onChange={(e) => setDates((d) => ({ ...d, [row.id]: e.target.value }))}
                aria-label={`${row.title} deadline`}
                className="w-[150px] shrink-0 rounded-sm border border-line-4 bg-panel px-[10px] py-[7px] text-[12.5px] text-ink outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line"
              />
              {override && (
                <button
                  onClick={() =>
                    setDates((d) => {
                      const next = { ...d };
                      delete next[row.id];
                      return next;
                    })
                  }
                  className="shrink-0 cursor-pointer border-none bg-transparent text-[12px] text-ink-4 hover:text-ink"
                >
                  Reset
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------------------------------------------------------
   Requested files
   --------------------------------------------------------------- */

function RequestedFiles({
  partnerId,
  participation,
}: {
  partnerId: string;
  participation: Participation;
}) {
  const [files, setFiles] = useState<RequestedFile[]>(participation.requestedFiles ?? []);

  const small =
    'w-full rounded-sm border border-line-4 bg-panel px-[11px] py-[9px] text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  return (
    <Section
      title="Files you need from them"
      description="Documents the BOARD team needs this partner to provide — insurance certificates, method statements, artwork. Listed separately in their Files area from the library they can download."
      onSave={() => saveRequestedFiles(partnerId, participation.id, files)}
      action={
        <button
          onClick={() =>
            setFiles((xs) => [
              ...xs,
              { id: '', label: '', due: null, required: true, file: null },
            ])
          }
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill bg-brand px-4 py-2 text-[12.5px] text-on-brand"
        >
          <Plus size={14} /> Request a file
        </button>
      }
    >
      {files.length === 0 ? (
        <p className="text-[12.5px] text-ink-4">Nothing requested from this partner yet.</p>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-md border border-line-2 bg-inset px-[14px] py-[11px] max-md:flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <input
                  className={small}
                  value={f.label}
                  onChange={(e) =>
                    setFiles((xs) =>
                      xs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  placeholder="e.g. Public liability insurance certificate"
                  aria-label={`Requested file ${i + 1} label`}
                />
                {f.file && (
                  <div className="mt-[6px] flex items-center gap-2 text-[11.5px] text-accent">
                    <Check size={12} /> {f.file.name} — provided
                  </div>
                )}
              </div>
              <input
                type="date"
                value={f.due ?? ''}
                onChange={(e) =>
                  setFiles((xs) =>
                    xs.map((x, k) => (k === i ? { ...x, due: e.target.value || null } : x)),
                  )
                }
                aria-label={`Requested file ${i + 1} due date`}
                className="w-[150px] shrink-0 rounded-sm border border-line-4 bg-panel px-[10px] py-[9px] text-[12.5px] text-ink outline-none focus:border-accent-line focus:ring-2 focus:ring-accent-line"
              />
              <button
                onClick={() => setFiles((xs) => xs.filter((_, k) => k !== i))}
                aria-label={`Remove requested file ${i + 1}`}
                className="flex h-[34px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-warn-line bg-transparent text-warn hover:bg-warn-fill"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/* ---------------------------------------------------------------
   Notes
   --------------------------------------------------------------- */

function Notes({
  partnerId,
  participation,
}: {
  partnerId: string;
  participation: Participation;
}) {
  const [partnerNotes, setPartnerNotes] = useState(participation.partnerNotes ?? '');
  const [internalNotes, setInternalNotes] = useState(participation.internalNotes ?? '');

  return (
    <Section
      title="Notes"
      onSave={() =>
        saveParticipation(partnerId, participation.id, {
          addedEntitlements: participation.addedEntitlements ?? [],
          formDueDates: participation.formDueDates ?? {},
          taskDueDates: participation.taskDueDates ?? {},
          partnerNotes,
          internalNotes,
          passAllocation: participation.passAllocation,
          standRef: participation.standRef,
        })
      }
    >
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor="notes-partner">Visible to the partner</Label>
          <TextArea
            id="notes-partner"
            rows={3}
            value={partnerNotes}
            onChange={(e) => setPartnerNotes(e.target.value)}
            placeholder="Shown on their dashboard…"
          />
        </div>
        <div>
          <Label htmlFor="notes-internal">Internal only</Label>
          <TextArea
            id="notes-internal"
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Only your team sees this…"
            className="border-warn-line focus:border-warn-line"
          />
          <Help>Never shown to the partner, in the portal or in any email.</Help>
        </div>
      </div>
    </Section>
  );
}
