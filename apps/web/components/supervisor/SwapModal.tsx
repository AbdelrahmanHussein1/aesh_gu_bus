'use client';
import { useApp } from '@/hooks/useAppStore';

export default function SwapModal() {
  const {
    swapBookingTarget, setSwapBookingTarget,
    swapTripId, setSwapTripId,
    swapSeatNumber, setSwapSeatNumber,
    isSwapping, handleSupervisorSwapSubmit,
  } = useApp();

  if (!swapBookingTarget) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container w-full max-w-md rounded-xl p-6 border border-border-whisper space-y-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-border-whisper pb-4">
          <h3 className="text-lg font-bold text-primary-container flex items-center gap-2">
            <span className="material-symbols-outlined">swap_horiz</span>
            Reassign Seat
          </h3>
          <button onClick={() => setSwapBookingTarget(null)} className="text-text-secondary hover:text-text-primary">&times;</button>
        </div>

        <div className="bg-surface-container-low p-4 rounded-xl border border-border-whisper space-y-1 text-xs">
          <p><span className="text-text-secondary">Passenger:</span> <span className="font-semibold text-text-primary">{swapBookingTarget.riderName}</span></p>
          <p><span className="text-text-secondary">Current Seat:</span> <span className="font-bold text-primary-container">{swapBookingTarget.seatNumber}</span></p>
          <p><span className="text-text-secondary">Status:</span> <span className="font-semibold">{swapBookingTarget.status}</span></p>
        </div>

        <form onSubmit={handleSupervisorSwapSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">New Trip ID</label>
            <input type="number" required placeholder="e.g. 101" value={swapTripId} onChange={e => setSwapTripId(e.target.value)}
              className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-text-secondary font-medium">New Seat Number</label>
            <input type="number" required min={1} max={50} placeholder="1-50" value={swapSeatNumber} onChange={e => setSwapSeatNumber(e.target.value)}
              className="w-full bg-surface border border-border-whisper rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary-container text-text-primary" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setSwapBookingTarget(null)} className="flex-1 py-2.5 bg-surface border border-border-whisper text-text-primary rounded-lg text-xs font-semibold hover:bg-surface-container-low transition">Cancel</button>
            <button type="submit" disabled={isSwapping || !swapTripId || !swapSeatNumber}
              className="flex-1 py-2.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-40">
              {isSwapping ? 'Reassigning...' : 'Confirm Reassignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
