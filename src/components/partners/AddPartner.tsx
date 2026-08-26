'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button, Callout, Help, Label, Panel, TextInput } from '@/components/ui/primitives';

import { createPartner } from '@/app/organiser/partners/actions';

/* ============================================================
   Adding a partner

   Five fields, because everything else is configured afterwards on
   a screen built for it. The main contact is not optional: a
   participation nobody can sign in to is not much use, and asking
   for it later means somebody has to remember to.
   ============================================================ */

export function AddPartner({
  partnerWord,
  trigger = 'button',
}: {
  /** "Partner", "Sponsor" — whatever this event calls them. */
  partnerWord: string;
  /** The empty state opens the form directly rather than offering a button. */
  trigger?: 'button' | 'inline';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(trigger === 'inline');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: '',
    sector: '',
    country: '',
    leadName: '',
    leadEmail: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPartner(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Straight to Configure: a partner with no entitlements sees
      // almost nothing, so the next step is always the same one.
      router.push(`/organiser/partners/${result.partnerId}/configure`);
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus size={14} /> Add {partnerWord.toLowerCase()}
      </Button>
    );
  }

  return (
    <Panel className="mb-6 max-w-[640px] px-[22px] py-[20px]">
      <form onSubmit={submit}>
        <h2 className="mb-1 text-[17px] font-light text-ink">Add a {partnerWord.toLowerCase()}</h2>
        <p className="mb-5 text-[12.5px] leading-relaxed text-ink-4">
          Just enough to create them. Entitlements, deadlines, stand and everything else come
          next, on the configuration screen.
        </p>

        {error && (
          <Callout tone="warn" className="mb-4">
            {error}
          </Callout>
        )}

        <div className="mb-4">
          <Label htmlFor="p-name" required>
            Organisation name
          </Label>
          <TextInput id="p-name" value={form.name} onChange={set('name')} autoFocus />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          <div>
            <Label htmlFor="p-sector">Sector</Label>
            <TextInput
              id="p-sector"
              value={form.sector}
              onChange={set('sector')}
              placeholder="Technology, Financial services…"
            />
          </div>
          <div>
            <Label htmlFor="p-country">Country</Label>
            <TextInput id="p-country" value={form.country} onChange={set('country')} />
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-4 text-[12px] tracking-[0.12em] text-ink-4 uppercase">
            Their main contact
          </div>

          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <Label htmlFor="p-lead" required>
                Full name
              </Label>
              <TextInput id="p-lead" value={form.leadName} onChange={set('leadName')} />
            </div>
            <div>
              <Label htmlFor="p-email" required>
                Email
              </Label>
              <TextInput
                id="p-email"
                type="email"
                value={form.leadEmail}
                onChange={set('leadEmail')}
              />
            </div>
          </div>

          <Help>
            They become the Partner Lead — full access to their own portal, and able to grant
            their colleagues access. No invitation is emailed yet; send them a sign-in link
            from their Team page once you are ready for them.
          </Help>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Adding…' : 'Add and configure'}
          </Button>
          {trigger === 'button' && (
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
