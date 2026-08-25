'use client';

import { clsx } from 'clsx';
import { ArrowDown, ArrowUp, Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { BlockRenderer, blocksToText } from '@/components/content/BlockRenderer';
import {
  Button,
  Callout,
  Eyebrow,
  FieldError,
  Help,
  Label,
  PageTitle,
  Panel,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/primitives';
import { gradientFor } from '@/lib/resolvers';
import type {
  ContentBlock,
  ContentCategory,
  ContentPage,
  Entitlement,
  Partner,
  VisibilityRule,
} from '@/lib/types';

import type { ContentPageInput } from '@/app/organiser/content/actions';

/* ============================================================
   The block editor

   Blocks are held in local state and saved as one document, so
   reordering and editing stay instant and a half-finished page is
   never written. The Preview toggle renders through exactly the
   same BlockRenderer a partner sees — there is no second
   implementation to drift.
   ============================================================ */

const GRADIENTS = Array.from({ length: 9 }, (_, i) => `/assets/board-bg-${i + 1}.png`);

type BlockKind = ContentBlock['type'];

const ADDABLE: Array<{ kind: BlockKind; label: string }> = [
  { kind: 'heading', label: 'Heading' },
  { kind: 'paragraph', label: 'Text' },
  { kind: 'image', label: 'Image' },
  { kind: 'list', label: 'List' },
  { kind: 'quote', label: 'Quote' },
  { kind: 'callout', label: 'Callout' },
  { kind: 'video', label: 'Video' },
  { kind: 'download', label: 'Download' },
  { kind: 'timeline', label: 'Key dates' },
  { kind: 'divider', label: 'Divider' },
];

const BLOCK_LABEL: Record<BlockKind, string> = {
  heading: 'Heading',
  paragraph: 'Text',
  image: 'Image',
  list: 'List',
  quote: 'Quote',
  callout: 'Callout',
  divider: 'Divider',
  video: 'Video',
  download: 'Download',
  timeline: 'Key dates',
};

function emptyBlock(kind: BlockKind): ContentBlock {
  switch (kind) {
    case 'heading':
      return { type: 'heading', text: '' };
    case 'paragraph':
      return { type: 'paragraph', text: '' };
    case 'image':
      return { type: 'image', src: '', caption: '' };
    case 'list':
      return { type: 'list', items: [''] };
    case 'quote':
      return { type: 'quote', text: '', cite: '' };
    case 'callout':
      return { type: 'callout', tone: 'info', text: '' };
    case 'video':
      return { type: 'video', url: '', caption: '' };
    case 'download':
      return { type: 'download', name: '', note: '' };
    case 'timeline':
      return { type: 'timeline', items: [] };
    case 'divider':
      return { type: 'divider' };
  }
}

export function ContentEditor({
  page,
  categories,
  entitlements,
  partners,
  onSave,
  onDelete,
}: {
  page: ContentPage | null;
  categories: ContentCategory[];
  entitlements: Entitlement[];
  partners: Partner[];
  onSave: (input: ContentPageInput) => Promise<{ ok: boolean; id?: string; error?: string }>;
  onDelete?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(page?.title ?? '');
  const [categoryId, setCategoryId] = useState(page?.categoryId ?? categories[0]?.id ?? '');
  const [blocks, setBlocks] = useState<ContentBlock[]>(page?.blocks ?? []);
  const [cover, setCover] = useState<string | null>(page?.cover ?? null);
  const [visibility, setVisibility] = useState<VisibilityRule>(
    page?.visibility ?? { type: 'all' },
  );
  const [requireAck, setRequireAck] = useState(page?.requireAck ?? false);
  const [published, setPublished] = useState(page?.published !== false);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const autoCover = useMemo(() => gradientFor(categoryId || 'default'), [categoryId]);

  /* ---- block operations ---- */

  function updateBlock(index: number, next: ContentBlock) {
    setBlocks((bs) => bs.map((b, i) => (i === index ? next : b)));
  }

  function addBlock(kind: BlockKind) {
    setBlocks((bs) => [...bs, emptyBlock(kind)]);
  }

  function moveBlock(index: number, delta: number) {
    setBlocks((bs) => {
      const target = index + delta;
      if (target < 0 || target >= bs.length) return bs;
      const next = [...bs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeBlock(index: number) {
    setBlocks((bs) => bs.filter((_, i) => i !== index));
  }

  /* ---- save ---- */

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await onSave({
        id: page?.id,
        title,
        categoryId,
        blocks,
        // The card snippet is derived, so it can never drift from
        // the blocks it is meant to summarise.
        body: blocksToText(blocks).slice(0, 240),
        cover,
        visibility,
        requireAck,
        published,
      });

      if (!result.ok) {
        setError(result.error ?? 'Could not save the page.');
        return;
      }
      router.push('/organiser/content');
      router.refresh();
    });
  }

  function remove() {
    if (!page || !onDelete) return;
    const ok = window.confirm(
      `Delete "${page.title}"? This cannot be undone, and any task linking to it will lose its target.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await onDelete(page.id);
      if (!result.ok) {
        setError(result.error ?? 'Could not delete the page.');
        return;
      }
      router.push('/organiser/content');
      router.refresh();
    });
  }

  return (
    <div className="animate-rise">
      <Eyebrow className="mb-2">Organiser · Content</Eyebrow>

      <div className="mb-6 flex items-start justify-between gap-4">
        <PageTitle>{page ? 'Edit page' : 'New information page'}</PageTitle>
        <button
          onClick={() => setPreview((v) => !v)}
          className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill border border-line-4 px-4 py-[7px] text-[12px] tracking-[0.04em] text-ink-2 uppercase transition-colors hover:border-accent-line hover:text-ink"
        >
          {preview ? <Pencil size={14} /> : <Eye size={14} />}
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>

      {error && (
        <Callout tone="warn" className="mb-5">
          {error}
        </Callout>
      )}

      {preview ? (
        <Panel inset className="mb-6 px-[26px] pt-[26px] pb-[30px]">
          <Eyebrow tone="accent" className="mb-2 tracking-[0.14em]">
            Partner preview
          </Eyebrow>
          <h1 className="mb-5 text-[26px] leading-tight font-light text-ink">
            {title || 'Untitled page'}
          </h1>
          {blocks.length === 0 ? (
            <p className="text-[13px] text-ink-4">Nothing to preview yet — add a block.</p>
          ) : (
            <BlockRenderer blocks={blocks} />
          )}
        </Panel>
      ) : (
        <>
          {/* ---- basics ---- */}
          <div className="mb-6 grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <div>
              <Label htmlFor="page-title" required>
                Title
              </Label>
              <TextInput
                id="page-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Stand design & construction rules"
              />
            </div>
            <div>
              <Label htmlFor="page-category" required>
                Category
              </Label>
              <Select
                id="page-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categories.length === 0 && <option value="">No categories yet</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* ---- blocks ---- */}
          <Label>Content</Label>
          {blocks.length === 0 && (
            <div className="mb-3 rounded-lg border border-dashed border-line-3 p-[14px] text-[13px] text-ink-4">
              No content yet — add a block below.
            </div>
          )}

          <div className="mb-3 flex flex-col gap-[10px]">
            {blocks.map((block, i) => (
              <BlockEditor
                key={i}
                block={block}
                index={i}
                isFirst={i === 0}
                isLast={i === blocks.length - 1}
                onChange={(next) => updateBlock(i, next)}
                onMove={(d) => moveBlock(i, d)}
                onRemove={() => removeBlock(i)}
              />
            ))}
          </div>

          <div className="mb-6 flex flex-wrap gap-[6px]">
            {ADDABLE.map(({ kind, label }) => (
              <button
                key={kind}
                onClick={() => addBlock(kind)}
                className="inline-flex cursor-pointer items-center gap-[5px] rounded-pill border border-brand-line bg-brand-fill px-3 py-[6px] text-[12px] text-info transition-colors hover:border-brand"
              >
                <Plus size={12} /> {label}
              </button>
            ))}
          </div>

          {/* ---- cover ---- */}
          <Label>Cover image</Label>
          <div className="mb-2 flex flex-wrap gap-2">
            <CoverSwatch
              src={autoCover}
              selected={cover === null}
              onClick={() => setCover(null)}
              caption="Auto"
              title="Automatic — a BOARD gradient chosen from the category"
            />
            {GRADIENTS.map((src) => (
              <CoverSwatch
                key={src}
                src={src}
                selected={cover === src}
                onClick={() => setCover(src)}
                title="BOARD gradient"
              />
            ))}
          </div>
          <Help>
            Uploading your own cover needs file storage, which is not wired up yet — for now
            pick a BOARD gradient, or leave it on Auto.
          </Help>

          {/* ---- visibility ---- */}
          <div className="mt-6">
            <Label htmlFor="page-visibility">Visibility</Label>
            <VisibilityEditor
              value={visibility}
              onChange={setVisibility}
              entitlements={entitlements}
              partners={partners}
            />
          </div>

          {/* ---- flags ---- */}
          <div className="mt-6 mb-7 flex flex-wrap items-center gap-6">
            <Toggle
              checked={requireAck}
              onChange={setRequireAck}
              label="Require acknowledgement"
              hint="Partners must confirm they have read this before a linked task completes."
            />
            <Toggle
              checked={published}
              onChange={setPublished}
              label="Published"
              hint="Unpublished pages are invisible to partners."
            />
          </div>
        </>
      )}

      {/* ---- actions ---- */}
      <div className="flex flex-wrap items-center gap-3 border-t border-line-2 pt-5">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Saving…' : page ? 'Save changes' : 'Create page'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/organiser/content')} disabled={pending}>
          Cancel
        </Button>
        <div className="flex-1" />
        {page && onDelete && (
          <Button variant="danger" onClick={remove} disabled={pending}>
            <Trash2 size={14} /> Delete page
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   One block
   --------------------------------------------------------------- */

function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  onChange,
  onMove,
  onRemove,
}: {
  block: ContentBlock;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChange: (b: ContentBlock) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const iconBtn =
    'flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-xs border border-line-3 bg-transparent text-ink-3 transition-colors hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="rounded-xl border border-line-3 bg-inset px-[13px] py-3">
      <div className="mb-[9px] flex items-center justify-between">
        <Eyebrow tone="accent" className="text-[10px] tracking-[0.1em]">
          {BLOCK_LABEL[block.type]}
        </Eyebrow>
        <div className="flex gap-[5px]">
          <button
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label={`Move ${BLOCK_LABEL[block.type]} block up`}
            className={iconBtn}
          >
            <ArrowUp size={13} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label={`Move ${BLOCK_LABEL[block.type]} block down`}
            className={iconBtn}
          >
            <ArrowDown size={13} />
          </button>
          <button
            onClick={onRemove}
            aria-label={`Remove ${BLOCK_LABEL[block.type]} block`}
            className="flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-xs border border-warn-line bg-transparent text-warn transition-colors hover:bg-warn-fill"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <BlockFields block={block} index={index} onChange={onChange} />
    </div>
  );
}

function BlockFields({
  block,
  index,
  onChange,
}: {
  block: ContentBlock;
  index: number;
  onChange: (b: ContentBlock) => void;
}) {
  const small =
    'w-full rounded-sm border border-line-3 bg-panel px-[11px] py-[9px] text-[13.5px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  switch (block.type) {
    case 'heading':
      return (
        <input
          className={small}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Heading text"
          aria-label={`Heading text, block ${index + 1}`}
        />
      );

    case 'paragraph':
      return (
        <textarea
          className={clsx(small, 'resize-y')}
          rows={3}
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          placeholder="Paragraph — use **bold**, _italic_, [link](https://…)"
          aria-label={`Paragraph text, block ${index + 1}`}
        />
      );

    case 'quote':
      return (
        <div className="flex flex-col gap-2">
          <textarea
            className={clsx(small, 'resize-y')}
            rows={2}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Quote text"
            aria-label={`Quote text, block ${index + 1}`}
          />
          <input
            className={small}
            value={block.cite ?? ''}
            onChange={(e) => onChange({ ...block, cite: e.target.value })}
            placeholder="Attribution (optional)"
            aria-label={`Quote attribution, block ${index + 1}`}
          />
        </div>
      );

    case 'callout':
      return (
        <div className="flex flex-col gap-2">
          <textarea
            className={clsx(small, 'resize-y')}
            rows={2}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Callout text"
            aria-label={`Callout text, block ${index + 1}`}
          />
          <button
            onClick={() => onChange({ ...block, tone: block.tone === 'warn' ? 'info' : 'warn' })}
            className="self-start cursor-pointer rounded-pill border border-line-3 px-3 py-[5px] text-[12px] text-ink-3 hover:text-ink"
          >
            Tone: {block.tone === 'warn' ? 'Warning' : 'Info'}
          </button>
        </div>
      );

    case 'image':
      return (
        <div className="flex flex-col gap-2">
          <select
            className={clsx(small, 'cursor-pointer')}
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            aria-label={`Image, block ${index + 1}`}
          >
            <option value="">Choose an image…</option>
            {GRADIENTS.map((src, i) => (
              <option key={src} value={src}>
                BOARD gradient {i + 1}
              </option>
            ))}
          </select>
          <input
            className={small}
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)"
            aria-label={`Image caption, block ${index + 1}`}
          />
        </div>
      );

    case 'list':
      return (
        <textarea
          className={clsx(small, 'resize-y')}
          rows={3}
          value={block.items.join('\n')}
          onChange={(e) => onChange({ ...block, items: e.target.value.split('\n') })}
          placeholder="One item per line"
          aria-label={`List items, block ${index + 1}`}
        />
      );

    case 'video':
      return (
        <div className="flex flex-col gap-2">
          <input
            className={small}
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="Video URL (YouTube / Vimeo)"
            aria-label={`Video URL, block ${index + 1}`}
          />
          <input
            className={small}
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Caption (optional)"
            aria-label={`Video caption, block ${index + 1}`}
          />
        </div>
      );

    case 'download':
      return (
        <div className="flex flex-col gap-2">
          <input
            className={small}
            value={block.name}
            onChange={(e) => onChange({ ...block, name: e.target.value })}
            placeholder="File name"
            aria-label={`Download name, block ${index + 1}`}
          />
          <input
            className={small}
            value={block.note ?? ''}
            onChange={(e) => onChange({ ...block, note: e.target.value })}
            placeholder="Note e.g. 2.4 MB · PDF"
            aria-label={`Download note, block ${index + 1}`}
          />
        </div>
      );

    case 'divider':
      return <div className="text-[12px] text-ink-4">Horizontal divider</div>;

    case 'timeline':
      return <TimelineFields block={block} onChange={onChange} />;
  }
}

function TimelineFields({
  block,
  onChange,
}: {
  block: Extract<ContentBlock, { type: 'timeline' }>;
  onChange: (b: ContentBlock) => void;
}) {
  const small =
    'w-full rounded-xs border border-line-3 bg-inset px-[9px] py-2 text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line focus:ring-2 focus:ring-accent-line';

  function update(i: number, patch: Partial<(typeof block.items)[number]>) {
    onChange({
      ...block,
      items: block.items.map((it, k) => (k === i ? { ...it, ...patch } : it)),
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {block.items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-[6px] rounded-md border border-line-2 bg-panel p-[9px] max-md:flex-wrap"
        >
          <input
            type="date"
            className={clsx(small, 'w-[140px] shrink-0 max-md:w-full')}
            value={item.date}
            onChange={(e) => update(i, { date: e.target.value })}
            aria-label={`Milestone ${i + 1} date`}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <input
              className={small}
              value={item.title}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="Milestone title"
              aria-label={`Milestone ${i + 1} title`}
            />
            <input
              className={clsx(small, 'text-ink-3')}
              value={item.note ?? ''}
              onChange={(e) => update(i, { note: e.target.value })}
              placeholder="Note (optional)"
              aria-label={`Milestone ${i + 1} note`}
            />
          </div>
          <button
            onClick={() => onChange({ ...block, items: block.items.filter((_, k) => k !== i) })}
            aria-label={`Remove milestone ${i + 1}`}
            className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-xs border border-warn-line bg-transparent text-warn hover:bg-warn-fill"
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange({ ...block, items: [...block.items, { date: '', title: '', note: '' }] })
        }
        className="inline-flex cursor-pointer items-center gap-[5px] self-start rounded-pill border border-accent-line bg-accent-fill px-[13px] py-[6px] text-[12px] text-accent"
      >
        <Plus size={12} /> Add date
      </button>
    </div>
  );
}

/* ---------------------------------------------------------------
   Cover swatch
   --------------------------------------------------------------- */

function CoverSwatch({
  src,
  selected,
  onClick,
  caption,
  title,
}: {
  src: string;
  selected: boolean;
  onClick: () => void;
  caption?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={selected}
      className={clsx(
        'relative h-12 w-[74px] cursor-pointer overflow-hidden rounded-md border-2 bg-cover bg-center p-0',
        selected ? 'border-accent' : 'border-transparent hover:border-line-4',
      )}
      style={{ backgroundImage: `url('${src}')` }}
    >
      {caption && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] tracking-[0.05em] text-board-off-white uppercase">
          {caption}
        </span>
      )}
    </button>
  );
}

/* ---------------------------------------------------------------
   Visibility

   The same rule shape used for products, files, tasks and form
   fields. Entitlement matching is ANY-of, which the hint spells out
   because it is the part people get wrong.
   --------------------------------------------------------------- */

function VisibilityEditor({
  value,
  onChange,
  entitlements,
  partners,
}: {
  value: VisibilityRule;
  onChange: (v: VisibilityRule) => void;
  entitlements: Entitlement[];
  partners: Partner[];
}) {
  const type = value.type ?? 'all';
  const keys = Array.isArray(value.keys) ? value.keys : value.key ? [value.key] : [];
  const selectedPartners = value.partners ?? [];

  function setType(next: string) {
    if (next === 'all') onChange({ type: 'all' });
    else if (next === 'entitlement') onChange({ type: 'entitlement', keys: [] });
    else onChange({ type: 'partner', partners: [] });
  }

  function toggleKey(key: string) {
    const next = keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
    onChange({ type: 'entitlement', keys: next });
  }

  function togglePartner(id: string) {
    const next = selectedPartners.includes(id)
      ? selectedPartners.filter((p) => p !== id)
      : [...selectedPartners, id];
    onChange({ type: 'partner', partners: next });
  }

  return (
    <>
      <Select id="page-visibility" value={type} onChange={(e) => setType(e.target.value)}>
        <option value="all">All partners</option>
        <option value="entitlement">Partners with an entitlement</option>
        <option value="partner">Specific partners only</option>
      </Select>

      {type === 'entitlement' && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {entitlements.map((e) => {
              const on = keys.includes(e.key);
              return (
                <button
                  key={e.key}
                  onClick={() => toggleKey(e.key)}
                  aria-pressed={on}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] transition-colors',
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
              ? 'No entitlements selected — the page would be visible to everyone. Pick at least one.'
              : keys.length === 1
                ? 'Shown to partners holding this entitlement.'
                : 'Shown to partners holding any one of these — they do not need all of them.'}
          </Help>
        </div>
      )}

      {type === 'partner' && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            {partners.map((p) => {
              const on = selectedPartners.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePartner(p.id)}
                  aria-pressed={on}
                  className={clsx(
                    'cursor-pointer rounded-pill border px-[13px] py-[6px] text-[12px] transition-colors',
                    on
                      ? 'border-accent-line bg-accent-fill text-accent'
                      : 'border-line-3 bg-transparent text-ink-3 hover:text-ink',
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
          {selectedPartners.length === 0 && (
            <FieldError>Choose at least one partner, or this page reaches nobody.</FieldError>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------
   Toggle
   --------------------------------------------------------------- */

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-[10px]">
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative mt-[2px] h-[22px] w-10 shrink-0 cursor-pointer rounded-pill border-none p-0 transition-colors',
          checked ? 'bg-brand' : 'bg-chip',
        )}
      >
        <span
          className="absolute top-[2px] h-[18px] w-[18px] rounded-pill bg-board-off-white transition-all"
          style={{ left: checked ? '20px' : '2px' }}
        />
      </button>
      <div>
        <div className="text-[13px] text-ink-2">{label}</div>
        {hint && <div className="mt-[2px] max-w-[36ch] text-[11.5px] text-ink-4">{hint}</div>}
      </div>
    </div>
  );
}
