import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Page Not Found | Bus Aesh GU',
  description: 'The requested transit schedule, route, or page could not be found.',
  alternates: {
    canonical: '/not-found',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4 transition-colors duration-200">
      <div className="w-full max-w-lg text-center">
        {/* University Header Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/gu-logo-colored.png"
            alt="Galala University Official Emblem"
            className="h-16 w-auto object-contain dark:hidden"
          />
          <img
            src="/gu-logo-white.png"
            alt="Galala University Official Emblem"
            className="h-16 w-auto object-contain hidden dark:block"
          />
        </div>

        {/* 404 Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500 text-xs font-mono font-bold uppercase tracking-wider mb-4">
          <span className="material-symbols-outlined text-base">near_me_disabled</span>
          <span>HTTP 404 • Destination Not Found</span>
        </div>

        {/* Semantic Single H1 */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight mb-3">
          Transit Route Not Found
        </h1>
        <p className="text-base font-semibold text-[var(--text-secondary)] mb-2" dir="rtl">
          الصفحة أو مسار الرحلة المطلوب غير متوفر
        </p>

        {/* Clear Description */}
        <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto mb-8 leading-relaxed">
          The bus schedule, seat reservation link, or administrative URL you attempted to access may have expired, been updated, or moved to an alternate campus terminal.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/rider"
            className="w-full sm:w-auto py-2.5 px-5 bg-[var(--accent)] hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">directions_bus</span>
            <span>Rider Booking (حجز المقاعد)</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto py-2.5 px-5 bg-[var(--card-bg)] hover:bg-[var(--surface-secondary)] active:scale-[0.98] text-[var(--foreground)] font-medium text-sm rounded-lg border border-[var(--card-border)] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            <span>Return to Home (الرئيسية)</span>
          </Link>
        </div>

        {/* Operational Help Footnote */}
        <div className="mt-10 pt-6 border-t border-[var(--card-border)] text-xs text-[var(--text-muted)] flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Galala University Transport Operations</span>
          <span className="font-mono text-[var(--text-muted)]">Building B • Desk Ext: 4410</span>
        </div>
      </div>
    </main>
  );
}
