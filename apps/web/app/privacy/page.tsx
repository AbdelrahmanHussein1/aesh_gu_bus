import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Galala University Bus Aesh',
  description:
    'Comprehensive data protection, student ID privacy, transit tracking records, and data retention disclosures for Galala University smart bus transit system.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: 'Privacy Policy | Galala University Bus Aesh',
    description:
      'Information on how student academic credentials, seat reservations, and on-board verification records are collected and secured.',
    url: 'https://bus.gu.edu.eg/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Emblem"
              className="h-9 w-auto object-contain"
            />
            <span className="font-bold text-white tracking-tight text-sm sm:text-base">
              Bus Aesh <span className="text-amber-400 font-normal">| Policy</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-300 hover:text-white py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumbs" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <li>
              <Link href="/" className="hover:text-blue-400 transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-slate-200 font-medium">Privacy Policy</li>
          </ol>
        </nav>

        {/* Semantic Single H1 */}
        <div className="mb-8 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-mono font-semibold mb-3">
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>Institutional Data Protection Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Privacy Policy & Data Protection
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Effective Date: September 2026 • Document Version: 1.2 • Galala University Transit Registry
          </p>
        </div>

        {/* Content Sections */}
        <article className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">account_balance</span>
              1. Institutional Identity & Data Controller
            </h2>
            <p>
              This Privacy Policy governs the processing of personal data on the <strong>Bus Aesh</strong> smart transit platform, managed by the <strong>Transportation & Fleet Logistics Directorate of Galala University (GU)</strong>, located on the Plateau of Galala, Attaka, Suez Governorate, Egypt.
            </p>
            <p className="mt-2 text-slate-400">
              For any privacy inquiries or regulatory concerns, please contact our Institutional Data Protection Liaison at{' '}
              <a href="mailto:transport@gu.edu.eg" className="text-blue-400 hover:underline">
                transport@gu.edu.eg
              </a>
              .
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-xl">badge</span>
              2. Categories of Information Collected
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-1">
              <li>
                <strong>Academic Identity:</strong> Official university email (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-amber-300">@gu.edu.eg</code>), full student legal name (Arabic and English), Academic ID number, and affiliated Faculty/Program.
              </li>
              <li>
                <strong>Reservation Telemetry:</strong> Selected travel route, departure date, scheduled time slot, cabin seat assignment, and reservation timestamps.
              </li>
              <li>
                <strong>Operational Boarding Scans:</strong> Cryptographic QR code verification timestamps, bus vehicle identification, and assigned line supervisor check-in records.
              </li>
              <li>
                <strong>Security Logs:</strong> Client IP addresses, session IDs, user-agent data, and password update audit records stored securely in PostgreSQL.
              </li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-xl">security</span>
              3. Purpose of Processing & Legal Basis
            </h2>
            <p className="mb-2">
              All personal and transit records are processed strictly for educational logistics and safety:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-300 ml-1">
              <li>Facilitating safe, synchronized daily transit between Cairo, Suez, and the Galala University campus.</li>
              <li>Preventing fraudulent pass transfers through single-device session validation and anti-passback scanning.</li>
              <li>Processing automated refunds in the event of schedule cancellations before the 3-hour lock deadline.</li>
              <li>Emergency contact and security accountability during mountain highway transit.</li>
            </ol>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-xl">cookie</span>
              4. Cookies & Session Storage
            </h2>
            <p>
              Bus Aesh uses strict essential cookies and browser <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-slate-200">localStorage</code> tokens required for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 mt-2 ml-1">
              <li>Authentication session state (JWT bearer tokens).</li>
              <li>Redis 5-minute temporary seat hold locking.</li>
              <li>Single-tab browser guard via native <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">BroadcastChannel</code>.</li>
            </ul>
            <p className="mt-2 text-slate-400">
              We do not deploy third-party advertising cookies, data broker trackers, or invasive analytics pixels.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-xl">lock</span>
              5. Data Retention & Student Rights
            </h2>
            <p>
              Trip manifests and boarding logs are retained for 90 days following semester completion for administrative auditing, after which operational records are permanently archived or aggregated for route optimization.
            </p>
            <p className="mt-2">
              Students maintain full rights to review their active booking history, request correction of misallocated academic details, and download boarding pass receipts via the Student Rider Portal.
            </p>
          </section>
        </article>

        {/* Footer Contact */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/terms" className="text-blue-400 hover:underline">
              Terms & Conditions
            </Link>
            <span>•</span>
            <Link href="/pass" className="text-blue-400 hover:underline">
              Pass Verification
            </Link>
            <span>•</span>
            <Link href="/" className="text-blue-400 hover:underline">
              Login Portal
            </Link>
          </div>
          <div className="text-slate-400 font-mono">
            © 2026 Galala University Transport Department
          </div>
        </div>
      </main>
    </div>
  );
}
