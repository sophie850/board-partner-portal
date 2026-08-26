'use client';

import { clsx } from 'clsx';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

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
  ContentPage,
  Entitlement,
  FormDef,
  RequestType,
  ShopCategory,
  TaskLinkType,
  TaskPriority,
  TaskTemplate,
} from '@/lib/types';

import type { TaskInput } from '@/app/organiser/tasks/actions';

/* ============================================================
   Task editor

   The link type is the important choice: it decides where the task
   sends the partner and what makes it complete itself.
   ============================================================ */

const LINK_TYPES: Array<{ type: TaskLinkType; label: string; note: string }> = [
  {
    type: 'form',
    label: 'Complete a form',
    note: 'Completes automatically when the form is submitted.',
  },
  {
    type: 'content',
    label: 'Read a page',
    note: 'Completes when the partner acknowledges the page.',
  },
  {
    type: 'request',
    label: 'Raise a request',
    note: 'Completes when the request is submitted.',
  },
  { type: 'shop', label: 'Order from the shop', note: 'Completes when an order is placed.' },
  { type: 'upload', label: 'Upload a file', note: 'Completes when a file is provided.' },
  { type: 'url', label: 'Visit a link', note: 'Marked done by the partner.' },
  { type: 'ack', label: 'Acknowledge', note: 'A simple confirmation the partner ticks.' },
  { type: 'checklist', label: 'Manual checklist item', note: 'Marked done by the partner.' },
];

const MODULES = [
  { value: 'forms', label: 'Forms' },
  { value: 'requests', label: 'Requests' },
  { value: 'information', label: 'Information' },
  { value: 'shop', label: 'Shop' },
  { value: 'files', label: 'Files' },
  { value: 'profile', label: 'Participation' },
];

