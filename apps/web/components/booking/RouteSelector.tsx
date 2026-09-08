'use client';
import { useMemo, useEffect, useState } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { getDynamicOperationalDates, getTodayDateString, getTomorrowDateString } from '@/lib/dateUtils';
import {
  ROUTE_CATEGORIES,
  RouteCategoryKey,
  getRouteCategory,
  getCategoryRoutes,
} from '@/lib/routes-config';

export default function RouteSelector() {
  const {
    routes, selectedRouteId, setSelectedRouteId,
    selectedDirection, setSelectedDirection,
    bookingType, setBookingType,
    timeSlot, setTimeSlot,
    returnTimeSlot, setReturnTimeSlot,
    selectedDate, setSelectedDate,
  } = useApp();

  const todayStr = useMemo(() => getTodayDateString(), []);
  const tomorrowStr = useMemo(() => getTomorrowDateString(), []);
  const operationalDates = useMemo(() => getDynamicOperationalDates(), []);

  // Today is closed for new bookings; ensure rider booking automatically defaults to tomorrow's date
  useEffect(() => {
    if (!selectedDate || selectedDate <= todayStr) {
      setSelectedDate(tomorrowStr);
    }
  }, [selectedDate, todayStr, tomorrowStr, setSelectedDate]);

  // Current category inferred from selectedRouteId
  const currentCategory = useMemo(() => getRouteCategory(selectedRouteId), [selectedRouteId]);
  const [activeCategory, setActiveCategory] = useState<RouteCategoryKey>(currentCategory);

  // Sync category when selectedRouteId changes from external sources
  useEffect(() => {
    setActiveCategory(getRouteCategory(selectedRouteId));
  }, [selectedRouteId]);

  // Routes filtered by active category
  const filteredCategoryRoutes = useMemo(() => {
    return getCategoryRoutes(activeCategory, routes);
  }, [activeCategory, routes]);

  // When user clicks a category tab
  const handleSelectCategory = (cat: RouteCategoryKey) => {
    setActiveCategory(cat);
    const catRoutes = getCategoryRoutes(cat, routes);
    // If the currently selected route is not in the clicked category, auto-select first route
    const isCurrentlyInCat = catRoutes.some(r => r.id === selectedRouteId);
    if (!isCurrentlyInCat && catRoutes.length > 0) {
      setSelectedRouteId(catRoutes[0].id);
    }
  };

  // Swap handler
  const handleSwap = () => {
    if (bookingType === 'round_trip') return; // Cannot swap round trip
    if (selectedDirection === 'to_campus') {
      setSelectedDirection('from_campus');
      setBookingType('from_campus');
    } else {
      setSelectedDirection('to_campus');
      setBookingType('to_campus');
    }
  };

  // Station selector subcomponent
  const renderStationSelector = (titleAr: string, titleEn: string) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">
          {titleEn} / {titleAr}
        </label>
        <span className="text-[11px] text-text-secondary font-medium">اختر المحافظة ثم المحطة</span>
      </div>

      {/* Governorate / Region Category Tabs */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface rounded-xl border border-border-whisper">
        {ROUTE_CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleSelectCategory(cat.key)}
              className={`py-2 px-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                isActive
                  ? 'bg-primary-container text-on-primary-container shadow-sm ring-1 ring-primary-container/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
              <span className="truncate">{cat.labelAr}</span>
            </button>
          );
        })}
      </div>

      {/* Station Dropdown */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
          location_on
        </span>
        <select
          value={selectedRouteId}
          onChange={e => setSelectedRouteId(Number(e.target.value))}
          className="w-full pl-10 pr-4 py-3 bg-surface border border-border-whisper rounded-lg text-body-md text-text-primary font-medium focus:ring-2 focus:ring-primary-container/30 focus:border-primary-container outline-none transition"
        >
          {filteredCategoryRoutes.map(r => (
            <option key={r.id} value={r.id}>
              {r.nameAr} ({r.nameEn})
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Galala University Hub subcomponent
  const renderGalalaHubCard = (titleAr: string, titleEn: string, subtitleAr: string) => (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">
          {titleEn} / {titleAr}
        </label>
        <span className="text-[10px] bg-primary-container/10 text-primary-container font-bold px-2 py-0.5 rounded-full border border-primary-container/20">
          الحرم الجامعي المعتمد
        </span>
      </div>

      <div className="h-[92px] p-3.5 bg-surface rounded-xl border border-border-whisper flex items-center gap-3.5 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-primary-container/10 text-primary-container border border-primary-container/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-2xl">school</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-text-primary truncate">
            جامعة الجلالة (Galala University)
          </h4>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {subtitleAr}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Main Terminal • هضبة الجلالة
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter bg-surface-container p-6 rounded-xl border border-border-whisper shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
      {/* Dynamic Origin & Destination layout */}
      {bookingType === 'round_trip' ? (
        <>
          {/* Pickup / Return Station */}
          <div className="col-span-1 md:col-span-5">
            {renderStationSelector('محطة الانطلاق والعودة', 'Pickup & Return Station')}
          </div>

          {/* Connected Round-trip Badge */}
          <div className="hidden md:flex col-span-2 flex-col items-center justify-center mt-6 gap-1">
            <div
              className="w-10 h-10 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-text-secondary cursor-not-allowed select-none opacity-80"
              title="رحلة الذهاب والعودة محددة تلقائياً: الانطلاق من المحطة والعودة إليها"
            >
              <span className="material-symbols-outlined text-xl">sync_alt</span>
            </div>
            <span className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">ذهاب وعودة</span>
          </div>

          {/* Destination: Galala Campus */}
          <div className="col-span-1 md:col-span-5">
            {renderGalalaHubCard('الوجهة', 'Destination', 'المقر الرئيسي - وجهة الوصول الصباحية ونقطة انطلاق العودة')}
          </div>
        </>
      ) : selectedDirection === 'to_campus' ? (
        <>
          {/* From: Station */}
          <div className="col-span-1 md:col-span-5">
            {renderStationSelector('من (نقطة الانطلاق)', 'From')}
          </div>

          {/* Swap Button */}
          <div className="hidden md:flex col-span-2 items-center justify-center mt-6">
            <button
              type="button"
              onClick={handleSwap}
              className="w-10 h-10 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-primary-container active:scale-95 transition-transform hover:bg-surface-container"
              title="تبديل الاتجاه إلى عودة فقط"
            >
              <span className="material-symbols-outlined">swap_horiz</span>
            </button>
          </div>

          {/* To: Galala Campus */}
          <div className="col-span-1 md:col-span-5">
            {renderGalalaHubCard('إلى (الوجهة)', 'To', 'المقر الرئيسي - مبنى الركاب المركزي')}
          </div>
        </>
      ) : (
        <>
          {/* From: Galala Campus */}
          <div className="col-span-1 md:col-span-5">
            {renderGalalaHubCard('من (نقطة الانطلاق)', 'From', 'المقر الرئيسي - نقطة انطلاق رحلات العودة')}
          </div>

          {/* Swap Button */}
          <div className="hidden md:flex col-span-2 items-center justify-center mt-6">
            <button
              type="button"
              onClick={handleSwap}
              className="w-10 h-10 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-primary-container active:scale-95 transition-transform hover:bg-surface-container"
              title="تبديل الاتجاه إلى ذهاب فقط"
            >
              <span className="material-symbols-outlined">swap_horiz</span>
            </button>
          </div>

          {/* To: Station */}
          <div className="col-span-1 md:col-span-5">
            {renderStationSelector('إلى (محطة الوصول)', 'To')}
          </div>
        </>
      )}

      {/* Trip Type + Shifts */}
      <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 pt-4 border-t border-border-whisper">
        <div className="space-y-1">
          <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Trip Type / نوع الرحلة</label>
          <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-xl border border-border-whisper">
            {(['to_campus', 'from_campus', 'round_trip'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setBookingType(type);
                  if (type !== 'round_trip') {
                    setSelectedDirection(type === 'to_campus' ? 'to_campus' : 'from_campus');
                  } else {
                    setSelectedDirection('to_campus');
                  }
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${
                  bookingType === type ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {type === 'to_campus' ? 'ذهاب فقط' : type === 'from_campus' ? 'عودة فقط' : 'ذهاب وعودة'}
              </button>
            ))}
          </div>
        </div>

        {(bookingType === 'to_campus' || bookingType === 'round_trip') && (
          <div className="space-y-1">
            <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Arrival Shift / شفت الوصول</label>
            <div className="grid grid-cols-2 gap-2 bg-surface p-1 rounded-xl border border-border-whisper">
              {(['morning_1', 'morning_2'] as const).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTimeSlot(slot)}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${
                    timeSlot === slot ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {slot === 'morning_1' ? '9:00 AM (شفت 1)' : '11:30 AM (شفت 2)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {(bookingType === 'from_campus' || bookingType === 'round_trip') && (
          <div className="space-y-1">
            <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Return Shift / شفت العودة</label>
            <div className="grid grid-cols-3 gap-1.5 bg-surface p-1 rounded-xl border border-border-whisper">
              {(['return_1', 'return_2', 'return_3'] as const).map(slot => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setReturnTimeSlot(slot)}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition ${
                    returnTimeSlot === slot ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {slot === 'return_1' ? '12:30 PM' : slot === 'return_2' ? '02:30 PM' : '05:30 PM'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="col-span-1 md:col-span-12 flex flex-col gap-2 mt-2 pt-4 border-t border-border-whisper">
        <div className="flex items-center justify-between">
          <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary-container">calendar_month</span>
            Operational Dates / مواعيد التشغيل
          </label>
          <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 font-semibold bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/20">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
            الحجز متاح لرحلات الغد (Booking Open for Tomorrow)
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin pt-2">
          {operationalDates.map(od => {
            const isSelected = selectedDate === od.date;

            // Today: Current day anchor with prominent GREEN OUTLINE (unbookable for departure trips)
            if (od.isToday) {
              return (
                <div
                  key={od.date}
                  className="relative flex-shrink-0 min-w-[115px] p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-2 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)] select-none cursor-default"
                  title="اليوم الحالي - انتهى موعد حجز رحلات اليوم (الحجز متاح لرحلات الغد وما بعدها)"
                >
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
                    TODAY • اليوم
                  </span>
                  <span className="text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-0.5">{od.day}</span>
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{od.month} • {od.weekdayAr}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 mt-0.5">
                    انتهى حجز اليوم
                  </span>
                </div>
              );
            }

            // Bookable dates: Tomorrow (primary default) and advance upcoming days
            if (od.isBookable) {
              return (
                <button
                  key={od.date}
                  type="button"
                  onClick={() => setSelectedDate(od.date)}
                  className={`relative flex-shrink-0 min-w-[115px] p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-slate-900 dark:text-sky-100 ring-2 ring-sky-500/40 shadow-[0_0_16px_rgba(14,165,233,0.25)] scale-[1.02]'
                      : 'border-border-whisper bg-surface hover:border-sky-400/50 hover:bg-surface-container text-text-primary'
                  }`}
                  title={od.isTomorrow ? 'غداً - الحجز متاح الآن' : `رحلات ${od.date} - الحجز متاح`}
                >
                  {od.isTomorrow ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-sky-500 text-white shadow-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      TOMORROW • غداً
                    </span>
                  ) : (
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-sky-800 dark:text-sky-300' : 'text-text-secondary'}`}>
                      {od.weekday} • {od.weekdayAr}
                    </span>
                  )}
                  <span className={`text-3xl font-black mt-0.5 ${isSelected ? 'text-slate-950 dark:text-sky-100 font-extrabold' : 'text-text-primary'}`}>{od.day}</span>
                  <span className={`text-xs font-bold ${isSelected ? 'text-sky-900 dark:text-sky-200' : 'text-text-secondary'}`}>{od.month} • {od.weekdayAr}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${
                    isSelected
                      ? 'text-sky-900 dark:text-sky-200 bg-sky-200/70 dark:bg-sky-900/60 border-sky-400/60'
                      : 'text-text-tertiary bg-surface-container border-border-whisper'
                  }`}>
                    متاح للحجز
                  </span>
                </button>
              );
            }

            // Non-bookable dates (e.g. Yesterday)
            return (
              <div
                key={od.date}
                className="relative flex-shrink-0 min-w-[110px] p-3 rounded-xl border border-border-whisper bg-surface/30 opacity-40 cursor-not-allowed flex flex-col items-center justify-center gap-1 select-none grayscale-[50%]"
                title={od.isYesterday ? 'أمس - انتهى موعد الحجز' : 'غير متاح'}
              >
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">
                  {od.isYesterday ? 'YESTERDAY • أمس' : od.labelAr}
                </span>
                <span className="text-xl font-bold text-text-secondary mt-0.5">{od.day}</span>
                <span className="text-xs text-text-tertiary font-medium">{od.month} • {od.weekday}</span>
                <span className="text-[10px] text-text-tertiary font-mono px-1.5 py-0.5 rounded bg-surface border border-border-whisper mt-0.5">
                  {od.statusBadgeAr}
                </span>
              </div>
            );
          })}

          {/* Current validated date lock badge */}
          <div className="flex-shrink-0 flex items-center bg-surface border border-border-whisper rounded-xl px-3 py-2 self-center">
            <span className="material-symbols-outlined text-sky-400 mr-2 text-base">event_available</span>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">تاريخ الحجز المحدد</span>
              <span className="text-xs font-bold text-sky-400 font-mono">{selectedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
