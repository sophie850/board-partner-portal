'use client';

import { clsx } from 'clsx';
import { Check, Copy, KeyRound, Plus, Webhook } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  Select,
  StatusPill,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import { fmtDate } from '@/lib/resolvers';
import type { ApprovalMode } from '@/lib/types';

import {
  rotateWebhookSecret,
  saveSupplier,
  setSupplierActive,
} from '@/app/organiser/suppliers/actions';

/* ============================================================
   Suppliers

   The webhook secret is deliberately absent from this component's
   props — the server never sends it. A supplier either has one or
   does not, and it can be replaced but never read back.
   ============================================================ */

/** Exactly what the server is willing to send a browser. */
export interface SupplierView {
  id: string;
  name: string;
  category: string;
  contact: string;
  notifEmails: string[];
  webhookUrl: string;
  routingKey: string;
  active: boolean;
  approvalDefault: ApprovalMode;
  notes: string;
  /** Whether a secret is set. Never the secret itself. */
  hasSecret: boolean;
  productCount: number;
  openOrders: number;
  /** The last day they take an order, or null if they never close. */
  closesOn: string | null;
}

const APPROVAL_NOTE: Record<ApprovalMode, string> = {
  auto: 'Orders confirm immediately and the webhook fires straight away.',
  manual: 'Orders wait for your review. The webhook fires only once you confirm.',
  quote: 'A quote is requested first. The partner accepts or declines before anything is confirmed.',
};

