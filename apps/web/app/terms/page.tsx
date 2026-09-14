import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions | Galala University Bus Aesh',
  description:
    'Official terms of transit, seat reservation rules, cancellation lock windows, automated refund guidelines, and onboard passenger conduct policies for Galala University bus service.',
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    title: 'Terms and Conditions | Galala University Bus Aesh',
    description:
      'Official seat reservation regulations, cancellation policies, and transit terms for Galala University students and staff.',
    url: 'https://bus.gu.edu.eg/terms',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <header className="border-b border-[var(--card-border)] bg-[var(--card-bg)]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Emblem"
              className="h-9 w-auto object-contain dark:hidden"
            />
            <img
              src="/gu-logo-white.png"
              alt="Galala University Emblem"
              className="h-9 w-auto object-contain hidden dark:block"
            />
            <span className="font-bold text-[var(--foreground)] tracking-tight text-sm sm:text-base">
              Bus Aesh <span className="text-[var(--warning)] font-normal">| Terms</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] py-1.5 px-3 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] transition-all"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumbs" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <li>
              <Link href="/" className="hover:text-blue-400 transition-colors">
                Home
              </Link>
            </li>
            <li>/</li>
            <li className="text-slate-200 font-medium">Terms of Transit</li>
          </ol>
        </nav>

        {/* Semantic Single H1 */}
        <div className="mb-8 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-mono font-semibold mb-3">
            <span className="material-symbols-outlined text-base">gavel</span>
            <span>Official University Transit Regulations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Terms & Conditions of Transit
          </h1>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Last Revised: September 2026 • Enforced by GU Campus Operations & Security
          </p>
        </div>

        {/* Policy Articles */}
        <article className="space-y-8 text-sm text-slate-300 leading-relaxed">
          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-400 text-xl">event_seat</span>
              1. Seat Reservation & Temporary Lock Policy
            </h2>
            <p>
              When selecting an available seat on the 50-passenger cabin map, the system issues a temporary <strong>5-minute (300 seconds)</strong> lock in the distributed Redis store. During this window, the seat is held exclusively for your account to complete checkout.
            </p>
            <p className="mt-2 text-slate-400">
              If payment or Instapay reference submission is not finalized within 5 minutes, the seat lock automatically expires and is immediately made available to other students across all active terminals.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-xl">lock_clock</span>
              2. Cancellation Lock Windows & Automated Refunds
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-300 ml-1">
              <li>
                <strong>Student Self-Service Cancellation:</strong> Bookings may be cancelled through the Rider Portal up to <strong>3 hours</strong> prior to scheduled departure. Cancellations completed before this deadline receive an automatic <strong>100% full refund (160 EGP per single leg)</strong>.
              </li>
              <li>
                <strong>Cancellation Lockout:</strong> Within 3 hours of scheduled departure, the cancellation lock takes effect. No cancellations, ticket transfers, or refund claims can be processed through the student portal after this cutoff.
              </li>
              <li>
                <strong>Operational Cancellations:</strong> In the rare event of bus mechanical failure or extreme mountain weather advisory, line supervisors or administrators may cancel a trip up to 5 hours prior to departure, issuing immediate push notifications and 100% automated refunds to all booked riders.
              </li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-xl">qr_code_scanner</span>
              3. Boarding Verification & Anti-Passback Rules
            </h2>
            <p>
              Each confirmed reservation generates a dual-mode digital boarding pass containing:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 mt-2 ml-1">
              <li>A cryptographically signed HMAC-SHA256 QR code verified by the supervisor device camera.</li>
              <li>A human-readable 4-character boarding code (<code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-amber-300">GU-XXXX</code>) for manual manifest check-in.</li>
            </ol>
            <p className="mt-3">
              <strong>Anti-Passback Enforcement:</strong> A boarding code or QR pass can only be scanned once per trip. Any secondary scan attempt triggers an immediate security alert with the exact initial boarding timestamp. Transferring active passes to non-eligible individuals is strictly prohibited.
            </p>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl">commute</span>
              4. Passenger Conduct & Mountain Highway Safety
            </h2>
            <p>
              All passengers travelling along the Cairo-Ain Sokhna and Galala Mountain corridors must observe university transport regulations:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-300 mt-2 ml-1">
              <li>Arrive at your assigned regional pickup station at least <strong>10 minutes</strong> before scheduled departure.</li>
              <li>Occupancy is restricted to the specific seat number assigned on your confirmed boarding pass.</li>
              <li>Seat swapping is solely permissible under the direct authorization and system re-assignment of the designated Line Supervisor.</li>
              <li>Seatbelt fastening is mandatory across all highway segments in compliance with national transport safety laws.</li>
            </ul>
          </section>

          <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400 text-xl">support_agent</span>
              5. Dispute Resolution & Transit Desk Support
            </h2>
            <p>
              For inquiries regarding lost items, pickup station changes, or payment discrepancies, students can submit an inquiry through the homepage contact form or reach the Transport Operations Desk at:
            </p>
            <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-1 text-slate-300">
              <div>• Email: transport@gu.edu.eg</div>
              <div>• Operating Hours: Daily 06:00 AM – 08:00 PM</div>
              <div>• Physical Desk: Galala University Plateau, Building B, Ground Floor</div>
            </div>
          </section>
        </article>

        {/* Footer Navigation */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-blue-400 hover:underline">
              Privacy Policy
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
