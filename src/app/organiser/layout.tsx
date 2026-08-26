import {
  BarChart3,
  BookOpen,
  Building2,
  CircleCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  MessageSquareWarning,
  Receipt,
  Settings,
  ShoppingBag,
  Truck,
} from 'lucide-react';

import { AppShell, type NavEntry } from '@/components/shell/AppShell';
import { canReachArea, requireOrganiser } from '@/lib/auth/session';
import { getDb } from '@/lib/db/store';
import { fmtDate, terms } from '@/lib/resolvers';
import type { OrganiserPermissions } from '@/lib/types';

/**
 * Which permission each nav entry needs.
 *
 * Dashboard is absent because everybody on the team gets it — it is
 * the landing page, and its contents are already filtered to what
 * the reader may see. Entitlements is part of configuring partners,
 * so it rides on the same permission.
 */
const AREA_FOR: Record<string, keyof OrganiserPermissions> = {
  partners: 'partners',
  entitlements: 'partners',
  tasks: 'tasks',
  forms: 'forms',
  content: 'content',
  products: 'products',
  suppliers: 'suppliers',
  orders: 'orders',
  requests: 'requests',
  reporting: 'reporting',
  settings: 'settings',
};

/**
 * Nothing under the organiser portal is prerendered.
 *
 * Every screen reads live event data, so a build-time snapshot would
 * serve stale counts and stale content — and would make the build
 * itself depend on the database being reachable.
 */
export const dynamic = 'force-dynamic';

export default async function OrganiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOrganiser('/organiser');

  const db = await getDb();
  const t = terms(db);
  const ev = db.event;

  const size = 17;

  const allNav: NavEntry[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/organiser',
      icon: <LayoutDashboard size={size} />,
    },
    {
      key: 'partners',
      label: t.partners,
      href: '/organiser/partners',
      icon: <Building2 size={size} />,
    },
    {
      key: 'entitlements',
      label: 'Entitlements',
      href: '/organiser/entitlements',
      icon: <KeyRound size={size} />,
    },
    {
      key: 'tasks',
      label: t.tasks,
      href: '/organiser/tasks',
      icon: <CircleCheck size={size} />,
    },
    {
      key: 'forms',
      label: 'Forms',
      href: '/organiser/forms',
      icon: <FileText size={size} />,
    },
    {
      key: 'content',
      label: 'Content',
      href: '/organiser/content',
      icon: <BookOpen size={size} />,
    },
    {
      key: 'products',
      label: 'Products',
      href: '/organiser/products',
      icon: <ShoppingBag size={size} />,
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      href: '/organiser/suppliers',
      icon: <Truck size={size} />,
    },
    {
      key: 'orders',
      label: 'Orders & webhooks',
      href: '/organiser/orders',
      icon: <Receipt size={size} />,
    },
    {
      key: 'requests',
      label: t.requests,
      href: '/organiser/requests',
      icon: <MessageSquareWarning size={size} />,
    },
    {
      key: 'reporting',
      label: 'Reporting',
      href: '/organiser/reporting',
      icon: <BarChart3 size={size} />,
    },
    {
      key: 'settings',
      label: 'Event settings',
      href: '/organiser/settings',
      icon: <Settings size={size} />,
    },
  ];

  /*
   * Hidden here and refused in the route itself. This is the tidy
   * half — a nav full of links that turn people away is no use to
   * anybody — but it is not the control. `requireArea` is.
   */
  const nav = allNav.filter((entry) => {
    const area = AREA_FOR[entry.key];
    return !area || canReachArea(session, area);
  });

  const meta = `${ev.venue}, ${ev.city} · ${fmtDate(ev.startDate)} – ${fmtDate(ev.endDate)}`;

  return (
    <AppShell
      portalKind="Organiser"
      eventName={ev.name}
      eventMeta={meta}
      supportContact={ev.sender.email}
      nav={nav}
      user={{
        name: session.user.name,
        email: session.user.email,
        detail: session.user.role === 'super_admin' ? 'Super admin' : 'BOARD team',
      }}
    >
      {children}
    </AppShell>
  );
}
