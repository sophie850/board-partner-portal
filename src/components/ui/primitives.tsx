/* ============================================================
   BOARD UI primitives

   The shared vocabulary every screen builds from. Rules encoded
   here so screens do not have to remember them:

     * Type is never heavier than Regular (400). Headings are Light
       (300). Hierarchy comes from size, caps, tracking and colour.
     * Corners are crisp (0–16px); the pill is the one signature
       curve, reserved for buttons, tags and price capsules.
     * Elevation on dark is hairline borders and soft glows, not
       heavy shadows.
     * Every surface paints its own background.
   ============================================================ */

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/* ---------------------------------------------------------------
   Eyebrow — the wide-tracked uppercase section label
   --------------------------------------------------------------- */

export function Eyebrow({
  children,
  className,
  tone = 'muted',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'accent' | 'ink';
}) {
  return (
    <div
      className={clsx(
        'text-[11px] uppercase tracking-[0.16em]',
        tone === 'muted' && 'text-ink-4',
        tone === 'accent' && 'text-accent',
        tone === 'ink' && 'text-ink-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   Headings — Light, and uppercase where the brand calls for it
   --------------------------------------------------------------- */

export function PageTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h1 className={clsx('text-[26px] font-light leading-tight text-ink', className)}>
      {children}
    </h1>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={clsx('text-[18px] font-light leading-snug text-ink', className)}>
      {children}
    </h2>
  );
}

/* ---------------------------------------------------------------
   Button
   --------------------------------------------------------------- */

type ButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        // The pill is the BOARD signature curve.
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-pill',
        'font-normal tracking-[0.02em] transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        size === 'md' && 'px-[18px] py-[11px] text-[13.5px]',
        size === 'sm' && 'px-[14px] py-[7px] text-[12.5px]',
        variant === 'primary' &&
          'border-none bg-brand text-on-brand hover:bg-brand-hover',
        variant === 'ghost' &&
          'border border-line-4 bg-transparent text-ink hover:border-line-5 hover:bg-chip',
        variant === 'quiet' &&
          'border-none bg-transparent px-0 text-ink-3 hover:text-ink',
        variant === 'danger' &&
          'border border-warn-line bg-warn-fill text-warn hover:bg-warn-fill/70',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------
   Panels & cards
   --------------------------------------------------------------- */

export function Panel({
  children,
  className,
  inset = false,
}: {
  children: ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-line-2',
        inset ? 'bg-inset' : 'bg-panel',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   Status pill
   --------------------------------------------------------------- */

export type Tone = 'good' | 'warn' | 'neutral' | 'muted' | 'info';

const TONE_CLASS: Record<Tone, string> = {
  good: 'text-accent border-accent-line',
  warn: 'text-warn border-warn-line',
  info: 'text-info border-brand-line',
  neutral: 'text-ink-3 border-line-4',
  muted: 'text-ink-4 border-line-3',
};

export function StatusPill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center rounded-pill border px-[9px] py-[2px]',
        'text-[9.5px] uppercase tracking-[0.06em] whitespace-nowrap',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A soft-filled chip — for metadata and clickable references. */
export function Chip({
  children,
  className,
  onClick,
  title,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      onClick={onClick}
      title={title}
      className={clsx(
        'inline-flex items-center gap-[6px] rounded-pill border border-line-3 bg-chip',
        'px-[10px] py-[4px] text-[11.5px] text-ink-2',
        onClick && 'cursor-pointer transition-colors hover:border-accent-line hover:text-ink',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------
   Form controls

   Every control paints its own background and sets a visible focus
   ring, so keyboard users can always see where they are.
   --------------------------------------------------------------- */

const CONTROL = clsx(
  'w-full rounded-md border border-line-4 bg-inset px-[13px] py-[11px]',
  'text-[14px] text-ink outline-none transition-colors',
  'placeholder:text-ink-4',
  'focus:border-accent-line focus:ring-2 focus:ring-accent-line',
  'disabled:opacity-50',
);

export function Label({
  children,
  htmlFor,
  required,
  className,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={clsx('mb-[7px] block text-[13px] text-ink-2', className)}
    >
      {children}
      {required && (
        <span className="text-warn" aria-hidden>
          {' '}
          *
        </span>
      )}
    </label>
  );
}

export function TextInput({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(CONTROL, className)} {...rest} />;
}

export function TextArea({
  className,
  rows = 3,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={clsx(CONTROL, 'resize-y', className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(CONTROL, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  );
}

export function Help({ children }: { children: ReactNode }) {
  return <div className="mt-[6px] text-[11.5px] text-ink-4">{children}</div>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="mt-[6px] text-[12px] text-warn">
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   Empty and error states — helpful, never blank
   --------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-3 bg-panel px-6 py-12 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-brand-line bg-brand-fill text-info">
          {icon}
        </div>
      )}
      <div className="text-[15px] font-light text-ink">{title}</div>
      {body && (
        <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-ink-3">{body}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------
   Callout
   --------------------------------------------------------------- */

export function Callout({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'warn';
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border px-[17px] py-[14px] text-[13px] leading-relaxed',
        tone === 'info' && 'border-brand-line bg-brand-fill text-ink-2',
        tone === 'warn' && 'border-warn-line bg-warn-fill text-ink-2',
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------
   Animation wrapper — the shared entrance
   --------------------------------------------------------------- */

export function Rise({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={clsx('animate-rise', className)}>{children}</div>;
}
