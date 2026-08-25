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
import { getDb } from '@/lib/db/store';
import { fmtDate, terms } from '@/lib/resolvers';

export default async function OrganiserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await getDb();
  const t = terms(db);
  const ev = db.event;

  const size = 17;

  const nav: NavEntry[] = [
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

  const meta = `${ev.venue}, ${ev.city} · ${fmtDate(ev.startDate)} – ${fmtDate(ev.endDate)}`;

  return (
    <AppShell
      portalKind="Organiser"
      eventName={ev.name}
      eventMeta={meta}
      supportContact={ev.sender.email}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
