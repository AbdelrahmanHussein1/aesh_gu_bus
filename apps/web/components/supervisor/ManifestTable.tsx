'use client';
import { useApp } from '@/hooks/useAppStore';

export default function ManifestTable() {
  const { supervisorManifest, activeTrip, setSwapBookingTarget, handleSupervisorCancel } = useApp();

  return (
    <div className="xl:col-span-2 bg-surface-container border border-border-whisper rounded-xl p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border-whisper pb-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">qr_code_scanner</span>
            Supervisor Operations Panel
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">Manage live rosters, boarding logs, and swap seats</p>
        </div>
        <div className="text-xs text-primary-container bg-primary-container/10 px-3 py-1.5 rounded-md border border-primary-container/25 font-semibold">
          Trip Bus: {activeTrip?.bus.name || 'No bus selected'}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-text-primary">
          <thead>
            <tr className="border-b border-border-whisper text-xs text-text-secondary uppercase font-semibold">
              <th className="py-3 px-4">Seat</th>
              <th className="py-3 px-4">Rider</th>
              <th className="py-3 px-4">Booking Status</th>
              <th className="py-3 px-4">Boarding State</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-whisper text-sm">
            {supervisorManifest.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-text-secondary italic">No passengers currently booked on this trip.</td></tr>
            ) : (
              supervisorManifest.map(row => (
                <tr key={row.bookingId} className="hover:bg-surface-container-low border-b border-border-whisper">
                  <td className="py-3.5 px-4 font-bold text-primary-container">{row.seatNumber}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-text-primary">{row.riderName}</div>
                    <div className="text-xs text-text-secondary">{row.riderEmail}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${row.status === 'confirmed' || row.status === 'swapped' ? 'bg-primary-container/10 text-primary-container' : 'bg-error-container/50 text-on-error-container'}`}>{row.status}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    {row.isBoarded ? (
                      <span className="text-success-galala flex items-center gap-1.5 text-xs font-semibold">
                        <span className="material-symbols-outlined text-sm">check_circle</span> Boarded ({row.boardedAt})
                      </span>
                    ) : (
                      <span className="text-text-secondary flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-sm">schedule</span> Pending
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {row.status !== 'cancelled' && (
                      <>
                        <button onClick={() => setSwapBookingTarget(row)}
                          className="text-xs bg-surface-container-low hover:bg-surface-container-high text-text-primary px-3 py-1.5 rounded-lg border border-border-whisper transition">
                          Swap Seat
                        </button>
                        <button onClick={() => handleSupervisorCancel(row.bookingId)}
                          className="text-xs bg-destructive-alt/10 hover:bg-destructive-alt/20 text-destructive-alt px-3 py-1.5 rounded-lg border border-destructive-alt/20 transition">
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
    </div>
  );
}
