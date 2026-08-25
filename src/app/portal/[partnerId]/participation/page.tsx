import {
  Building2,
  FileText,
  Handshake,
  MapPin,
  Megaphone,
  Sparkles,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Eyebrow, PageTitle, Panel, Rise, StatusPill } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import {
  fmtDate,
  money,
  nextDeadline,
  orderTotal,
  packageValue,
  resolveForms,
  resolveTasks,
  terms,
} from '@/lib/resolvers';
import type { Db, InventoryItem, Participation } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Icon and accent per line-item type, so the list reads at a glance. */
const TYPE_STYLE: Record<
  string,
  { icon: React.ReactNode; accent: string }
> = {
  'Dedicated Space': { icon: <MapPin size={17} />, accent: 'var(--bp-accent)' },
  'Curated Introductions': { icon: <Handshake size={17} />, accent: 'var(--bp-info)' },
  Branding: { icon: <Megaphone size={17} />, accent: 'var(--bp-amber)' },
  Bespoke: { icon: <Sparkles size={17} />, accent: 'var(--bp-accent)' },
  'Delegate Passes': { icon: <Ticket size={17} />, accent: 'var(--bp-info)' },
};

export default async function ParticipationPage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === partnerId);
  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!partner || !part) notFound();

  const t = terms(db);
  const base = `/portal/${partnerId}`;
  const inventory = part.inventory ?? [];

  const value = packageValue(part);
  const passes = inventory
    .filter((i) => i.type === 'Delegate Passes')
    .reduce((a, i) => a + i.quantity, 0);

  const soonest = nextDeadline(
    db,
    part,
    inventory.flatMap((i) => i.refs ?? []),
  );

  // Extras are derived from what they have ordered in the shop, not
  // authored — so the two can never disagree.
  const orders = db.orders.filter((o) => o.participationId === part.id);
  const extrasValue = orders.reduce((a, o) => a + orderTotal(db, o.id), 0);

  return (
    <Rise>
      <Eyebrow className="mb-2">{t.partnerPortal}</Eyebrow>
      <PageTitle>My {t.lower.participation}</PageTitle>
      <p className="mt-2 mb-7 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-3">
        Everything {partner.name} has secured for {db.event.name}, line by line, with what is
        needed from you against each.
      </p>

      {/* ---- stat strip ---- */}
      <div className="bp-grid-2up mb-8 grid grid-cols-4 gap-3 max-md:grid-cols-2 max-[460px]:grid-cols-1">
        <StatCard label="Package value" value={money(db, value)} note="exc. tax" />
        <StatCard label="Items" value={String(inventory.length)} />
        <StatCard label="Delegate passes" value={String(passes || part.passAllocation || 0)} />
        <StatCard
          label="Next deadline"
          value={soonest ? fmtDate(soonest) : '—'}
          note={soonest ? undefined : 'Nothing scheduled'}
        />
      </div>

      {/* ---- the package ---- */}
      <section className="mb-8">
        <h2 className="mb-3 text-[15px] font-light text-ink">Your package</h2>

        {inventory.length === 0 ? (
          <Panel className="px-[22px] py-6 text-[13.5px] text-ink-3">
            Your package has not been set up yet. Your BOARD contact will confirm the detail
            shortly.
          </Panel>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {inventory.map((item) => (
              <InventoryCard key={item.id} db={db} part={part} item={item} base={base} />
            ))}
          </div>
        )}
      </section>

      {/* ---- extras, derived from orders ---- */}
      {orders.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-[15px] font-light text-ink">Extras you have ordered</h2>
          <Panel className="px-[18px] py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-ink-2">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'} through the shop
              </div>
              <div className="text-[15px] font-light text-ink">{money(db, extrasValue)}</div>
            </div>
            <Link
              href={`${base}/orders`}
              className="mt-3 inline-block text-[12.5px] text-accent no-underline"
            >
              See your orders
            </Link>
          </Panel>
        </section>
      )}

      {/* ---- agreement + billing ---- */}
      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        <section>
          <h2 className="mb-3 text-[15px] font-light text-ink">Signed agreement</h2>
          <Panel className="px-[18px] py-4">
            {part.contract?.name ? (
              <div className="text-[13px] text-ink">{part.contract.name}</div>
            ) : (
              <p className="text-[13px] text-ink-3">
                No signed agreement uploaded yet. Your BOARD contact will add it here once it
                is countersigned.
              </p>
            )}
          </Panel>
        </section>

        <section>
          <h2 className="mb-3 text-[15px] font-light text-ink">Billing details</h2>
          <Panel className="px-[18px] py-4">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[12.5px]">
              <dt className="text-ink-4">Entity</dt>
              <dd className="m-0 text-ink-2">{partner.billing?.entity || '—'}</dd>
              <dt className="text-ink-4">Address</dt>
              <dd className="m-0 text-ink-2">
                {[
                  partner.billing?.address,
                  partner.billing?.city,
                  partner.billing?.postcode,
                  partner.billing?.country,
                ]
                  .filter(Boolean)
                  .join(', ') || '—'}
              </dd>
              <dt className="text-ink-4">VAT</dt>
              <dd className="m-0 text-ink-2">{partner.billing?.vat || '—'}</dd>
            </dl>
          </Panel>
        </section>
      </div>
    </Rise>
  );
}

