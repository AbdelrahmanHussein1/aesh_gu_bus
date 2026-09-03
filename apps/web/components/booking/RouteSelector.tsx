'use client';
import { useApp } from '@/hooks/useAppStore';

export default function RouteSelector() {
  const {
    routes, selectedRouteId, setSelectedRouteId,
    selectedDirection, setSelectedDirection,
    bookingType, setBookingType,
    timeSlot, setTimeSlot,
    returnTimeSlot, setReturnTimeSlot,
    selectedDate, setSelectedDate,
  } = useApp();

  const OPERATIONAL_DATES = [
    { date: '2026-06-04', day: '4', month: 'Jun', label: 'THU' },
    { date: '2026-06-06', day: '6', month: 'Jun', label: 'SAT' },
    { date: '2026-06-07', day: '7', month: 'Jun', label: 'SUN' },
    { date: '2026-06-08', day: '8', month: 'Jun', label: 'MON' },
    { date: '2026-06-09', day: '9', month: 'Jun', label: 'TUE' },
    { date: '2026-06-10', day: '10', month: 'Jun', label: 'WED' },
    { date: '2026-06-11', day: '11', month: 'Jun', label: 'THU' },
    { date: '2026-06-13', day: '13', month: 'Jun', label: 'SAT' },
    { date: '2026-06-14', day: '14', month: 'Jun', label: 'SUN' },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter bg-surface-container p-6 rounded-xl border border-border-whisper shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
      {/* From */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-2">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">From / من</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">location_on</span>
          <select value={selectedRouteId} onChange={e => setSelectedRouteId(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border-whisper rounded-lg text-body-md text-text-primary focus:ring-1 focus:ring-primary-container focus:border-primary-container appearance-none outline-none">
            {routes.map(r => <option key={r.id} value={r.id}>{selectedDirection === 'to_campus' ? `${r.nameAr} (${r.nameEn})` : 'جامعة الجلالة (Galala University)'}</option>)}
          </select>
        </div>
      </div>

      {/* Swap */}
      <div className="hidden md:flex col-span-2 items-center justify-center mt-6">
        <button onClick={() => setSelectedDirection(selectedDirection === 'to_campus' ? 'from_campus' : 'to_campus')}
          className="w-10 h-10 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-primary-container active:scale-95 transition-transform" title="تبديل الاتجاه">
          <span className="material-symbols-outlined">swap_horiz</span>
        </button>
      </div>

      {/* To */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-2">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">To / إلى</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">pin_drop</span>
          <select value={selectedRouteId} onChange={e => setSelectedRouteId(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border-whisper rounded-lg text-body-md text-text-primary focus:ring-1 focus:ring-primary-container focus:border-primary-container appearance-none outline-none">
            {routes.map(r => <option key={r.id} value={r.id}>{selectedDirection === 'to_campus' ? 'جامعة الجلالة (Galala University)' : `${r.nameAr} (${r.nameEn})`}</option>)}
          </select>
        </div>
      </div>

      {/* Trip Type + Shifts */}
      <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 pt-4 border-t border-border-whisper">
        <div className="space-y-1">
          <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Trip Type / نوع الرحلة</label>
          <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-xl border border-border-whisper">
            {(['to_campus', 'from_campus', 'round_trip'] as const).map(type => (
              <button key={type} onClick={() => { setBookingType(type); if (type !== 'round_trip') setSelectedDirection(type === 'to_campus' ? 'to_campus' : 'from_campus'); }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${bookingType === type ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
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
                <button key={slot} onClick={() => setTimeSlot(slot)}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${timeSlot === slot ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
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
                <button key={slot} onClick={() => setReturnTimeSlot(slot)}
                  className={`py-2 rounded-lg text-[11px] font-semibold transition ${returnTimeSlot === slot ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
                  {slot === 'return_1' ? '12:30 PM' : slot === 'return_2' ? '02:30 PM' : '05:30 PM'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="col-span-1 md:col-span-12 flex flex-col gap-2 mt-2 pt-4 border-t border-border-whisper">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Operational Dates / مواعيد التشغيل</label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {OPERATIONAL_DATES.map(od => (
            <button key={od.date} onClick={() => setSelectedDate(od.date)}
              className={`flex-shrink-0 w-20 p-2.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition ${selectedDate === od.date ? 'border-primary-container bg-primary-container/10 text-primary-container font-bold shadow-sm' : 'border-border-whisper bg-surface hover:border-text-secondary text-text-secondary'}`}>
              <span className="font-label-mono text-[9px] uppercase font-bold">{od.label}</span>
              <span className="text-lg font-bold">{od.day}</span>
              <span className="text-[10px]">{od.month}</span>
            </button>
          ))}
          <div className="flex-shrink-0 flex items-center bg-surface border border-border-whisper rounded-lg px-3">
            <span className="material-symbols-outlined text-text-secondary mr-2 text-sm">calendar_month</span>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-xs font-semibold text-text-primary focus:outline-none focus:ring-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
