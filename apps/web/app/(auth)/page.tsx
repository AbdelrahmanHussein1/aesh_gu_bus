'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { useApp } from '@/hooks/useAppStore';
import StickyMobileContact from '@/components/layout/StickyMobileContact';
import ThemeToggle from '@/components/layout/ThemeToggle';
import LanguageSwitcher from '@/components/layout/LanguageSwitcher';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type AuthView = 'login' | 'register';

export default function HomePage() {
  const { user, isAuthLoading } = useApp();
  const { t, locale } = useLanguage();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Inquiry Form State
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryRoute, setInquiryRoute] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState('general');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [inquiryHoneypot, setInquiryHoneypot] = useState(''); // Spam bot honeypot
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [inquiryErrorMsg, setInquiryErrorMsg] = useState('');

  useEffect(() => {
    if (isAuthLoading) return;
    if (user?.role === 'rider') window.location.href = '/rider';
    else if (user?.role === 'supervisor') window.location.href = '/supervisor';
    else if (user?.role === 'admin') window.location.href = '/admin';
  }, [user, isAuthLoading]);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Anti-spam honeypot detection
    if (inquiryHoneypot) {
      console.warn('Spam submission suppressed by honeypot.');
      setInquiryStatus('sent');
      return;
    }

    if (!inquiryName.trim() || !inquiryEmail.trim() || !inquiryMessage.trim()) {
      setInquiryErrorMsg(t('inquiryFillRequired'));
      return;
    }

    if (!inquiryEmail.includes('@')) {
      setInquiryErrorMsg(t('inquiryInvalidEmail'));
      return;
    }

    setInquiryStatus('sending');
    setInquiryErrorMsg('');

    // Simulate sending inquiry to transport desk
    setTimeout(() => {
      setInquiryStatus('sent');
      setInquiryName('');
      setInquiryEmail('');
      setInquiryRoute('');
      setInquiryMessage('');
    }, 600);
  };

  const scrollToAuth = () => {
    const el = document.getElementById('auth-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const faqs = [
    { q: t('faq1Q'), a: t('faq1A') },
    { q: t('faq2Q'), a: t('faq2A') },
    { q: t('faq3Q'), a: t('faq3A') },
    { q: t('faq4Q'), a: t('faq4A') },
    { q: t('faq5Q'), a: t('faq5A') },
  ];

  return (
    <div className="min-h-screen bg-[var(--landing-bg)] text-[var(--landing-text-primary)] flex flex-col selection:bg-[var(--landing-cta-primary-bg)] selection:text-white transition-colors duration-200">
      {/* Top University Brand Bar */}
      <nav className="border-b border-[var(--landing-nav-border)] bg-[var(--landing-nav-bg)] backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Official Emblem"
              className="h-10 w-auto object-contain dark:brightness-0 dark:invert transition-all"
            />
            <div className="hidden sm:block border-s border-[var(--landing-card-border)] ps-3">
              <span className="font-bold text-[var(--landing-text-primary)] text-sm tracking-tight block">
                {t('landingBrandName')} <span className="text-[var(--landing-accent-amber)] font-semibold">{t('landingBrandDot')} {locale === 'ar' ? 'Bus Aesh' : 'باص عيش'}</span>
              </span>
              <span className="text-[11px] text-[var(--landing-text-muted)] block font-mono">
                {t('landingBrandSubtitle')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <Link
              href="/pass"
              className="py-1.5 px-3 text-xs font-semibold text-[var(--landing-text-secondary)] hover:text-[var(--landing-text-primary)] rounded-lg border border-[var(--landing-card-border)] bg-[var(--landing-badge-bg)] hover:bg-[var(--landing-card-bg)] transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-[var(--landing-accent-emerald)]">qr_code</span>
              <span className="hidden sm:inline">{t('verifyPass')}</span>
            </Link>
            <button
              type="button"
              onClick={scrollToAuth}
              className="py-1.5 px-3 text-xs font-bold text-white bg-[var(--landing-cta-primary-bg)] hover:bg-[var(--landing-cta-primary-hover)] rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span>{t('login')}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative border-b border-[var(--landing-nav-border)] py-16 sm:py-24 px-4 sm:px-6 transition-colors duration-200" style={{ background: 'var(--landing-bg-hero)' }}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--landing-badge-bg)] border border-[var(--landing-badge-border)] rounded-lg text-[var(--landing-accent-amber)] text-xs font-mono font-semibold uppercase tracking-wider mb-6 shadow-sm">
            <span className="material-symbols-outlined text-base text-[var(--landing-accent-amber)]">verified</span>
            <span>{t('heroBadge')}</span>
          </div>

          {/* Semantic Single H1 */}
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--landing-text-primary)] tracking-tight leading-tight mb-4">
            {t('heroTitle')}
          </h1>

          <p className="text-sm sm:text-base text-[var(--landing-text-muted)] max-w-2xl mx-auto leading-relaxed mb-8">
            {t('heroSubtitle')}
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={scrollToAuth}
              className="py-3 px-6 bg-[var(--landing-cta-primary-bg)] hover:bg-[var(--landing-cta-primary-hover)] active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">directions_bus</span>
              <span>{t('heroReserveSeat')}</span>
            </button>

            <Link
              href="/pass"
              className="py-3 px-6 bg-[var(--landing-cta-secondary-bg)] hover:bg-[var(--landing-cta-secondary-hover)] active:scale-[0.98] text-[var(--landing-cta-secondary-text)] hover:text-[var(--landing-text-primary)] font-semibold text-sm rounded-lg border border-[var(--landing-card-border)] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg text-[var(--landing-accent-amber)]">confirmation_number</span>
              <span>{t('heroTrackTicket')}</span>
            </Link>

            <a
              href="#pricing-section"
              className="py-3 px-5 text-[var(--landing-text-muted)] hover:text-[var(--landing-text-secondary)] font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>{t('heroFaresPricing')}</span>
              <span className="material-symbols-outlined text-base">arrow_downward</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-start">
            <div className="p-3 bg-[var(--landing-metric-bg)] border border-[var(--landing-card-border)] rounded-lg shadow-sm">
              <div className="text-xl font-mono font-bold text-[var(--landing-text-primary)]">{t('metric29Lines')}</div>
              <div className="text-xs text-[var(--landing-text-muted)]">{t('metricOfficialRoutes')}</div>
            </div>
            <div className="p-3 bg-[var(--landing-metric-bg)] border border-[var(--landing-card-border)] rounded-lg shadow-sm">
              <div className="text-xl font-mono font-bold text-[var(--landing-accent-emerald)]">{t('metric50Seats')}</div>
              <div className="text-xs text-[var(--landing-text-muted)]">{t('metricCoachCapacity')}</div>
            </div>
            <div className="p-3 bg-[var(--landing-metric-bg)] border border-[var(--landing-card-border)] rounded-lg shadow-sm">
              <div className="text-xl font-mono font-bold text-[var(--landing-accent-amber)]">{t('metric5Shifts')}</div>
              <div className="text-xs text-[var(--landing-text-muted)]">{t('metricDailyDepartures')}</div>
            </div>
            <div className="p-3 bg-[var(--landing-metric-bg)] border border-[var(--landing-card-border)] rounded-lg shadow-sm">
              <div className="text-xl font-mono font-bold text-[var(--landing-accent-blue)]">{t('metric3Hour')}</div>
              <div className="text-xs text-[var(--landing-text-muted)]">{t('metricRefundWindow')}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Authentication & Operational Hub */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full space-y-16">
        {/* Authentication Card Section */}
        <section id="auth-section" className="max-w-md mx-auto scroll-mt-20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-[var(--landing-text-primary)] mb-1">
              {authView === 'login' ? t('authLoginTitle') : t('authRegisterTitle')}
            </h2>
            <p className="text-xs text-[var(--landing-text-muted)]">
              {authView === 'login' ? t('authLoginSubtitle') : t('authRegisterSubtitle')}
            </p>
          </div>

          <div className="bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl p-6 shadow-2xl transition-colors duration-200">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--landing-bg)] rounded-lg border border-[var(--landing-card-border)] mb-6">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className={`py-2 px-3 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authView === 'login'
                    ? 'bg-[var(--landing-cta-primary-bg)] text-white font-bold shadow'
                    : 'text-[var(--landing-text-muted)] hover:text-[var(--landing-text-primary)] hover:bg-[var(--landing-card-bg)]'
                }`}
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>{t('authTabSignIn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthView('register')}
                className={`py-2 px-3 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authView === 'register'
                    ? 'bg-[var(--landing-cta-primary-bg)] text-white font-bold shadow'
                    : 'text-[var(--landing-text-muted)] hover:text-[var(--landing-text-primary)] hover:bg-[var(--landing-card-bg)]'
                }`}
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>{t('authTabRegister')}</span>
              </button>
            </div>

            {authView === 'login' && <LoginForm onSwitchTab={(tab) => setAuthView(tab === 'register' ? 'register' : 'login')} />}
            {authView === 'register' && <RegisterForm onSwitchTab={(tab) => setAuthView(tab === 'register' ? 'register' : 'login')} />}
          </div>

          <div className="mt-4 text-center text-xs text-[var(--landing-text-muted)] flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-[var(--landing-text-muted)]">lock</span>
            <span>{t('authSecuredWith')}</span>
          </div>
        </section>

        {/* Fares & Pricing Section */}
        <section id="pricing-section" className="scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-lg text-xs font-mono text-[var(--landing-accent-amber)] mb-3 shadow-sm">
              <span className="material-symbols-outlined text-base">payments</span>
              <span>{t('pricingBadge')}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--landing-text-primary)] tracking-tight">
              {t('pricingTitle')}
            </h2>
            <p className="text-sm text-[var(--landing-text-muted)] mt-2">
              {t('pricingSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Plan 1: Single Trip */}
            <div className="p-6 bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl flex flex-col justify-between shadow-sm transition-colors duration-200">
              <div>
                <div className="text-xs font-bold font-mono text-[var(--landing-text-muted)] uppercase mb-2">{t('pricingSingleLeg')}</div>
                <h3 className="text-xl font-bold text-[var(--landing-text-primary)] mb-2">{t('pricingOneWay')}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-[var(--landing-text-primary)] font-mono">160</span>
                  <span className="text-sm font-bold text-[var(--landing-accent-amber)]">{t('egp')}</span>
                  <span className="text-xs text-[var(--landing-text-muted)]">{t('pricingPerSeat')}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--landing-text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingSeatSelection')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingAutoRefund')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingQrPass')}</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={scrollToAuth}
                className="mt-6 w-full py-2 px-4 bg-[var(--landing-cta-secondary-bg)] hover:bg-[var(--landing-cta-secondary-hover)] text-[var(--landing-text-primary)] font-semibold text-xs rounded-lg transition-colors cursor-pointer border border-[var(--landing-card-border)]"
              >
                {t('pricingBookOneWay')}
              </button>
            </div>

            {/* Plan 2: Round Trip (Featured) */}
            <div className="p-6 bg-[var(--landing-card-bg)] border-2 border-[var(--landing-cta-primary-bg)] rounded-xl flex flex-col justify-between relative shadow-xl transition-colors duration-200">
              <div className="absolute -top-3 end-4 px-2.5 py-0.5 bg-[var(--landing-cta-primary-bg)] text-white text-[10px] font-bold uppercase tracking-wider rounded-md shadow-sm">
                {t('pricingMostPopular')}
              </div>
              <div>
                <div className="text-xs font-bold font-mono text-[var(--landing-accent-blue)] uppercase mb-2">{t('pricingDailyCommute')}</div>
                <h3 className="text-xl font-bold text-[var(--landing-text-primary)] mb-2">{t('pricingRoundTrip')}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-[var(--landing-text-primary)] font-mono">320</span>
                  <span className="text-sm font-bold text-[var(--landing-accent-amber)]">{t('egp')}</span>
                  <span className="text-xs text-[var(--landing-text-muted)]">{t('pricingBothShifts')}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--landing-text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingCoordinated')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingGuaranteedReturn')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingSingleCheckout')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingFlexibleSwap')}</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={scrollToAuth}
                className="mt-6 w-full py-2.5 px-4 bg-[var(--landing-cta-primary-bg)] hover:bg-[var(--landing-cta-primary-hover)] text-white font-bold text-xs rounded-lg transition-all shadow-md cursor-pointer"
              >
                {t('pricingBookRoundTrip')}
              </button>
            </div>

            {/* Plan 3: Semester Pass */}
            <div className="p-6 bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl flex flex-col justify-between shadow-sm transition-colors duration-200">
              <div>
                <div className="text-xs font-bold font-mono text-[var(--landing-text-muted)] uppercase mb-2">{t('pricingTermSubscription')}</div>
                <h3 className="text-xl font-bold text-[var(--landing-text-primary)] mb-2">{t('pricingSemesterPass')}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-sm font-bold text-[var(--landing-text-secondary)]">{t('pricingInquireFinance')}</span>
                </div>
                <ul className="space-y-2.5 text-xs text-[var(--landing-text-secondary)]">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingPermanentSeat')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingPriorityRouting')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-sm">check</span>
                    <span>{t('pricingIntegratedSIS')}</span>
                  </li>
                </ul>
              </div>
              <a
                href="#inquiry-section"
                className="mt-6 w-full py-2 px-4 bg-[var(--landing-cta-secondary-bg)] hover:bg-[var(--landing-cta-secondary-hover)] text-[var(--landing-cta-secondary-text)] hover:text-[var(--landing-text-primary)] font-semibold text-xs rounded-lg text-center transition-colors block border border-[var(--landing-card-border)]"
              >
                {t('pricingInquireDesk')}
              </a>
            </div>
          </div>
        </section>

        {/* Real Operational Case Study */}
        <section className="bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl p-6 sm:p-8 max-w-5xl mx-auto shadow-sm transition-colors duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-[var(--landing-card-border)] pb-6 mb-6">
            <div>
              <div className="text-xs font-mono text-[var(--landing-accent-amber)] uppercase tracking-wider mb-1">
                {t('caseStudyBadge')}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--landing-text-primary)]">
                {t('caseStudyTitle')}
              </h2>
            </div>
            <div className="px-3 py-1.5 bg-[var(--landing-accent-emerald)]/10 border border-[var(--landing-accent-emerald)]/20 text-[var(--landing-accent-emerald)] text-xs font-mono font-semibold rounded-lg shrink-0">
              {t('caseStudy100OnTime')}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-[var(--landing-bg)] border border-[var(--landing-card-border)] rounded-lg">
              <div className="text-2xl font-mono font-bold text-[var(--landing-text-primary)]">{t('caseStudyStudentsDaily')}</div>
              <div className="text-xs text-[var(--landing-text-muted)] mt-0.5">{t('caseStudyDispatched')}</div>
            </div>
            <div className="p-4 bg-[var(--landing-bg)] border border-[var(--landing-card-border)] rounded-lg">
              <div className="text-2xl font-mono font-bold text-[var(--landing-accent-emerald)]">{t('caseStudyZero')}</div>
              <div className="text-xs text-[var(--landing-text-muted)] mt-0.5">{t('caseStudyConflicts')}</div>
            </div>
            <div className="p-4 bg-[var(--landing-bg)] border border-[var(--landing-card-border)] rounded-lg">
              <div className="text-2xl font-mono font-bold text-[var(--landing-accent-blue)]">{t('caseStudyLessThan2ms')}</div>
              <div className="text-xs text-[var(--landing-text-muted)] mt-0.5">{t('caseStudyLatency')}</div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[var(--landing-text-secondary)] leading-relaxed">
            {t('caseStudyDescription')}
          </p>
        </section>

        {/* 5 Operational Frequently Asked Questions */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-lg text-xs font-mono text-[var(--landing-accent-amber)] mb-2 shadow-sm">
              <span className="material-symbols-outlined text-base">help_outline</span>
              <span>{t('faqBadge')}</span>
            </div>
            <h2 className="text-2xl font-extrabold text-[var(--landing-text-primary)]">
              {t('faqSectionTitle')}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-lg overflow-hidden transition-colors shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-start flex items-center justify-between gap-3 text-sm font-bold text-[var(--landing-text-primary)] hover:text-[var(--landing-accent-blue)] transition-colors cursor-pointer"
                  >
                    <div>{faq.q}</div>
                    <span className="material-symbols-outlined text-[var(--landing-text-muted)] shrink-0">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-[var(--landing-text-secondary)] leading-relaxed border-t border-[var(--landing-card-border)] bg-[var(--landing-bg)]/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Support Desk, Response Time Promise & Short Inquiry Form */}
        <section id="inquiry-section" className="bg-[var(--landing-card-bg)] border border-[var(--landing-card-border)] rounded-xl p-6 sm:p-10 max-w-4xl mx-auto scroll-mt-20 shadow-sm transition-colors duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Details & Response Time Promise */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--landing-accent-blue)]/10 border border-[var(--landing-accent-blue)]/20 text-[var(--landing-accent-blue)] text-xs font-mono font-semibold rounded-lg mb-3">
                <span className="material-symbols-outlined text-base">timer</span>
                <span>{t('inquiryResponseBadge')}</span>
              </div>
              <h2 className="text-2xl font-bold text-[var(--landing-text-primary)] mb-2">
                {t('inquiryTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--landing-text-muted)] mb-6 leading-relaxed">
                {t('inquiryDescription')}
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[var(--landing-accent-amber)] text-base mt-0.5">location_on</span>
                  <div>
                    <strong className="text-[var(--landing-text-primary)] block">{t('inquiryCampusOffice')}</strong>
                    <span className="text-[var(--landing-text-muted)]">{t('inquiryCampusAddress')}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[var(--landing-accent-blue)] text-base mt-0.5">mail</span>
                  <div>
                    <strong className="text-[var(--landing-text-primary)] block">{t('inquiryOfficialEmail')}</strong>
                    <a href="mailto:transport@gu.edu.eg" className="text-[var(--landing-accent-blue)] hover:underline">
                      transport@gu.edu.eg
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-base mt-0.5">schedule</span>
                  <div>
                    <strong className="text-[var(--landing-text-primary)] block">{t('inquiryOperatingSchedule')}</strong>
                    <span className="text-[var(--landing-text-muted)]">{t('inquiryOperatingHours')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiry & Lost Item Form with Spam Protection */}
            <div className="bg-[var(--landing-bg)] border border-[var(--landing-card-border)] p-5 rounded-xl shadow-inner transition-colors duration-200">
              <h3 className="text-base font-bold text-[var(--landing-text-primary)] mb-1">
                {t('inquiryFormTitle')}
              </h3>
              <p className="text-xs text-[var(--landing-text-muted)] mb-4">
                {t('inquiryFormSubtitle')}
              </p>

              {inquiryStatus === 'sent' ? (
                <div className="p-4 bg-[var(--landing-accent-emerald)]/10 border border-[var(--landing-accent-emerald)]/30 rounded-lg text-center space-y-2">
                  <span className="material-symbols-outlined text-[var(--landing-accent-emerald)] text-3xl">check_circle</span>
                  <div className="text-sm font-bold text-[var(--landing-text-primary)]">{t('inquiryReceived')}</div>
                  <p className="text-xs text-[var(--landing-text-secondary)]">
                    {t('inquiryReceivedMsg')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setInquiryStatus('idle')}
                    className="text-xs text-[var(--landing-accent-blue)] hover:underline mt-2 inline-block cursor-pointer"
                  >
                    {t('inquirySubmitAnother')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit} className="space-y-3">
                  {/* Anti-spam honeypot (hidden from human users) */}
                  <input
                    type="text"
                    name="website_url_hp"
                    value={inquiryHoneypot}
                    onChange={(e) => setInquiryHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="hidden"
                    aria-hidden="true"
                  />

                  <div>
                    <label htmlFor="inqName" className="block text-[11px] font-bold text-[var(--landing-text-secondary)] uppercase tracking-wider mb-1">
                      {t('inquiryFullName')}
                    </label>
                    <input
                      id="inqName"
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder={t('inquiryNamePlaceholder')}
                      className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] rounded-lg px-3 py-2 text-xs text-[var(--landing-text-primary)] placeholder-[var(--landing-text-muted)] transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="inqEmail" className="block text-[11px] font-bold text-[var(--landing-text-secondary)] uppercase tracking-wider mb-1">
                      {t('inquiryUniversityEmail')}
                    </label>
                    <input
                      id="inqEmail"
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder={t('inquiryEmailPlaceholder')}
                      className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] rounded-lg px-3 py-2 text-xs text-[var(--landing-text-primary)] placeholder-[var(--landing-text-muted)] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="inqCat" className="block text-[11px] font-bold text-[var(--landing-text-secondary)] uppercase tracking-wider mb-1">
                        {t('inquiryCategory')}
                      </label>
                      <select
                        id="inqCat"
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] rounded-lg px-2.5 py-2 text-xs text-[var(--landing-text-primary)] transition-colors"
                      >
                        <option value="general">{t('inquiryCatGeneral')}</option>
                        <option value="lost_found">{t('inquiryCatLostFound')}</option>
                        <option value="booking">{t('inquiryCatBooking')}</option>
                        <option value="refund">{t('inquiryCatRefund')}</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="inqRoute" className="block text-[11px] font-bold text-[var(--landing-text-secondary)] uppercase tracking-wider mb-1">
                        {t('inquiryRouteBus')}
                      </label>
                      <input
                        id="inqRoute"
                        type="text"
                        value={inquiryRoute}
                        onChange={(e) => setInquiryRoute(e.target.value)}
                        placeholder={t('inquiryRoutePlaceholder')}
                        className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] rounded-lg px-3 py-2 text-xs text-[var(--landing-text-primary)] placeholder-[var(--landing-text-muted)] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inqMsg" className="block text-[11px] font-bold text-[var(--landing-text-secondary)] uppercase tracking-wider mb-1">
                      {t('inquiryMessageLabel')}
                    </label>
                    <textarea
                      id="inqMsg"
                      required
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder={t('inquiryMessagePlaceholder')}
                      className="w-full bg-[var(--landing-input-bg)] border border-[var(--landing-input-border)] focus:border-[var(--landing-accent-blue)] rounded-lg px-3 py-2 text-xs text-[var(--landing-text-primary)] placeholder-[var(--landing-text-muted)] transition-colors resize-none"
                    />
                  </div>

                  {inquiryErrorMsg && (
                    <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                      {inquiryErrorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={inquiryStatus === 'sending'}
                    className="w-full py-2 px-4 bg-[var(--landing-cta-primary-bg)] hover:bg-[var(--landing-cta-primary-hover)] active:scale-[0.98] text-white font-bold text-xs rounded-lg transition-all shadow cursor-pointer disabled:opacity-50"
                  >
                    {inquiryStatus === 'sending' ? t('inquirySubmitting') : t('inquirySubmitBtn')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-[var(--landing-footer-border)] bg-[var(--landing-footer-bg)] py-10 px-4 sm:px-6 mt-16 text-xs text-[var(--landing-text-muted)] transition-colors duration-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/gu-logo-colored.png"
                alt="Galala University Official Emblem"
                className="h-8 w-auto object-contain dark:brightness-0 dark:invert transition-all"
              />
              <span className="font-bold text-[var(--landing-text-primary)] text-sm">{t('footerBrandName')}</span>
            </div>
            <p className="text-[11px] text-[var(--landing-text-muted)] leading-relaxed">
              {t('footerDescription')}
            </p>
          </div>

          <div>
            <div className="font-bold text-[var(--landing-text-primary)] mb-2 uppercase tracking-wider text-[11px]">
              {t('footerPortalsServices')}
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/rider" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerRiderDashboard')}
                </Link>
              </li>
              <li>
                <Link href="/pass" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerPassVerification')}
                </Link>
              </li>
              <li>
                <Link href="/supervisor" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerSupervisorOps')}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerAdminConsole')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-[var(--landing-text-primary)] mb-2 uppercase tracking-wider text-[11px]">
              {t('footerLegalRegulations')}
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/privacy" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerPrivacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerTerms')}
                </Link>
              </li>
              <li>
                <a href="https://gu.edu.eg" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerOfficialPortal')}
                </a>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-[var(--landing-accent-blue)] transition-colors">
                  {t('footerSitemap')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-[var(--landing-text-primary)] mb-2 uppercase tracking-wider text-[11px]">
              {t('footerSupportDesk')}
            </div>
            <p className="text-[11px] text-[var(--landing-text-muted)] mb-1">
              {t('footerAddress')}
            </p>
            <p className="text-[11px] text-[var(--landing-text-muted)] mb-1">
              {t('footerEmailLabel')} <a href="mailto:transport@gu.edu.eg" className="text-[var(--landing-accent-blue)] hover:underline">transport@gu.edu.eg</a>
            </p>
            <p className="text-[11px] text-[var(--landing-text-muted)]">
              {t('footerHoursLabel')} {t('footerHours')}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[var(--landing-footer-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            {t('footerCopyright')}
          </div>
          <div className="font-mono text-[var(--landing-text-muted)]">
            {t('footerRelease')}
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Contact Drawer */}
      <StickyMobileContact />
    </div>
  );
}
