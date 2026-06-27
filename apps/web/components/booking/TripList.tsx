'use client';
import { useApp } from '@/hooks/useAppStore';

export default function TripList() {
  const {
    trips, bookingType, timeSlot,
    activeTrip, setActiveTrip,
    activeArrivalTrip, setActiveArrivalTrip,
    activeReturnTrip, setActiveReturnTrip,
  } = useApp();

  if (bookingType === 'round_trip') {
    return (
      <div className="space-y-4">
        <h3 className="font-headline-sm font-semibold flex items-center gap-2 text-primary-container">
          <span className="material-symbols-outlined text-xl">directions_bus</span> Available Trips
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary-container block">Arrival (To Campus)</span>
            {trips.filter(t => t.direction === 'to_campus' && t.timeSlot === timeSlot).length === 0 ? (
              <p className="text-xs text-text-secondary italic py-2">No active arrival trips scheduled.</p>
            ) : (
              trips.filter(t => t.direction === 'to_campus' && t.timeSlot === timeSlot).map(trip => (
                <button key={trip.id} onClick={() => setActiveArrivalTrip(trip)}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${activeArrivalTrip?.id === trip.id ? 'bg-primary-container/5 border-primary-container text-text-primary shadow-sm' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'}`}>
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary">{trip.bus.name}</h4>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-sm text-text-secondary">schedule</span> {trip.departureTime}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-primary-container">{trip.priceEgp} EGP</span>
                    <p className="text-[9px] text-text-secondary mt-1">{trip.bus.licensePlate}</p>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-destructive-asu block">Return (From Campus)</span>
            {trips.filter(t => t.direction === 'from_campus' && t.timeSlot === 'return').length === 0 ? (
              <p className="text-xs text-text-secondary italic py-2">No active return trips scheduled.</p>
            ) : (
              trips.filter(t => t.direction === 'from_campus' && t.timeSlot === 'return').map(trip => (
                <button key={trip.id} onClick={() => setActiveReturnTrip(trip)}
                  className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${activeReturnTrip?.id === trip.id ? 'bg-primary-container/5 border-primary-container text-text-primary shadow-sm' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'}`}>
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary">{trip.bus.name}</h4>
                    <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 font-mono">
                      <span className="material-symbols-outlined text-sm text-text-secondary">schedule</span> {trip.departureTime}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-primary-container">{trip.priceEgp} EGP</span>
                    <p className="text-[9px] text-text-secondary mt-1">{trip.bus.licensePlate}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-headline-sm font-semibold flex items-center gap-2 text-primary-container">
        <span className="material-symbols-outlined text-xl">directions_bus</span> Available Trips
      </h3>
      {trips.filter(t => {
        const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
        const slot = bookingType === 'to_campus' ? timeSlot : 'return';
        return t.direction === dir && t.timeSlot === slot;
      }).length === 0 ? (
        <p className="text-xs text-text-secondary italic py-2">No active trips scheduled for this search context.</p>
      ) : (
        <div className="space-y-3">
          {trips.filter(t => {
            const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
            const slot = bookingType === 'to_campus' ? timeSlot : 'return';
            return t.direction === dir && t.timeSlot === slot;
          }).map(trip => (
            <button key={trip.id} onClick={() => setActiveTrip(trip)}
              className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${activeTrip?.id === trip.id ? 'bg-primary-container/5 border-primary-container text-text-primary shadow-sm' : 'bg-surface border-border-whisper text-text-secondary hover:border-text-primary'}`}>
              <div>
                <h4 className="font-semibold text-sm text-text-primary">{trip.bus.name}</h4>
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 font-mono">
                  <span className="material-symbols-outlined text-sm text-text-secondary">schedule</span> {trip.departureTime}
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold text-primary-container">{trip.priceEgp} EGP</span>
                <p className="text-[9px] text-text-secondary mt-1">{trip.bus.licensePlate}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
