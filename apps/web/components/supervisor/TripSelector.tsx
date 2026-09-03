'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { getApiBaseUrl } from '@/lib/api';
import type { Trip } from '@/lib/types';

export default function TripSelector() {
  const {
    selectedDate, setSelectedDate,
    routes, activeTrip, setActiveTrip,
  } = useApp();

  const [filterRouteId, setFilterRouteId] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'to_campus' | 'from_campus'>('all');
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch all trips for the chosen date & filters
  useEffect(() => {
    let isCancelled = false;
    const fetchTrips = async () => {
      setLoading(true);
      const apiUrl = getApiBaseUrl();
      try {
        let url = `${apiUrl}/api/trips?date=${selectedDate}`;
        if (filterRouteId !== 'all') url += `&routeId=${filterRouteId}`;
        if (filterDirection !== 'all') url += `&direction=${filterDirection}`;

        const res = await fetch(url);
        if (res.ok && !isCancelled) {
          const data: Trip[] = await res.json();
          setAvailableTrips(data);
          if (data.length > 0 && (!activeTrip || !data.some(t => t.id === activeTrip.id))) {
            setActiveTrip(data[0]);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch supervisor trips:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchTrips();
    return () => { isCancelled = true; };
  }, [selectedDate, filterRouteId, filterDirection, setActiveTrip]);

  const activeTripDisplay = activeTrip ? (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-container/10 border border-primary-container/30 rounded-xl p-3 sm:p-4 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-base shadow-sm">
          <span className="material-symbols-outlined text-2xl">directions_bus</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">{activeTrip.bus.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-galala/15 text-success-galala border border-success-galala/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success-galala animate-pulse" />
              Active Scanning Target
            </span>
          </div>
          <p className="text-text-secondary mt-0.5">
            {activeTrip.route?.nameEn || 'Route'} • {activeTrip.direction === 'to_campus' ? 'To Campus' : 'From Campus'} ({activeTrip.timeSlot.replace('_', ' ').toUpperCase()})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        {activeTrip.driver && (
          <div className="hidden sm:block">
            <span className="text-[10px] text-text-secondary uppercase font-semibold">Driver</span>
            <p className="font-semibold text-text-primary">{activeTrip.driver.nameEn || activeTrip.driver.nameAr}</p>
            <p className="text-[10px] text-text-secondary">{activeTrip.driver.phone}</p>
          </div>
        )}
        <div className="bg-surface-container px-3 py-1.5 rounded-lg border border-border-whisper">
          <span className="text-[10px] text-text-secondary uppercase font-semibold block">Capacity</span>
          <span className="font-bold text-primary-container">{activeTrip.bus.totalSeats || activeTrip.totalSeats || 50} Seats</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-surface-container border border-border-whisper rounded-xl p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-whisper pb-3">
        <div>
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container text-xl">departure_board</span>
            Select Bus Run to Scan
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Choose which scheduled bus trip you are supervising to display its live passenger list and accept QR check-ins.
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-start sm:self-auto text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-whisper bg-surface-container-low hover:bg-surface-container-high transition font-medium text-text-secondary"
        >
          <span className="material-symbols-outlined text-base">
            {isExpanded ? 'expand_less' : 'tune'}
          </span>
          {isExpanded ? 'Minimize Selector' : 'Change Bus Run'}
        </button>
      </div>

      {activeTripDisplay}

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low p-3 rounded-lg border border-border-whisper text-xs">
            {/* Date Picker */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Trip Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-whisper rounded-md text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </div>

            {/* Route Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Route Line</label>
              <select
                value={filterRouteId}
                onChange={(e) => setFilterRouteId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-whisper rounded-md text-text-primary text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
              >
                <option value="all">All Routes (All Lines)</option>
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nameEn} ({r.nameAr})
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Direction / Shift</label>
              <div className="flex rounded-md border border-border-whisper overflow-hidden bg-surface-container">
                <button
                  type="button"
                  onClick={() => setFilterDirection('all')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'all' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection('to_campus')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'to_campus' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Morning
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection('from_campus')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'from_campus' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  Return
                </button>
              </div>
            </div>
          </div>

          {/* Bus Trips Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-secondary uppercase">
                Available Scheduled Trips ({availableTrips.length})
              </span>
              {loading && (
                <span className="text-[10px] text-primary-container flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-xs animate-spin">sync</span> Loading trips...
                </span>
              )}
            </div>

            {availableTrips.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary border border-dashed border-border-whisper rounded-lg">
                No trips scheduled for this date and filter. Try changing the date or route.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                {availableTrips.map((trip) => {
                  const isSelected = activeTrip?.id === trip.id;
                  const isMorning = trip.direction === 'to_campus';

                  return (
                    <div
                      key={trip.id}
                      onClick={() => setActiveTrip(trip)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer text-left relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary-container bg-primary-container/10 ring-2 ring-primary-container/30 shadow-sm'
                          : 'border-border-whisper bg-surface-container-low hover:border-primary-container/50 hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-text-primary">{trip.bus.name}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isMorning ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                            }`}>
                              {isMorning ? 'To Campus' : 'From Campus'}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-text-secondary mt-0.5 truncate max-w-[180px]">
                            {trip.route?.nameEn || 'Route'}
                          </p>
                        </div>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-xs shadow-sm">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary hover:text-primary-container font-semibold">
                            Select
                          </span>
                        )}
                      </div>

                      <div className="border-t border-border-whisper/60 pt-2 mt-1 flex items-center justify-between text-[10px] text-text-secondary">
                        <span className="font-semibold text-text-primary">
                          Shift: {trip.timeSlot.replace('_', ' ').toUpperCase()}
                        </span>
                        <span>{trip.bus.totalSeats || trip.totalSeats || 50} Seats</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