/* ---------------------------------------------------------------
   One line item
   --------------------------------------------------------------- */

function InventoryCard({
  db,
  part,
  item,
  base,
}: {
  db: Db;
  part: Participation;
  item: InventoryItem;
  base: string;
}) {
  const style = TYPE_STYLE[item.type] ?? {
    icon: <Building2 size={17} />,
    accent: 'var(--bp-text-3)',
  };

  const tasks = resolveTasks(db, part);
  const forms = resolveForms(db, part);
  const due = nextDeadline(db, part, item.refs ?? []);

  const chips = (item.refs ?? [])
    .map((ref) => {
      if (ref.kind === 'task') {
        const task = tasks.find((x) => x.id === ref.id);
        return task
          ? { label: task.title, href: `${base}/tasks`, done: task.completed }
          : null;
      }
      const form = forms.find((x) => x.id === ref.id);
      return form
        ? {
            label: form.title,
            href: `${base}/forms/${form.id}`,
            done: form.state.status === 'approved' || form.state.status === 'submitted',
          }
        : null;
    })
    .filter(Boolean) as Array<{ label: string; href: string; done: boolean }>;

  return (
    <div className="relative overflow-hidden rounded-xl border border-line-2 bg-panel">
      {/* accent bar keyed to the item type */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: style.accent }}
      />

      <div className="flex gap-4 px-[20px] py-[18px] max-md:flex-wrap">
        <span
          className="mt-[2px] flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line-3 bg-chip"
          style={{ color: style.accent }}
        >
          {style.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[10px]">
            <span className="text-[15px] text-ink">{item.name}</span>
            {item.standNumber && (
              <StatusPill tone="good">Stand {item.standNumber}</StatusPill>
            )}
          </div>

          <div className="mt-[3px] text-[11px] tracking-[0.06em] text-ink-4 uppercase">
            {item.type}
            {item.quantity > 1 && ` · ×${item.quantity}`}
          </div>

          {item.description && (
            <p className="mt-[8px] max-w-[64ch] text-[13px] leading-relaxed text-ink-3">
              {item.description}
            </p>
          )}

          {chips.length > 0 && (
            <div className="mt-[10px] flex flex-wrap gap-2">
              {chips.map((chip) => (
                <Link
                  key={chip.href + chip.label}
                  href={chip.href}
                  className={`inline-flex items-center gap-[6px] rounded-pill border px-[10px] py-[4px] text-[11.5px] no-underline transition-colors ${
                    chip.done
                      ? 'border-line-3 bg-chip text-ink-4'
                      : 'border-accent-line bg-accent-fill text-accent hover:text-accent'
                  }`}
                >
                  <FileText size={11} />
                  {chip.label}
                </Link>
              ))}
            </div>
          )}

          {due && (
            <div className="mt-[10px] text-[12px] text-ink-4">
              Next deadline · {fmtDate(due)}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right max-md:w-full max-md:text-left">
          <div className="text-[15px] font-light text-ink">{money(db, item.cost)}</div>
          {item.quantity > 1 && (
            <div className="mt-[2px] text-[11px] text-ink-4">each</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-line-2 bg-panel px-[18px] py-4">
      <div className="text-[24px] leading-none font-light text-ink">{value}</div>
      <div className="mt-2 text-[11px] tracking-[0.08em] text-ink-4 uppercase">{label}</div>
      {note && <div className="mt-[3px] text-[11px] text-ink-4">{note}</div>}
    </div>
  );
}
