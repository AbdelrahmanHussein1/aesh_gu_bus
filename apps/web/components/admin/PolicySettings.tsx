'use client';
import { useApp } from '@/hooks/useAppStore';

export default function PolicySettings() {
  const { cancelLockHours, setCancelLockHours } = useApp();

  return (
    <div className="bg-surface-container border border-border-whisper rounded-xl shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] p-5 space-y-4">
      <h3 className="font-headline-sm text-headline-sm text-text-primary border-b border-border-whisper pb-2">Policy Settings</h3>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-text-secondary">Cancellation Lock-out</span>
          <span className="text-primary-container font-bold">{cancelLockHours} Hours</span>
        </div>
        <input type="range" min="1" max="24" value={cancelLockHours}
          onChange={e => setCancelLockHours(Number(e.target.value))}
          className="w-full accent-primary-container" />
        <p className="text-[9px] text-text-secondary leading-normal">Riders cannot cancel seats within this number of hours before departure.</p>
      </div>

      <div className="pt-3 border-t border-border-whisper space-y-2">
        <h4 className="text-xs font-semibold text-text-primary">Simulation Operations</h4>
        <button onClick={() => {
          localStorage.setItem('aesh_bookings', JSON.stringify([]));
          localStorage.setItem('aesh_audit_logs', JSON.stringify([]));
          alert('Database wiped.');
          window.location.reload();
        }}
          className="w-full py-2.5 bg-destructive-alt/10 border border-destructive-alt/20 text-destructive-alt text-xs rounded-lg hover:bg-destructive-alt/20 transition font-semibold">
          Wipe Simulation Records
        </button>
      </div>
    </div>
  );
}
