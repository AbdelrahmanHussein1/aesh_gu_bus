'use client';
import { useApp } from '@/hooks/useAppStore';

export default function RouteSelector() {
  const {
    routes, selectedRouteId, setSelectedRouteId,
    selectedDirection, setSelectedDirection,
    bookingType, setBookingType,
    timeSlot, setTimeSlot,
    selectedDate, setSelectedDate,
  } = useApp();

  return (
    <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter bg-surface-container p-6 rounded-xl border border-border-whisper shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
      {/* From */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-2">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">From</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">location_on</span>
          <select value={selectedRouteId} onChange={e => setSelectedRouteId(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border-whisper rounded-lg text-body-md text-text-primary focus:ring-1 focus:ring-primary-container focus:border-primary-container appearance-none outline-none">
            {routes.map(r => <option key={r.id} value={r.id}>{selectedDirection === 'to_campus' ? r.nameEn.split(' - ')[0] : 'Galala University'}</option>)}
          </select>
        </div>
      </div>

      {/* Swap */}
      <div className="hidden md:flex col-span-2 items-center justify-center mt-6">
        <button onClick={() => setSelectedDirection(selectedDirection === 'to_campus' ? 'from_campus' : 'to_campus')}
          className="w-10 h-10 rounded-full bg-surface border border-border-whisper flex items-center justify-center text-primary-container active:scale-95 transition-transform">
          <span className="material-symbols-outlined">swap_horiz</span>
        </button>
      </div>

      {/* To */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-2">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">To</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">pin_drop</span>
          <select value={selectedRouteId} onChange={e => setSelectedRouteId(Number(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-surface border border-border-whisper rounded-lg text-body-md text-text-primary focus:ring-1 focus:ring-primary-container focus:border-primary-container appearance-none outline-none">
            {routes.map(r => <option key={r.id} value={r.id}>{selectedDirection === 'to_campus' ? 'Galala University' : r.nameEn.split(' - ')[0]}</option>)}
          </select>
        </div>
      </div>

      {/* Trip Type + Shifts */}
      <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-4 border-t border-border-whisper">
        <div className="space-y-1">
          <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Trip Type</label>
          <div className="grid grid-cols-3 gap-2 bg-surface p-1 rounded-xl border border-border-whisper">
            {(['to_campus', 'from_campus', 'round_trip'] as const).map(type => (
              <button key={type} onClick={() => { setBookingType(type); if (type !== 'round_trip') setSelectedDirection(type === 'to_campus' ? 'to_campus' : 'from_campus'); }}
                className={`py-2 rounded-lg text-xs font-semibold transition ${bookingType === type ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
                {type === 'to_campus' ? 'Univ. Only' : type === 'from_campus' ? 'Return Only' : 'Round Trip'}
              </button>
            ))}
          </div>
        </div>

        {(bookingType === 'to_campus' || bookingType === 'round_trip') && (
          <div className="space-y-1">
            <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Morning Shift</label>
            <div className="grid grid-cols-2 gap-2 bg-surface p-1 rounded-xl border border-border-whisper">
              {(['morning_1', 'morning_2'] as const).map(slot => (
                <button key={slot} onClick={() => setTimeSlot(slot)}
                  className={`py-2 rounded-lg text-xs font-semibold transition ${timeSlot === slot ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-secondary hover:text-text-primary'}`}>
                  {slot === 'morning_1' ? 'Shift 1 (05-10)' : 'Shift 2 (10-11:30)'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="col-span-1 md:col-span-12 flex flex-col gap-2 mt-2 pt-4 border-t border-border-whisper">
        <label className="text-body-sm text-text-secondary uppercase tracking-wider font-semibold">Trip Date</label>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button onClick={() => setSelectedDate('2026-06-27')}
            className={`flex-shrink-0 w-24 p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${selectedDate === '2026-06-27' ? 'border-primary-container bg-primary-container/5 text-primary-container' : 'border-border-whisper bg-surface hover:border-text-secondary text-text-secondary'}`}>
            <span className="font-label-mono text-[10px] uppercase font-bold">TODAY</span>
            <span className="text-headline-md font-bold">27</span>
            <span className="text-xs">Jun</span>
          </button>
          <button onClick={() => setSelectedDate('2026-06-28')}
            className={`flex-shrink-0 w-24 p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition ${selectedDate === '2026-06-28' ? 'border-primary-container bg-primary-container/5 text-primary-container' : 'border-border-whisper bg-surface hover:border-text-secondary text-text-secondary'}`}>
            <span className="font-label-mono text-[10px] uppercase font-bold">TOMORROW</span>
            <span className="text-headline-md font-bold">28</span>
            <span className="text-xs">Jun</span>
          </button>
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
