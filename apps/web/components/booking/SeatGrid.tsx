'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SeatGrid() {
  const {
    bookingType, activeTrip, activeArrivalTrip, activeReturnTrip,
    seats, selectedSeat, heldExpiresAt, lockingSeatNumber, seatLoadStatus, seatError, retrySeatMap,
    handleSeatClick, setShowCheckout, user,
  } = useApp();
  const { locale } = useLanguage();

  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (!heldExpiresAt) return;
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [heldExpiresAt]);

  const hasActiveTrip = bookingType === 'round_trip'
    ? Boolean(activeArrivalTrip && activeReturnTrip)
    : Boolean(activeTrip);

  const currentTrip = bookingType === 'round_trip' ? activeArrivalTrip : activeTrip;
  const fare = Number(currentTrip?.priceEgp ?? 0);
  const totalFare = bookingType === 'round_trip' ? fare + Number(activeReturnTrip?.priceEgp ?? 0) : fare;

  const holdTimeLeft = heldExpiresAt ? Math.max(0, Math.floor((heldExpiresAt - now) / 1000)) : 0;
  const holdMins = Math.floor(holdTimeLeft / 60);
  const holdSecs = holdTimeLeft % 60;
  const countdownFormatted = `${holdMins}:${holdSecs.toString().padStart(2, '0')}`;

  const rows = useMemo(() => {
    const seatMap = new Map(seats.map(seat => [seat.seatNumber, seat]));
    const rowNumbers = Array.from(new Set(seats.map(seat => Math.ceil(seat.seatNumber / 4)))).sort((a, b) => a - b);
    return rowNumbers.map(row => ({
      rowNumber: row,
      rowLabel: row.toString().padStart(2, '0'),
      seats: ['A', 'B', 'C', 'D'].map((col, index) => ({
        code: `${row.toString().padStart(2, '0')}${col}`, num: (row - 1) * 4 + index + 1,
        col, isWindow: index === 0 || index === 3, seat: seatMap.get((row - 1) * 4 + index + 1),
      })),
    }));
  }, [seats]);

  const selectedSeatObj = useMemo(() => {
    if (!selectedSeat) return null;
    const r = Math.floor((selectedSeat - 1) / 4) + 1;
    const colIdx = (selectedSeat - 1) % 4;
    const colLetter = ['A', 'B', 'C', 'D'][colIdx] || 'A';
    const code = `${r.toString().padStart(2, '0')}${colLetter}`;
    const isWindow = colLetter === 'A' || colLetter === 'D';
    return {
      num: selectedSeat,
      code,
      tier: isWindow ? (locale === 'ar' ? 'مقعد بجوار النافذة' : 'Window Seat') : (locale === 'ar' ? 'مقعد بجوار الممر' : 'Aisle Seat'),
    };
  }, [selectedSeat, locale]);

  return (
    <div className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-4 sm:p-8 shadow-sm transition-colors duration-200">
      {/* Header & Model Spec */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-[var(--background)] px-3.5 py-1.5 rounded-full border border-[var(--card-border)] shadow-xs mb-3">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-ping"></span>
          <span className="font-mono text-xs font-semibold text-primary-container dark:text-blue-400 tracking-wider uppercase">
            {locale === 'ar' ? 'مخطط الحافلة الذكي' : 'Coach Cabin Blueprint'}
          </span>
          <span className="text-[var(--text-muted)]">•</span>
          <span className="font-mono text-xs text-[var(--text-muted)]">
            {currentTrip?.bus.name || (locale === 'ar' ? 'الحافلة' : 'Bus')} · {seats.length} {locale === 'ar' ? 'مقعداً' : 'seats'}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] tracking-tight">
          {locale === 'ar' ? 'اختر مقعدك على متن الحافلة' : 'Interactive Cabin Floorplan & Seat Selector'}
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          {locale === 'ar'
            ? 'توزيع 2+2 مريح مع قمرة قيادة بانورامية، ممر وسطي، ومخرج طوارئ.'
            : 'Standard 2+2 layout with panoramic frontal cockpit, central aisle, and mid-cabin safety exits.'}
        </p>
      </div>

      {/* Seat State Legend Bar */}
      <div className="w-full max-w-2xl mx-auto bg-[var(--background)] rounded-xl p-3.5 shadow-xs border border-[var(--card-border)] mb-8">
        <div className="flex flex-wrap items-center justify-around gap-3 text-xs font-mono font-medium">
          {/* Available */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-7 rounded bg-[var(--card-bg)] border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px] text-[var(--text-muted)] font-bold shadow-xs">
              01
            </div>
            <span className="text-[var(--foreground)]">{locale === 'ar' ? 'متاح' : 'Available'}</span>
          </div>

          {/* Selected */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-7 rounded bg-[#14259B] text-white flex items-center justify-center text-[11px] shadow-sm">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </div>
            <span className="font-bold text-primary-container dark:text-blue-400">{locale === 'ar' ? 'مقعدك المحدد' : 'Selected (You)'}</span>
          </div>

          {/* Booked */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-7 rounded bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center text-[11px] opacity-70">
              <span className="material-symbols-outlined text-[13px]">lock</span>
            </div>
            <span className="text-[var(--text-muted)]">{locale === 'ar' ? 'محجوز' : 'Booked'}</span>
          </div>

          {/* Held / In Cart */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-7 rounded bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 flex items-center justify-center text-[11px] font-bold">
              <span className="material-symbols-outlined text-[13px] text-amber-600">schedule</span>
            </div>
            <span className="text-[var(--foreground)]">{locale === 'ar' ? 'قيد الحجز' : 'In Cart (Held)'}</span>
          </div>
        </div>
      </div>

      {!hasActiveTrip ? (
        <div className="py-16 text-center text-[var(--text-muted)] text-sm italic bg-[var(--background)] rounded-2xl border border-dashed border-[var(--card-border)] max-w-lg mx-auto">
          <span className="material-symbols-outlined text-4xl mb-2 text-[var(--text-muted)] block">directions_bus</span>
          <span>{locale === 'ar' ? 'يرجى اختيار رحلة من القائمة أعلاه لعرض مخطط المقاعد.' : 'Please select a trip schedule above to display the interactive coach cabin floorplan.'}</span>
        </div>
      ) : seatLoadStatus !== 'ready' ? (
        <div role={seatLoadStatus === 'error' ? 'alert' : 'status'} aria-live="polite" aria-busy={seatLoadStatus === 'loading'} className="py-12 px-4 text-center text-sm bg-[var(--background)] rounded-2xl border border-[var(--card-border)] max-w-lg mx-auto space-y-4">
          <span className={`material-symbols-outlined text-3xl block ${seatLoadStatus === 'loading' ? 'animate-spin' : ''}`} aria-hidden="true">{seatLoadStatus === 'loading' ? 'progress_activity' : seatLoadStatus === 'error' ? 'cloud_off' : 'event_seat'}</span>
          <p>{seatLoadStatus === 'loading'
            ? locale === 'ar' ? 'جاري تحميل المقاعد المتاحة...' : 'Loading seat availability…'
            : seatLoadStatus === 'error'
              ? locale === 'ar' ? 'تعذر تحميل المقاعد. تحقق من الاتصال وحاول مرة أخرى.' : seatError
              : locale === 'ar' ? 'لا توجد مقاعد متاحة لهذه الرحلة.' : 'No seats were returned for this trip.'}</p>
          {seatLoadStatus !== 'loading' && <button type="button" onClick={() => void retrySeatMap()} className="min-h-11 rounded-xl px-6 bg-primary-container text-white font-semibold">{locale === 'ar' ? 'إعادة المحاولة' : 'Retry seat availability'}</button>}
        </div>
      ) : (
        /* MAIN COACH BLUEPRINT CHASSIS CONTAINER */
        <div dir="ltr" className="relative w-full max-w-[540px] mx-auto bg-[var(--background)] rounded-[44px] p-3 sm:p-8 shadow-xl border border-[var(--card-border)]">
          {/* Exterior Wing Mirrors */}
          <div className="absolute -left-3 top-20 w-3 h-10 bg-slate-800 rounded-l-md shadow-md border-r border-slate-700 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-6 bg-slate-600 rounded-sm"></div>
          </div>
          <div className="absolute -right-3 top-20 w-3 h-10 bg-slate-800 rounded-r-md shadow-md border-l border-slate-700 flex items-center justify-center pointer-events-none">
            <div className="w-1 h-6 bg-slate-600 rounded-sm"></div>
          </div>

          {/* STREAMLINED COACH FRONT / NOSE & COCKPIT */}
          <div className="w-full bg-slate-900 text-white rounded-t-[56px] pt-6 pb-5 px-6 relative overflow-hidden shadow-inner border-b border-slate-800">
            <div className="absolute top-2 inset-x-12 h-3 bg-gradient-to-b from-sky-400/30 via-sky-300/10 to-transparent rounded-full blur-[1px] pointer-events-none"></div>
            
            <div className="grid grid-cols-2 gap-4 pt-4 pb-2">
              {/* Driver Station */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 shadow-inner">
                  <span className="material-symbols-outlined text-[22px]">sports_motorsports</span>
                </div>
                <div className="flex flex-col text-start">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">
                    {locale === 'ar' ? 'قمرة القيادة' : 'Cockpit'}
                  </span>
                  <span className="text-xs font-semibold text-white tracking-wide mt-1">
                    {locale === 'ar' ? 'السائق الرسمي' : 'Driver Station'}
                  </span>
                </div>
              </div>

              {/* Boarding Access Entry */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex flex-col text-start">
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none">
                    {locale === 'ar' ? 'باب الصعود' : 'Passenger Access'}
                  </span>
                  <span className="text-xs font-semibold text-white tracking-wide mt-1">
                    {locale === 'ar' ? 'مدخل الركاب' : 'Boarding Entry'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-600/40 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                  <span className="material-symbols-outlined text-[20px]">stairs</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
              <span>{locale === 'ar' ? 'المقصورة الأمامية' : 'FRONT CABIN DECK'}</span>
              <span className="text-slate-300 font-semibold uppercase tracking-wider">Galala SuperJet</span>
              <span>{locale === 'ar' ? 'المحور الأمامي' : 'FORWARD AXLE'}</span>
            </div>
          </div>

          {/* MAIN PASSENGER CABIN DECK */}
          <div className="w-full bg-[var(--card-bg)] border-x border-b border-[var(--card-border)] rounded-b-3xl p-4 sm:p-5 pt-5">
            {/* Column Headers Strip (A - B - AISLE - C - D) */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 text-center mb-4 text-xs font-mono font-bold text-[var(--text-muted)] px-1">
              <div className="flex items-center justify-center gap-1">
                <span>A</span>
                <span className="material-symbols-outlined text-[13px]">window</span>
              </div>
              <div className="flex items-center justify-center">
                <span>B</span>
              </div>
              <div className="flex items-center justify-center text-[10px] tracking-widest uppercase font-semibold">
                <span>{locale === 'ar' ? 'ممر' : 'Aisle'}</span>
              </div>
              <div className="flex items-center justify-center">
                <span>C</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <span>D</span>
                <span className="material-symbols-outlined text-[13px]">window</span>
              </div>
            </div>

            {/* SEATS GRID CONTAINER */}
            <div className="flex flex-col gap-2.5">
              {rows.map((row) => {
                // Mid-Cabin Emergency Exit Divider between row 7 and 8
                const renderExitDivider = row.rowNumber === 8;

                return (
                  <React.Fragment key={row.rowNumber}>
                    {renderExitDivider && (
                      <div className="my-3 py-2 px-4 bg-rose-500/10 border border-dashed border-rose-500/30 rounded-xl flex items-center justify-between shadow-xs">
                        <span className="text-[10px] font-mono text-rose-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base">emergency</span>
                          <span>{locale === 'ar' ? 'مخرج طوارئ وسط المقصورة' : 'MID-CABIN EMERGENCY EXIT'}</span>
                        </span>
                        <span className="material-symbols-outlined text-sm text-rose-500">
                          {locale === 'ar' ? 'arrow_back' : 'arrow_forward'}
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-2 sm:gap-3 items-center">
                      {/* Port Window (A) */}
                      {renderSeatButton(row.seats[0])}

                      {/* Port Aisle (B) */}
                      {renderSeatButton(row.seats[1])}

                      {/* Central Aisle Runner */}
                      <div className="h-12 flex flex-col items-center justify-center bg-[var(--background)] rounded-lg border border-dashed border-[var(--card-border)]">
                        <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold">
                          {row.rowLabel}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-blue-500/40 mt-1"></div>
                      </div>

                      {/* Starboard Aisle (C) */}
                      {renderSeatButton(row.seats[2])}

                      {/* Starboard Window (D) */}
                      {renderSeatButton(row.seats[3])}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* REAR CHASSIS ENGINE COMPARTMENT & VENTILATION GRILL */}
            <div className="mt-6 pt-4 border-t border-[var(--card-border)] flex flex-col items-center gap-2 text-[var(--text-muted)]">
              <div className="flex items-center gap-1.5 w-32 justify-center">
                <span className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                <span className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                <span className="w-full h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase">
                <span>REAR TWIN-TURBO TURBINE</span>
                <span>•</span>
                <span>AIR SUSPENSION</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SELECTION MINI-DOCK / SUMMARY CARD */}
      {selectedSeat && seatLoadStatus === 'ready' && (
        <div className="w-full max-w-2xl mx-auto mt-8 bg-[var(--card-bg)]/95 backdrop-blur-md rounded-2xl p-5 shadow-2xl border-2 border-primary-container flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-container text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[24px]">airline_seat_recline_extra</span>
            </div>
            <div className="flex flex-col text-start">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase text-[var(--text-muted)]">
                  {locale === 'ar' ? 'الحجز النشط' : 'Active Reservation'}
                </span>
                <span className="bg-blue-100 dark:bg-blue-900/40 text-primary-container dark:text-blue-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                  1 {locale === 'ar' ? 'مقعد' : 'Seat'}
                </span>
                {heldExpiresAt && (
                  <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${holdTimeLeft < 60 ? 'text-rose-500 animate-pulse' : 'text-amber-600'}`}>
                    <span className="material-symbols-outlined text-[13px]">timer</span>
                    {countdownFormatted}
                  </span>
                )}
              </div>
              <div className="text-base font-bold text-[var(--foreground)]">
                {locale === 'ar' ? `المقعد رقم ${selectedSeat} (${selectedSeatObj?.code})` : `Seat #${selectedSeat} (${selectedSeatObj?.code})`}
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                {selectedSeatObj?.tier} • {fare.toFixed(2)} EGP
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-[var(--card-border)]">
            <div className="flex flex-col sm:text-right text-start">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">
                {locale === 'ar' ? 'الإجمالي المطلوب' : 'Cabin Total'}
              </span>
              <span className="text-xl font-bold font-mono text-primary-container dark:text-blue-400">
                {totalFare.toFixed(2)} EGP
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              disabled={lockingSeatNumber !== null}
              className="bg-primary-container hover:bg-primary-container/90 active:scale-[0.98] text-white font-mono text-xs font-bold px-6 py-3 rounded-xl transition shadow flex items-center gap-2 cursor-pointer"
            >
              <span>{locale === 'ar' ? 'تأكيد الحجز والدفع' : 'Confirm Seats'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {locale === 'ar' ? 'arrow_back' : 'arrow_forward'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function renderSeatButton(sItem: { code: string; num: number; col: string; isWindow: boolean; seat: typeof seats[0] | undefined }) {
    const s = sItem.seat;
    if (!s) return <div className="h-12" />;

    const isSelected = selectedSeat === s.seatNumber;
    const isHeldByMe = s.status === 'held' && s.userId === user?.id;
    const isBooked = s.status === 'booked';
    const isHeldByOther = s.status === 'held' && !isHeldByMe;
    const isDisabled = isBooked || isHeldByOther || lockingSeatNumber !== null || seatLoadStatus !== 'ready';

    let seatClasses = 'bg-[var(--card-bg)] border border-slate-300 dark:border-slate-700 text-[var(--foreground)] hover:border-primary-container hover:-translate-y-0.5 shadow-xs';
    if (isBooked) seatClasses = 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60 border border-slate-300 dark:border-slate-700';
    else if (isSelected || isHeldByMe) seatClasses = 'bg-[#14259B] text-white shadow-md border border-blue-400/40 scale-105';
    else if (isHeldByOther) seatClasses = 'bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300 cursor-not-allowed';

    return (
      <button
        key={s.seatNumber}
        type="button"
        disabled={isDisabled}
        onClick={() => handleSeatClick(s.seatNumber, s.status)}
        className={`relative h-12 rounded-xl flex flex-col items-center justify-center transition-all ${seatClasses}`}
        title={`Seat #${s.seatNumber} (${sItem.code})`}
        aria-pressed={isSelected}
        aria-label={`Seat ${s.seatNumber}, ${sItem.code}${isSelected ? ', Selected' : isBooked ? ', Booked' : isHeldByOther ? ', Held' : ', Available'}`}
      >
        {/* Headrest Tab */}
        <div className={`absolute top-0.5 inset-x-3 h-1 rounded-sm ${isSelected || isHeldByMe ? 'bg-blue-300' : 'bg-slate-300 dark:bg-slate-600'}`}></div>

        {/* Seat Code or Number */}
        <span className="font-mono text-xs font-bold mt-1">
          {s.seatNumber}
        </span>

        {/* Status Indicator */}
        {isSelected || isHeldByMe ? (
          <span className="material-symbols-outlined text-[12px] text-emerald-300 -mt-0.5">check_circle</span>
        ) : isBooked ? (
          <span className="material-symbols-outlined text-[12px] -mt-0.5">lock</span>
        ) : isHeldByOther ? (
          <span className="material-symbols-outlined text-[12px] text-amber-600 -mt-0.5">schedule</span>
        ) : (
          <span className="text-[9px] font-mono text-[var(--text-muted)] -mt-0.5">{sItem.col}</span>
        )}

        {/* Cushion Ridge */}
        <div className={`absolute bottom-0.5 inset-x-3.5 h-0.5 rounded-full ${isSelected || isHeldByMe ? 'bg-blue-400/60' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      </button>
    );
  }
}
