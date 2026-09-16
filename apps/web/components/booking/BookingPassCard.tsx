'use client';
import { useApp } from '@/hooks/useAppStore';
import type { GroupedBooking } from '@/lib/types';
import { showToast } from '@/components/ui/Toast';

interface BoardedStampProps {
  isJustBoarded: boolean;
  size?: 'normal' | 'compact';
}

function BoardedStamp({ isJustBoarded, size = 'normal' }: BoardedStampProps) {
  const isCompact = size === 'compact';
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      {isJustBoarded && (
        <div className="py-1 px-3 bg-emerald-500/15 border border-emerald-500/30 rounded-full inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-badge-pop shadow-sm">
          <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
          <span>تم تأكيد الصعود بنجاح</span>
        </div>
      )}

      <div
        className={`relative ${isCompact ? 'w-24 h-24' : 'w-28 h-28'} bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl flex flex-col items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm transition-all duration-500 ${
          isJustBoarded ? 'animate-badge-pop ring-4 ring-emerald-400/40 shadow-[0_0_25px_rgba(16,185,129,0.35)]' : ''
        }`}
      >
        {isJustBoarded && (
          <span className="absolute inset-0 rounded-2xl bg-emerald-400/20 animate-ping pointer-events-none opacity-70" />
        )}

        <div className={`${isCompact ? 'w-10 h-10' : 'w-11 h-11'} rounded-full border-2 border-emerald-500 flex items-center justify-center mb-1 bg-emerald-500/10 ${isJustBoarded ? 'qr-checkmark-anim' : ''}`}>
          <svg className={`${isCompact ? 'w-5 h-5' : 'w-6 h-6'} text-emerald-600 dark:text-emerald-400 stroke-current fill-none`} viewBox="0 0 24 24" strokeWidth="3">
            <path
              className={isJustBoarded ? 'animate-checkmark-draw' : ''}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-black tracking-widest text-emerald-600 dark:text-emerald-400`}>BOARDED</span>
      </div>
    </div>
  );
}

function BoardingCodeBadge({ code, bId }: { code?: string; bId: string }) {
  const displayCode = code || ('GU-' + bId.substring(0, 4).toUpperCase());
  return (
    <div className="bg-primary-container/5 border border-primary-container/25 rounded-xl p-2 max-w-[220px] mx-auto text-center space-y-1 mt-2 shadow-xs">
      <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-primary-container">
        <span className="material-symbols-outlined text-[13px]">pin</span>
        <span>رمز الصعود البديل (Manual Code)</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-surface-container py-1 px-2.5 rounded-lg border border-border-whisper">
        <span className="font-mono text-sm font-extrabold tracking-widest text-primary-container select-all">
          {displayCode}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(displayCode).catch(() => {});
            }
            showToast(`تم نسخ رمز الصعود: ${displayCode}`, 'success');
          }}
          className="text-text-secondary hover:text-primary-container p-0.5 rounded transition-colors"
          title="نسخ الرمز"
        >
          <span className="material-symbols-outlined text-[14px]">content_copy</span>
        </button>
      </div>
      <p className="text-[8px] text-text-secondary leading-tight">
        أعطِ هذا الرمز للمشرف عند تعذر مسح الـ QR
      </p>
    </div>
  );
}

function RoundTripCard({ group }: { group: GroupedBooking }) {
  const { expandedTicketId, setExpandedTicketId, justBoardedBookingIds, handleCancelBooking, setScanInputToken } = useApp();
  const arr = group.arrival!;
  const ret = group.returnLeg!;
  const isExpanded = expandedTicketId === group.id;
  const arrBoarded = !!arr.qrUsedAt;
  const retBoarded = !!ret.qrUsedAt;
  const arrJustBoarded = justBoardedBookingIds.has(arr.id);
  const retJustBoarded = justBoardedBookingIds.has(ret.id);
  const hasJustBoarded = arrJustBoarded || retJustBoarded;

  return (
    <div className={`bg-surface-container border border-border-whisper rounded-xl overflow-hidden shadow-sm transition-all duration-500 ${group.status === 'cancelled' ? 'opacity-40' : (arrBoarded && retBoarded) ? 'ticket-boarded' : ''} ${hasJustBoarded ? 'ring-2 ring-emerald-500/70 shadow-lg' : ''}`}>
      <button onClick={() => setExpandedTicketId(isExpanded ? null : group.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors">
        <div className="min-w-0 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl">confirmation_number</span>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-primary-container bg-primary-container/10 px-2 py-0.5 rounded">Round Trip</span>
            <h4 className="font-semibold text-sm text-text-primary mt-1">{arr.routeAr}</h4>
          </div>
        </div>
        <span className="material-symbols-outlined text-text-secondary transition-transform">{isExpanded ? 'expand_less' : 'expand_more'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-whisper pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Arrival Leg */}
            <div className="space-y-2 text-center">
              <p className="text-[10px] font-bold text-primary-container uppercase">1. Arrival Leg</p>
              <p className="text-[10px] text-text-secondary font-mono">{arr.departureTime}</p>
              <p className="text-xs font-bold text-text-primary">Seat {arr.seatNumber}</p>
              {arrBoarded ? (
                <BoardedStamp isJustBoarded={arrJustBoarded} size="compact" />
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arr.qrToken)}`} alt="Arrival QR" className="w-full h-full" />
                  </div>
                  <BoardingCodeBadge code={arr.boardingCode} bId={arr.id} />
                  <button onClick={() => { setScanInputToken(arr.boardingCode || arr.qrToken); showToast('Token copied to scanner!', 'info'); }} className="text-[9px] text-primary-container hover:underline">Simulate Boarding</button>
                </div>
              )}
            </div>

            {/* Return Leg */}
            <div className="space-y-2 text-center border-l border-border-whisper pl-4">
              <p className="text-[10px] font-bold text-destructive-asu uppercase">2. Return Leg</p>
              <p className="text-[10px] text-text-secondary font-mono">{ret.departureTime}</p>
              <p className="text-xs font-bold text-text-primary">Seat {ret.seatNumber}</p>
              {retBoarded ? (
                <BoardedStamp isJustBoarded={retJustBoarded} size="compact" />
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ret.qrToken)}`} alt="Return QR" className="w-full h-full" />
                  </div>
                  <BoardingCodeBadge code={ret.boardingCode} bId={ret.id} />
                  <button onClick={() => { setScanInputToken(ret.boardingCode || ret.qrToken); showToast('Token copied to scanner!', 'info'); }} className="text-[9px] text-primary-container hover:underline">Simulate Boarding</button>
                </div>
              )}
            </div>
          </div>
          {/* Driver & Line Supervisor Contacts */}
          {(arr.driver || (arr.supervisors && arr.supervisors.length > 0) || ret.driver || (ret.supervisors && ret.supervisors.length > 0)) && (
            <div className="bg-surface-container-low border border-border-whisper rounded-lg p-3 text-xs space-y-2 text-left">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary-container">contact_phone</span>
                <span>مسؤولو الرحلة / Trip Staff</span>
              </div>
              {arr.driver && (
                <div className="flex items-center justify-between text-text-primary">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-text-secondary">directions_bus</span>
                    <span>سائق الذهاب: {arr.driver.nameAr}</span>
                  </span>
                  <a href={`tel:${arr.driver.phone}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-container/10 text-primary-container hover:bg-primary-container/20 rounded font-mono font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    <span>{arr.driver.phone}</span>
                  </a>
                </div>
              )}
              {arr.supervisors && arr.supervisors.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-text-primary">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-text-secondary">badge</span>
                    <span>المشرف: {s.nameAr}</span>
                  </span>
                  <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-container/30 text-text-primary hover:bg-secondary-container/50 rounded font-mono font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    <span>{s.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-2">
            <button onClick={() => handleCancelBooking(arr.id)} className="text-[10px] text-destructive-alt hover:underline font-semibold">Cancel Sibling Bookings</button>
          </div>
        </div>
      )}
    </div>
  );
}

