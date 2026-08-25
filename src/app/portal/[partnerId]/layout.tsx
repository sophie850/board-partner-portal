import {
  BookOpen,
  CalendarClock,
  CircleCheck,
  FileText,
  Folder,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquareWarning,
  Package,
  Receipt,
  ShoppingBag,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AppShell, type NavEntry } from '@/components/shell/AppShell';
import { getDb } from '@/lib/db/store';
import { actionCounts, fmtDate, terms, visibleModules } from '@/lib/resolvers';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={17} />,
  timeline: <CalendarClock size={17} />,
  participation: <Package size={17} />,
  tasks: <CircleCheck size={17} />,
  forms: <FileText size={17} />,
  requests: <MessageSquareWarning size={17} />,
  information: <BookOpen size={17} />,
  shop: <ShoppingBag size={17} />,
  orders: <Receipt size={17} />,
  files: <Folder size={17} />,
  promote: <Megaphone size={17} />,
  team: <Users size={17} />,
};

/** Grouped under "Actions", which carries the combined badge. */
const ACTION_KEYS = new Set(['tasks', 'forms', 'requests']);

export default async function PartnerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ partnerId: string }>;
}) {
  const { partnerId } = await params;
  const db = await getDb();

  const partner = db.partners.find((p) => p.id === partnerId);
  const part = db.participations.find((p) => p.partnerId === partnerId);
  if (!partner || !part) notFound();

  const t = terms(db);
  const ev = db.event;
  const base = `/portal/${partnerId}`;

  // No authentication yet, so there is no signed-in user to gate on.
  // Once magic links land this becomes the session's partner user,
  // and module permissions start applying.
  const modules = visibleModules(db, part, null);
  const counts = actionCounts(db, part);

  const nav: NavEntry[] = [];
  let actionsInjected = false;

  const href = (key: string) => (key === 'dashboard' ? base : `${base}/${key}`);

  const injectActions = () => {
    if (actionsInjected) return;
    actionsInjected = true;

    const children = modules
      .filter((m) => ACTION_KEYS.has(m.key))
      .map((m) => ({
        key: m.key,
        label: m.key === 'tasks' ? t.tasks : m.key === 'requests' ? t.requests : m.label,
        href: href(m.key),
        icon: ICONS[m.key],
        badge:
          m.key === 'tasks'
            ? counts.tasks
            : m.key === 'forms'
              ? counts.forms
              : counts.requests,
      }));

    if (children.length) {
      nav.push({
        key: 'actions',
        label: 'Actions',
        icon: <ListChecks size={17} />,
        badge: counts.total,
        children,
      });
    }
  };

  modules.forEach((m) => {
    if (ACTION_KEYS.has(m.key)) {
      injectActions();
      return;
    }
    nav.push({
      key: m.key,
      label: m.key === 'participation' ? `My ${t.lower.participation}` : m.label,
      href: href(m.key),
      icon: ICONS[m.key],
    });
    // Actions sits directly under Dashboard — the work comes first.
    if (m.key === 'dashboard') injectActions();
  });
  injectActions();

  const meta = `${ev.venue}, ${ev.city} · ${fmtDate(ev.startDate)} – ${fmtDate(ev.endDate)}`;

  return (
    <AppShell
      portalKind={t.partnerPortal}
      eventName={ev.name}
      eventMeta={meta}
      supportContact={ev.sender.email}
      nav={nav}
      banner={<PreviewBanner partnerName={partner.name} />}
    >
      {children}
    </AppShell>
  );
}

/**
 * Until sign-in exists, every partner view is reached by an
 * organiser looking at it. Saying so plainly stops anyone mistaking
 * this for the partner's own session.
 */
function PreviewBanner({ partnerName }: { partnerName: string }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 border-b border-accent-line px-[22px] py-[9px]"
      style={{
        background: 'linear-gradient(90deg, rgba(26,77,231,0.22), rgba(1,105,114,0.14))',
      }}
    >
      <span className="min-w-[180px] flex-1 text-[12.5px] tracking-[0.01em] text-ink">
        Previewing the Partner Portal as{' '}
        <strong className="font-normal text-accent">{partnerName}</strong> — this is exactly
        what they see, filtered to their package.
      </span>
      <Link
        href="/organiser/partners"
        className="shrink-0 rounded-pill border border-line-5 px-[14px] py-[5px] text-[12px] text-ink no-underline hover:text-ink"
      >
        Back to organiser
      </Link>
    </div>
  );
}
