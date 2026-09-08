'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppStore';

export default function SeatGrid() {
  const {
    bookingType, activeTrip, activeArrivalTrip, activeReturnTrip,
    seats, selectedSeat, heldExpiresAt, lockingSeatNumber,
    handleSeatClick, setShowCheckout, user,
  } = useApp();

  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!heldExpiresAt) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [heldExpiresAt]);

  const hasActiveTrip = bookingType === 'round_trip' ? (activeArrivalTrip && activeReturnTrip) : activeTrip;
  const holdTimeLeft = heldExpiresAt ? Math.max(0, Math.floor((heldExpiresAt - now) / 1000)) : 0;
  const holdMins = Math.floor(holdTimeLeft / 60);
  const holdSecs = holdTimeLeft % 60;
  const countdownFormatted = holdMins > 0 ? `${holdMins}m ${holdSecs}s` : `${holdSecs}s`;

  return (
    <div className="bg-surface-container border border-border-whisper rounded-xl p-6 flex flex-col items-center shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] h-fit">
      <div className="w-full flex justify-between items-center mb-6 border-b border-border-whisper pb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Seat Selection</h3>
          <p className="text-[10px] text-text-secondary mt-0.5">Choose your preferred seat</p>
        </div>
      </div>

      <div className="w-full flex justify-center gap-2 mb-6 text-[10px] font-medium font-mono text-text-secondary flex-wrap">
        <span className="px-2.5 py-1 bg-surface border border-border-whisper rounded flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-surface-container border border-border-whisper"></div> Available
        </span>
        <span className="px-2.5 py-1 bg-surface border border-border-whisper rounded flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-surface-variant border border-outline"></div> Booked
        </span>
        <span className="px-2.5 py-1 bg-primary-container text-on-primary-container rounded flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-on-primary-container"></div> Selected
        </span>
      </div>

      {hasActiveTrip ? (
        <div className="w-full max-w-[280px] bg-surface-container-low border border-border-whisper p-6 rounded-2xl relative">
          <div className="flex justify-end mb-6 pr-2">
            <span className="material-symbols-outlined text-outline text-2xl">hearing</span>
          </div>
          <div className="grid grid-cols-5 gap-y-3 gap-x-2">
            {seats.map((seat, index) => {
              const isAisle = index % 5 === 2;
              const isSelectedByMe = selectedSeat === seat.seatNumber;
              const isHeldByMe = seat.status === 'held' && seat.userId === user?.id;
              const isDisabled = seat.status === 'booked' || (seat.status === 'held' && !isHeldByMe);

              let seatStyle = 'border border-border-whisper bg-surface-container hover:border-primary-container text-text-secondary';
              if (seat.status === 'booked') seatStyle = 'border border-outline bg-surface-variant text-text-secondary opacity-50 cursor-not-allowed';
              else if (isHeldByMe || isSelectedByMe) seatStyle = 'border-2 border-primary-container bg-primary-container text-on-primary-container shadow-sm font-bold';
              else if (seat.status === 'held') seatStyle = 'border border-outline bg-surface-variant text-text-secondary opacity-50 cursor-not-allowed';

              if (isAisle) {
                return (
                  <React.Fragment key={`row-${index}`}>
                    <div className="col-span-1 flex items-center justify-center text-[10px] text-text-secondary font-mono">Aisle</div>
                    <button type="button" disabled={isDisabled} onClick={() => handleSeatClick(seat.seatNumber, seat.status)}
                      className={`w-10 h-10 rounded flex items-center justify-center font-label-mono text-label-mono-sm transition-all ${seatStyle}`}>
                      {seat.seatNumber}
                    </button>
                  </React.Fragment>
                );
              }

              return (
                <button key={seat.seatNumber} type="button" disabled={isDisabled} onClick={() => handleSeatClick(seat.seatNumber, seat.status)}
                  className={`w-10 h-10 rounded flex items-center justify-center font-label-mono text-label-mono-sm transition-all ${seatStyle}`}>
                  {seat.seatNumber}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-text-secondary text-xs italic">Choose a trip to select seats.</div>
      )}

      {selectedSeat && (
        <div className="w-full mt-6 bg-primary-container/5 border border-border-whisper p-4 rounded-xl flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-secondary font-medium">Seat {selectedSeat} Reserved</span>
            {heldExpiresAt && (
              <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${holdTimeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>
                <span className="material-symbols-outlined text-xs">timer</span>
                Expires: {countdownFormatted} ({holdTimeLeft}s)
              </span>
            )}
          </div>
          <button onClick={() => setShowCheckout(true)}
            className="w-full py-2.5 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-95 transition flex justify-center items-center gap-2">
            Confirm Selection
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  );
}
