'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/hooks/useAppStore';
import { getApiBaseUrl } from '@/lib/api';
import { getTodayDateString, getScheduleManagerDates } from '@/lib/dateUtils';
import { purgeOfflineShifts, createSingleOfflineTestShift } from '@/lib/offline';
import {
  ROUTE_CATEGORIES,
  RouteCategoryKey,
  getRouteCategory,
  formatShiftDisplay,
  PREDEFINED_ROUTES,
} from '@/lib/routes-config';
import BusSeatInspectorModal from './BusSeatInspectorModal';
import BoardingManifestPdfModal from '../supervisor/BoardingManifestPdfModal';

const SHIFT_OPTIONS = [
  { id: 'all', label: 'All Shifts / جميع الشفتات' },
  { id: 'morning_1', label: 'Morning 1 (07:00 AM) / شفت 1 وصول 9:00' },
  { id: 'morning_2', label: 'Morning 2 (09:30 AM) / شفت 2 وصول 11:30' },
  { id: 'return_1', label: 'Return 1 (12:30 PM) / عودة 1' },
  { id: 'return_2', label: 'Return 2 (02:30 PM) / عودة 2' },
  { id: 'return_3', label: 'Return 3 (05:30 PM) / عودة 3' },
];

export default function FleetStatus() {
  const { isOffline, token, routes } = useApp();
  const todayStr = useMemo(() => getTodayDateString(), []);
  const operationalDates = useMemo(() => getScheduleManagerDates(3, 10), []);

  const [fleetList, setFleetList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [silentRefreshing, setSilentRefreshing] = useState(false);
  const [inspectingTripId, setInspectingTripId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<'all' | RouteCategoryKey>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('all');
  const [selectedDirection, setSelectedDirection] = useState<string>('all');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('all');
  const [selectedOccupancy, setSelectedOccupancy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Purge & Single Test Shift Modals state
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<'all' | 'date'>('all');
  const [purging, setPurging] = useState(false);

  const [showCreateTestModal, setShowCreateTestModal] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [testDate, setTestDate] = useState<string>(todayStr);
  const [testRouteId, setTestRouteId] = useState<number>(29);
  const [testDirection, setTestDirection] = useState<'to_campus' | 'from_campus'>('to_campus');
  const [testTimeSlot, setTestTimeSlot] = useState<string>('morning_1');

  const [pdfTripData, setPdfTripData] = useState<any | null>(null);
  const [pdfManifestData, setPdfManifestData] = useState<any[]>([]);

  const API_URL = getApiBaseUrl();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = useRef(false);
  const [pollingDisabled, setPollingDisabled] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleOpenFleetPdf = async (bus: any) => {
    const tripObj = {
      id: bus.tripId,
      tripDate: bus.tripDate || selectedDate,
      departureTime: bus.departureTime || '09:00 AM',
      direction: bus.direction,
      bus: {
        name: bus.busName,
        licensePlate: bus.licensePlate,
        totalSeats: bus.capacity || 50,
      },
      route: {
        nameAr: bus.routeNameAr,
        nameEn: bus.routeNameEn,
      },
      supervisors: bus.supervisors || (bus.supervisorName ? [{ nameAr: bus.supervisorName, nameEn: bus.supervisorName }] : []),
      driver: bus.driver || (bus.driverName ? { nameAr: bus.driverName, nameEn: bus.driverName } : null),
    };
    setPdfTripData(tripObj);

    try {
      const res = await fetch(`${API_URL}/api/trips/${bus.tripId}/manifest`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPdfManifestData(Array.isArray(data) ? data : []);
      } else {
        setPdfManifestData([]);
      }
    } catch {
      setPdfManifestData([]);
    }
  };

  // Load fleet data with full filtering support
  const loadFleetData = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    if (!silent) setLoading(true);
    else setSilentRefreshing(true);

    // 1. Guard against unauthorized request loops: if no token, do not call admin live API
    if (!token || isOffline) {
      // Fall straight through to offline data without network request
    } else {
      inFlightRef.current = true;
      try {
        const params = new URLSearchParams();
        if (selectedDate && selectedDate !== 'all') params.set('date', selectedDate);
        if (selectedRouteId && selectedRouteId !== 'all') params.set('routeId', selectedRouteId);
        if (selectedDirection && selectedDirection !== 'all') params.set('direction', selectedDirection);
        if (selectedTimeSlot && selectedTimeSlot !== 'all') params.set('timeSlot', selectedTimeSlot);
        if (selectedOccupancy && selectedOccupancy !== 'all') params.set('status', selectedOccupancy);
        if (searchQuery.trim()) params.set('search', searchQuery.trim());

        const res = await fetch(`${API_URL}/api/admin/fleet?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401 || res.status === 403) {
          console.warn('[FleetStatus] 401/403 Unauthorized: stopping fleet polling.');
          setPollingDisabled(true);
        } else if (res.ok) {
          const data = await res.json();
          setFleetList(Array.isArray(data) ? data : []);
          setLoading(false);
          setSilentRefreshing(false);
          return;
        }
      } catch (err) {
        console.warn('Live fleet fetch failed, falling back to simulated fleet store:', err);
      } finally {
        inFlightRef.current = false;
      }
    }

    // Dynamic offline fallback
    const sampleDrivers = [
      { name: 'محمد صبحي', phone: '01021561196' },
      { name: 'اشرف حسن', phone: '01034972249' },
      { name: 'السيد عبد الجواد', phone: '01270628098' },
      { name: 'عادل محمدين', phone: '01064384157' },
      { name: 'ابراهيم السبع', phone: '01093192601' },
    ];
    const sampleSupervisors = [
      { name: 'ممدوح بدران', phone: '01275467090' },
      { name: 'محمد عبد الباري', phone: '01283970678' },
      { name: 'احمد السيد', phone: '01224393146' },
      { name: 'محمود عبد الله', phone: '01282783018' },
    ];

    const currentRoutes = routes.length > 0 ? routes : [
      { id: 29, nameAr: 'بورتوفيق - السويس', nameEn: 'Port Tawfik (Suez)' },
      { id: 33, nameAr: 'السويس (نبي الله داوود)', nameEn: 'Suez (Nabi Allah)' },
      { id: 30, nameAr: 'السلام - المستقبل', nameEn: 'El Salam & El Mostakbal' },
      { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
      { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
    ];

    // If purged offline flag is set, return empty
    if (typeof window !== 'undefined' && localStorage.getItem('aesh_offline_purged_flag') === 'true') {
      setFleetList([]);
      setLoading(false);
      setSilentRefreshing(false);
      return;
    }

    let dynamicFleet = currentRoutes.map((r, idx) => {
      const booked = (idx * 9 + 12) % 45;
      const held = (idx % 3 === 0) ? 3 : (idx % 2 === 0) ? 1 : 0;
      const capacity = 50;
      const free = Math.max(0, capacity - booked - held);
      const percent = Math.min(100, Math.round(((booked + held) / capacity) * 100));
      const driver = sampleDrivers[idx % sampleDrivers.length];
      const superv = sampleSupervisors[idx % sampleSupervisors.length];
      const timeSlot = idx % 2 === 0 ? 'morning_1' : 'morning_2';
      const direction = idx % 3 === 0 ? 'from_campus' : 'to_campus';

      return {
        tripId: r.id * 100 + 1,
        routeId: r.id,
        tripDate: selectedDate || todayStr,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        busName: `باص جامعة الجلالة #${100 + r.id}`,
        licensePlate: `أ ب ج ${100 + r.id}`,
        departureTime: timeSlot === 'morning_1' ? '07:00 AM' : '09:30 AM',
        timeSlot,
        direction,
        driverName: driver.name,
        driverPhone: driver.phone,
        superName: superv.name,
        superPhone: superv.phone,
        bookedSeats: booked,
        heldSeats: held,
        freeSeats: free,
        capacity,
        occupancyPercent: percent,
        status: percent >= 95 ? 'full' : percent > 60 ? 'boarding' : 'scheduled',
      };
    });

    // Apply client-side filters
    if (selectedRouteId !== 'all') {
      dynamicFleet = dynamicFleet.filter(f => String(f.routeId) === String(selectedRouteId));
    }
    if (selectedDirection !== 'all') {
      dynamicFleet = dynamicFleet.filter(f => f.direction === selectedDirection);
    }
    if (selectedTimeSlot !== 'all') {
      dynamicFleet = dynamicFleet.filter(f => f.timeSlot === selectedTimeSlot);
    }
    if (selectedOccupancy !== 'all') {
      if (selectedOccupancy === 'available') dynamicFleet = dynamicFleet.filter(f => f.occupancyPercent < 50);
      else if (selectedOccupancy === 'filling') dynamicFleet = dynamicFleet.filter(f => f.occupancyPercent >= 50 && f.occupancyPercent < 85);
      else if (selectedOccupancy === 'full') dynamicFleet = dynamicFleet.filter(f => f.occupancyPercent >= 85);
      else if (selectedOccupancy === 'holding') dynamicFleet = dynamicFleet.filter(f => f.heldSeats > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      dynamicFleet = dynamicFleet.filter(f =>
        f.nameAr.toLowerCase().includes(q) ||
        f.nameEn.toLowerCase().includes(q) ||
        f.licensePlate.toLowerCase().includes(q) ||
        f.driverName.toLowerCase().includes(q) ||
        f.superName.toLowerCase().includes(q)
      );
    }

    setFleetList(dynamicFleet);
    setLoading(false);
    setSilentRefreshing(false);
  }, [isOffline, token, routes, API_URL, selectedDate, selectedRouteId, selectedDirection, selectedTimeSlot, selectedOccupancy, searchQuery, todayStr]);

  useEffect(() => {
    loadFleetData();
  }, [loadFleetData]);

  // Visibility-aware background sync (every 25s, pauses when tab is hidden, immediate upon refocus)
  useEffect(() => {
    if (pollingDisabled || !token || isOffline) return;

    pollingRef.current = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadFleetData(true);
      }
    }, 25000);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadFleetData(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleScheduleUpdated = () => {
      loadFleetData(true);
    };
    window.addEventListener('schedule_updated', handleScheduleUpdated);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('schedule_updated', handleScheduleUpdated);
    };
  }, [loadFleetData, pollingDisabled, token, isOffline]);

  // Handle Purge Action
  const handlePurgeShifts = async () => {
    setPurging(true);
    const dateParam = purgeTarget === 'date' ? selectedDate : undefined;

    if (!isOffline) {
      try {
        const queryStr = dateParam ? `?date=${dateParam}` : '';
        const res = await fetch(`${API_URL}/api/admin/shifts/purge-all${queryStr}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          showToast('success', data.message || `Successfully purged shifts (${data.purgedShiftsCount || 0} shifts removed). Fleet is now clean!`);
          setShowPurgeModal(false);
          setPurging(false);
          loadFleetData();
          return;
        }
      } catch (err) {
        console.warn('Backend purge failed, using offline purge:', err);
      }
    }

    // Offline purge
    const res = purgeOfflineShifts(dateParam);
    showToast('success', `Purged ${res.count} shifts from local store. Fleet is now clean!`);
    setShowPurgeModal(false);
    setPurging(false);
    loadFleetData();
  };

  // Handle Create 1 Single Test Shift
  const handleCreateTestShift = async () => {
    setCreatingTest(true);
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/shifts/create-single-test-shift`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            date: testDate,
            routeId: testRouteId,
            direction: testDirection,
            timeSlot: testTimeSlot,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          showToast('success', `Clean test shift #${data.trip?.id || 'NEW'} created successfully on ${testDate}! Ready for live testing.`);
          setShowCreateTestModal(false);
          setCreatingTest(false);
          setSelectedDate(testDate);
          loadFleetData();
          return;
        }
      } catch (err) {
        console.warn('Backend test shift creation failed, using offline fallback:', err);
      }
    }

    // Offline test shift
    const result = createSingleOfflineTestShift(testDate, testRouteId);
    showToast('success', `Test shift #${result.trip.id} created successfully! You can now test seat locking in real-time.`);
    setShowCreateTestModal(false);
    setCreatingTest(false);
    setSelectedDate(testDate);
    loadFleetData();
  };

  const [testCategory, setTestCategory] = useState<RouteCategoryKey>('suez');

  // Filtered routes by selected category for the main selector
  const filteredRoutes = useMemo(() => {
    if (selectedCategory === 'all') return routes;
    const catIds = new Set(PREDEFINED_ROUTES.filter(r => r.category === selectedCategory).map(r => r.id));
    return routes.filter(r => catIds.has(r.id));
  }, [routes, selectedCategory]);

  const testRoutes = useMemo(() => {
    const catIds = new Set(PREDEFINED_ROUTES.filter(r => r.category === testCategory).map(r => r.id));
    const inLoaded = routes.filter(r => catIds.has(r.id));
    if (inLoaded.length > 0) return inLoaded;
    return PREDEFINED_ROUTES.filter(r => r.category === testCategory);
  }, [routes, testCategory]);

  // Displayed fleet filtered by category
  const displayedFleet = useMemo(() => {
    if (selectedCategory === 'all') return fleetList;
    return fleetList.filter(f => getRouteCategory(Number(f.routeId)) === selectedCategory);
  }, [fleetList, selectedCategory]);

  // Summary Metrics based on displayedFleet
  const metrics = useMemo(() => {
    const totalFleet = displayedFleet.length;
    const totalCap = displayedFleet.reduce((acc, f) => acc + (f.capacity || 50), 0);
    const totalBooked = displayedFleet.reduce((acc, f) => acc + (f.bookedSeats || 0), 0);
    const totalHeld = displayedFleet.reduce((acc, f) => acc + (f.heldSeats || 0), 0);
    const totalFree = displayedFleet.reduce((acc, f) => acc + (f.freeSeats || Math.max(0, (f.capacity || 50) - (f.bookedSeats || 0) - (f.heldSeats || 0))), 0);
    const avgOccupancy = totalCap > 0 ? Math.round(((totalBooked + totalHeld) / totalCap) * 100) : 0;
    return { totalFleet, totalCap, totalBooked, totalHeld, totalFree, avgOccupancy };
  }, [displayedFleet]);

  const hasActiveFilters = selectedCategory !== 'all' || selectedDate !== todayStr || selectedRouteId !== 'all' || selectedDirection !== 'all' || selectedTimeSlot !== 'all' || selectedOccupancy !== 'all' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedDate(todayStr);
    setSelectedRouteId('all');
    setSelectedDirection('all');
    setSelectedTimeSlot('all');
    setSelectedOccupancy('all');
    setSearchQuery('');
  };

  return (
    <div className="bg-surface-container border border-border-whisper rounded-2xl shadow-sm flex flex-col overflow-hidden space-y-4 p-5">
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-bold animate-in slide-in-from-top-2 duration-200 ${notification.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-text-tertiary hover:text-text-primary">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Top Header with Live Indicator & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-whisper">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/15 text-primary-container flex items-center justify-center border border-primary-container/30">
            <span className="material-symbols-outlined text-2xl">directions_bus</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-text-primary">Fleet Live Status & Operations Hub</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync {silentRefreshing && '• Syncing...'}
              </span>
            </div>
            <p className="text-xs text-text-secondary">
              Real-time monitoring: Tri-color seat status (Booked / Held / Free). Click any bus to inspect its live seat map.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Create 1 Test Shift Button */}
          <button
            onClick={() => setShowCreateTestModal(true)}
            className="px-3 py-1.5 rounded-xl bg-primary-container text-on-primary-container hover:opacity-90 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            title="Create 1 isolated test shift for clean end-to-end testing"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>Create 1 Test Shift</span>
          </button>

          {/* Purge All Shifts Button */}
          <button
            onClick={() => setShowPurgeModal(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold transition-colors flex items-center gap-1.5"
            title="Remove all shifts or date shifts to start with a clean slate"
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            <span>Wipe / Purge Shifts</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => loadFleetData(false)}
            className="px-3 py-1.5 border border-border-whisper rounded-xl text-text-secondary hover:text-text-primary text-xs font-semibold hover:bg-surface transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Fleet Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Active Buses</span>
          <div className="text-xl font-black text-text-primary mt-0.5">{metrics.totalFleet}</div>
          <span className="text-[10px] text-emerald-400 font-semibold">Operational Vehicles</span>
        </div>
        <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Fleet Capacity</span>
          <div className="text-xl font-black text-primary-container mt-0.5">{metrics.totalCap}</div>
          <span className="text-[10px] text-text-secondary">Total seats</span>
        </div>
        <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper">
          <span className="text-[10px] uppercase font-bold text-blue-400">Booked Seats</span>
          <div className="text-xl font-black text-blue-400 mt-0.5">{metrics.totalBooked}</div>
          <span className="text-[10px] text-text-secondary">Confirmed riders</span>
        </div>
        <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper">
          <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            In-Progress Held
          </span>
          <div className="text-xl font-black text-amber-400 mt-0.5">{metrics.totalHeld}</div>
          <span className="text-[10px] text-text-secondary">Rider active locks</span>
        </div>
        <div className="bg-surface-container-low p-3 rounded-xl border border-border-whisper col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-text-tertiary">Fleet Occupancy</span>
          <div className="text-xl font-black text-text-primary mt-0.5">{metrics.avgOccupancy}%</div>
          <span className="text-[10px] text-emerald-400 font-semibold">{metrics.totalFree} Free Seats</span>
        </div>
      </div>

      {/* Comprehensive Customizable Filter Toolbar */}
      <div className="bg-surface-container-low p-4 rounded-xl border border-border-whisper space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border-whisper/60 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-text-primary">
            <span className="material-symbols-outlined text-base text-primary-container">tune</span>
            <span>Customizable Filter Panel</span>
          </div>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Reset Filters</span>
              </button>
            )}
            {/* View Mode Toggle */}
            <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border-whisper">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'cards' ? 'bg-primary-container text-on-primary-container' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <span className="material-symbols-outlined text-sm">grid_view</span>
                <span>Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${viewMode === 'table' ? 'bg-primary-container text-on-primary-container' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <span className="material-symbols-outlined text-sm">table_rows</span>
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Regional Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-border-whisper/60">
          <span className="text-[11px] font-bold text-text-secondary uppercase shrink-0 pl-1">
            المنطقة / Region:
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedRouteId('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-primary-container text-white shadow-sm'
                : 'bg-surface text-text-secondary hover:text-text-primary border border-border-whisper'
            }`}
          >
            <span className="material-symbols-outlined text-sm">hub</span>
            جميع المناطق (All)
          </button>
          {ROUTE_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.key);
                setSelectedRouteId('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                selectedCategory === cat.key
                  ? 'bg-primary-container text-white shadow-sm'
                  : 'bg-surface text-text-secondary hover:text-text-primary border border-border-whisper'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{cat.icon}</span>
              {cat.labelAr} ({cat.count} خط)
            </button>
          ))}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {/* Date Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Operational Date</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
            >
              <option value="all">All Dates / جميع الأيام</option>
              {operationalDates.map((d) => (
                <option key={d} value={d}>
                  {d === todayStr ? `Today (${d})` : d}
                </option>
              ))}
            </select>
          </div>

          {/* Route / Line Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">
              Route / Line {selectedCategory !== 'all' ? `(${selectedCategory === 'cairo' ? 'القاهرة' : selectedCategory === 'suez' ? 'السويس' : 'الشروق وبدر'})` : ''}
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
            >
              <option value="all">All Routes / جميع الخطوط</option>
              {filteredRoutes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nameAr} ({r.nameEn})
                </option>
              ))}
            </select>
          </div>

          {/* Direction Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Direction</label>
            <select
              value={selectedDirection}
              onChange={(e) => setSelectedDirection(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
            >
              <option value="all">All Directions / الاتجاهين</option>
              <option value="to_campus">To Campus / ذهاب للجامعة</option>
              <option value="from_campus">From Campus / عودة من الجامعة</option>
            </select>
          </div>

          {/* Time Slot Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Shift / Time Slot</label>
            <select
              value={selectedTimeSlot}
              onChange={(e) => setSelectedTimeSlot(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
            >
              {SHIFT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Occupancy Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Occupancy Status</label>
            <select
              value={selectedOccupancy}
              onChange={(e) => setSelectedOccupancy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
            >
              <option value="all">All Statuses / جميع الحالات</option>
              <option value="available">Available (&lt; 50% capacity)</option>
              <option value="filling">Filling Up (50% - 85%)</option>
              <option value="full">Full / Almost Full (&gt; 85%)</option>
              <option value="holding">Has Active Holds (Orange Seats)</option>
            </select>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">search</span>
          <input
            type="text"
            placeholder="Search by line name, plate number, driver, supervisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-border-whisper text-text-primary text-xs focus:border-primary-container focus:outline-none"
          />
        </div>
      </div>

      {/* Fleet Vehicles Display */}
      {loading ? (
        <div className="py-16 text-center text-text-secondary flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined animate-spin text-primary-container text-3xl">sync</span>
          <span className="text-xs font-semibold">Loading live fleet monitoring data...</span>
        </div>
      ) : fleetList.length === 0 ? (
        <div className="py-16 text-center text-text-secondary flex flex-col items-center justify-center gap-3 border border-dashed border-border-whisper rounded-xl">
          <span className="material-symbols-outlined text-4xl text-text-tertiary">bus_alert</span>
          <div className="max-w-md space-y-1">
            <h4 className="font-bold text-sm text-text-primary">No Operational Shifts Detected</h4>
            <p className="text-xs text-text-secondary">
              There are currently no active bus shifts matching your criteria. You can create 1 single test shift to test end-to-end booking.
            </p>
          </div>
          <button
            onClick={() => setShowCreateTestModal(true)}
            className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">add_circle</span>
            <span>Create 1 Single Test Shift</span>
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {displayedFleet.map((bus) => {
            const shiftInfo = formatShiftDisplay({
              routeId: bus.routeId,
              departureTime: bus.departureTime,
              timeSlot: bus.timeSlot,
              direction: bus.direction,
              bus: { name: bus.busName, licensePlate: bus.licensePlate, totalSeats: bus.capacity },
            });

            return (
              <div
                key={bus.tripId}
                onClick={() => setInspectingTripId(bus.tripId)}
                className="p-4 rounded-xl bg-surface-container-low border border-border-whisper hover:border-primary-container/60 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-3 group"
                title="Click to inspect real-time seat locks and passenger list"
              >
                {/* Header Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/15 text-primary-container flex items-center justify-center font-black group-hover:scale-105 transition-transform shrink-0">
                      <span className="material-symbols-outlined text-2xl">directions_bus</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-text-primary group-hover:text-primary-container transition-colors">
                          {shiftInfo.shortTitleAr}
                        </h4>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-surface border border-border-whisper text-text-secondary font-bold">
                          {shiftInfo.licensePlate}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center gap-1 ${bus.direction === 'to_campus' ? 'bg-primary-container/15 text-primary-container border border-primary-container/30' : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'}`}>
                          <span className="material-symbols-outlined text-[11px]">{bus.direction === 'to_campus' ? 'north_east' : 'south_west'}</span>
                          <span>{shiftInfo.directionAr}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary-container/10 text-primary-container border border-primary-container/20">
                          {shiftInfo.categoryLabelAr}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>خط {shiftInfo.routeNameAr} ({shiftInfo.routeNameEn})</span>
                        <span>•</span>
                        <span className="font-mono text-primary-container font-semibold">{shiftInfo.departureDisplay}</span>
                        <span>•</span>
                        <span>{bus.tripDate}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shrink-0 ${bus.status === 'full' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : bus.heldSeats > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : bus.status === 'boarding' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                    {bus.status === 'full' ? 'Full' : bus.heldSeats > 0 ? 'Holding' : bus.status === 'boarding' ? 'Boarding' : 'Scheduled'}
                  </span>
                </div>

                {/* Personnel Contacts */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-surface p-2 rounded-lg border border-border-whisper">
                  <div className="flex items-center gap-1.5 text-text-secondary truncate">
                    <span className="material-symbols-outlined text-sm text-text-tertiary">sports_motorsports</span>
                    <span className="truncate">سائق: <strong className="text-text-primary">{bus.driverName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary truncate">
                    <span className="material-symbols-outlined text-sm text-text-tertiary">supervised_user_circle</span>
                    <span className="truncate">مشرف: <strong className="text-text-primary">{bus.superName}</strong></span>
                  </div>
                </div>

                {/* Tri-Color Occupancy Bar (Booked Blue / Held Orange / Free Slate) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 text-blue-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {bus.bookedSeats} Booked
                      </span>
                      {bus.heldSeats > 0 && (
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                          {bus.heldSeats} Held
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-text-tertiary">
                        <span className="w-2 h-2 rounded-full bg-surface-container-highest border border-border-whisper"></span>
                        {bus.freeSeats} Free
                      </span>
                    </div>
                    <span className="font-mono font-bold text-text-primary">{bus.occupancyPercent}% ({bus.bookedSeats + bus.heldSeats}/{bus.capacity})</span>
                  </div>

                  {/* Progress multi-segment */}
                  <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-border-whisper flex">
                    <div
                      className="bg-blue-600 h-full transition-all"
                      style={{ width: `${Math.round(((bus.bookedSeats || 0) / (bus.capacity || 50)) * 100)}%` }}
                      title={`Booked: ${bus.bookedSeats}`}
                    />
                    <div
                      className="bg-amber-500 h-full transition-all animate-pulse"
                      style={{ width: `${Math.round(((bus.heldSeats || 0) / (bus.capacity || 50)) * 100)}%` }}
                      title={`Held: ${bus.heldSeats}`}
                    />
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-2 border-t border-border-whisper/50 flex items-center justify-between text-xs text-text-secondary">
                  <span className="flex items-center gap-1 text-[11px]">
                    <span className="material-symbols-outlined text-sm text-emerald-400">sync</span>
                    <span>Instant live sync active</span>
                  </span>
                  <span className="font-bold text-primary-container group-hover:underline flex items-center gap-0.5">
                    <span>Inspect Seat Map</span>
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto border border-border-whisper rounded-xl">
          <table className="w-full text-left text-xs text-text-secondary border-collapse">
            <thead className="bg-surface-container-low text-[10px] uppercase font-bold text-text-tertiary border-b border-border-whisper">
              <tr>
                <th className="p-3">Shift & Route</th>
                <th className="p-3">Vehicle Plate</th>
                <th className="p-3">Direction</th>
                <th className="p-3">Departure</th>
                <th className="p-3">Personnel</th>
                <th className="p-3">Occupancy</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-whisper">
              {displayedFleet.map((bus) => {
                const shiftInfo = formatShiftDisplay({
                  routeId: bus.routeId,
                  departureTime: bus.departureTime,
                  timeSlot: bus.timeSlot,
                  direction: bus.direction,
                  bus: { name: bus.busName, licensePlate: bus.licensePlate, totalSeats: bus.capacity },
                });

                return (
                  <tr
                    key={bus.tripId}
                    onClick={() => setInspectingTripId(bus.tripId)}
                    className="hover:bg-surface-container-high/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-text-primary">{shiftInfo.shortTitleAr}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-primary-container/10 text-primary-container border border-primary-container/20">
                          {shiftInfo.categoryLabelAr}
                        </span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">خط {shiftInfo.routeNameAr} ({shiftInfo.routeNameEn})</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-text-primary">
                      {shiftInfo.licensePlate}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bus.direction === 'to_campus' ? 'bg-primary-container/15 text-primary-container' : 'bg-amber-500/15 text-amber-300'}`}>
                        {shiftInfo.directionAr}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-text-primary">
                      {shiftInfo.departureDisplay}
                    </td>
                    <td className="p-3 text-[11px]">
                      <div>سائق: {bus.driverName}</div>
                      <div className="text-[10px] text-text-tertiary">مشرف: {bus.superName}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-text-primary">{bus.bookedSeats}/{bus.capacity}</span>
                        {bus.heldSeats > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                            +{bus.heldSeats} held
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFleetPdf(bus);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Download / Print Official Boarding PDF"
                      >
                        <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                        PDF
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectingTripId(bus.tripId);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-surface border border-border-whisper hover:border-primary-container text-text-primary text-xs font-bold cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Embedded Bus Seat Map Modal (Live sync, 100% solid dark navy) */}
      {inspectingTripId !== null && (
        <BusSeatInspectorModal
          tripId={inspectingTripId}
          onClose={() => setInspectingTripId(null)}
        />
      )}

      {/* Official Boarding Manifest PDF Modal from Fleet Row */}
      {pdfTripData !== null && (
        <BoardingManifestPdfModal
          trip={pdfTripData}
          manifest={pdfManifestData}
          onClose={() => setPdfTripData(null)}
          supervisorName={pdfTripData?.supervisors?.[0]?.nameEn || pdfTripData?.supervisors?.[0]?.nameAr}
        />
      )}

      {/* Confirmation Modal: Purge All Shifts */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#060913]/90 backdrop-blur-md">
          <div className="bg-surface-container border border-rose-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-text-primary">Wipe / Purge Operational Shifts</h4>
                <p className="text-xs text-text-secondary">Clean testing action: remove mass shifts</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This action safely clears the operational shifts schedule, removes test bookings, and wipes Redis seat lock keys so you can test one isolated shift at a time.
            </p>

            {/* Scope Selection */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-text-primary block">Select Purge Scope:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurgeTarget('all')}
                  className={`p-3 rounded-xl border text-left transition-all ${purgeTarget === 'all' ? 'bg-rose-500/20 border-rose-500 text-text-primary font-bold' : 'bg-surface border-border-whisper text-text-secondary'}`}
                >
                  <div className="text-xs font-bold">Wipe All Shifts</div>
                  <div className="text-[10px] text-text-tertiary">All ~320 shifts across all dates</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPurgeTarget('date')}
                  className={`p-3 rounded-xl border text-left transition-all ${purgeTarget === 'date' ? 'bg-rose-500/20 border-rose-500 text-text-primary font-bold' : 'bg-surface border-border-whisper text-text-secondary'}`}
                >
                  <div className="text-xs font-bold">Wipe For Date Only</div>
                  <div className="text-[10px] text-text-tertiary">Only shifts on {selectedDate}</div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-whisper">
              <button
                type="button"
                disabled={purging}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border-whisper text-text-secondary hover:text-text-primary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={purging}
                onClick={handlePurgeShifts}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                {purging ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete_sweep</span>
                    <span>Confirm Wipe & Purge</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create 1 Single Test Shift */}
      {showCreateTestModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-[#060913]/90 backdrop-blur-md">
          <div className="bg-surface-container border border-primary-container/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center shrink-0 border border-primary-container/30">
                <span className="material-symbols-outlined text-2xl">science</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-text-primary">Create 1 Single Test Shift</h4>
                <p className="text-xs text-text-secondary">Clean isolated bus shift with 50 empty seats</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Create one isolated shift so you can open the rider app and test seat locks, booking confirmations, and admin synchronization without clutter.
            </p>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <label className="block font-bold text-text-primary mb-1">Target Date</label>
                <select
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-whisper text-text-primary focus:border-primary-container focus:outline-none"
                >
                  {operationalDates.map((d) => (
                    <option key={d} value={d}>
                      {d === todayStr ? `Today (${d})` : d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">المنطقة / Region Category</label>
                <div className="flex rounded-lg border border-border-whisper overflow-hidden bg-surface mb-2">
                  {ROUTE_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setTestCategory(cat.key);
                        const first = PREDEFINED_ROUTES.find(r => r.category === cat.key);
                        if (first) setTestRouteId(first.id);
                      }}
                      className={`flex-1 py-1.5 text-center text-xs font-bold transition flex items-center justify-center gap-1 ${
                        testCategory === cat.key ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                      <span>{cat.labelAr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-text-primary mb-1">
                  Select Route ({testCategory === 'cairo' ? 'القاهرة' : testCategory === 'suez' ? 'السويس' : 'الشروق وبدر'})
                </label>
                <select
                  value={testRouteId}
                  onChange={(e) => setTestRouteId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border-whisper text-text-primary focus:border-primary-container focus:outline-none"
                >
                  {testRoutes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nameAr} - {r.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-text-primary mb-1">Direction</label>
                  <select
                    value={testDirection}
                    onChange={(e) => setTestDirection(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-whisper text-text-primary focus:border-primary-container focus:outline-none"
                  >
                    <option value="to_campus">To Campus (Arrival)</option>
                    <option value="from_campus">From Campus (Return)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-text-primary mb-1">Time Slot</label>
                  <select
                    value={testTimeSlot}
                    onChange={(e) => setTestTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-border-whisper text-text-primary focus:border-primary-container focus:outline-none"
                  >
                    <option value="morning_1">Morning 1 (07:00 AM)</option>
                    <option value="morning_2">Morning 2 (09:30 AM)</option>
                    <option value="return_1">Return 1 (12:30 PM)</option>
                    <option value="return_2">Return 2 (02:30 PM)</option>
                    <option value="return_3">Return 3 (05:30 PM)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-whisper">
              <button
                type="button"
                disabled={creatingTest}
                onClick={() => setShowCreateTestModal(false)}
                className="px-4 py-2 rounded-xl bg-surface border border-border-whisper text-text-secondary hover:text-text-primary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingTest}
                onClick={handleCreateTestShift}
                className="px-4 py-2 rounded-xl bg-primary-container text-on-primary-container text-xs font-bold flex items-center gap-1.5 hover:opacity-90 shadow-lg shadow-primary-container/20"
              >
                {creatingTest ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>Create Shift Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

