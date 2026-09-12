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
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg text-center">
        {/* University Header Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/gu-logo-colored.png"
            alt="Galala University Official Emblem"
            className="h-16 w-auto object-contain"
          />
        </div>

        {/* 404 Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-4">
          <span className="material-symbols-outlined text-base">near_me_disabled</span>
          <span>HTTP 404 • Destination Not Found</span>
        </div>

        {/* Semantic Single H1 */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          Transit Route Not Found
        </h1>
        <p className="text-base font-semibold text-slate-300 mb-2" dir="rtl">
          الصفحة أو مسار الرحلة المطلوب غير متوفر
        </p>

        {/* Clear Description */}
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
          The bus schedule, seat reservation link, or administrative URL you attempted to access may have expired, been updated, or moved to an alternate campus terminal.
        </p>

        {/* Action Buttons (Strictly rounded-lg, NO pill buttons, NO purple gradients) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/rider"
            className="w-full sm:w-auto py-2.5 px-5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">directions_bus</span>
            <span>Rider Booking (حجز المقاعد)</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto py-2.5 px-5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 hover:text-white font-medium text-sm rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">home</span>
            <span>Return to Home (الرئيسية)</span>
          </Link>
        </div>

        {/* Operational Help Footnote */}
        <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Galala University Transport Operations</span>
          <span className="font-mono text-slate-400">Building B • Desk Ext: 4410</span>
        </div>
      </div>
    </main>
  );
}
