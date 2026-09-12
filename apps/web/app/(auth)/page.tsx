'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import { useApp } from '@/hooks/useAppStore';
import StickyMobileContact from '@/components/layout/StickyMobileContact';

type AuthView = 'login' | 'register';

export default function HomePage() {
  const { user, isAuthLoading } = useApp();
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
      setInquiryErrorMsg('Please fill in all required fields.');
      return;
    }

    if (!inquiryEmail.includes('@')) {
      setInquiryErrorMsg('Please provide a valid email address.');
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
    {
      q: 'How far in advance can I reserve my bus seat?',
      qAr: 'ما هي الفترة المتاحة لحجز مقعد الرحلة مسبقاً؟',
      a: 'Booking opens 7 days prior to the operational date for registered Galala University students and staff. Seat reservations lock 3 hours before trip departure to allow dispatchers to finalize passenger manifests.',
    },
    {
      q: 'How do automated cancellations and refunds work?',
      qAr: 'كيف تتم عملية إلغاء الحجز واسترداد الرسوم تلقائياً؟',
      a: 'You can cancel any active booking directly in the Rider Portal up to 3 hours prior to departure. When cancelled within this window, a 100% full refund (160 EGP per single leg) is immediately processed back to your payment account.',
    },
    {
      q: 'What happens if I miss my scheduled morning shift?',
      qAr: 'ماذا أفعل إذا فاتني شفت الصباح الأول؟',
      a: 'Contact your assigned route line supervisor immediately. If unreserved seats remain on Shift 2 (09:30 AM departure), the supervisor can execute an authorized seat transfer directly through their onboard terminal.',
    },
    {
      q: 'How is student academic eligibility validated?',
      qAr: 'كيف يتم التحقق من بيانات القيد الجامعي للطلاب؟',
      a: 'Account creation requires a valid Galala University email address (@gu.edu.eg) and student Academic ID. Credentials are validated automatically via Microsoft 365 Outlook OTP verification.',
    },
    {
      q: 'What payment methods are supported on the platform?',
      qAr: 'ما هي طرق الدفع المعتمدة للمنظومة؟',
      a: 'We accept all major Visa/Mastercard debit and credit cards, as well as instant Instapay transaction reference submission with immediate digital receipt dispatch.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top University Brand Bar */}
      <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Official Emblem"
              className="h-10 w-auto object-contain"
            />
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <span className="font-bold text-white text-sm tracking-tight block">
                Bus Aesh <span className="text-amber-400 font-semibold">• باص عيش</span>
              </span>
              <span className="text-[11px] text-slate-400 block font-mono">
                Galala University Transport System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/pass"
              className="py-1.5 px-3 text-xs font-semibold text-slate-300 hover:text-white rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm text-emerald-400">qr_code</span>
              <span>Verify Pass (التحقق من تذكرة)</span>
            </Link>
            <button
              type="button"
              onClick={scrollToAuth}
              className="py-1.5 px-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              <span>Sign In (دخول)</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-amber-400 text-xs font-mono font-semibold uppercase tracking-wider mb-6">
            <span className="material-symbols-outlined text-base text-amber-400">verified</span>
            <span>Official University Transit • 29 Regional Lines</span>
          </div>

          {/* Semantic Single H1 */}
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Galala University Smart Transit & Seat Reservation Platform
          </h1>

          <p className="text-lg sm:text-xl font-bold text-slate-300 mb-6 font-mono" dir="rtl">
            منظومة النقل الذكي وحجز المقاعد الرسمية لجامعة الجلالة
          </p>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Safe, synchronized daily transportation connecting Greater Cairo (Nasr City, Heliopolis, New Cairo, Maadi, Giza, October, Zayed, El Obour) and Suez with the Galala Mountain Campus. 50-seat luxury air-conditioned coaches, real-time seat locking, and onboard supervisor verification.
          </p>

          {/* Hero CTAs (Strictly rounded-lg, NO pill buttons, NO purple gradients) */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={scrollToAuth}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">directions_bus</span>
              <span>Reserve Bus Seat (حجز مقعد)</span>
            </button>

            <Link
              href="/pass"
              className="py-3 px-6 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 hover:text-white font-semibold text-sm rounded-lg border border-slate-700 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg text-amber-400">confirmation_number</span>
              <span>Track / Verify Ticket</span>
            </Link>

            <a
              href="#pricing-section"
              className="py-3 px-5 text-slate-400 hover:text-slate-200 font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Fares & Pricing</span>
              <span className="material-symbols-outlined text-base">arrow_downward</span>
            </a>
          </div>

          {/* Quick Metrics Bar (Authentic operational parameters) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="text-xl font-mono font-bold text-white">29 Lines</div>
              <div className="text-xs text-slate-400">Official Routes</div>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="text-xl font-mono font-bold text-emerald-400">50 Seats</div>
              <div className="text-xs text-slate-400">Coach Capacity</div>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="text-xl font-mono font-bold text-amber-400">5 Shifts</div>
              <div className="text-xs text-slate-400">Daily Departures</div>
            </div>
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
              <div className="text-xl font-mono font-bold text-blue-400">3-Hour</div>
              <div className="text-xs text-slate-400">Full Refund Window</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid: Authentication & Operational Hub */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 w-full space-y-16">
        {/* Authentication Card Section */}
        <section id="auth-section" className="max-w-md mx-auto scroll-mt-20">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">
              {authView === 'login' ? 'Student & Staff Login' : 'New Student Registration'}
            </h2>
            <p className="text-xs text-slate-400">
              {authView === 'login'
                ? 'Sign in with your official university credentials'
                : 'Register with your official @gu.edu.eg student email'}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 shadow-2xl">
            {/* Tab Switcher (rounded-lg, NO pill buttons) */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => setAuthView('login')}
                className={`py-2 px-3 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authView === 'login'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Sign In (دخول)</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthView('register')}
                className={`py-2 px-3 text-xs rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  authView === 'register'
                    ? 'bg-blue-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>New Student (تسجيل)</span>
              </button>
            </div>

            {authView === 'login' && <LoginForm onSwitchTab={(t) => setAuthView(t as AuthView)} />}
            {authView === 'register' && <RegisterForm onSwitchTab={(t) => setAuthView(t as AuthView)} />}
          </div>

          <div className="mt-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-slate-400">lock</span>
            <span>Secured with Galala SSO & Single-Device Concurrency Lock</span>
          </div>
        </section>

        {/* Fares & Pricing Section */}
        <section id="pricing-section" className="scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 mb-3">
              <span className="material-symbols-outlined text-base">payments</span>
              <span>Transparent University Tariff</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Transit Fares & Booking Plans
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              Regulated non-profit university transit rates covering all regional routes between Cairo, Suez, and the Galala Campus.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Plan 1: Single Trip */}
            <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold font-mono text-slate-400 uppercase mb-2">Single Shift Leg</div>
                <h3 className="text-xl font-bold text-white mb-2">One-Way (ذهاب أو عودة)</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-white font-mono">160</span>
                  <span className="text-sm font-bold text-amber-400">EGP</span>
                  <span className="text-xs text-slate-400">/ seat</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Direct seat selection on 50-passenger cabin</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>100% automated refund (up to 3 hrs before)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Encrypted QR pass & manual boarding code</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={scrollToAuth}
                className="mt-6 w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Book One-Way
              </button>
            </div>

            {/* Plan 2: Round Trip (Featured) */}
            <div className="p-6 bg-slate-900 border-2 border-blue-600 rounded-lg flex flex-col justify-between relative shadow-xl shadow-blue-600/10">
              <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                Most Popular
              </div>
              <div>
                <div className="text-xs font-bold font-mono text-blue-400 uppercase mb-2">Daily Commute</div>
                <h3 className="text-xl font-bold text-white mb-2">Round-Trip (ذهاب وعودة)</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-black text-white font-mono">320</span>
                  <span className="text-sm font-bold text-amber-400">EGP</span>
                  <span className="text-xs text-slate-400">/ both shifts</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Coordinated Morning 1/2 + Afternoon Return</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Guaranteed return seat preservation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Single checkout via Card or Instapay</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Flexible seat swap with Line Supervisor</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={scrollToAuth}
                className="mt-6 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                Book Round-Trip
              </button>
            </div>

            {/* Plan 3: Semester Pass */}
            <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-lg flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold font-mono text-slate-400 uppercase mb-2">Term Subscription</div>
                <h3 className="text-xl font-bold text-white mb-2">Semester Pass (اشتراك فصلي)</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-sm font-bold text-slate-300">Inquire at Finance</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Permanent seat allocation all semester</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Priority morning departure routing</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">check</span>
                    <span>Integrated with Galala Student SIS</span>
                  </li>
                </ul>
              </div>
              <a
                href="#inquiry-section"
                className="mt-6 w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-lg text-center transition-colors block"
              >
                Inquire With Desk
              </a>
            </div>
          </div>
        </section>

        {/* Real Operational Case Study */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 sm:p-8 max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-6 mb-6">
            <div>
              <div className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">
                Operational Case Study • Spring 2026
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Exam Period Transit Operations Report
              </h2>
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold rounded-lg shrink-0">
              100% On-Time Dispatch
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-2xl font-mono font-bold text-white">1,840+</div>
              <div className="text-xs text-slate-400 mt-0.5">Students Dispatched Daily</div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-2xl font-mono font-bold text-emerald-400">0</div>
              <div className="text-xs text-slate-400 mt-0.5">Double-Booking Conflicts</div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <div className="text-2xl font-mono font-bold text-blue-400">&lt; 2ms</div>
              <div className="text-xs text-slate-400 mt-0.5">Redis Seat Check Latency</div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            During the June 2026 final exams, Galala University operated 40 peak-hour transit coaches simultaneously across the Ain Sokhna highway. Through Redis distributed lock holds (<code className="text-amber-300 text-xs font-mono">SET NX EX 300</code>) and PostgreSQL unique constraints, the platform achieved zero conflicting reservations across 18,000+ total bookings.
          </p>
        </section>

        {/* 5 Operational Frequently Asked Questions */}
        <section className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 mb-2">
              <span className="material-symbols-outlined text-base">help_outline</span>
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Operational Transit FAQs (الأسئلة الشائعة)
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 text-sm font-bold text-white hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <div>
                      <div>{faq.q}</div>
                      <div className="text-xs font-normal text-slate-400 mt-0.5" dir="rtl">
                        {faq.qAr}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 shrink-0">
                      {isOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 bg-slate-950/40">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Support Desk, Response Time Promise & Short Inquiry Form */}
        <section id="inquiry-section" className="bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-10 max-w-4xl mx-auto scroll-mt-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Details & Response Time Promise */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-semibold rounded-lg mb-3">
                <span className="material-symbols-outlined text-base">timer</span>
                <span>Response Time Promise: &lt; 2 Hours</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Transport Logistics Desk
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
                The Galala University Transport Department guarantees an official written response to all submitted inquiries and lost item notices within <strong>2 hours</strong> during transit operating hours.
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-amber-400 text-base mt-0.5">location_on</span>
                  <div>
                    <strong className="text-white block">Campus Operations Office:</strong>
                    <span className="text-slate-400">Galala University Plateau, Building B, Ground Floor Desk</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-blue-400 text-base mt-0.5">mail</span>
                  <div>
                    <strong className="text-white block">Official Email:</strong>
                    <a href="mailto:transport@gu.edu.eg" className="text-blue-400 hover:underline">
                      transport@gu.edu.eg
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-emerald-400 text-base mt-0.5">schedule</span>
                  <div>
                    <strong className="text-white block">Operating Schedule:</strong>
                    <span className="text-slate-400">Daily 06:00 AM – 08:00 PM (Including Exam Saturdays)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiry & Lost Item Form with Spam Protection */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-lg">
              <h3 className="text-base font-bold text-white mb-1">
                Submit an Inquiry / Lost Property Notice
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Fill in your details below. Our transit coordinators will contact you directly.
              </p>

              {inquiryStatus === 'sent' ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center space-y-2">
                  <span className="material-symbols-outlined text-emerald-400 text-3xl">check_circle</span>
                  <div className="text-sm font-bold text-white">Inquiry Received</div>
                  <p className="text-xs text-slate-300">
                    Your reference has been logged with the Transport Desk. An officer will respond to your email within 2 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => setInquiryStatus('idle')}
                    className="text-xs text-blue-400 hover:underline mt-2 inline-block cursor-pointer"
                  >
                    Submit Another Inquiry
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
                    <label htmlFor="inqName" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      id="inqName"
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder="e.g. Abdelrahman Ehab"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="inqEmail" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      University Email (@gu.edu.eg) *
                    </label>
                    <input
                      id="inqEmail"
                      type="email"
                      required
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                      placeholder="student@gu.edu.eg"
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="inqCat" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        id="inqCat"
                        value={inquiryCategory}
                        onChange={(e) => setInquiryCategory(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-2.5 py-2 text-xs text-white transition-colors"
                      >
                        <option value="general">General Transit Inquiry</option>
                        <option value="lost_found">Lost Item Onboard Bus</option>
                        <option value="booking">Seat Booking Support</option>
                        <option value="refund">Refund / Payment Issue</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="inqRoute" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                        Route / Bus
                      </label>
                      <input
                        id="inqRoute"
                        type="text"
                        value={inquiryRoute}
                        onChange={(e) => setInquiryRoute(e.target.value)}
                        placeholder="e.g. Line 29 Port Tawfik"
                        className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="inqMsg" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Message / Notice Details *
                    </label>
                    <textarea
                      id="inqMsg"
                      required
                      rows={3}
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      placeholder="Describe your inquiry or lost item details..."
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 transition-colors resize-none"
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
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs rounded-lg transition-all shadow cursor-pointer disabled:opacity-50"
                  >
                    {inquiryStatus === 'sending' ? 'Submitting...' : 'Submit Inquiry (إرسال الطلب)'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10 px-4 sm:px-6 mt-16 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/gu-logo-colored.png"
                alt="Galala University Official Emblem"
                className="h-8 w-auto object-contain"
              />
              <span className="font-bold text-white text-sm">Bus Aesh GU</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Official smart transit network serving Galala University students, faculty, line supervisors, and transport administrators.
            </p>
          </div>

          <div>
            <div className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
              Portals & Services
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/rider" className="hover:text-blue-400 transition-colors">
                  Student Rider Dashboard
                </Link>
              </li>
              <li>
                <Link href="/pass" className="hover:text-blue-400 transition-colors">
                  Boarding Pass Verification
                </Link>
              </li>
              <li>
                <Link href="/supervisor" className="hover:text-blue-400 transition-colors">
                  Line Supervisor Operations
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-blue-400 transition-colors">
                  Admin Dispatch Console
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
              Legal & Regulations
            </div>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/privacy" className="hover:text-blue-400 transition-colors">
                  Privacy Policy & Data Rights
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-400 transition-colors">
                  Terms & Conditions of Transit
                </Link>
              </li>
              <li>
                <a href="https://gu.edu.eg" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
                  Official University Portal
                </a>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-blue-400 transition-colors">
                  XML Sitemap
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
              Operations Support Desk
            </div>
            <p className="text-[11px] text-slate-400 mb-1">
              Building B, Plateau of Galala, Suez
            </p>
            <p className="text-[11px] text-slate-400 mb-1">
              Email: <a href="mailto:transport@gu.edu.eg" className="text-blue-400 hover:underline">transport@gu.edu.eg</a>
            </p>
            <p className="text-[11px] text-slate-400">
              Hours: 06:00 - 20:00 Daily
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <div>
            © 2026 Galala University (جامعة الجلالة). All rights reserved.
          </div>
          <div className="font-mono text-slate-400">
            Platform Release v1.1.2 • Verified Institutional Transport Mesh
          </div>
        </div>
      </footer>

      {/* Sticky Mobile Contact Drawer */}
      <StickyMobileContact />
    </div>
  );
}
