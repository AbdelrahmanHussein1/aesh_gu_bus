'use client';

import React from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`h-8 px-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] flex items-center gap-1.5 font-bold text-xs transition-all ${className}`}
      title={locale === 'ar' ? 'Switch to English' : 'التحويل للغة العربية'}
      aria-label="Toggle language"
    >
      <span className="material-symbols-outlined text-sm text-[var(--text-muted)]">translate</span>
      <span>{locale === 'ar' ? 'EN' : 'عربي'}</span>
    </button>
  );
}
