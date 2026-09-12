'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const html = document.documentElement;
  if (resolved === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const initial = stored || 'system';
    setThemeState(initial);
    applyTheme(initial);

    // Listen for system theme changes when in 'system' mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const current = localStorage.getItem('theme') as Theme | null;
      if (!current || current === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  return { theme, setTheme, resolvedTheme };
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    const order: Theme[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  const icon = resolvedTheme === 'dark' ? 'dark_mode' : 'light_mode';
  const label = theme === 'system' 
    ? 'System theme' 
    : theme === 'dark' 
    ? 'Dark mode' 
    : 'Light mode';

  return (
    <button
      onClick={cycleTheme}
      className={`relative w-8 h-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] flex items-center justify-center transition-all ${className}`}
      title={label}
      aria-label={`Theme: ${label}. Click to change.`}
    >
      <span className="material-symbols-outlined text-lg">{icon}</span>
      {theme === 'system' && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--accent)]" />
      )}
    </button>
  );
}