export function SupplierList({ suppliers }: { suppliers: SupplierView[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-2 rounded-pill bg-brand px-[18px] py-[11px] text-[13.5px] text-on-brand"
        >
          <Plus size={16} /> New supplier
        </button>
      </div>

      {creating && (
        <div className="mb-4">
          <SupplierCard supplier={null} onDone={() => setCreating(false)} startOpen />
        </div>
      )}

      <div className="flex flex-col gap-[10px]">
        {suppliers.map((s) => (
          <SupplierCard key={s.id} supplier={s} />
        ))}
      </div>
    </>
  );
}

function SupplierCard({
  supplier,
  onDone,
  startOpen,
}: {
  supplier: SupplierView | null;
  onDone?: () => void;
  startOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(supplier?.name ?? '');
  const [category, setCategory] = useState(supplier?.category ?? '');
  const [contact, setContact] = useState(supplier?.contact ?? '');
  const [emails, setEmails] = useState((supplier?.notifEmails ?? []).join(', '));
  const [webhookUrl, setWebhookUrl] = useState(supplier?.webhookUrl ?? '');
  const [routingKey, setRoutingKey] = useState(supplier?.routingKey ?? '');
  const [approvalDefault, setApprovalDefault] = useState<ApprovalMode>(
    supplier?.approvalDefault ?? 'manual',
  );
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [newSecret, setNewSecret] = useState('');
  const [revealed, setRevealed] = useState<string | null>(null);

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSupplier({
        id: supplier?.id,
        name,
        category,
        contact,
        notifEmails: emails.split(',').map((e) => e.trim()).filter(Boolean),
        webhookUrl,
        routingKey,
        newWebhookSecret: newSecret || undefined,
        active: supplier?.active ?? true,
        approvalDefault,
        notes,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewSecret('');
      setSaved(true);
      router.refresh();
      onDone?.();
      window.setTimeout(() => setSaved(false), 2500);
    });
  }

  function rotate() {
    if (!supplier) return;
    if (
      !window.confirm(
        `Replace ${supplier.name}'s webhook secret? Deliveries will fail until they update it at their end. You will see the new value once, and never again.`,
      )
    )
      return;

    setError(null);
    startTransition(async () => {
      const result = await rotateWebhookSecret(supplier.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRevealed(result.secret);
      router.refresh();
    });
  }

  function toggleActive() {
    if (!supplier) return;
    startTransition(async () => {
      await setSupplierActive(supplier.id, !supplier.active);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-line-2 bg-panel">
      {supplier && (
        <div className="flex flex-wrap items-center gap-4 px-[18px] py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[10px]">
              <span className="text-[14.5px] text-ink">{supplier.name}</span>
              {!supplier.active && <StatusPill tone="muted">Inactive</StatusPill>}
              {supplier.closesOn && new Date(supplier.closesOn) < new Date() && (
                <StatusPill tone="muted">Closed to orders</StatusPill>
              )}
              {!supplier.hasSecret && supplier.webhookUrl && (
                <StatusPill tone="warn">No signing secret</StatusPill>
              )}
            </div>
            <div className="mt-[3px] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-4">
              <span>{supplier.category || 'Uncategorised'}</span>
              <span aria-hidden>·</span>
              <span>
                {supplier.productCount} {supplier.productCount === 1 ? 'product' : 'products'}
              </span>
              {supplier.closesOn && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {new Date(supplier.closesOn) < new Date() ? 'Closed' : 'Closes'}{' '}
                    {fmtDate(supplier.closesOn)}
                  </span>
                </>
              )}
              {supplier.openOrders > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="text-warn">{supplier.openOrders} awaiting action</span>
                </>
              )}
            </div>
          </div>

          <StatusPill tone={supplier.approvalDefault === 'auto' ? 'good' : 'neutral'}>
            {supplier.approvalDefault}
          </StatusPill>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="shrink-0 cursor-pointer rounded-pill border border-line-4 px-[14px] py-[6px] text-[12px] text-ink-2 hover:border-line-5 hover:text-ink"
          >
            {open ? 'Close' : 'Edit'}
          </button>
        </div>
      )}

      {open && (
        <div
          className={clsx(
            'px-[18px] py-4',
            supplier && 'border-t border-line',
          )}
        >
          {error && (
            <Callout tone="warn" className="mb-4">
              {error}
            </Callout>
          )}

          <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
            <div>
              <Label htmlFor={`sup-name-${supplier?.id ?? 'new'}`} required>
                Name
              </Label>
              <TextInput
                id={`sup-name-${supplier?.id ?? 'new'}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aztec"
              />
            </div>
            <div>
              <Label htmlFor={`sup-cat-${supplier?.id ?? 'new'}`}>Category</Label>
              <TextInput
                id={`sup-cat-${supplier?.id ?? 'new'}`}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="AV &amp; Technical"
              />
            </div>
            <div>
              <Label htmlFor={`sup-contact-${supplier?.id ?? 'new'}`}>Primary contact</Label>
              <TextInput
                id={`sup-contact-${supplier?.id ?? 'new'}`}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor={`sup-emails-${supplier?.id ?? 'new'}`}>Notification emails</Label>
              <TextInput
                id={`sup-emails-${supplier?.id ?? 'new'}`}
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                placeholder="orders@supplier.example, ops@supplier.example"
              />
              <Help>Comma separated.</Help>
            </div>
          </div>

          <div className="mt-4">
            <Label htmlFor={`sup-approval-${supplier?.id ?? 'new'}`}>
              Default approval behaviour
            </Label>
            <Select
              id={`sup-approval-${supplier?.id ?? 'new'}`}
              value={approvalDefault}
              onChange={(e) => setApprovalDefault(e.target.value as ApprovalMode)}
            >
              <option value="auto">Auto-confirm</option>
              <option value="manual">Needs organiser approval</option>
              <option value="quote">Quote required</option>
            </Select>
            <Help>{APPROVAL_NOTE[approvalDefault]}</Help>
          </div>

          {/* ---- webhook ---- */}
          <div className="mt-5 rounded-lg border border-line-3 bg-inset px-[16px] py-4">
            <Eyebrow className="mb-3 flex items-center gap-2 tracking-[0.1em]">
              <Webhook size={13} /> Outbound webhook
            </Eyebrow>

            <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
              <div className="col-span-2 max-md:col-span-1">
                <Label htmlFor={`sup-url-${supplier?.id ?? 'new'}`}>Zapier catch URL</Label>
                <TextInput
                  id={`sup-url-${supplier?.id ?? 'new'}`}
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/…"
                />
              </div>
              <div>
                <Label htmlFor={`sup-routing-${supplier?.id ?? 'new'}`}>Routing key</Label>
                <TextInput
                  id={`sup-routing-${supplier?.id ?? 'new'}`}
                  value={routingKey}
                  onChange={(e) => setRoutingKey(e.target.value)}
                  placeholder="board-av"
                />
              </div>
              <div>
                <Label htmlFor={`sup-secret-${supplier?.id ?? 'new'}`}>Signing secret</Label>
                <TextInput
                  id={`sup-secret-${supplier?.id ?? 'new'}`}
                  type="password"
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  placeholder={supplier?.hasSecret ? '•••••••• (set)' : 'Not set'}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {supplier && (
                <Button size="sm" variant="ghost" onClick={rotate} disabled={pending}>
                  <KeyRound size={13} /> Generate a new secret
                </Button>
              )}
              <Help>
                Used to sign every payload so the supplier can prove it came from BOARD. It is
                stored server-side and never sent to a browser — including this one, which is
                why the current value cannot be shown.
              </Help>
            </div>

            {revealed && (
              <div className="mt-3 rounded-md border border-accent-line bg-accent-fill px-[14px] py-3">
                <div className="mb-2 text-[12px] text-ink">
                  Copy this now — it will not be shown again.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-sm bg-inset px-[10px] py-2 font-mono text-[12px] text-ink">
                    {revealed}
                  </code>
                  <button
                    onClick={() => navigator.clipboard?.writeText(revealed)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line-4 px-[12px] py-[6px] text-[12px] text-ink-2"
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Label htmlFor={`sup-notes-${supplier?.id ?? 'new'}`}>Internal notes</Label>
            <TextArea
              id={`sup-notes-${supplier?.id ?? 'new'}`}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button size="sm" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : supplier ? 'Save changes' : 'Create supplier'}
            </Button>
            {saved && (
              <span className="flex items-center gap-[6px] text-[12px] text-accent">
                <Check size={13} /> Saved
              </span>
            )}
            <div className="flex-1" />
            {supplier && (
              <Button size="sm" variant="quiet" onClick={toggleActive} disabled={pending}>
                {supplier.active ? 'Deactivate' : 'Reactivate'}
              </Button>
            )}
          </div>

          {supplier && (
            <Help>
              Suppliers are referenced by products and orders, so they are deactivated rather
              than deleted — that hides them from the shop while keeping order history intact.
            </Help>
          )}
        </div>
      )}
    </div>
  );
}
