'use client';

import { clsx } from 'clsx';
import { Archive, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FileUpload } from '@/components/ui/FileUpload';
import {
  Button,
  Callout,
  Eyebrow,
  Help,
  Label,
  PageTitle,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import type {
  ApprovalMode,
  Entitlement,
  FieldType,
  Partner,
  Product,
  ProductOption,
  ProductQuestion,
  ShopCategory,
  Supplier,
  VisibilityRule,
} from '@/lib/types';

import type { ProductInput } from '@/app/organiser/products/actions';

/* ============================================================
   Product editor
   ============================================================ */

const APPROVAL_NOTE: Record<ApprovalMode, string> = {
  auto: 'Confirms immediately on checkout, and the supplier is notified straight away.',
  manual: 'Held for your review. Nothing reaches the supplier until you confirm.',
  quote: 'No price is shown. The supplier quotes, then the partner accepts or declines.',
};

const QUESTION_TYPES: Array<{ type: FieldType; label: string }> = [
  { type: 'short_text', label: 'Short text' },
  { type: 'long_text', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'time', label: 'Time' },
  { type: 'file_upload', label: 'File upload' },
];

/** Suppliers a product can be assigned to — inactive ones excluded. */
export function ProductEditor({
  product,
  suppliers,
  categories,
  entitlements,
  partners,
  onSave,
  onArchive,
}: {
  product: Product | null;
  suppliers: Supplier[];
  categories: ShopCategory[];
  entitlements: Entitlement[];
  partners: Partner[];
  onSave: (input: ProductInput) => Promise<{ ok: boolean; id?: string; error?: string }>;
  onArchive?: (id: string, active: boolean) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [supplierId, setSupplierId] = useState(product?.supplierId ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'each');
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(product?.approvalMode ?? 'auto');
  const [quoteOnly, setQuoteOnly] = useState(product?.basePrice === null);
  const [basePrice, setBasePrice] = useState(String(product?.basePrice ?? ''));
  const [taxRate, setTaxRate] = useState(String((product?.taxRate ?? 0.2) * 100));
  const [minQty, setMinQty] = useState(String(product?.minQty ?? 1));
  const [maxQty, setMaxQty] = useState(String(product?.maxQty ?? 10));
  const [orderDeadline, setOrderDeadline] = useState(product?.orderDeadline ?? '');
  const [leadTimeDays, setLeadTimeDays] = useState(String(product?.leadTimeDays ?? 0));
  const [image, setImage] = useState(product?.image ?? null);
  const [options, setOptions] = useState<ProductOption[]>(product?.options ?? []);
  const [questions, setQuestions] = useState<ProductQuestion[]>(product?.questions ?? []);
  const [visibility, setVisibility] = useState<VisibilityRule>(product?.visibility ?? {});

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await onSave({
        id: product?.id,
        name,
        supplierId: supplierId || null,
        categoryId: categoryId || null,
        description,
        unit,
        basePrice: quoteOnly ? null : Number(basePrice) || 0,
        taxRate: (Number(taxRate) || 0) / 100,
        approvalMode,
        minQty: Number(minQty) || 1,
        maxQty: Number(maxQty) || 1,
        orderDeadline: orderDeadline || null,
        leadTimeDays: Number(leadTimeDays) || 0,
        active: product?.active ?? true,
        image,
        options,
        questions,
        visibility,
      });

      if (!result.ok) {
        setError(result.error ?? 'Could not save.');
        return;
      }
      router.push('/organiser/products');
      router.refresh();
    });
  }

  const small =
    'w-full rounded-sm border border-line-4 bg-panel px-[11px] py-[9px] text-[13px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  return (
    <div className="animate-rise max-w-[820px]">
      <Eyebrow className="mb-2">Organiser · Products</Eyebrow>
      <PageTitle className="mb-6">{product ? 'Edit product' : 'New product'}</PageTitle>

      {error && (
        <Callout tone="warn" className="mb-5">
          {error}
        </Callout>
      )}

      {/* ---- basics ---- */}
      <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div className="col-span-2 max-md:col-span-1">
          <Label htmlFor="p-name" required>
            Name
          </Label>
          <TextInput
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder='55" screen on floor stand'
          />
        </div>
        <div>
          <Label htmlFor="p-supplier" required>
            Supplier
          </Label>
          <Select
            id="p-supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="">Choose…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {!s.active ? ' (inactive)' : ''}
              </option>
            ))}
          </Select>
          <Help>Their order and their webhook.</Help>
        </div>
        <div>
          <Label htmlFor="p-category">Category</Label>
          <Select
            id="p-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="p-desc">Description</Label>
        <TextArea
          id="p-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* ---- pricing ---- */}
      <div className="mb-4 rounded-xl border border-line-3 bg-inset px-[18px] py-4">
        <Eyebrow className="mb-3 tracking-[0.1em]">Pricing &amp; approval</Eyebrow>

        <Label htmlFor="p-approval">How this is ordered</Label>
        <Select
          id="p-approval"
          value={approvalMode}
          onChange={(e) => {
            const mode = e.target.value as ApprovalMode;
            setApprovalMode(mode);
            // Quote-required and a fixed price contradict each other,
            // so choosing quote clears the price rather than saving a
            // combination the partner would see as both.
            if (mode === 'quote') setQuoteOnly(true);
          }}
        >
          <option value="auto">Auto-confirm</option>
          <option value="manual">Needs your approval</option>
          <option value="quote">Quote required</option>
        </Select>
        <Help>{APPROVAL_NOTE[approvalMode]}</Help>

        <div className="mt-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
          <div className="col-span-2 max-md:col-span-2">
            <Label htmlFor="p-price">Price (€, exc. tax)</Label>
            <input
              id="p-price"
              type="number"
              min={0}
              className={clsx(small, quoteOnly && 'opacity-40')}
              value={quoteOnly ? '' : basePrice}
              disabled={quoteOnly}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder={quoteOnly ? 'Quoted per order' : '0'}
            />
          </div>
          <div>
            <Label htmlFor="p-tax">Tax %</Label>
            <input
              id="p-tax"
              type="number"
              min={0}
              className={small}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="p-unit">Unit</Label>
            <input
              id="p-unit"
              className={small}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="each"
            />
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-[10px]">
          <input
            type="checkbox"
            checked={quoteOnly}
            disabled={approvalMode === 'quote'}
            onChange={(e) => setQuoteOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--bp-blue)]"
          />
          <span className="text-[13px] text-ink-2">
            No fixed price — quoted per order
            {approvalMode === 'quote' && (
              <span className="text-ink-4"> (implied by quote-required)</span>
            )}
          </span>
        </label>
        <Help>All prices display exclusive of tax, rounded to the nearest euro.</Help>
      </div>

      {/* ---- availability ---- */}
      <div className="mb-4 grid grid-cols-4 gap-3 max-md:grid-cols-2">
        <div>
          <Label htmlFor="p-min">Min qty</Label>
          <input
            id="p-min"
            type="number"
            min={1}
            className={small}
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-max">Max qty</Label>
          <input
            id="p-max"
            type="number"
            min={1}
            className={small}
            value={maxQty}
            onChange={(e) => setMaxQty(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-deadline">Order by</Label>
          <input
            id="p-deadline"
            type="date"
            className={small}
            value={orderDeadline}
            onChange={(e) => setOrderDeadline(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="p-lead">Lead time (days)</Label>
          <input
            id="p-lead"
            type="number"
            min={0}
            className={small}
            value={leadTimeDays}
            onChange={(e) => setLeadTimeDays(e.target.value)}
          />
        </div>
      </div>

      {/* ---- media ---- */}
      <div className="mb-4">
        <Label>Product image</Label>
        {image && (
          <div
            className="mb-2 h-[110px] w-[200px] rounded-md border border-line-3 bg-cover bg-center"
            style={{ backgroundImage: `url('${image}')` }}
            role="img"
            aria-label={`${name} image`}
          />
        )}
        <FileUpload
          purpose="image"
          folder="products"
          label={image ? 'Replace image' : 'Upload an image'}
          compact
          onUploaded={(f) => setImage(f.url)}
        />
        <Help>Without one, the card falls back to a BOARD gradient chosen from the category.</Help>
      </div>

      {/* ---- options ---- */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Options</Label>
          <button
            onClick={() => setOptions((o) => [...o, { name: '', values: [] }])}
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-pill border border-line-3 px-[11px] py-[5px] text-[12px] text-ink-3 hover:text-ink"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {options.length === 0 ? (
          <p className="text-[12.5px] text-ink-4">
            No options — e.g. Colour, Size, Finish. The partner picks one of each when ordering.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-start gap-2 max-md:flex-wrap">
                <input
                  className={clsx(small, 'w-[160px] shrink-0 max-md:w-full')}
                  value={opt.name}
                  onChange={(e) =>
                    setOptions((os) =>
                      os.map((o, k) => (k === i ? { ...o, name: e.target.value } : o)),
                    )
                  }
                  placeholder="Colour"
                  aria-label={`Option ${i + 1} name`}
                />
                <input
                  className={clsx(small, 'min-w-0 flex-1')}
                  value={opt.values.join(', ')}
                  onChange={(e) =>
                    setOptions((os) =>
                      os.map((o, k) =>
                        k === i
                          ? { ...o, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }
                          : o,
                      ),
                    )
                  }
                  placeholder="Rich black, Off white, Teal"
                  aria-label={`Option ${i + 1} values`}
                />
                <button
                  onClick={() => setOptions((os) => os.filter((_, k) => k !== i))}
                  aria-label={`Remove option ${i + 1}`}
                  className="flex h-[34px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-warn-line text-warn"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- questions ---- */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <Label>Questions asked at checkout</Label>
          <button
            onClick={() =>
              setQuestions((q) => [
                ...q,
                { key: `q_${q.length + 1}`, label: '', type: 'short_text', required: true },
              ])
            }
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-pill border border-line-3 px-[11px] py-[5px] text-[12px] text-ink-3 hover:text-ink"
          >
            <Plus size={12} /> Add
          </button>
        </div>
        {questions.length === 0 ? (
          <p className="text-[12.5px] text-ink-4">
            None — e.g. stand number, installation location, print-ready artwork.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {questions.map((q, i) => (
              <div key={i} className="flex items-start gap-2 max-md:flex-wrap">
                <input
                  className={clsx(small, 'min-w-0 flex-1')}
                  value={q.label}
                  onChange={(e) =>
                    setQuestions((qs) =>
                      qs.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  placeholder="Installation location"
                  aria-label={`Question ${i + 1} label`}
                />
                <select
                  className={clsx(small, 'w-[150px] shrink-0 cursor-pointer max-md:w-full')}
                  value={q.type}
                  onChange={(e) =>
                    setQuestions((qs) =>
                      qs.map((x, k) =>
                        k === i ? { ...x, type: e.target.value as FieldType } : x,
                      ),
                    )
                  }
                  aria-label={`Question ${i + 1} type`}
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="flex h-[34px] shrink-0 cursor-pointer items-center gap-2 text-[12px] text-ink-3">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) =>
                      setQuestions((qs) =>
                        qs.map((x, k) => (k === i ? { ...x, required: e.target.checked } : x)),
                      )
                    }
                    className="h-4 w-4 accent-[var(--bp-blue)]"
                  />
                  Required
                </label>
                <button
                  onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))}
                  aria-label={`Remove question ${i + 1}`}
                  className="flex h-[34px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-warn-line text-warn"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- visibility ---- */}
      <div className="mb-7">
        <Label htmlFor="p-vis">Who can order this</Label>
        <VisibilityPicker
          id="p-vis"
          value={visibility}
          onChange={setVisibility}
          entitlements={entitlements}
          partners={partners}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line-2 pt-5">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push('/organiser/products')}
          disabled={pending}
        >
          Cancel
        </Button>
        <div className="flex-1" />
        {product && onArchive && (
          <Button
            variant="quiet"
            disabled={pending}
            onClick={() => {
              if (
                product.active &&
                !window.confirm(
                  `Archive "${product.name}"? It disappears from the shop. Existing orders keep it.`,
                )
              )
                return;
              startTransition(async () => {
                await onArchive(product.id, !product.active);
                router.refresh();
              });
            }}
          >
            <Archive size={13} /> {product.active ? 'Archive' : 'Restore'}
          </Button>
        )}
      </div>
      {product && (
        <Help>
          Products are archived rather than deleted — order line items refer to them, and an
          order has to stay readable long after the shop closes.
        </Help>
      )}
    </div>
  );
}

function VisibilityPicker({
  id,
  value,
  onChange,
  entitlements,
  partners,
}: {
  id: string;
  value: VisibilityRule;
  onChange: (v: VisibilityRule) => void;
  entitlements: Entitlement[];
  partners: Partner[];
}) {
  const keys = Array.isArray(value.keys)
    ? value.keys
    : value.key
      ? [value.key]
      : value.requires
        ? [value.requires]
        : [];
  const type = keys.length ? 'entitlement' : (value.type ?? 'all');
  const selected = value.partners ?? [];

  return (
    <>
      <Select
        id={id}
        value={type === 'partner' ? 'partner' : type === 'entitlement' ? 'entitlement' : 'all'}
        onChange={(e) => {
          const next = e.target.value;
          if (next === 'all') onChange({ type: 'all' });
          else if (next === 'entitlement') onChange({ type: 'entitlement', keys: [] });
          else onChange({ type: 'partner', partners: [] });
        }}
      >
        <option value="all">Every partner who can shop</option>
        <option value="entitlement">Partners with an entitlement</option>
        <option value="partner">Specific partners only</option>
      </Select>

      {type === 'entitlement' && (
        <div className="mt-2">
          <div className="flex flex-wrap gap-2">
            {entitlements.map((e) => {
              const on = keys.includes(e.key);
              return (
                <button
                  key={e.key}
                  onClick={() =>
                    onChange({
                      type: 'entitlement',
                      keys: on ? keys.filter((k) => k !== e.key) : [...keys, e.key],
                    })
                  }
                  aria-pressed={on}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px]',
                    on
                      ? 'border-accent-line bg-accent-fill text-accent'
                      : 'border-line-3 text-ink-3 hover:text-ink',
                  )}
                >
                  {e.label}
                </button>
              );
            })}
          </div>
          <Help>
            {keys.length === 0
              ? 'Nothing selected — visible to everyone who can shop.'
              : keys.length === 1
                ? 'Only partners holding this entitlement.'
                : 'Partners holding any one of these.'}
          </Help>
        </div>
      )}

      {type === 'partner' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {partners.map((p) => {
            const on = selected.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() =>
                  onChange({
                    type: 'partner',
                    partners: on ? selected.filter((x) => x !== p.id) : [...selected, p.id],
                  })
                }
                aria-pressed={on}
                className={clsx(
                  'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px]',
                  on
                    ? 'border-accent-line bg-accent-fill text-accent'
                    : 'border-line-3 text-ink-3 hover:text-ink',
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
