'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Light / dark toggle, persisted.
 *
 * The stored value is applied before first paint by an inline script
 * in the root layout, so this component only has to catch up with
 * whatever that decided — hence reading the attribute rather than
 * storage on mount.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'light' ? 'light' : 'dark');
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('board-theme', next);
    } catch {
      // Private browsing can refuse storage; the toggle still works
      // for this session, it just will not be remembered.
    }
  }

  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-line-3 bg-transparent text-ink transition-colors hover:border-line-5"
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
