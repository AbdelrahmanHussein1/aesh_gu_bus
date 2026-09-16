'use client';
import { useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function PassVerificationPage() {
  const { t, locale } = useLanguage();
  const [queryCode, setQueryCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = queryCode.trim().toUpperCase();
    if (!cleanCode) {
      setError(locale === 'ar' ? 'يرجى إدخال كود صعود صحيح (مثال: GU-4A9B)' : 'Please enter a valid 4-character Boarding Code (e.g. GU-4A9B) or Ticket Reference.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      // Look up via public status check API
      const res = await fetch(`/api/trips/verify-code/${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        setError(locale === 'ar' ? 'التذكرة غير موجودة أو الخدمة غير متوفرة حالياً' : 'Pass not found or service unavailable');
      }
    } catch {
      setError(locale === 'ar' ? 'التذكرة غير موجودة أو الخدمة غير متوفرة حالياً' : 'Pass not found or service unavailable');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text-primary)] flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-[var(--landing-nav-border)] bg-[var(--landing-nav-bg)] backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Official Emblem"
              className="h-9 w-auto object-contain dark:hidden"
            />
            <img
              src="/gu-logo-white.png"
              alt="Galala University Official Emblem"
              className="h-9 w-auto object-contain hidden dark:block"
            />
            <span className="font-bold text-[var(--landing-text-primary)] tracking-tight text-sm sm:text-base">
              Bus Aesh <span className="text-[var(--landing-accent-amber)] font-normal">| {locale === 'ar' ? 'التحقق من التذاكر' : 'Pass Verification'}</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/"
              className="text-xs font-semibold text-[var(--landing-text-secondary)] hover:text-[var(--landing-text-primary)] py-1.5 px-3 rounded-lg border border-[var(--landing-card-border)] bg-[var(--landing-card-bg)] transition-all"
            >
              {locale === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumbs" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-[var(--landing-text-muted)] font-mono">
            <li>
              <Link href="/" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                {locale === 'ar' ? 'الرئيسية' : 'Home'}
              </Link>
            </li>
            <li>/</li>
            <li className="text-[var(--landing-text-primary)] font-medium">
              {locale === 'ar' ? 'التحقق من التذكرة' : 'Pass Verification'}
            </li>
          </ol>
        </nav>

        {/* Semantic Single H1 */}
        <div className="mb-8 border-b border-[var(--landing-card-border)] pb-6 text-start">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[var(--landing-accent-emerald)]/10 border border-[var(--landing-accent-emerald)]/20 rounded-lg text-[var(--landing-accent-emerald)] text-xs font-mono font-semibold mb-3">
            <span className="material-symbols-outlined text-base">verified</span>
            <span>{locale === 'ar' ? 'أداة التحقق الرقمي من التذاكر' : 'Digital Transit Verification Tool'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--landing-text-primary)] tracking-tight">
            {locale === 'ar' ? 'التحقق الرقمي من تذكرة الصعود' : 'Digital Boarding Pass Verification'}
          </h1>
          <p className="text-sm text-[var(--landing-text-muted)] mt-2">
            {locale === 'ar'
              ? 'أدخل كود الصعود المكون من 4 خانات (مثل GU-4A9B) للتحقق من بيانات المقعد، السائق، وموعد الانطلاق.'
              : 'Enter your 4-character Boarding Code (GU-XXXX) or booking reference to verify seat allocation, driver status, and trip departure details.'}
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl p-6 mb-8 max-w-xl shadow-sm transition-colors duration-200 text-start">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="boardingCode" className="block text-xs font-bold text-[var(--landing-text-primary)] mb-1.5 uppercase tracking-wider">
                {locale === 'ar' ? 'كود الصعود (Boarding Code)' : 'Boarding Code / كود الصعود'}
              </label>
              <div className="relative">
                <input
                  id="boardingCode"
                  type="text"
                  value={queryCode}
                  onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GU-4A9B or 4A9B"
                  maxLength={10}
                  className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] focus:ring-1 focus:ring-[var(--landing-accent-blue)] rounded-lg py-3 px-4 text-base font-mono font-bold tracking-widest text-[var(--landing-text-primary)] placeholder-[var(--landing-text-muted)] uppercase transition-all"
                  required
                />
                <span className="absolute end-3 top-3 text-[var(--landing-text-muted)] material-symbols-outlined pointer-events-none">
                  search
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="w-full py-2.5 px-4 bg-[var(--landing-cta-primary-bg)] hover:bg-[var(--landing-cta-primary-hover)] active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  <span>{locale === 'ar' ? 'جاري التحقق من سجلات النقل...' : 'Verifying Transit Registry...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>{locale === 'ar' ? 'التحقق من حالة التذكرة' : 'Verify Ticket Status'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Display */}
        {result && (
          <div className="bg-[var(--landing-card-bg)] border border-[var(--landing-accent-emerald)]/30 rounded-xl p-6 max-w-xl shadow-lg animate-in fade-in duration-300 text-start">
            <div className="flex items-center justify-between border-b border-[var(--landing-card-border)] pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono text-[var(--landing-text-muted)] uppercase">
                  {locale === 'ar' ? 'كود الصعود' : 'Boarding Code'}
                </span>
                <div className="text-xl font-mono font-black text-[var(--landing-accent-amber)] tracking-wider">
                  {result.boardingCode}
                </div>
              </div>
              <div className="px-3 py-1 bg-[var(--landing-accent-emerald)]/15 border border-[var(--landing-accent-emerald)]/30 rounded-lg text-[var(--landing-accent-emerald)] text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>{locale === 'ar' ? 'مؤكد وصالح للصعود' : 'Active & Confirmed'}</span>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'المقعد المخصص' : 'Assigned Seat'}</dt>
                <dd className="text-[var(--landing-text-primary)] font-mono font-bold text-base">Seat #{result.seatNumber}</dd>
              </div>
              <div>
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'اسم الراكب' : 'Passenger'}</dt>
                <dd className="text-[var(--landing-text-secondary)] font-medium">{result.passengerMasked}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'خط السير' : 'Transit Route'}</dt>
                <dd className="text-[var(--landing-text-secondary)] font-semibold">{result.route}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'الشفت والموعد' : 'Shift & Departure'}</dt>
                <dd className="text-[var(--landing-accent-amber)] font-mono font-medium">{result.shift}</dd>
              </div>
              <div>
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'الحافلة' : 'Assigned Coach'}</dt>
                <dd className="text-[var(--landing-text-secondary)] font-mono">{result.busPlate}</dd>
              </div>
              <div>
                <dt className="text-[var(--landing-text-muted)] font-medium mb-0.5">{locale === 'ar' ? 'مشرف الخط' : 'Line Supervisor'}</dt>
                <dd className="text-[var(--landing-text-secondary)]">{result.supervisorName}</dd>
              </div>
            </dl>

            <div className="mt-5 pt-4 border-t border-[var(--landing-card-border)] text-[11px] text-[var(--landing-text-muted)] flex items-center justify-between">
              <span>{locale === 'ar' ? 'تم التحقق عبر شبكة نقل جامعة الجلالة' : 'Verified on Galala Transit Mesh'}</span>
              <span className="font-mono text-[var(--landing-text-muted)]">{result.verifiedAt}</span>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t border-[var(--landing-card-border)] text-xs text-[var(--landing-text-muted)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-[var(--landing-accent-blue)] hover:underline">
              {locale === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </Link>
            <span>•</span>
            <Link href="/terms" className="text-[var(--landing-accent-blue)] hover:underline">
              {locale === 'ar' ? 'شروط وأحكام النقل' : 'Terms of Transit'}
            </Link>
            <span>•</span>
            <Link href="/" className="text-[var(--landing-accent-blue)] hover:underline">
              {locale === 'ar' ? 'بوابة الدخول' : 'Login Portal'}
            </Link>
          </div>
          <div className="text-[var(--landing-text-muted)] font-mono">
            © 2026 Galala University Transport Department
          </div>
        </div>
      </main>
    </div>
  );
}
