'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function PassVerificationPage() {
  const [queryCode, setQueryCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = queryCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a valid 4-character Boarding Code (e.g. GU-4A9B) or Ticket Reference.');
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
        setError('Pass not found or service unavailable');
      }
    } catch {
      setError('Pass not found or service unavailable');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/gu-logo-colored.png"
              alt="Galala University Official Emblem"
              className="h-9 w-auto object-contain"
            />
            <span className="font-bold text-white tracking-tight text-sm sm:text-base">
              Bus Aesh <span className="text-amber-400 font-normal">| Pass Verification</span>
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

      {/* Main Container */}
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
            <li className="text-slate-200 font-medium">Pass Verification</li>
          </ol>
        </nav>

        {/* Semantic Single H1 */}
        <div className="mb-8 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-mono font-semibold mb-3">
            <span className="material-symbols-outlined text-base">verified</span>
            <span>Digital Transit Verification Tool</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Digital Boarding Pass Verification
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Enter your 4-character Boarding Code (<code className="text-amber-400 font-mono">GU-XXXX</code>) or booking reference to verify seat allocation, driver status, and trip departure details.
          </p>
        </div>

        {/* Search Form Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-6 mb-8 max-w-xl">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="boardingCode" className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                Boarding Code / كود الصعود
              </label>
              <div className="relative">
                <input
                  id="boardingCode"
                  type="text"
                  value={queryCode}
                  onChange={(e) => setQueryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GU-4A9B or 4A9B"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg py-3 px-4 text-base font-mono font-bold tracking-widest text-white placeholder-slate-600 uppercase transition-all"
                  required
                />
                <span className="absolute right-3 top-3 text-slate-600 material-symbols-outlined">
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
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm rounded-lg transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSearching ? (
                <>
                  <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                  <span>Verifying Transit Registry...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Verify Ticket Status (تحقق من التذكرة)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result Display */}
        {result && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-lg p-6 max-w-xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">Boarding Code</span>
                <div className="text-xl font-mono font-black text-amber-400 tracking-wider">
                  {result.boardingCode}
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">verified</span>
                <span>Active & Confirmed</span>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Assigned Seat</dt>
                <dd className="text-white font-mono font-bold text-base">Seat #{result.seatNumber}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Passenger</dt>
                <dd className="text-slate-200 font-medium">{result.passengerMasked}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-medium mb-0.5">Transit Route</dt>
                <dd className="text-slate-200 font-semibold">{result.route}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-400 font-medium mb-0.5">Shift & Departure</dt>
                <dd className="text-amber-300 font-mono font-medium">{result.shift}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Assigned Coach</dt>
                <dd className="text-slate-300 font-mono">{result.busPlate}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-medium mb-0.5">Line Supervisor</dt>
                <dd className="text-slate-300">{result.supervisorName}</dd>
              </div>
            </dl>

            <div className="mt-5 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Verified on Galala Transit Mesh</span>
              <span className="font-mono text-slate-400">{result.verifiedAt}</span>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="text-blue-400 hover:underline">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="text-blue-400 hover:underline">
              Terms of Transit
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
