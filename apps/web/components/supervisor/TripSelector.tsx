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
  const [selectedRosterTrip, setSelectedRosterTrip] = useState<Trip | null>(null);
  const [rosterFilter, setRosterFilter] = useState<'all' | 'pending' | 'boarded'>('all');
  const [rosterSearch, setRosterSearch] = useState<string>('');

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

  // Real-Time live synchronization listener for created, cloned, or deleted shifts and rider boarding
  useEffect(() => {
    const handleRefresh = () => {
      fetchTrips();
    };

    const handleFleetPurged = (e: any) => {
      const detail = e.detail;
      if (detail?.allDates || !detail?.date || detail?.date === 'all' || detail?.date === selectedDate) {
        setAvailableTrips([]);
        setActiveTrip(null);
        setSelectedRosterTrip(null);
      }
      fetchTrips();
    };

    window.addEventListener('fleet_purged', handleFleetPurged);
    window.addEventListener('schedule_updated', handleRefresh);
    window.addEventListener('rider_boarded_event', handleRefresh);
    window.addEventListener('booking_updated', handleRefresh);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTrips();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('fleet_purged', handleFleetPurged);
      window.removeEventListener('schedule_updated', handleRefresh);
      window.removeEventListener('rider_boarded_event', handleRefresh);
      window.removeEventListener('booking_updated', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchTrips, selectedDate, setActiveTrip]);

  // Displayed trips filtered by category
  const displayedTrips = useMemo(() => {
    if (selectedCategory === 'all') return availableTrips;
    return availableTrips.filter(t => getRouteCategory(t.routeId) === selectedCategory);
  }, [availableTrips, selectedCategory]);

  // Synchronized current selected roster trip with fresh booking numbers
  const currentRosterTrip = useMemo(() => {
    if (!selectedRosterTrip) return null;
    return availableTrips.find(t => t.id === selectedRosterTrip.id) || selectedRosterTrip;
  }, [selectedRosterTrip, availableTrips]);

  // Filtered passengers for the roster modal
  const filteredPassengers = useMemo(() => {
    if (!currentRosterTrip || !currentRosterTrip.passengers) return [];
    return currentRosterTrip.passengers.filter(p => {
      if (rosterFilter === 'pending' && p.isBoarded) return false;
      if (rosterFilter === 'boarded' && !p.isBoarded) return false;
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchName = p.riderName.toLowerCase().includes(q) || (p.riderNameAr && p.riderNameAr.toLowerCase().includes(q));
        const matchSeat = String(p.seatNumber).includes(q);
        const matchId = p.academicId.toLowerCase().includes(q);
        const matchPhone = p.phone.toLowerCase().includes(q);
        return matchName || matchSeat || matchId || matchPhone;
      }
      return true;
    });
  }, [currentRosterTrip, rosterFilter, rosterSearch]);

  const activeTripInfo = activeTrip ? formatShiftDisplay(activeTrip) : null;

  const activeTripDisplay = activeTrip && activeTripInfo ? (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-container/10 border border-primary-container/30 rounded-xl p-3 sm:p-4 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container text-white flex items-center justify-center font-bold text-base shadow-sm">
          <span className="material-symbols-outlined text-2xl">directions_bus</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base text-text-primary">خط {activeTripInfo.routeNameAr}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/15 text-primary-container border border-primary-container/30">
              {activeTripInfo.categoryLabelAr}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-galala/15 text-success-galala border border-success-galala/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success-galala animate-pulse" />
              Active
            </span>
          </div>
          <p className="text-text-secondary mt-0.5 flex items-center gap-2 font-medium">
            <span className="text-text-primary font-semibold">{activeTripInfo.shiftTimeTitleAr}</span>
            <span>•</span>
            <span className="font-mono text-primary-container font-semibold">{activeTripInfo.timeBadgeAr}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-right">
        {activeTrip.driver && (
          <div className="hidden sm:block">
            <span className="text-[10px] text-text-secondary uppercase font-semibold">السائق / Driver</span>
            <p className="font-semibold text-text-primary">{activeTrip.driver.nameAr || activeTrip.driver.nameEn}</p>
            <p className="text-[10px] text-text-secondary font-mono">{activeTrip.driver.phone}</p>
          </div>
        )}
        <div className="bg-surface-container px-3 py-1.5 rounded-lg border border-border-whisper">
          <span className="text-[10px] text-text-secondary uppercase font-semibold block">{activeTripInfo.licensePlate}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="font-bold text-primary-container font-mono">{activeTripInfo.capacity} مقعد</span>
            <span className="text-border-whisper">•</span>
            <span className="font-bold text-blue-600 font-mono">{activeTrip.bookedSeats ?? 0} محجوز</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelectedRosterTrip(activeTrip)}
          className="px-3 py-2 rounded-lg bg-primary-container text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition shadow-sm cursor-pointer"
          title="عرض كشف ركاب الشفت النشط"
        >
          <span className="material-symbols-outlined text-base">groups</span>
          <span className="hidden sm:inline">كشف الركاب</span>
          {(activeTrip.pendingSeats ?? 0) > 0 && (
            <span className="bg-amber-400 text-slate-900 text-[10px] font-mono px-1.5 py-0.5 rounded-full font-black">
              {activeTrip.pendingSeats}
            </span>
          )}
        </button>
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
                  const totalSeats = trip.bus?.totalSeats || trip.totalSeats || 50;
                  const bookedCount = trip.bookedSeats ?? 0;
                  const boardedCount = trip.boardedSeats ?? 0;
                  const pendingCount = trip.pendingSeats ?? Math.max(0, bookedCount - boardedCount);

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
                      {/* Top Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-container/15 text-primary-container border border-primary-container/20">
                                {shiftInfo.categoryLabelAr}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                isMorning ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30' : 'bg-indigo-500/10 text-indigo-700 border border-indigo-500/30'
                              }`}>
                                {shiftInfo.timeBadgeAr}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-text-primary">
                                {shiftInfo.departureDisplay}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm text-text-primary mt-1">
                              خط {shiftInfo.routeNameAr}
                            </h4>
                            <p className="text-[11px] font-medium text-text-secondary">
                              {shiftInfo.shiftTimeTitleAr}
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

                        {/* Live Booking & Boarding Stats Badge */}
                        <div className="my-2 p-2 rounded-lg bg-surface-container border border-border-whisper/80 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary-container">confirmation_number</span>
                            <span className="font-bold text-text-primary font-mono">
                              {bookedCount} / {totalSeats}
                            </span>
                            <span className="text-[10px] text-text-secondary">محجوز</span>
                          </div>

                          {bookedCount === 0 ? (
                            <span className="text-[10px] text-text-secondary font-medium">شاغر</span>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-emerald-600 font-bold">✓ {boardedCount}</span>
                              <span className="text-text-secondary">•</span>
                              <span className={`font-bold ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                ⏳ {pendingCount} متبقي
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer & Roster inspection popup trigger */}
                      <div className="space-y-2 border-t border-border-whisper/60 pt-2 mt-1">
                        <div className="flex items-center justify-between text-[10px] text-text-secondary">
                          <span className="font-semibold text-text-primary">
                            اللوحة: {shiftInfo.licensePlate}
                          </span>
                          <span className="font-medium text-primary-container font-mono">{shiftInfo.capacity} مقعد</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRosterTrip(trip);
                            setRosterFilter('all');
                            setRosterSearch('');
                          }}
                          className="w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold bg-surface-container hover:bg-surface-container-high border border-border-whisper hover:border-primary-container/60 text-text-primary flex items-center justify-between transition shadow-xs cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm text-primary-container">groups</span>
                            <span>كشف الركاب ({bookedCount})</span>
                          </span>
                          {pendingCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 font-mono text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              {pendingCount} لم يصعدوا
                            </span>
                          ) : bookedCount > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-mono text-[10px] font-bold">
                              اكتمل الصعود ✓
                            </span>
                          ) : (
                            <span className="text-text-secondary text-[10px]">عرض التفاصيل</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Shift Passenger Roster Pop-up Modal */}
      {currentRosterTrip && (() => {
        const modalShiftInfo = formatShiftDisplay(currentRosterTrip);
        const modalTotalSeats = currentRosterTrip.bus?.totalSeats || currentRosterTrip.totalSeats || 50;
        const modalBookedCount = currentRosterTrip.bookedSeats ?? (currentRosterTrip.passengers?.length || 0);
        const modalBoardedCount = currentRosterTrip.boardedSeats ?? (currentRosterTrip.passengers?.filter(p => p.isBoarded).length || 0);
        const modalPendingCount = currentRosterTrip.pendingSeats ?? Math.max(0, modalBookedCount - modalBoardedCount);
        const isCurrentActive = activeTrip?.id === currentRosterTrip.id;

        return (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
            <div className="bg-surface-container border border-border-whisper text-text-primary rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
              
              {/* Modal Top Header */}
              <div className="flex items-start justify-between p-4 sm:p-5 border-b border-border-whisper bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-container text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    <span className="material-symbols-outlined text-2xl">directions_bus</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-text-primary">{modalShiftInfo.shortTitleAr}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container/10 text-primary-container border border-primary-container/20">
                        {modalShiftInfo.categoryLabelAr}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-container border border-border-whisper">
                        {modalShiftInfo.timeBadgeAr}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      خط {modalShiftInfo.routeNameAr} • اللوحة: {modalShiftInfo.licensePlate} • التاريخ: {currentRosterTrip.tripDate}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRosterTrip(null)}
                  className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface-container-high transition"
                  title="إغلاق"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-border-whisper bg-surface-container-low/50 text-xs">
                <div className="bg-surface-container p-2.5 rounded-xl border border-border-whisper text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">سعة الحافلة</span>
                  <span className="text-sm font-black font-mono text-text-primary">{modalTotalSeats} مقعد</span>
                </div>
                <div className="bg-surface-container p-2.5 rounded-xl border border-border-whisper text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">المحجوز</span>
                  <span className="text-sm font-black font-mono text-blue-600">{modalBookedCount} تذكرة</span>
                </div>
                <div className="bg-surface-container p-2.5 rounded-xl border border-border-whisper text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">تم الصعود</span>
                  <span className="text-sm font-black font-mono text-emerald-600">{modalBoardedCount} راكب</span>
                </div>
                <div className="bg-surface-container p-2.5 rounded-xl border border-border-whisper text-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary block">لم يصعدوا بعد</span>
                  <span className={`text-sm font-black font-mono ${modalPendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {modalPendingCount} راكب
                  </span>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="p-4 pb-2 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex bg-surface-container-low p-1 rounded-xl border border-border-whisper text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setRosterFilter('all')}
                      className={`px-3 py-1 rounded-lg transition ${rosterFilter === 'all' ? 'bg-primary-container text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      الكل ({modalBookedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterFilter('pending')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${rosterFilter === 'pending' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      <span>لم يصعدوا بعد</span>
                      <span className="font-mono text-[10px]">({modalPendingCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRosterFilter('boarded')}
                      className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${rosterFilter === 'boarded' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      <span>تم الصعود</span>
                      <span className="font-mono text-[10px]">({modalBoardedCount})</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative flex-1 max-w-xs">
                    <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-text-secondary">search</span>
                    <input
                      type="text"
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      placeholder="بحث بالاسم، المقعد، الهاتف..."
                      className="w-full pr-8 pl-3 py-1.5 bg-surface-container-low border border-border-whisper rounded-lg text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                </div>
              </div>

              {/* Passenger List Container */}
              <div className="flex-1 overflow-y-auto p-4 pt-1 space-y-2">
                {filteredPassengers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-text-secondary border border-dashed border-border-whisper rounded-xl space-y-1">
                    <span className="material-symbols-outlined text-3xl text-text-secondary/60">person_off</span>
                    <p className="font-bold">لا يوجد ركاب مطابقين للتصفية المحددة.</p>
                    <p className="text-[11px]">
                      {modalBookedCount === 0
                        ? 'لم يتم تسجيل أي حجوزات مؤكدة لهذا الشفت حتى الآن.'
                        : 'جرب تغيير خيار التصفية أو مسح عبارة البحث.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPassengers.map((p, idx) => {
                      const boardTimeStr = p.boardedAt
                        ? new Date(p.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : null;

                      return (
                        <div
                          key={p.bookingId || idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-border-whisper hover:border-primary-container/40 transition gap-3"
                        >
                          {/* Seat Badge & Passenger Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-primary-container/10 border border-primary-container/30 text-primary-container font-mono font-black text-sm flex items-center justify-center shrink-0">
                              {p.seatNumber}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-text-primary truncate">
                                  {p.riderNameAr || p.riderName}
                                </span>
                                {p.academicId && p.academicId !== '—' && (
                                  <span className="font-mono text-[10px] text-text-secondary bg-surface-container px-1.5 py-0.5 rounded border border-border-whisper shrink-0">
                                    ID: {p.academicId}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-text-secondary mt-0.5">
                                {p.phone && p.phone !== '—' ? (
                                  <a
                                    href={`tel:${p.phone}`}
                                    className="flex items-center gap-1 font-mono text-primary-container hover:underline font-semibold"
                                    title="اتصال بالطالب"
                                  >
                                    <span className="material-symbols-outlined text-xs">call</span>
                                    {p.phone}
                                  </a>
                                ) : (
                                  <span className="text-[10px]">لا يوجد هاتف</span>
                                )}
                                {p.boardingCode && (
                                  <span className="font-mono text-[10px] text-text-secondary">
                                    كود: {p.boardingCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Boarding Status Pill */}
                          <div className="shrink-0 text-right">
                            {p.isBoarded ? (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  تم الصعود
                                </span>
                                {boardTimeStr && (
                                  <span className="text-[9px] font-mono text-text-secondary mt-0.5">
                                    {boardTimeStr}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                                <span className="material-symbols-outlined text-xs animate-spin">hourglass_top</span>
                                لم يصعد بعد
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Modal Bottom Actions */}
              <div className="p-4 border-t border-border-whisper bg-surface-container-low flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  {isCurrentActive ? (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">verified</span>
                      هذا الشفت محدد حالياً كشفت الفحص النشط على الشاشة
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTrip(currentRosterTrip);
                        setSelectedRosterTrip(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary-container text-white font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">qr_code_scanner</span>
                      تعيين كشفت الفحص النشط والبدء بالمسح
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRosterTrip(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container border border-border-whisper text-text-secondary hover:text-text-primary font-bold transition"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