function OneWayCard({ group }: { group: GroupedBooking }) {
  const { expandedTicketId, setExpandedTicketId, justBoardedBookingIds, handleCancelBooking, setScanInputToken } = useApp();
  const b = group.booking!;
  const isExpanded = expandedTicketId === group.id;
  const isBoarded = !!b.qrUsedAt;

  const isJustBoarded = justBoardedBookingIds.has(b.id);

  return (
    <div className={`bg-surface-container border border-border-whisper rounded-xl overflow-hidden shadow-sm transition-all duration-500 ${group.status === 'cancelled' ? 'opacity-40' : isBoarded ? 'ticket-boarded' : ''} ${isJustBoarded ? 'ring-2 ring-emerald-500/70 shadow-lg' : ''}`}>
      <button onClick={() => setExpandedTicketId(isExpanded ? null : group.id)} className="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors">
        <div className="min-w-0 flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-container text-2xl">confirmation_number</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${b.status === 'confirmed' ? 'bg-primary-container/10 text-primary-container' : 'bg-error-container/50 text-on-error-container'}`}>{b.status}</span>
              <span className="text-[9px] text-text-secondary uppercase font-semibold">{b.legType === 'to_campus' ? 'To Campus' : 'Return'}</span>
            </div>
            <h4 className="font-semibold text-sm text-text-primary mt-1">{b.routeAr}</h4>
          </div>
        </div>
        <span className="material-symbols-outlined text-text-secondary transition-transform">{isExpanded ? 'expand_less' : 'expand_more'}</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-whisper pt-4 text-center space-y-4">
          <p className="text-[10px] text-text-secondary font-mono">Departure: {b.departureTime}</p>
          <p className="text-xs font-bold text-text-primary">Seat {b.seatNumber}</p>
          {isBoarded ? (
            <BoardedStamp isJustBoarded={isJustBoarded} size="normal" />
          ) : (
            <div className="space-y-2">
              <div className="w-24 h-24 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qrToken)}`} alt="Ticket QR" className="w-full h-full" />
              </div>
              <BoardingCodeBadge code={b.boardingCode} bId={b.id} />
              <button onClick={() => { setScanInputToken(b.boardingCode || b.qrToken); showToast('Token copied to scanner!', 'info'); }} className="text-[9px] text-primary-container hover:underline">Simulate Scan</button>
            </div>
          )}

          {/* Driver & Line Supervisor Contacts */}
          {(b.driver || (b.supervisors && b.supervisors.length > 0)) && (
            <div className="bg-surface-container-low border border-border-whisper rounded-lg p-3 text-xs space-y-2 text-left">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary-container">contact_phone</span>
                <span>مسؤولو الرحلة / Trip Staff</span>
              </div>
              {b.driver && (
                <div className="flex items-center justify-between text-text-primary">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-text-secondary">directions_bus</span>
                    <span>السائق: {b.driver.nameAr}</span>
                  </span>
                  <a href={`tel:${b.driver.phone}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-container/10 text-primary-container hover:bg-primary-container/20 rounded font-mono font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    <span>{b.driver.phone}</span>
                  </a>
                </div>
              )}
              {b.supervisors && b.supervisors.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-text-primary">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-text-secondary">badge</span>
                    <span>المشرف: {s.nameAr}</span>
                  </span>
                  <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-container/30 text-text-primary hover:bg-secondary-container/50 rounded font-mono font-semibold text-[11px]">
                    <span className="material-symbols-outlined text-[12px]">call</span>
                    <span>{s.phone}</span>
                  </a>
                </div>
              ))}
            </div>
          )}

          {!isBoarded && (
            <div className="text-center pt-2">
              <button onClick={() => handleCancelBooking(b.id)} className="text-[10px] text-destructive-alt hover:underline">Cancel Seat</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BookingPassCard() {
  const { getGroupedBookings } = useApp();
  const grouped = getGroupedBookings();

  if (grouped.length === 0) {
    return (
      <div className="bg-surface-container rounded-xl border border-border-whisper p-6 text-center text-xs italic text-text-secondary">
        No boarding tickets found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grouped.map(g => g.type === 'round_trip' ? <RoundTripCard key={g.id} group={g} /> : <OneWayCard key={g.id} group={g} />)}
    </div>
  );
}
