'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('aesh_cookie_consent');
      if (!consent) {
        // Small delay for smooth entry
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('aesh_cookie_consent', 'all');
      localStorage.setItem('aesh_cookie_consent_date', new Date().toISOString());
    } catch {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('aesh_cookie_consent', 'essential');
      localStorage.setItem('aesh_cookie_consent_date', new Date().toISOString());
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie & Privacy Consent"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-5 rounded-lg shadow-2xl text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
          <span className="material-symbols-outlined text-lg">cookie</span>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-white mb-1">
            Privacy & Transit Cookies / خصوصية البيانات
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            We use essential session tokens and storage to secure your university login, retain active seat locks, and synchronize bus schedules. We never sell student data or track you across third-party websites.
          </p>
          <div className="text-[11px] text-slate-400 mb-4">
            Learn more in our{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
              Terms of Transit
            </Link>
            .
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
            >
              Accept All (موافق)
            </button>
            <button
              type="button"
              onClick={handleEssentialOnly}
              className="py-2 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-300 hover:text-white text-xs font-medium rounded-lg border border-slate-700 transition-all cursor-pointer"
            >
              Essential Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