export function TaskEditor({
  task,
  entitlements,
  forms,
  pages,
  requestTypes,
  shopCategories,
  onSave,
  onDelete,
}: {
  task: TaskTemplate | null;
  entitlements: Entitlement[];
  forms: FormDef[];
  pages: ContentPage[];
  requestTypes: RequestType[];
  shopCategories: ShopCategory[];
  onSave: (input: TaskInput) => Promise<{ ok: boolean; id?: string; error?: string }>;
  onDelete?: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [category, setCategory] = useState(task?.category ?? '');
  const [module, setModule] = useState(task?.module ?? 'forms');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium');
  const [required, setRequired] = useState(task?.required ?? true);
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [instructions, setInstructions] = useState(task?.instructions ?? '');
  const [linkType, setLinkType] = useState<TaskLinkType>(task?.link?.type ?? 'checklist');
  const [linkTarget, setLinkTarget] = useState(task?.link?.target ?? '');
  const [requires, setRequires] = useState<string[]>(
    Array.isArray(task?.requires) ? task.requires : task?.requires ? [task.requires] : [],
  );
  const [error, setError] = useState<string | null>(null);

  const linkNote = LINK_TYPES.find((l) => l.type === linkType)?.note ?? '';

  function targetOptions(): Array<{ id: string; label: string }> {
    switch (linkType) {
      case 'form':
        return forms.map((f) => ({ id: f.id, label: f.title }));
      case 'content':
        return pages.map((p) => ({ id: p.id, label: p.title }));
      case 'request':
        return requestTypes.map((r) => ({ id: r.id, label: r.name }));
      case 'shop':
        return shopCategories.map((c) => ({ id: c.id, label: c.name }));
      default:
        return [];
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await onSave({
        id: task?.id,
        title,
        description,
        category,
        module,
        priority,
        required,
        dueDate: dueDate || null,
        requires,
        linkType,
        linkTarget: linkTarget || null,
        instructions,
      });

      if (!result.ok) {
        setError(result.error ?? 'Could not save.');
        return;
      }
      router.push('/organiser/tasks');
      router.refresh();
    });
  }

  function remove() {
    if (!task || !onDelete) return;
    if (
      !window.confirm(
        `Delete "${task.title}"? It disappears from every partner's list. Completion history is kept.`,
      )
    )
      return;

    startTransition(async () => {
      const result = await onDelete(task.id);
      if (!result.ok) {
        setError(result.error ?? 'Could not delete.');
        return;
      }
      router.push('/organiser/tasks');
      router.refresh();
    });
  }

  const options = targetOptions();

  return (
    <div className="animate-rise max-w-[760px]">
      <Eyebrow className="mb-2">Organiser · Tasks</Eyebrow>
      <PageTitle className="mb-6">{task ? 'Edit task' : 'New task'}</PageTitle>

      {error && (
        <Callout tone="warn" className="mb-5">
          {error}
        </Callout>
      )}

      <div className="mb-4">
        <Label htmlFor="task-title" required>
          Title
        </Label>
        <TextInput
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Submit health &amp; safety declaration"
        />
      </div>

      <div className="mb-4">
        <Label htmlFor="task-desc">Description</Label>
        <TextInput
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One line explaining what this is"
        />
      </div>

      {/* ---- what completing it involves ---- */}
      <div className="mb-4 rounded-xl border border-line-3 bg-inset px-[18px] py-4">
        <Label htmlFor="task-link">What the partner does</Label>
        <Select
          id="task-link"
          value={linkType}
          onChange={(e) => {
            setLinkType(e.target.value as TaskLinkType);
            // A target from the previous type is meaningless now.
            setLinkTarget('');
          }}
        >
          {LINK_TYPES.map((l) => (
            <option key={l.type} value={l.type}>
              {l.label}
            </option>
          ))}
        </Select>
        <Help>{linkNote}</Help>

        {options.length > 0 && (
          <div className="mt-3">
            <Label htmlFor="task-target" required>
              Which one
            </Label>
            <Select
              id="task-target"
              value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
            >
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}

        {linkType === 'url' && (
          <div className="mt-3">
            <Label htmlFor="task-url" required>
              Web address
            </Label>
            <TextInput
              id="task-url"
              value={linkTarget}
              onChange={(e) => setLinkTarget(e.target.value)}
              placeholder="https://…"
            />
          </div>
        )}
      </div>

      {/* ---- who it applies to ---- */}
      <div className="mb-4">
        <Label>Who gets this task</Label>
        <div className="flex flex-wrap gap-2">
          {entitlements.map((e) => {
            const on = requires.includes(e.key);
            return (
              <button
                key={e.key}
                onClick={() =>
                  setRequires((ks) => (on ? ks.filter((k) => k !== e.key) : [...ks, e.key]))
                }
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
          {requires.length === 0
            ? 'No entitlements selected — every partner gets this task.'
            : requires.length === 1
              ? 'Only partners holding this entitlement.'
              : 'Partners holding any one of these — they do not need all of them.'}
        </Help>
      </div>

      {/* ---- scheduling ---- */}
      <div className="mb-4 grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor="task-due">Default deadline</Label>
          <TextInput
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Help>Blank means set it per partner.</Help>
        </div>
        <div>
          <Label htmlFor="task-priority">Priority</Label>
          <Select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="task-module">Module</Label>
          <Select id="task-module" value={module} onChange={(e) => setModule(e.target.value)}>
            {MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div>
          <Label htmlFor="task-category">Category</Label>
          <TextInput
            id="task-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Exhibition"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-[10px]">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="h-4 w-4 accent-[var(--bp-blue)]"
            />
            <span className="text-[13px] text-ink-2">Required</span>
          </label>
        </div>
      </div>

      <div className="mb-7">
        <Label htmlFor="task-instructions">Instructions</Label>
        <TextArea
          id="task-instructions"
          rows={3}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Anything the partner needs to know before they start"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line-2 pt-5">
        <Button onClick={save} disabled={pending}>
          {pending ? 'Saving…' : task ? 'Save changes' : 'Create task'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/organiser/tasks')} disabled={pending}>
          Cancel
        </Button>
        <div className="flex-1" />
        {task && onDelete && (
          <Button variant="danger" onClick={remove} disabled={pending}>
            <Trash2 size={14} /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
