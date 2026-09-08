'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { getApiBaseUrl } from '@/lib/api';
import type { Trip } from '@/lib/types';
import {
  ROUTE_CATEGORIES,
  RouteCategoryKey,
  getRouteCategory,
  formatShiftDisplay,
  PREDEFINED_ROUTES,
} from '@/lib/routes-config';

export default function TripSelector() {
  const {
    selectedDate, setSelectedDate,
    routes, activeTrip, setActiveTrip,
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<'all' | RouteCategoryKey>('all');
  const [filterRouteId, setFilterRouteId] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<'all' | 'to_campus' | 'from_campus'>('all');
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Available routes filtered by selected category
  const filteredRoutes = useMemo(() => {
    if (selectedCategory === 'all') return routes;
    const categoryIds = new Set(
      PREDEFINED_ROUTES.filter(r => r.category === selectedCategory).map(r => r.id)
    );
    return routes.filter(r => categoryIds.has(r.id));
  }, [routes, selectedCategory]);

  // When category changes, reset route filter if previous selection does not belong to new category
  const handleCategoryChange = (category: 'all' | RouteCategoryKey) => {
    setSelectedCategory(category);
    if (category !== 'all' && filterRouteId !== 'all') {
      const rid = parseInt(filterRouteId);
      const isStillValid = PREDEFINED_ROUTES.some(r => r.id === rid && r.category === category);
      if (!isStillValid) {
        setFilterRouteId('all');
      }
    }
  };

  // Fetch all trips for the chosen date & filters
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const apiUrl = getApiBaseUrl();
    try {
      let url = `${apiUrl}/api/trips?date=${selectedDate}`;
      if (filterRouteId !== 'all') url += `&routeId=${filterRouteId}`;
      if (filterDirection !== 'all') url += `&direction=${filterDirection}`;

      const res = await fetch(url);
      if (res.ok) {
        const data: Trip[] = await res.json();
        setAvailableTrips(data);
        if (data.length > 0) {
          if (!activeTrip || !data.some(t => t.id === activeTrip.id)) {
            setActiveTrip(data[0]);
          }
        } else {
          setActiveTrip(null);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch supervisor trips:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filterRouteId, filterDirection, activeTrip, setActiveTrip]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Real-Time live synchronization listener for created, cloned, or deleted shifts
  useEffect(() => {
    const handleScheduleUpdated = () => {
      fetchTrips();
    };

    window.addEventListener('schedule_updated', handleScheduleUpdated);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTrips();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('schedule_updated', handleScheduleUpdated);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchTrips]);

  // Displayed trips filtered by category
  const displayedTrips = useMemo(() => {
    if (selectedCategory === 'all') return availableTrips;
    return availableTrips.filter(t => getRouteCategory(t.routeId) === selectedCategory);
  }, [availableTrips, selectedCategory]);

  const activeTripInfo = activeTrip ? formatShiftDisplay(activeTrip) : null;

  const activeTripDisplay = activeTrip && activeTripInfo ? (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-container/10 border border-primary-container/30 rounded-xl p-3 sm:p-4 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-base shadow-sm">
          <span className="material-symbols-outlined text-2xl">directions_bus</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-text-primary">{activeTripInfo.shortTitleAr}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-galala/15 text-success-galala border border-success-galala/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success-galala animate-pulse" />
              Active Scanning Target
            </span>
          </div>
          <p className="text-text-secondary mt-0.5 flex items-center gap-2">
            <span className="font-medium text-text-primary">خط {activeTripInfo.routeNameAr} ({activeTripInfo.categoryLabelAr})</span>
            <span>•</span>
            <span className="font-mono text-primary-container font-semibold">{activeTripInfo.timeBadgeAr}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-right">
        {activeTrip.driver && (
          <div className="hidden sm:block">
            <span className="text-[10px] text-text-secondary uppercase font-semibold">السائق / Driver</span>
            <p className="font-semibold text-text-primary">{activeTrip.driver.nameAr || activeTrip.driver.nameEn}</p>
            <p className="text-[10px] text-text-secondary font-mono">{activeTrip.driver.phone}</p>
          </div>
        )}
        <div className="bg-surface-container px-3 py-1.5 rounded-lg border border-border-whisper">
          <span className="text-[10px] text-text-secondary uppercase font-semibold block">{activeTripInfo.licensePlate}</span>
          <span className="font-bold text-primary-container">{activeTripInfo.capacity} مقعد</span>
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
            اختيار الشفت والحافلة للفحص / Select Bus Run to Scan
          </h2>
          <p className="text-xs text-text-secondary mt-0.5">
            اختر الرحلة والشفت لعرض كشف الركاب واستقبال تسجيل الحضور بمسح QR.
          </p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="self-start sm:self-auto text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-whisper bg-surface-container-low hover:bg-surface-container-high transition font-medium text-text-secondary"
        >
          <span className="material-symbols-outlined text-base">
            {isExpanded ? 'expand_less' : 'tune'}
          </span>
          {isExpanded ? 'طي القائمة / Minimize' : 'تغيير الشفت / Change Run'}
        </button>
      </div>

      {activeTripDisplay}

      {isExpanded && (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          {/* Regional Category Filter Tabs (Cairo, Suez, El Shorouk & Badr) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border-whisper/60">
            <span className="text-[11px] font-bold text-text-secondary uppercase shrink-0 pl-1">
              المنطقة / Region:
            </span>
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'
              }`}
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              جميع الخطوط (All)
            </button>
            {ROUTE_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                  selectedCategory === cat.key
                    ? 'bg-primary-container text-white shadow-sm'
                    : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                {cat.labelAr} ({cat.count} خط)
              </button>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low p-3 rounded-lg border border-border-whisper text-xs">
            {/* Date Picker */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">تاريخ الرحلة / Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-whisper rounded-md text-text-primary text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary-container"
              />
            </div>

            {/* Route Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">
                مسار الخط / Route Line {selectedCategory !== 'all' ? `(${selectedCategory === 'cairo' ? 'القاهرة' : selectedCategory === 'suez' ? 'السويس' : 'الشروق وبدر'})` : ''}
              </label>
              <select
                value={filterRouteId}
                onChange={(e) => setFilterRouteId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface-container border border-border-whisper rounded-md text-text-primary text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-container"
              >
                <option value="all">جميع الخطوط المتاحة (All Lines)</option>
                {filteredRoutes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr} - {r.nameEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Filter */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-text-secondary mb-1">الاتجاه / Direction</label>
              <div className="flex rounded-md border border-border-whisper overflow-hidden bg-surface-container">
                <button
                  type="button"
                  onClick={() => setFilterDirection('all')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'all' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  الكل (All)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection('to_campus')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'to_campus' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  وصول (Morning)
                </button>
                <button
                  type="button"
                  onClick={() => setFilterDirection('from_campus')}
                  className={`flex-1 py-1.5 text-center text-[10px] font-bold transition ${filterDirection === 'from_campus' ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  عودة (Return)
                </button>
              </div>
            </div>
          </div>

          {/* Bus Trips Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-secondary uppercase">
                الشفتات المجدولة المتاحة / Available Scheduled Shifts ({displayedTrips.length})
              </span>
              {loading && (
                <span className="text-[10px] text-primary-container flex items-center gap-1 font-semibold">
                  <span className="material-symbols-outlined text-xs animate-spin">sync</span> جاري التحديث...
                </span>
              )}
            </div>

            {displayedTrips.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary border border-dashed border-border-whisper rounded-lg">
                لا توجد شفتات مجدولة لهذا التاريخ والمرشحات المختارة.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                {displayedTrips.map((trip) => {
                  const isSelected = activeTrip?.id === trip.id;
                  const isMorning = trip.direction === 'to_campus';
                  const shiftInfo = formatShiftDisplay(trip);

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
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-text-primary">
                              {shiftInfo.shortTitleAr}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              isMorning ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30' : 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/30'
                            }`}>
                              {shiftInfo.timeBadgeAr}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary-container/10 text-primary-container border border-primary-container/20">
                              {shiftInfo.categoryLabelAr}
                            </span>
                          </div>
                          <p className="text-[11px] font-semibold text-text-secondary truncate max-w-[200px]">
                            خط {shiftInfo.routeNameAr}
                          </p>
                        </div>
                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-primary-container text-white flex items-center justify-center text-xs shadow-sm shrink-0">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-secondary hover:text-primary-container font-semibold shrink-0">
                            اختيار
                          </span>
                        )}
                      </div>

                      <div className="border-t border-border-whisper/60 pt-2 mt-1 flex items-center justify-between text-[10px] text-text-secondary">
                        <span className="font-semibold text-text-primary">
                          اللوحة: {shiftInfo.licensePlate}
                        </span>
                        <span className="font-medium text-primary-container font-mono">{shiftInfo.capacity} مقعد</span>
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
