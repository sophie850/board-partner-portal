'use client';

import { clsx } from 'clsx';
import { Menu, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { Wordmark } from '@/components/ui/Wordmark';

import { ThemeToggle } from './ThemeToggle';

/* ============================================================
   The application frame

   Header, sidebar and scrolling main column. Below 1024px the
   sidebar becomes an off-canvas drawer, because at 230px it
   otherwise eats most of a phone screen.
   ============================================================ */

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  /** Renders as an indented child of the preceding parent. */
  child?: boolean;
}

export interface NavGroup {
  key: string;
  label: string;
  href?: string;
  icon: React.ReactNode;
  /** Combined badge, which splits into per-child badges when open. */
  badge?: number;
  children: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return 'children' in e;
}

export function AppShell({
  portalKind,
  eventName,
  eventMeta,
  supportContact,
  nav,
  contextSwitcher,
  banner,
  children,
}: {
  portalKind: string;
  eventName: string;
  eventMeta: string;
  supportContact: string;
  nav: NavEntry[];
  contextSwitcher?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden bg-canvas text-ink">
      {/* ---- top bar ---- */}
      <header className="flex h-[60px] shrink-0 items-center gap-5 border-b border-line-2 bg-inset px-[22px] max-lg:gap-3 max-lg:px-[14px]">
        <button
          onClick={() => setNavOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={navOpen}
          className="hidden h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-line-3 bg-transparent text-ink max-lg:inline-flex"
        >
          <Menu size={18} />
        </button>

        <Link href="/" className="flex h-[22px] items-center text-ink hover:text-ink">
          <Wordmark size={20} />
        </Link>

        <div className="h-[26px] w-px bg-line-3 max-lg:hidden" />

        <div className="flex min-w-0 flex-col leading-[1.15] whitespace-nowrap max-lg:hidden">
          <span className="truncate text-[13px] tracking-[0.02em] text-ink">{eventName}</span>
          <span className="truncate text-[11px] tracking-[0.04em] text-ink-4">{eventMeta}</span>
        </div>

        <div className="min-w-[12px] flex-1" />

        {contextSwitcher}
        <ThemeToggle />
      </header>

      {banner}

      {/* ---- body ---- */}
      <div className="flex min-h-0 flex-1">
        {/* scrim for the mobile drawer */}
        {navOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-[85] hidden bg-black/55 max-lg:block"
          />
        )}

        <nav
          className={clsx(
            'bp-scroll flex w-[230px] shrink-0 flex-col gap-[2px] overflow-y-auto',
            'border-r border-line bg-inset p-[16px_12px]',
            // Off-canvas below 1024px.
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-[90] max-lg:w-[264px]',
            'max-lg:shadow-[0_0_44px_rgba(0,0,0,0.66)] max-lg:transition-transform max-lg:duration-[260ms]',
            'max-lg:ease-[cubic-bezier(0.2,0.7,0.2,1)]',
            navOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          )}
        >
          <div className="px-3 pt-[6px] pb-[10px] text-[10px] tracking-[0.18em] text-ink-5 uppercase">
            {portalKind}
          </div>

          <NavList nav={nav} onNavigate={() => setNavOpen(false)} />

          <div className="flex-1" />

          <div className="mx-[6px] mt-[10px] border-t border-line px-2 pt-3 pb-1">
            <div className="text-[11px] leading-relaxed text-ink-4">
              Need help? Contact
              <br />
              <span className="text-ink-3">{supportContact}</span>
            </div>
          </div>
        </nav>

        <main className="bp-scroll min-w-0 flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-[1180px] px-10 pt-[30px] pb-[60px] max-md:px-[15px] max-md:pt-5 max-md:pb-[50px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Nav rendering
   --------------------------------------------------------------- */

function NavList({ nav, onNavigate }: { nav: NavEntry[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname, collectHrefs(nav));

  return (
    <>
      {nav.map((entry) =>
        isGroup(entry) ? (
          <NavGroupView key={entry.key} group={entry} current={current} onNavigate={onNavigate} />
        ) : (
          <NavLink
            key={entry.key}
            item={entry}
            active={current === entry.href}
            onNavigate={onNavigate}
          />
        ),
      )}
    </>
  );
}

function NavGroupView({
  group,
  current,
  onNavigate,
}: {
  group: NavGroup;
  current: string | null;
  onNavigate: () => void;
}) {
  // Expanded by default: the group holds everything needing action,
  // so hiding it behind a click buries the work.
  const [open, setOpen] = useState(true);
  const anyChildActive = group.children.some((c) => current === c.href);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={clsx(
          'flex w-full cursor-pointer items-center gap-3 rounded-sm border-l-2 px-3 py-[9px]',
          'text-left text-[13.5px] tracking-[0.01em] transition-colors',
          anyChildActive
            ? 'border-l-accent bg-chip text-ink'
            : 'border-l-transparent bg-transparent text-ink-2 hover:bg-chip hover:text-ink',
        )}
      >
        <span className="shrink-0">{group.icon}</span>
        <span className="flex-1">{group.label}</span>
        {/* The combined badge splits into per-item badges when open. */}
        {!open && group.badge ? <Badge count={group.badge} /> : null}
        <span
          aria-hidden
          className="inline-flex text-[10px] text-ink-4 transition-transform duration-200"
          style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}
        >
          ▾
        </span>
      </button>

      {open &&
        group.children.map((c) => (
          <NavLink
            key={c.key}
            item={c}
            active={current === c.href}
            onNavigate={onNavigate}
            indented
          />
        ))}
    </>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  indented,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
  indented?: boolean;
}) {
  const router = useRouter();

  return (
    <Link
      href={item.href}
      onClick={() => {
        onNavigate();
        router.prefetch?.(item.href);
      }}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'flex w-full items-center gap-3 rounded-sm border-l-2 py-[9px] text-[13.5px]',
        'tracking-[0.01em] no-underline transition-colors',
        indented ? 'pr-3 pl-[26px]' : 'px-3',
        active
          ? 'border-l-accent bg-chip text-ink hover:text-ink'
          : 'border-l-transparent bg-transparent text-ink-2 hover:bg-chip hover:text-ink',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {item.badge ? <Badge count={item.badge} /> : null}
    </Link>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-warn px-[6px] text-[11px] text-inset">
      {count}
    </span>
  );
}

/**
 * Which nav entry is current.
 *
 * Longest-match rather than a plain prefix test: the portal root
 * ("/organiser") is a prefix of every child route, so a prefix test
 * lights up Dashboard on every page. The most specific matching
 * href wins, which also keeps a section highlighted on its detail
 * routes without matching a sibling that merely shares a stem.
 */
function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(href + '/');
    if (matches && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

function collectHrefs(nav: NavEntry[]): string[] {
  const out: string[] = [];
  nav.forEach((e) => {
    if (isGroup(e)) {
      if (e.href) out.push(e.href);
      e.children.forEach((c) => out.push(c.href));
    } else {
      out.push(e.href);
    }
  });
  return out;
}

/* ---------------------------------------------------------------
   Search trigger — the ⌘K affordance in the header
   --------------------------------------------------------------- */

export function SearchButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Search"
      className="flex shrink-0 cursor-pointer items-center gap-[9px] rounded-pill border border-line-3 bg-chip px-[13px] py-[7px] text-ink-3 transition-colors hover:text-ink max-lg:hidden"
    >
      <Search size={15} />
      <span className="text-[12.5px] tracking-[0.02em]">Search</span>
      <span className="rounded-xs border border-line-3 px-[5px] py-px text-[10px] tracking-[0.04em] text-ink-4">
        ⌘K
      </span>
    </button>
  );
}
