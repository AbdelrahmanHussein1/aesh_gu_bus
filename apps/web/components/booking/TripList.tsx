'use client';
import { useMemo, useState } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { formatShiftDisplay } from '@/lib/routes-config';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Trip, TimeSlot } from '@/lib/types';

export default function TripList() {
  const { t, locale } = useLanguage();
  const {
    trips,
    bookingType,
    timeSlot,
    returnTimeSlot,
    setTimeSlot,
    setReturnTimeSlot,
    activeTrip,
    setActiveTrip,
    activeArrivalTrip,
    setActiveArrivalTrip,
    activeReturnTrip,
    setActiveReturnTrip,
    isTripsLoading,
    refreshTrips,
    lastTripsRefreshTime,
    selectedDate,
  } = useApp();

  const [recentlyRefreshed, setRecentlyRefreshed] = useState(false);

  const handleManualRefresh = async () => {
    await refreshTrips();
    setRecentlyRefreshed(true);
    setTimeout(() => setRecentlyRefreshed(false), 3000);
  };

  // Format last updated time
  const lastUpdatedDisplay = useMemo(() => {
    if (!lastTripsRefreshTime) return null;
    return lastTripsRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }, [lastTripsRefreshTime]);

  // Render an individual unique & delicate bus ticket card
  const renderTripCard = (
    trip: Trip,
    isSelected: boolean,
    onSelect: () => void,
    legType: 'arrival' | 'return' | 'one_way'
  ) => {
    const shiftInfo = formatShiftDisplay(trip);
    const totalSeats = trip.totalSeats || 50;
    const bookedSeats = trip.bookedSeats || 0;
    const seatsAvailable = Math.max(0, totalSeats - bookedSeats);
    const isFull = seatsAvailable === 0;

    const isArrival = trip.direction === 'to_campus';
    const originLabel = isArrival
      ? (locale === 'ar' ? `محطة ${shiftInfo.routeNameAr}` : `${shiftInfo.routeNameEn} Station`)
      : (locale === 'ar' ? 'جامعة الجلالة (Galala Campus)' : 'Galala Campus (جامعة الجلالة)');
    const destinationLabel = isArrival
      ? (locale === 'ar' ? 'جامعة الجلالة (Galala Campus)' : 'Galala Campus (جامعة الجلالة)')
      : (locale === 'ar' ? `محطة ${shiftInfo.routeNameAr}` : `${shiftInfo.routeNameEn} Station`);

    return (
      <div
        key={trip.id}
        onClick={onSelect}
        className={`relative group cursor-pointer rounded-2xl p-1 transition-all duration-300 ${
          isSelected
            ? 'bg-blue-600/15 ring-2 ring-blue-600 shadow-xl shadow-blue-600/10 scale-[1.01]'
            : 'bg-surface-container/60 hover:bg-surface-container border border-border-whisper hover:border-blue-400/40 hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        {/* Inner Card Core */}
        <div
          className={`rounded-[calc(1rem-2px)] p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden transition-colors ${
            isSelected
              ? 'bg-blue-50/70 dark:bg-slate-900 border border-blue-500/30'
              : 'bg-surface'
          }`}
        >
          {/* Selected Accent Ribbon */}
          {isSelected && (
            <div className="absolute top-0 right-0 left-0 h-1 bg-blue-600" />
          )}

          {/* Top Bar: Route, Category, Shift & Live Seat Availability */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-lg">
                  {isArrival ? 'flight_land' : 'flight_takeoff'}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                  <span>{locale === 'ar' ? `خط ${shiftInfo.routeNameAr}` : `Line ${shiftInfo.routeNameEn}`}</span>
                  <span className="text-[11px] font-normal text-text-secondary font-mono">
                    ({locale === 'ar' ? shiftInfo.routeNameEn : shiftInfo.routeNameAr})
                  </span>
                </h4>
              </div>

              {/* Regional Category Tag */}
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                {locale === 'ar' ? shiftInfo.categoryLabelAr : shiftInfo.categoryLabelEn}
              </span>

              {/* Shift Timing Tag */}
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
                {locale === 'ar' ? shiftInfo.timeBadgeAr : shiftInfo.timeBadgeEn}
              </span>
            </div>

            {/* Seat Availability Status Pill */}
            <div className="flex items-center gap-2">
              {isFull ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {locale === 'ar' ? 'مكتملة بالكامل (Bus Full)' : 'Bus Full (مكتمل)'}
                </span>
              ) : seatsAvailable <= 8 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {locale === 'ar' ? `سارع بالحجز (${seatsAvailable} مقاعد متبقية!)` : `Hurry! (${seatsAvailable} seats left)`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {locale === 'ar' ? `متاح (${seatsAvailable} مقعد متاح)` : `${seatsAvailable} seats available`}
                </span>
              )}
            </div>
          </div>

          {/* Middle: The Transit Journey Spine (Station to Campus / Campus to Station) */}
          <div className="bg-surface-container/50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-border-whisper flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Origin Point */}
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-text-secondary flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-sm">trip_origin</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                  {locale === 'ar' ? 'نقطة التحرك (Departure)' : 'Departure Station'}
                </span>
                <span className="text-sm font-black text-text-primary font-mono block">
                  {shiftInfo.departureDisplay}
                </span>
                <span className="text-xs text-text-secondary truncate block max-w-[200px]" title={originLabel}>
                  {originLabel}
                </span>
              </div>
            </div>

            {/* Connecting Track Line */}
            <div className="hidden sm:flex flex-1 flex-col items-center justify-center px-4 gap-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                <span className="material-symbols-outlined text-xs">directions_bus</span>
                <span>{locale === 'ar' ? 'رحلة مباشرة • Direct Campus Transit' : 'Direct Campus Transit • رحلة مباشرة'}</span>
              </div>
              <div className="w-full flex items-center relative py-1">
                <div className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-400/40"></div>
                <div className="flex-1 border-t-2 border-dashed border-blue-400/50 mx-1"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-400/40"></div>
              </div>
              <span className="text-[10px] text-text-tertiary font-mono">
                {locale === 'ar' ? shiftInfo.shiftTimeTitleAr : shiftInfo.shiftTimeTitleEn}
              </span>
            </div>

            {/* Destination Point */}
            <div className="flex items-start sm:items-end flex-row sm:flex-col justify-between sm:justify-start gap-1 text-left sm:text-right">
              <div className="flex items-start sm:items-end gap-2.5">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-text-secondary block">
                    {locale === 'ar' ? 'محطة الوصول (Arrival)' : 'Arrival Station'}
                  </span>
                  <span className="text-sm font-black text-text-primary font-mono block text-emerald-600 dark:text-emerald-400">
                    {shiftInfo.targetTime}
                  </span>
                  <span className="text-xs text-text-secondary truncate block max-w-[200px]" title={destinationLabel}>
                    {destinationLabel}
                  </span>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-sm">location_on</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Driver, Fleet Plate, Amenities, Price & Action CTA */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border-whisper/60">
            {/* Driver & Bus Fleet Info */}
            <div className="flex items-center gap-3 flex-wrap">
              {trip.driver ? (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium">
                  <span className="material-symbols-outlined text-sm text-blue-600">person</span>
                  <span className="font-semibold text-text-primary">{locale === 'ar' ? trip.driver.nameAr : (trip.driver.nameEn || trip.driver.nameAr)}</span>
                  {trip.driver.phone && (
                    <span className="text-[10px] font-mono text-text-tertiary">({trip.driver.phone})</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                  <span className="material-symbols-outlined text-sm text-text-tertiary">person_outline</span>
                  <span>{locale === 'ar' ? 'سائق معتمد من إدارة النقل' : 'Authorized Transit Driver'}</span>
                </div>
              )}

              {/* Bus Plate Pill */}
              <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-surface-container border border-border-whisper font-mono text-xs text-text-primary font-semibold">
                <span className="material-symbols-outlined text-xs text-text-secondary">pin</span>
                <span>{shiftInfo.licensePlate}</span>
              </div>

              {/* Amenities */}
              <div className="hidden md:flex items-center gap-1 text-[11px] text-text-secondary">
                <span className="px-1.5 py-0.5 rounded bg-surface border border-border-whisper text-[10px] font-semibold">{locale === 'ar' ? '❄️ مكيف' : '❄️ AC'}</span>
                <span className="px-1.5 py-0.5 rounded bg-surface border border-border-whisper text-[10px] font-semibold">📶 Wi-Fi</span>
              </div>
            </div>

            {/* Price & Selection Action Button */}
            <div className="flex items-center gap-3 mr-auto sm:mr-0">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  {locale === 'ar' ? 'السعر للراكب' : 'Fare'}
                </span>
                <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                  {trip.priceEgp} <span className="text-xs font-bold text-text-secondary">{t('egp')}</span>
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 shadow-sm ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400/50 active:scale-95'
                    : 'bg-surface-container hover:bg-blue-600 hover:text-white text-text-primary border border-border-whisper hover:border-blue-600 active:scale-95'
                }`}
              >
                {isSelected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>{locale === 'ar' ? 'تم الاختيار ✓ حدد مقعدك' : 'Selected ✓ Pick Seat'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                  </>
                ) : (
                  <>
                    <span>{locale === 'ar' ? 'اختيار الحافلة' : 'Select Bus'}</span>
                    <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render a delicate, thoughtful empty state when no trips match
  const renderEmptyState = (legNameAr: string, legNameEn: string, availableOtherSlots: Trip[]) => {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border-whisper bg-surface-container/40 p-8 text-center flex flex-col items-center justify-center gap-3 transition-all">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center ring-4 ring-blue-500/5">
          <span className="material-symbols-outlined text-3xl">directions_bus</span>
        </div>

        <div className="max-w-md">
          <h4 className="font-bold text-base text-text-primary">
            {locale === 'ar' ? `لا توجد حافلات مجدولة حالياً لـ ${legNameAr}` : `No scheduled buses currently for ${legNameEn}`}
          </h4>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {locale === 'ar' 
              ? 'لم يتم تفعيل حافلات لهذا الخط في الشفت المحدد بعد. يتم فتح الرحلات تباعاً بحسب جدول التشغيل اليومي.'
              : 'No buses activated for this line in the selected shift yet. Trips are unlocked progressively according to the daily operational schedule.'}
          </p>
        </div>

        {/* Live Refresh Action */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isTripsLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-base ${isTripsLoading ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{locale === 'ar' ? 'تحديث جدول الحافلات الآن (Refresh Live)' : 'Refresh Live Schedule'}</span>
          </button>
        </div>

        {/* Alternative Shifts Available Today */}
        {availableOtherSlots.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border-whisper w-full max-w-lg">
            <span className="text-[11px] font-bold text-text-secondary block mb-2">
              {locale === 'ar' ? '💡 متوفر حافلات في شفتات أخرى لهذا اليوم (اضغط للتبديل الفوري):' : '💡 Buses available in other shifts today (click to switch):'}
            </span>
            <div className="flex flex-wrap gap-2 justify-center">
              {availableOtherSlots.map(otherTrip => {
                const otherInfo = formatShiftDisplay(otherTrip);
                return (
                  <button
                    key={otherTrip.id}
                    type="button"
                    onClick={() => {
                      if (otherTrip.direction === 'to_campus') {
                        setTimeSlot(otherTrip.timeSlot as TimeSlot);
                        if (bookingType === 'round_trip') {
                          setActiveArrivalTrip(otherTrip);
                        } else {
                          setActiveTrip(otherTrip);
                        }
                      } else {
                        setReturnTimeSlot(otherTrip.timeSlot as TimeSlot);
                        if (bookingType === 'round_trip') {
                          setActiveReturnTrip(otherTrip);
                        } else {
                          setActiveTrip(otherTrip);
                        }
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 text-xs text-text-primary font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs text-blue-600">schedule</span>
                    <span>{locale === 'ar' ? otherInfo.shiftTimeTitleAr : otherInfo.shiftTimeTitleEn}</span>
                    <span className="text-[10px] text-blue-600 font-mono">({otherInfo.departureDisplay})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. Round Trip Mode
  if (bookingType === 'round_trip') {
    const arrivalTrips = trips.filter(
      t => t.direction === 'to_campus' && (t.timeSlot === timeSlot || t.timeSlot.startsWith('morning'))
    );
    const otherArrivalTrips = trips.filter(
      t => t.direction === 'to_campus' && t.timeSlot !== timeSlot && !t.timeSlot.startsWith('morning')
    );

    const returnTrips = trips.filter(
      t => t.direction === 'from_campus' && (t.timeSlot === returnTimeSlot || t.timeSlot === 'return' || t.timeSlot.startsWith('return'))
    );
    const otherReturnTrips = trips.filter(
      t => t.direction === 'from_campus' && t.timeSlot !== returnTimeSlot && !t.timeSlot.startsWith('return')
    );

    return (
      <section className="space-y-6">
        {/* Section Header with Dedicated Refresh Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-whisper">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <span className="material-symbols-outlined text-xl">directions_bus</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>{locale === 'ar' ? 'الرحلات والحافلات المتاحة' : 'Available Trips & Buses'}</span>
                <span className="text-xs font-normal text-text-secondary font-mono">({locale === 'ar' ? 'رحلة ذهاب وعودة' : 'Round Trip'})</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                {locale === 'ar' ? 'رحلة ذهاب وعودة • اختر حافلة الذهاب الصباحية وحافلة العودة' : 'Round Trip • Select morning arrival bus & afternoon return bus'}
              </p>
            </div>
          </div>

          {/* Refresh Action Bar */}
          <div className="flex items-center gap-2">
            {lastUpdatedDisplay && (
              <span className="text-[11px] text-text-tertiary hidden sm:inline-block font-mono">
                {locale === 'ar' ? 'آخر تحديث' : 'Last updated'}: {lastUpdatedDisplay}
              </span>
            )}

            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isTripsLoading}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                recentlyRefreshed
                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                  : 'bg-surface hover:bg-surface-container text-text-primary border-border-whisper hover:border-blue-400'
              }`}
              title="تحديث قائمة الحافلات المتاحة ومزامنة المقاعد الحية"
            >
              <span className={`material-symbols-outlined text-base ${isTripsLoading ? 'animate-spin text-blue-600' : ''}`}>
                {recentlyRefreshed ? 'check_circle' : 'sync'}
              </span>
              <span>{isTripsLoading ? (locale === 'ar' ? 'جاري التحديث...' : 'Updating...') : recentlyRefreshed ? (locale === 'ar' ? 'تم التحديث ✓' : 'Refreshed ✓') : (locale === 'ar' ? 'تحديث الحافلات' : 'Refresh Trips')}</span>
            </button>
          </div>
        </div>

        {/* Connected 2-Leg Journey Progress Stepper */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-surface-container/50 rounded-xl border border-border-whisper text-xs">
          {/* Leg 1 Summary Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border-whisper">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-700 font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <span className="font-bold text-text-primary">{locale === 'ar' ? 'رحلة الذهاب:' : 'Arrival Leg:'}</span>
              <span className="text-text-secondary">
                {activeArrivalTrip ? `${locale === 'ar' ? 'شفت' : 'Shift'} ${activeArrivalTrip.timeSlot} • ${activeArrivalTrip.departureTime || '07:00 AM'}` : (locale === 'ar' ? 'لم يتم التحديد بعد' : 'Not selected yet')}
              </span>
            </div>
            {activeArrivalTrip ? (
              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">check</span> {locale === 'ar' ? 'محددة' : 'Selected'}
              </span>
            ) : (
              <span className="text-amber-600 font-medium text-[11px]">{locale === 'ar' ? 'مطلوب اختيار حافلة' : 'Select a bus'}</span>
            )}
          </div>

          {/* Leg 2 Summary Pill */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border-whisper">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-700 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span className="font-bold text-text-primary">{locale === 'ar' ? 'رحلة العودة:' : 'Return Leg:'}</span>
              <span className="text-text-secondary">
                {activeReturnTrip ? `${locale === 'ar' ? 'شفت' : 'Shift'} ${activeReturnTrip.timeSlot} • ${activeReturnTrip.departureTime || '02:30 PM'}` : (locale === 'ar' ? 'لم يتم التحديد بعد' : 'Not selected yet')}
              </span>
            </div>
            {activeReturnTrip ? (
              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">check</span> {locale === 'ar' ? 'محددة' : 'Selected'}
              </span>
            ) : (
              <span className="text-amber-600 font-medium text-[11px]">{locale === 'ar' ? 'مطلوب اختيار حافلة' : 'Select a bus'}</span>
            )}
          </div>
        </div>

        {/* Leg 1: Arrival Trips */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">wb_sunny</span>
              {locale === 'ar' ? '1. رحلة الذهاب إلى الجامعة (Arrival Leg)' : '1. Morning Arrival to Campus'}
            </span>
            <span className="text-[11px] text-text-tertiary font-mono">
              {arrivalTrips.length} {locale === 'ar' ? 'حافلات متاحة' : 'buses available'}
            </span>
          </div>

          {arrivalTrips.length === 0 ? (
            renderEmptyState('رحلة الذهاب الصباحية', 'Morning Arrival Trip', otherArrivalTrips)
          ) : (
            <div className="space-y-3">
              {arrivalTrips.map(trip =>
                renderTripCard(
                  trip,
                  activeArrivalTrip?.id === trip.id,
                  () => setActiveArrivalTrip(trip),
                  'arrival'
                )
              )}
            </div>
          )}
        </div>

        {/* Leg 2: Return Trips */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">wb_twilight</span>
              {locale === 'ar' ? '2. رحلة العودة من الجامعة (Return Leg)' : '2. Afternoon Return from Campus'}
            </span>
            <span className="text-[11px] text-text-tertiary font-mono">
              {returnTrips.length} {locale === 'ar' ? 'حافلات متاحة' : 'buses available'}
            </span>
          </div>

          {returnTrips.length === 0 ? (
            renderEmptyState('رحلة العودة المسائية', 'Afternoon Return Trip', otherReturnTrips)
          ) : (
            <div className="space-y-3">
              {returnTrips.map(trip =>
                renderTripCard(
                  trip,
                  activeReturnTrip?.id === trip.id,
                  () => setActiveReturnTrip(trip),
                  'return'
                )
              )}
            </div>
          )}
        </div>
      </section>
    );
  }

  // 2. One-Way Mode (to_campus or from_campus)
  const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
  const slot = bookingType === 'to_campus' ? timeSlot : returnTimeSlot;

  const filteredTrips = trips.filter(t => {
    return t.direction === dir && (t.timeSlot === slot || t.timeSlot.startsWith(dir === 'to_campus' ? 'morning' : 'return'));
  });

  const otherShifts = trips.filter(t => {
    return t.direction === dir && t.timeSlot !== slot && !t.timeSlot.startsWith(dir === 'to_campus' ? 'morning' : 'return');
  });

  return (
    <section className="space-y-4">
      {/* Section Header with Dedicated Refresh Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border-whisper">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
            <span className="material-symbols-outlined text-xl">directions_bus</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>{locale === 'ar' ? 'الرحلات والحافلات المتاحة' : 'Available Buses'}</span>
              <span className="text-xs font-normal text-text-secondary font-mono">({locale === 'ar' ? 'رحلات مباشرة' : 'Direct Transit'})</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              {dir === 'to_campus'
                ? (locale === 'ar' ? 'رحلات الذهاب للجامعة • اختر الحافلة المناسبة لموعدك' : 'Arrival to Campus • Choose your preferred morning departure')
                : (locale === 'ar' ? 'رحلات العودة من الجامعة • اختر الحافلة المناسبة لموعدك' : 'Return from Campus • Choose your preferred afternoon departure')}
            </p>
          </div>
        </div>

        {/* Refresh Action Bar */}
        <div className="flex items-center gap-2">
          {lastUpdatedDisplay && (
            <span className="text-[11px] text-text-tertiary hidden sm:inline-block font-mono">
              {locale === 'ar' ? 'آخر تحديث' : 'Last updated'}: {lastUpdatedDisplay}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isTripsLoading}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
              recentlyRefreshed
                ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                : 'bg-surface hover:bg-surface-container text-text-primary border-border-whisper hover:border-blue-400'
            }`}
            title="تحديث قائمة الحافلات المتاحة ومزامنة المقاعد الحية"
          >
            <span className={`material-symbols-outlined text-base ${isTripsLoading ? 'animate-spin text-blue-600' : ''}`}>
              {recentlyRefreshed ? 'check_circle' : 'sync'}
            </span>
            <span>{isTripsLoading ? (locale === 'ar' ? 'جاري التحديث...' : 'Updating...') : recentlyRefreshed ? (locale === 'ar' ? 'تم التحديث ✓' : 'Refreshed ✓') : (locale === 'ar' ? 'تحديث الحافلات' : 'Refresh Trips')}</span>
          </button>
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        renderEmptyState(
          dir === 'to_campus' ? 'الذهاب للجامعة' : 'العودة من الجامعة',
          dir === 'to_campus' ? 'Arrival to Campus' : 'Return from Campus',
          otherShifts
        )
      ) : (
        <div className="space-y-3">
          {filteredTrips.map(trip =>
            renderTripCard(
              trip,
              activeTrip?.id === trip.id,
              () => setActiveTrip(trip),
              'one_way'
            )
          )}
        </div>
      )}
    </section>
  );
}
