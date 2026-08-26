import { CURRENCIES } from '@/data/seed';
import { EventSettings, type SettingsData } from '@/components/settings/EventSettings';
import { Eyebrow, PageTitle, Rise } from '@/components/ui/primitives';
import { getDb } from '@/lib/db/store';
import { emailProvider } from '@/lib/email';
import { fmtDateTime } from '@/lib/resolvers';
import { requireArea } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function OrganiserSettings() {
  await requireArea('settings', '/organiser/settings');

  const db = await getDb();
  const event = db.event;

  const outbox = [...db.sentEmails].sort((a, b) => (a.at < b.at ? 1 : -1));

  const data: SettingsData = {
    profile: {
      name: event.name,
      shortName: event.shortName ?? '',
      venue: event.venue ?? '',
      city: event.city ?? '',
      startDate: event.startDate ?? '',
      endDate: event.endDate ?? '',
      timezone: event.timezone ?? '',
      tagline: event.tagline ?? '',
      currency: event.currency ?? 'EUR',
    },
    terminology: event.terminology,
    sender: event.sender ?? { name: '', email: '', signature: '', logo: '' },
    templates: db.emailTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body ?? '',
      enabled: t.enabled,
      category: t.category ?? '',
    })),
    team: db.organiserUsers.map((u) => ({
      id: u.id,
      name: u.name,
      title: u.title,
      email: u.email,
      role: u.role,
      permissions: u.permissions ?? {},
    })),
    provider: emailProvider(),
    // Twelve is enough to see what has been happening; the full log
    // is exported from Reporting rather than scrolled through here.
    outbox: outbox.slice(0, 12).map((m) => ({
      id: m.id,
      subject: m.subject,
      to: m.to,
      partner: db.partners.find((p) => p.id === m.partnerId)?.name ?? '',
      whenLabel: fmtDateTime(m.at),
      status: m.status,
    })),
    outboxTotal: outbox.length,
  };

  return (
    <Rise className="max-w-[900px]">
      <Eyebrow className="mb-2">Organiser</Eyebrow>
      <PageTitle>Event settings</PageTitle>
      <p className="mt-2 mb-6 max-w-[64ch] text-[13.5px] leading-relaxed text-ink-3">
        How this event describes itself, and what it calls things. Changes save as you leave
        each field and take effect across both portals immediately.
      </p>

      <EventSettings data={data} currencies={CURRENCIES} />
    </Rise>
  );
}
