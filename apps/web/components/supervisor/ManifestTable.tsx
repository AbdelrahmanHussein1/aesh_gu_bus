'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/hooks/useAppStore';
import BoardingManifestPdfModal from './BoardingManifestPdfModal';
import { checkManifestUnlock } from '@/lib/manifest-unlock';

export default function ManifestTable() {
  const { supervisorManifest, activeTrip, setSwapBookingTarget, handleSupervisorCancel, handleManualBoardPassenger, handleManualBoardAll, user } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'boarded' | 'pending'>('all');
  const [showPdfModal, setShowPdfModal] = useState(false);

  const stats = useMemo(() => {
    const total = supervisorManifest.length;
    const boarded = supervisorManifest.filter(m => m.isBoarded).length;
    const pending = total - boarded;
    const percentage = total > 0 ? Math.round((boarded / total) * 100) : 0;
    return { total, boarded, pending, percentage };
  }, [supervisorManifest]);

  const unlockStatus = useMemo(() => {
    return checkManifestUnlock(activeTrip, stats.boarded);
  }, [activeTrip, stats.boarded]);

  const filteredManifest = useMemo(() => {
    return supervisorManifest.filter(row => {
      // Status filter
      if (statusFilter === 'boarded' && !row.isBoarded) return false;
      if (statusFilter === 'pending' && row.isBoarded) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = row.riderName.toLowerCase().includes(q);
        const matchesEmail = row.riderEmail.toLowerCase().includes(q);
        const matchesSeat = String(row.seatNumber).includes(q);
        return matchesName || matchesEmail || matchesSeat;
      }
      return true;
    });
  }, [supervisorManifest, searchQuery, statusFilter]);

  return (
    <div className="xl:col-span-2 bg-surface-container border border-border-whisper rounded-xl p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-whisper pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-xl text-primary-container">groups</span>
              Passenger Manifest
            </h2>
            {activeTrip && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary-container/10 text-primary-container font-bold border border-primary-container/20">
                {activeTrip.bus.name}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            {activeTrip ? `${activeTrip.route?.nameEn || 'Route'} • ${activeTrip.direction === 'to_campus' ? 'To Campus' : 'From Campus'}` : 'Select a bus run to monitor roster'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Boarding Progress Pill */}
          <div className="bg-surface-container-low px-4 py-2 rounded-lg border border-border-whisper min-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-semibold">
              <span className="text-text-secondary">Boarding Progress</span>
              <span className="text-primary-container font-bold">{stats.boarded}/{stats.total} ({stats.percentage}%)</span>
            </div>
            <div className="w-full bg-border-whisper rounded-full h-2 overflow-hidden">
              <div
                className="bg-success-galala h-full transition-all duration-300 rounded-full"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>

          {stats.pending > 0 && activeTrip && (
            <button
              type="button"
              onClick={() => handleManualBoardAll(activeTrip.id)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
              title="Board all pending passengers on this bus"
            >
              <span className="material-symbols-outlined text-base">done_all</span>
              <span>Board All ({stats.pending})</span>
            </button>
          )}

          {/* Official Boarding PDF Action Button */}
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm cursor-pointer ${
              unlockStatus.isUnlocked
                ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95 ring-2 ring-blue-400/30'
                : 'bg-surface-container-low text-text-secondary border border-border-whisper hover:border-blue-500/40'
            }`}
            title={unlockStatus.isUnlocked ? unlockStatus.reasonEn : unlockStatus.reasonAr}
          >
            <span className="material-symbols-outlined text-base text-white">
              {unlockStatus.isUnlocked ? 'picture_as_pdf' : 'lock'}
            </span>
            <span>{unlockStatus.isUnlocked ? 'Export Boarding PDF' : 'Boarding PDF'}</span>
            {!unlockStatus.isUnlocked && (
              <span className="text-[10px] bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded font-mono font-normal">
                {unlockStatus.unlockTimeFormatted}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-text-secondary text-base">
            search
          </span>
          <input
            type="text"
            placeholder="Search passenger or seat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low border border-border-whisper rounded-lg text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-primary-container"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'all' ? 'bg-primary-container text-white' : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'}`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('boarded')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'boarded' ? 'bg-success-galala text-white' : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'}`}
          >
            Boarded ({stats.boarded})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'}`}
          >
            Pending ({stats.pending})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-text-primary">
          <thead>
            <tr className="border-b border-border-whisper text-xs text-text-secondary uppercase font-semibold">
              <th className="py-3 px-4">Seat</th>
              <th className="py-3 px-4">Rider</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4">Boarding State</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-whisper text-sm">
            {filteredManifest.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-secondary italic">
                  {supervisorManifest.length === 0
                    ? 'No passengers currently booked on this bus trip.'
                    : 'No passengers matched your search filter.'}
                </td>
              </tr>
            ) : (
              filteredManifest.map(row => (
                <tr key={row.bookingId} className="hover:bg-surface-container-low border-b border-border-whisper transition">
                  <td className="py-3.5 px-4 font-bold text-primary-container">
                    <span className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center font-bold">
                      {row.seatNumber}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text-primary">{row.riderName}</div>
                    <div className="text-xs text-text-secondary">{row.riderEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.paymentStatus === 'paid' ? 'bg-success-galala/10 text-success-galala border border-success-galala/20' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {row.paymentStatus === 'paid' ? 'Paid (Visa)' : 'Receipt Uploaded'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {row.isBoarded ? (
                      <span className="text-success-galala flex items-center gap-1.5 text-xs font-semibold">
                        <span className="material-symbols-outlined text-base">check_circle</span> Boarded ({row.boardedAt || 'Checked in'})
                      </span>
                    ) : (
                      <span className="text-text-secondary flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-base">schedule</span> Pending Check-in
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {row.status !== 'cancelled' && (
                      <>
                        {!row.isBoarded && (
                          <button
                            onClick={() => handleManualBoardPassenger(row.bookingId, activeTrip?.id)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
                            title="Confirm passenger boarded"
                          >
                            Board
                          </button>
                        )}
                        <button
                          onClick={() => setSwapBookingTarget(row)}
                          className="text-xs bg-surface-container-low hover:bg-surface-container-high text-text-primary px-3 py-1.5 rounded-lg border border-border-whisper transition font-medium"
                        >
                          Swap Seat
                        </button>
                        <button
                          onClick={() => handleSupervisorCancel(row.bookingId)}
                          disabled={row.isBoarded}
                          title={row.isBoarded ? 'لا يمكن إلغاء التذكرة: الراكب قد صعد بالفعل إلى الحافلة' : 'إلغاء التذكرة مع استرداد المبلغ بالكامل'}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition font-medium ${
                            row.isBoarded 
                              ? 'bg-surface-container-high/40 text-text-secondary/40 border-transparent cursor-not-allowed opacity-50' 
                              : 'bg-destructive-alt/10 hover:bg-destructive-alt/20 text-destructive-alt border-destructive-alt/20 cursor-pointer'
                          }`}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPdfModal && (
        <BoardingManifestPdfModal
          trip={activeTrip}
          manifest={supervisorManifest}
          onClose={() => setShowPdfModal(false)}
          supervisorName={user?.fullName}
          supervisorEmail={user?.email}
        />
      )}
    </div>
  );
}
