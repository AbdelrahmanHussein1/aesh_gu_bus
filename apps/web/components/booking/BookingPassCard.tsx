'use client';
import { useApp } from '@/hooks/useAppStore';
import type { GroupedBooking } from '@/lib/types';

function RoundTripCard({ group }: { group: GroupedBooking }) {
  const { expandedTicketId, setExpandedTicketId, justBoardedBookingIds, handleCancelBooking, setScanInputToken } = useApp();
  const arr = group.arrival!;
  const ret = group.returnLeg!;
  const isExpanded = expandedTicketId === group.id;
  const arrBoarded = !!arr.qrUsedAt;
  const retBoarded = !!ret.qrUsedAt;
  const arrJustBoarded = justBoardedBookingIds.has(arr.id);
  const retJustBoarded = justBoardedBookingIds.has(ret.id);

  return (
    <div className={`bg-surface-container border border-border-whisper rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${group.status === 'cancelled' ? 'opacity-40' : (arrBoarded && retBoarded) ? 'ticket-boarded' : ''}`}>
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
                <div className="w-20 h-20 bg-success-galala/10 border border-success-galala/30 rounded-lg flex flex-col items-center justify-center mx-auto text-success-galala">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="text-[8px] font-bold mt-1">BOARDED</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arr.qrToken)}`} alt="Arrival QR" className="w-full h-full" />
                  </div>
                  <button onClick={() => { setScanInputToken(arr.qrToken); alert('Token copied to scanner!'); }} className="text-[9px] text-primary-container hover:underline">Simulate Boarding</button>
                </div>
              )}
            </div>

            {/* Return Leg */}
            <div className="space-y-2 text-center border-l border-border-whisper pl-4">
              <p className="text-[10px] font-bold text-destructive-asu uppercase">2. Return Leg</p>
              <p className="text-[10px] text-text-secondary font-mono">{ret.departureTime}</p>
              <p className="text-xs font-bold text-text-primary">Seat {ret.seatNumber}</p>
              {retBoarded ? (
                <div className="w-20 h-20 bg-success-galala/10 border border-success-galala/30 rounded-lg flex flex-col items-center justify-center mx-auto text-success-galala">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="text-[8px] font-bold mt-1">BOARDED</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-20 h-20 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ret.qrToken)}`} alt="Return QR" className="w-full h-full" />
                  </div>
                  <button onClick={() => { setScanInputToken(ret.qrToken); alert('Token copied to scanner!'); }} className="text-[9px] text-primary-container hover:underline">Simulate Boarding</button>
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

  return (
    <div className={`bg-surface-container border border-border-whisper rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${group.status === 'cancelled' ? 'opacity-40' : isBoarded ? 'ticket-boarded' : ''}`}>
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
            <div className="w-24 h-24 bg-success-galala/10 border border-success-galala/30 rounded-lg flex flex-col items-center justify-center mx-auto text-success-galala">
              <span className="material-symbols-outlined text-2xl">check_circle</span>
              <span className="text-xs font-bold mt-1">BOARDED</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-24 h-24 bg-white p-1 rounded-lg border border-border-whisper mx-auto">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qrToken)}`} alt="Ticket QR" className="w-full h-full" />
              </div>
              <button onClick={() => { setScanInputToken(b.qrToken); alert('Token copied to scanner!'); }} className="text-[9px] text-primary-container hover:underline">Simulate Scan</button>
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
