'use client';
import { useApp } from '@/hooks/useAppStore';
import { formatShiftDisplay } from '@/lib/routes-config';

export default function TripList() {
  const {
    trips, bookingType, timeSlot, returnTimeSlot,
    activeTrip, setActiveTrip,
    activeArrivalTrip, setActiveArrivalTrip,
    activeReturnTrip, setActiveReturnTrip,
  } = useApp();

  if (bookingType === 'round_trip') {
    const arrivalTrips = trips.filter(t => t.direction === 'to_campus' && (t.timeSlot === timeSlot || t.timeSlot.startsWith('morning')));
    const returnTrips = trips.filter(t => t.direction === 'from_campus' && (t.timeSlot === returnTimeSlot || t.timeSlot === 'return' || t.timeSlot.startsWith('return')));

    return (
      <div className="space-y-4">
        <h3 className="font-headline-sm font-semibold flex items-center gap-2 text-primary-container">
          <span className="material-symbols-outlined text-xl">directions_bus</span> Available Trips / الرحلات المتاحة
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary-container block">1. Arrival Leg (ذهاب للجامعة)</span>
            {arrivalTrips.length === 0 ? (
              <p className="text-xs text-text-secondary italic py-2">No active arrival trips scheduled.</p>
            ) : (
              arrivalTrips.map(trip => {
                const shiftInfo = formatShiftDisplay(trip);
                const isSelected = activeArrivalTrip?.id === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => setActiveArrivalTrip(trip)}
                    className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${
                      isSelected ? 'bg-primary-container/10 border-primary-container text-text-primary shadow-sm ring-1 ring-primary-container/30' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-text-primary">خط {shiftInfo.routeNameAr}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-container/15 text-primary-container border border-primary-container/25">
                          {shiftInfo.categoryLabelAr}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-800 border border-amber-500/25">
                          {shiftInfo.timeBadgeAr}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 flex items-center gap-2 font-medium">
                        <span className="font-semibold text-text-primary">{shiftInfo.shiftTimeTitleAr}</span>
                        <span>•</span>
                        <span className="font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span> تحرك {shiftInfo.departureDisplay}
                        </span>
                      </p>
                      {trip.driver && (
                        <p className="text-[11px] text-primary-container mt-1 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">person</span> {trip.driver.nameAr}
                          <span className="text-text-secondary font-mono text-[10px]">({trip.driver.phone})</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-primary-container text-sm">{trip.priceEgp} EGP</span>
                      <p className="text-[10px] text-text-secondary mt-1">{shiftInfo.licensePlate}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-destructive-asu block">2. Return Leg (عودة من الجامعة)</span>
            {returnTrips.length === 0 ? (
              <p className="text-xs text-text-secondary italic py-2">No active return trips scheduled.</p>
            ) : (
              returnTrips.map(trip => {
                const shiftInfo = formatShiftDisplay(trip);
                const isSelected = activeReturnTrip?.id === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => setActiveReturnTrip(trip)}
                    className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${
                      isSelected ? 'bg-primary-container/10 border-primary-container text-text-primary shadow-sm ring-1 ring-primary-container/30' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-text-primary">خط {shiftInfo.routeNameAr}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-container/15 text-primary-container border border-primary-container/25">
                          {shiftInfo.categoryLabelAr}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/15 text-indigo-800 border border-indigo-500/25">
                          {shiftInfo.timeBadgeAr}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 flex items-center gap-2 font-medium">
                        <span className="font-semibold text-text-primary">{shiftInfo.shiftTimeTitleAr}</span>
                        <span>•</span>
                        <span className="font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span> تحرك {shiftInfo.departureDisplay}
                        </span>
                      </p>
                      {trip.driver && (
                        <p className="text-[11px] text-primary-container mt-1 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">person</span> {trip.driver.nameAr}
                          <span className="text-text-secondary font-mono text-[10px]">({trip.driver.phone})</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right font-mono text-xs">
                      <span className="font-bold text-primary-container text-sm">{trip.priceEgp} EGP</span>
                      <p className="text-[10px] text-text-secondary mt-1">{shiftInfo.licensePlate}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredTrips = trips.filter(t => {
    const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
    const slot = bookingType === 'to_campus' ? timeSlot : returnTimeSlot;
    return t.direction === dir && (t.timeSlot === slot || t.timeSlot.startsWith(dir === 'to_campus' ? 'morning' : 'return'));
  });

  return (
    <div className="space-y-4">
      <h3 className="font-headline-sm font-semibold flex items-center gap-2 text-primary-container">
        <span className="material-symbols-outlined text-xl">directions_bus</span> Available Trips / الرحلات المتاحة
      </h3>
      {filteredTrips.length === 0 ? (
        <p className="text-xs text-text-secondary italic py-2">No active trips scheduled for this search context.</p>
      ) : (
        <div className="space-y-3">
          {filteredTrips.map(trip => {
            const shiftInfo = formatShiftDisplay(trip);
            const isSelected = activeTrip?.id === trip.id;
            return (
              <button
                key={trip.id}
                onClick={() => setActiveTrip(trip)}
                className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${
                  isSelected ? 'bg-primary-container/10 border-primary-container text-text-primary shadow-sm ring-1 ring-primary-container/30' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-text-primary">خط {shiftInfo.routeNameAr}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-container/15 text-primary-container border border-primary-container/25">
                      {shiftInfo.categoryLabelAr}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-container/10 text-primary-container">
                      {shiftInfo.timeBadgeAr}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 flex items-center gap-2 font-medium">
                    <span className="font-semibold text-text-primary">{shiftInfo.shiftTimeTitleAr}</span>
                    <span>•</span>
                    <span className="font-mono flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span> تحرك {shiftInfo.departureDisplay}
                    </span>
                  </p>
                  {trip.driver && (
                    <p className="text-[11px] text-primary-container mt-1 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">person</span> {trip.driver.nameAr}
                      <span className="text-text-secondary font-mono text-[10px]">({trip.driver.phone})</span>
                    </p>
                  )}
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-primary-container text-sm">{trip.priceEgp} EGP</span>
                  <p className="text-[10px] text-text-secondary mt-1">{shiftInfo.licensePlate}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
