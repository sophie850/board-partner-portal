import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOARD Partner Portal',
  description:
    'Manage your participation in BOARD Monaco 2027 — tasks, forms, orders and everything the team needs from you, in one place.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Both themes ship; the stored preference wins via the script below.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
    { media: '(prefers-color-scheme: light)', color: '#e4e4d6' },
  ],
};

/**
 * Applies the stored theme before first paint, so a light-mode user
 * never sees a flash of the dark ground. Kept deliberately tiny and
 * failure-tolerant: private browsing can throw on localStorage.
 */
const THEME_SCRIPT = `
try {
  var t = localStorage.getItem('board-theme');
  if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {
  document.documentElement.setAttribute('data-theme', 'dark');
}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-canvas text-ink">{children}</body>
    </html>
  );
}
