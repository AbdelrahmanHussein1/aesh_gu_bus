'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useApp } from '@/hooks/useAppStore';
import type { Trip, Route, TimeSlot, Direction, PersonnelContact } from '@/lib/types';
import { getOfflineAllTrips, cloneOfflineSchedule, getAllPersonnel, saveCustomOfflineTrips, getCustomOfflineTrips, addMockAuditLog, purgeOfflineShifts, createSingleOfflineTestShift } from '@/lib/offline';
import { getApiBaseUrl } from '@/lib/api';
import { getTodayDateString, formatDateString, getScheduleManagerDates } from '@/lib/dateUtils';
import {
  ROUTE_CATEGORIES,
  RouteCategoryKey,
  getRouteCategory,
  formatShiftDisplay,
  PREDEFINED_ROUTES,
} from '@/lib/routes-config';
import BusSeatInspectorModal from './BusSeatInspectorModal';

const ADMIN_OPERATIONAL_DATES = getScheduleManagerDates(3, 10);

const SHIFT_OPTIONS: { id: TimeSlot | 'all'; labelAr: string; labelEn: string; time: string }[] = [
  { id: 'all', labelAr: 'جميع الشفتات', labelEn: 'All Shifts', time: 'Full Day' },
  { id: 'morning_1', labelAr: 'شفت 1 (وصول 9:00)', labelEn: 'Arrival 1', time: '09:00 AM Arrival' },
  { id: 'morning_2', labelAr: 'شفت 2 (وصول 11:30)', labelEn: 'Arrival 2', time: '11:30 AM Arrival' },
  { id: 'return_1', labelAr: 'عودة 1 (12:30 م)', labelEn: 'Return 1', time: '12:30 PM Departure' },
  { id: 'return_2', labelAr: 'عودة 2 (2:30 م)', labelEn: 'Return 2', time: '02:30 PM Departure' },
  { id: 'return_3', labelAr: 'عودة 3 (5:30 م)', labelEn: 'Return 3', time: '05:30 PM Departure' },
];

export default function ScheduleManager() {
  const { isOffline, routes, token } = useApp();
  const todayStr = useMemo(() => getTodayDateString(), []);
  const [selectedDate, setSelectedDate] = useState(() => getTodayDateString());
  const [selectedShift, setSelectedShift] = useState<TimeSlot | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | RouteCategoryKey>('all');
  const [selectedRouteId, setSelectedRouteId] = useState<number | 'all'>('all');
  const [allSchedules, setAllSchedules] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [personnel, setPersonnel] = useState<{ drivers: PersonnelContact[]; supervisors: PersonnelContact[] }>({ drivers: [], supervisors: [] });

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalCategory, setModalCategory] = useState<RouteCategoryKey>('suez');
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<'all' | 'date'>('all');
  const [purging, setPurging] = useState(false);
  const [inspectingTripId, setInspectingTripId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pollingDisabled, setPollingDisabled] = useState(false);
  const inFlightRef = useRef(false);

  // New Trip Form state
  const [newTripType, setNewTripType] = useState<'both_ways' | 'to_campus' | 'from_campus'>('both_ways');
  const [newRouteId, setNewRouteId] = useState<number>(29);
  const [newDirection, setNewDirection] = useState<Direction>('to_campus');
  const [newTimeSlot, setNewTimeSlot] = useState<TimeSlot>('morning_1');
  const [newReturnTimeSlot, setNewReturnTimeSlot] = useState<TimeSlot>('return_2');
  const [newTripDate, setNewTripDate] = useState(() => getTodayDateString());
  const [newDepartureTime, setNewDepartureTime] = useState('07:00 AM');
  const [newReturnDepartureTime, setNewReturnDepartureTime] = useState('02:30 PM');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [newSupervisorPhone, setNewSupervisorPhone] = useState('');
  const [newTotalSeats, setNewTotalSeats] = useState(50);
  const [newPrice, setNewPrice] = useState(160);

  // Clone Form state
  const [cloneSourceDate, setCloneSourceDate] = useState(() => getTodayDateString());
  const [cloneTargetDate, setCloneTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateString(d);
  });

  const API_URL = getApiBaseUrl();

  // Fetch schedules
  const loadSchedules = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    if (!silent) setLoading(true);

    // 1. Guard against unauthorized request loops: if no token, do not call admin live API
    if (!token || isOffline) {
      const offlineTrips = getOfflineAllTrips(selectedDate, selectedRouteId === 'all' ? undefined : selectedRouteId);
      setAllSchedules(offlineTrips);
      if (!silent) setLoading(false);
      return;
    }

    inFlightRef.current = true;
    try {
      const res = await fetch(`${API_URL}/api/admin/schedules?date=${selectedDate}${selectedRouteId !== 'all' ? `&routeId=${selectedRouteId}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        console.warn('[ScheduleManager] 401/403 Unauthorized: halting polling loop.');
        setPollingDisabled(true);
        const offlineTrips = getOfflineAllTrips(selectedDate, selectedRouteId === 'all' ? undefined : selectedRouteId);
        setAllSchedules(offlineTrips);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setAllSchedules(Array.isArray(data) ? data : []);
        return;
      }
    } catch (err) {
      console.warn('Live API fetch failed, using offline fallback', err);
    } finally {
      inFlightRef.current = false;
      if (!silent) setLoading(false);
    }

    // Fallback offline trips
    const offlineTrips = getOfflineAllTrips(selectedDate, selectedRouteId === 'all' ? undefined : selectedRouteId);
    setAllSchedules(offlineTrips);
  }, [API_URL, isOffline, selectedDate, selectedRouteId, token]);

  // Load personnel directory
  useEffect(() => {
    const p = getAllPersonnel();
    setPersonnel(p);
    if (p.drivers.length > 0) setNewDriverPhone(p.drivers[0].phone);
    if (p.supervisors.length > 0) setNewSupervisorPhone(p.supervisors[0].phone);
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Visibility-aware background sync (every 25s, pauses when tab is hidden, immediate upon refocus)
  useEffect(() => {
    if (pollingDisabled || !token || isOffline) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadSchedules(true);
      }
    }, 25000);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadSchedules(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleScheduleUpdated = () => {
      loadSchedules(true);
    };
    window.addEventListener('schedule_updated', handleScheduleUpdated);
    window.addEventListener('fleet_purged', handleScheduleUpdated);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('schedule_updated', handleScheduleUpdated);
      window.removeEventListener('fleet_purged', handleScheduleUpdated);
    };
  }, [loadSchedules, pollingDisabled, token, isOffline]);

  // Filtered routes by selected category for the main selector
  const filteredRoutes = useMemo(() => {
    if (selectedCategory === 'all') return routes;
    const catIds = new Set(PREDEFINED_ROUTES.filter(r => r.category === selectedCategory).map(r => r.id));
    return routes.filter(r => catIds.has(r.id));
  }, [routes, selectedCategory]);

  // Filtered routes by modal category for the Create Shift modal
  const modalRoutes = useMemo(() => {
    const catIds = new Set(PREDEFINED_ROUTES.filter(r => r.category === modalCategory).map(r => r.id));
    const inLoaded = routes.filter(r => catIds.has(r.id));
    if (inLoaded.length > 0) return inLoaded;
    return PREDEFINED_ROUTES.filter(r => r.category === modalCategory);
  }, [routes, modalCategory]);

  // Filtered schedules
  const filteredTrips = useMemo(() => {
    return allSchedules.filter(t => {
      if (selectedShift !== 'all' && t.timeSlot !== selectedShift) return false;
      if (selectedCategory !== 'all' && getRouteCategory(t.routeId) !== selectedCategory) return false;
      return true;
    });
  }, [allSchedules, selectedShift, selectedCategory]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredTrips.length;
    const totalCap = filteredTrips.reduce((acc, t) => acc + (t.totalSeats || 50), 0);
    const booked = filteredTrips.reduce((acc, t) => acc + (t.bookedSeats || 0), 0);
    const driversCount = new Set(filteredTrips.map(t => t.driver?.phone).filter(Boolean)).size;
    return { total, totalCap, booked, driversCount };
  }, [filteredTrips]);

  // Show notification banner
  const triggerNotice = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle create new shift/trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const driver = personnel.drivers.find(d => d.phone === newDriverPhone) || null;
    const supervisor = personnel.supervisors.find(s => s.phone === newSupervisorPhone);
    const supervisors = supervisor ? [supervisor] : [];
    const matchedRoute = routes.find(r => r.id === newRouteId);
    const isBothWays = newTripType === 'both_ways';

    if (!isOffline) {
      try {
        const payload: any = {
          routeId: newRouteId,
          driverId: driver ? (driver.id || driver.phone) : null,
          supervisorIds: supervisor ? [(supervisor.id || supervisor.phone)] : [],
          tripDate: newTripDate,
          direction: isBothWays ? 'both_ways' : newDirection,
          bothWays: isBothWays,
          timeSlot: newTimeSlot,
          departureTime: newDepartureTime,
          totalSeats: newTotalSeats,
          priceEgp: newPrice,
        };

        if (isBothWays) {
          payload.returnTimeSlot = newReturnTimeSlot;
          payload.returnDepartureTime = newReturnDepartureTime;
        }

        const res = await fetch(`${API_URL}/api/admin/trips`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          triggerNotice('success', isBothWays 
            ? `Both-way shifts (ذهاب وعودة) created successfully for ${newTripDate}!` 
            : `Shift created successfully for ${newTripDate}!`);
          setShowCreateModal(false);
          loadSchedules();
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          triggerNotice('error', errData.error || 'Failed to create shift on server');
          return;
        }
      } catch (err) {
        console.warn('Network error creating shift, falling back to offline:', err);
      }
    }

    // Save offline
    const custom = getCustomOfflineTrips();
    if (isBothWays) {
      const arrivalTripObj: Trip = {
        id: Date.now(),
        routeId: newRouteId,
        tripDate: newTripDate,
        direction: 'to_campus',
        timeSlot: newTimeSlot,
        priceEgp: newPrice,
        departureTime: newDepartureTime,
        status: 'scheduled',
        totalSeats: newTotalSeats,
        bookedSeats: 0,
        bus: {
          name: `${matchedRoute?.nameEn || 'Line'}/Arrival`,
          licensePlate: `أ ب ج ${100 + newRouteId}`,
          totalSeats: newTotalSeats,
        },
        route: matchedRoute,
        driver,
        supervisors,
      };

      const returnTripObj: Trip = {
        id: Date.now() + 1,
        routeId: newRouteId,
        tripDate: newTripDate,
        direction: 'from_campus',
        timeSlot: newReturnTimeSlot,
        priceEgp: newPrice,
        departureTime: newReturnDepartureTime,
        status: 'scheduled',
        totalSeats: newTotalSeats,
        bookedSeats: 0,
        bus: {
          name: `${matchedRoute?.nameEn || 'Line'}/Return`,
          licensePlate: `أ ب ج ${100 + newRouteId}`,
          totalSeats: newTotalSeats,
        },
        route: matchedRoute,
        driver,
        supervisors,
      };

      saveCustomOfflineTrips([...custom, arrivalTripObj, returnTripObj]);
      addMockAuditLog('TRIP_CREATED', `Created both-way shifts (ذهاب وعودة) for ${newTripDate} (${matchedRoute?.nameEn})`);
      triggerNotice('success', `Both-way shifts (ذهاب وعودة) created successfully for ${newTripDate}!`);
    } else {
      const newTripObj: Trip = {
        id: Date.now(),
        routeId: newRouteId,
        tripDate: newTripDate,
        direction: newDirection,
        timeSlot: newTimeSlot,
        priceEgp: newPrice,
        departureTime: newDepartureTime,
        status: 'scheduled',
        totalSeats: newTotalSeats,
        bookedSeats: 0,
        bus: {
          name: `${matchedRoute?.nameEn || 'Line'}/${newDirection === 'to_campus' ? 'Arrival' : 'Return'}`,
          licensePlate: `أ ب ج ${100 + newRouteId}`,
          totalSeats: newTotalSeats,
        },
        route: matchedRoute,
        driver,
        supervisors,
      };

      saveCustomOfflineTrips([...custom, newTripObj]);
      addMockAuditLog('TRIP_CREATED', `Created new shift for ${newTripDate} (${matchedRoute?.nameEn})`);
      triggerNotice('success', `Shift created successfully for ${newTripDate}!`);
    }

    setShowCreateModal(false);
    loadSchedules();
  };

  // Handle clone schedule
  const handleCloneSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloneSourceDate || !cloneTargetDate) return;
    if (cloneSourceDate === cloneTargetDate) {
      triggerNotice('error', 'Source and target dates must be different.');
      return;
    }

    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/schedules/clone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            sourceDate: cloneSourceDate,
            targetDate: cloneTargetDate,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          triggerNotice('success', `Successfully cloned ${data.clonedCount} shifts to ${cloneTargetDate}!`);
          setShowCloneModal(false);
          setSelectedDate(cloneTargetDate);
          loadSchedules();
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          triggerNotice('error', errData.error || 'Failed to clone schedule on server');
          return;
        }
      } catch (err) {
        console.warn('Network error cloning schedule, falling back to offline:', err);
      }
    }

    // Offline clone
    const result = cloneOfflineSchedule(cloneSourceDate, cloneTargetDate);
    if (result.success) {
      triggerNotice('success', `Successfully cloned ${result.count} shifts to ${cloneTargetDate}!`);
      setShowCloneModal(false);
      setSelectedDate(cloneTargetDate);
      loadSchedules();
    } else {
      triggerNotice('error', `No shifts found on source date ${cloneSourceDate}`);
    }
  };

  // Handle delete trip
  const handleDeleteTrip = async (tripId: number) => {
    if (!confirm('Are you sure you want to remove this trip from the schedule?')) return;

    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/trips/${tripId}`, {
          method: 'DELETE',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (res.ok) {
          triggerNotice('success', 'Trip removed successfully.');
          loadSchedules();
          return;
        }
      } catch {}
    }

    // Offline delete
    const custom = getCustomOfflineTrips();
    saveCustomOfflineTrips(custom.filter(t => t.id !== tripId));
    setAllSchedules(prev => prev.filter(t => t.id !== tripId));
    addMockAuditLog('TRIP_REMOVED', `Admin deleted trip ID #${tripId}`);
    triggerNotice('success', 'Trip removed from schedule.');
  };

  // Handle Purge All Shifts / Clear Roster
  const handlePurgeShifts = async () => {
    setPurging(true);
    const isAll = purgeTarget === 'all';
    const dateParam = isAll ? undefined : selectedDate;

    if (!isOffline) {
      try {
        const queryStr = isAll ? '?allDates=true' : `?date=${dateParam}`;
        const res = await fetch(`${API_URL}/api/admin/shifts/purge-all${queryStr}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            allDates: isAll,
            date: dateParam,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          purgeOfflineShifts(dateParam);
          triggerNotice('success', data.message || `Successfully purged shifts.`);
          setShowPurgeModal(false);
          setPurging(false);
          loadSchedules();
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          triggerNotice('error', errData.error || 'Failed to purge shifts on server');
          setPurging(false);
          return;
        }
      } catch (err: any) {
        console.error('Backend purge failed:', err);
        triggerNotice('error', err?.message || 'Network error purging shifts');
        setPurging(false);
        return;
      }
    }

    const res = purgeOfflineShifts(dateParam);
    triggerNotice('success', `Purged ${res.count} shifts from local store.`);
    setShowPurgeModal(false);
    setPurging(false);
    loadSchedules();
  };

  // Handle Quick Create Single Test Shift
  const handleQuickCreateTestShift = async () => {
    const routeIdToUse = selectedRouteId !== 'all' ? Number(selectedRouteId) : 29;
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/admin/shifts/create-single-test-shift`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            date: selectedDate,
            routeId: routeIdToUse,
            direction: 'to_campus',
            timeSlot: selectedShift !== 'all' ? selectedShift : 'morning_1',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          triggerNotice('success', `Clean test shift #${data.trip?.id || 'NEW'} created for ${selectedDate}! Ready for testing.`);
          loadSchedules();
          return;
        }
      } catch (err) {
        console.warn('Backend test shift creation failed, using offline fallback:', err);
      }
    }

    const result = createSingleOfflineTestShift(selectedDate, routeIdToUse);
    triggerNotice('success', `Test shift #${result.trip.id} created successfully! Ready for testing.`);
    loadSchedules();
  };

  return (
    <div className="space-y-6">
      {/* Top Notification */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-rose-50 text-rose-900 border border-rose-200'}`}>
          <span className="material-symbols-outlined text-lg">{notification.type === 'success' ? 'check_circle' : 'error'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Control Header & Stats */}
      <div className="bg-surface-container border border-border-whisper rounded-xl p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-text-primary">Shift & Schedule Hub</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-container/15 text-primary-container">
              {isOffline ? 'Offline Sync' : 'Live Connected'}
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Create, manage, and duplicate operational bus schedules bit-by-bit across dates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleQuickCreateTestShift}
            className="px-3.5 py-2 rounded-xl bg-primary-container text-on-primary-container hover:opacity-90 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Create 1 isolated test shift with 50 empty seats for testing"
          >
            <span className="material-symbols-outlined text-base">science</span>
            <span>Create 1 Test Shift</span>
          </button>

          <button
            onClick={() => setShowPurgeModal(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            title="Wipe shifts to start clean"
          >
            <span className="material-symbols-outlined text-base">delete_sweep</span>
            <span>Wipe / Purge Shifts</span>
          </button>

          <button
            onClick={() => setShowCloneModal(true)}
            className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest border border-border-whisper text-text-primary font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
            title="Duplicate an entire date's roster to another day"
          >
            <span className="material-symbols-outlined text-base text-primary-container">content_copy</span>
            <span>Reuse Old Schedule</span>
          </button>

          <button
            onClick={() => {
              setNewTripDate(selectedDate);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-surface-container-highest hover:bg-surface border border-border-whisper text-text-primary font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Create Shift</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-container border border-border-whisper p-4 rounded-xl">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Shifts Listed</p>
          <p className="text-2xl font-black text-text-primary mt-1">{stats.total}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">On {selectedDate}</p>
        </div>
        <div className="bg-surface-container border border-border-whisper p-4 rounded-xl">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total Seats</p>
          <p className="text-2xl font-black text-primary-container mt-1">{stats.totalCap}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">Campus fleet capacity</p>
        </div>
        <div className="bg-surface-container border border-border-whisper p-4 rounded-xl">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Reserved Seats</p>
          <p className="text-2xl font-black text-success-galala mt-1">{stats.booked}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">{stats.totalCap > 0 ? Math.round((stats.booked / stats.totalCap) * 100) : 0}% occupancy</p>
        </div>
        <div className="bg-surface-container border border-border-whisper p-4 rounded-xl">
          <p className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Assigned Drivers</p>
          <p className="text-2xl font-black text-text-primary mt-1">{stats.driversCount}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">On active routes</p>
        </div>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-surface-container border border-border-whisper rounded-xl p-4 space-y-4">
        {/* Date Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary-container">calendar_month</span>
              Select Operational Date / التاريخ التشغيلي:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-primary-container"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {ADMIN_OPERATIONAL_DATES.map(date => {
              const isSelected = selectedDate === date;
              const isToday = date === todayStr;
              const d = new Date(date + 'T00:00:00');
              const dayNum = d.getDate();
              const monthName = d.toLocaleDateString('en-US', { month: 'short' });
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : isToday
                      ? 'border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'
                  }`}
                >
                  <span>{dayNum} {monthName}</span>
                  {isToday && <span className="text-[10px] text-emerald-400 font-extrabold">(اليوم)</span>}
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Regional Category Filter Tabs */}
        <div className="pt-3 border-t border-border-whisper">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-text-secondary uppercase shrink-0">
              المنطقة / Region:
            </span>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                setSelectedRouteId('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-primary-container text-on-primary-container shadow-sm'
                  : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'
              }`}
            >
              <span className="material-symbols-outlined text-sm">hub</span>
              <span>جميع المناطق (All)</span>
            </button>
            {ROUTE_CATEGORIES.map(cat => {
              const isSel = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.key);
                    setSelectedRouteId('all');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                  <span>{cat.labelAr}</span>
                  <span className="text-[10px] opacity-75">({cat.count} خط)</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift Filter Pills */}
        <div className="pt-3 border-t border-border-whisper">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {SHIFT_OPTIONS.map(opt => {
              const isSelected = selectedShift === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSelectedShift(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${isSelected ? 'bg-primary-container text-on-primary-container shadow-sm' : 'bg-surface-container-low text-text-secondary hover:text-text-primary border border-border-whisper'}`}
                >
                  <span>{opt.labelEn}</span>
                  <span className="text-[10px] opacity-75 ml-1 font-arabic">({opt.labelAr})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Route Filter Dropdown */}
        <div className="flex items-center gap-3 pt-2">
          <span className="text-xs text-text-secondary font-medium">Filter Line:</span>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-container font-medium"
          >
            <option value="all">All Lines {selectedCategory !== 'all' ? `(${selectedCategory === 'cairo' ? 'القاهرة' : selectedCategory === 'suez' ? 'السويس' : 'الشروق وبدر'})` : ''}</option>
            {filteredRoutes.map(r => (
              <option key={r.id} value={r.id}>{r.nameEn} — {r.nameAr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Trips List / Bit-by-Bit View */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-sm text-text-primary">
            Scheduled Shifts ({filteredTrips.length})
          </h3>
          {loading && <span className="text-xs text-text-secondary animate-pulse">Loading live roster...</span>}
        </div>

        {filteredTrips.length === 0 ? (
          <div className="bg-surface-container border border-dashed border-border-whisper rounded-xl p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-outline">event_busy</span>
            <h4 className="font-bold text-base text-text-primary">No shifts scheduled for this filter</h4>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              No bus trips found for {selectedDate}. You can create a new shift or reuse a complete schedule from a previous date.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowCloneModal(true)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-border-whisper rounded-lg text-xs font-bold text-text-primary flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Reuse / Clone Schedule (إعادة استخدام جدول)</span>
              </button>
              <button
                onClick={() => {
                  setNewTripDate(selectedDate);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-primary-container text-on-primary-container rounded-lg text-xs font-bold hover:opacity-90"
              >
                Create Shift
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrips.map(trip => {
              const booked = trip.bookedSeats || 0;
              const total = trip.totalSeats || trip.bus.totalSeats || 50;
              const percent = Math.min(100, Math.round((booked / total) * 100));
              const shiftInfo = formatShiftDisplay(trip);

              return (
                <div
                  key={trip.id}
                  onClick={() => setInspectingTripId(trip.id)}
                  className="bg-surface-container border border-border-whisper rounded-xl p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)] hover:border-primary-container hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group relative"
                  title="Click to view visual bus seat map and passenger list"
                >
                  {/* Top line badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-container/15 text-primary-container">
                            {shiftInfo.categoryLabelAr}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${trip.direction === 'to_campus' ? 'bg-primary-container/10 text-primary-container' : 'bg-secondary-fixed/30 text-amber-800'}`}>
                            {shiftInfo.directionAr}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-text-primary mt-1.5 font-arabic group-hover:text-primary-container transition-colors">
                          خط {shiftInfo.routeNameAr}
                        </h4>
                        <p className="text-[11px] text-text-secondary font-medium">{shiftInfo.shiftTimeTitleAr}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-text-primary block">{shiftInfo.departureDisplay}</span>
                        <span className="text-[10px] text-text-secondary uppercase">{shiftInfo.timeBadgeAr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Driver & Supervisor Contact Card */}
                  <div className="bg-surface-container-low rounded-lg p-2.5 border border-border-whisper space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary text-[11px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-primary-container">airline_seat_recline_normal</span>
                        Driver:
                      </span>
                      {trip.driver ? (
                        <a
                          href={`tel:${trip.driver.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-primary-container hover:underline flex items-center gap-1 font-arabic"
                          title="Call driver"
                        >
                          <span>{trip.driver.nameAr}</span>
                          <span className="text-[10px] font-mono">({trip.driver.phone})</span>
                        </a>
                      ) : (
                        <span className="text-text-secondary italic">Not assigned</span>
                      )}
                    </div>

                    {trip.supervisors && trip.supervisors.length > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-border-whisper/50">
                        <span className="text-text-secondary text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-amber-600">badge</span>
                          Supervisor:
                        </span>
                        <a
                          href={`tel:${trip.supervisors[0].phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-amber-700 hover:underline flex items-center gap-1 font-arabic truncate max-w-[170px]"
                          title="Call line supervisor"
                        >
                          <span>{trip.supervisors[0].nameAr}</span>
                          <span className="text-[10px] font-mono">({trip.supervisors[0].phone})</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Seat occupancy bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-text-secondary font-medium">Occupancy</span>
                      <span className="font-mono font-bold text-text-primary">{booked} / {total} seats ({percent}%)</span>
                    </div>
                    <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${percent > 85 ? 'bg-destructive-asu' : percent > 50 ? 'bg-amber-500' : 'bg-primary-container'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Interactive Seat Map Action Button */}
                  <div className="flex items-center justify-between text-[11px] text-primary-container font-bold bg-primary-container/10 px-3 py-1.5 rounded-lg group-hover:bg-primary-container/20 transition-all border border-primary-container/20">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">directions_bus</span>
                      <span>عرض خريطة المقاعد والركاب</span>
                    </span>
                    <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">visibility</span>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-2 border-t border-border-whisper flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trip.status === 'scheduled' ? 'bg-emerald-50 text-emerald-800' : trip.status === 'cancelled' ? 'bg-rose-50 text-rose-800' : 'bg-surface-variant text-text-secondary'}`}>
                      {trip.status}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrip(trip.id);
                      }}
                      className="p-1.5 rounded-lg text-text-secondary hover:text-destructive-asu hover:bg-destructive-asu/10 transition-colors"
                      title="Delete / Cancel shift"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- CREATE SHIFT MODAL --- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container border border-border-whisper rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border-whisper bg-surface-container-low flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-text-primary">Create New Shift / إضافة رحلة</h3>
                <p className="text-xs text-text-secondary">Configure bus route, timing, and assign personnel.</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-surface-container text-text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTrip} className="p-5 space-y-4 text-xs">
              {/* Trip Type Selector (Both Ways / To Campus / From Campus) */}
              <div>
                <label className="font-bold text-text-primary block mb-1">
                  نوع الرحلة والشفتات / Trip Type & Runs
                </label>
                <div className="grid grid-cols-3 rounded-xl border border-border-whisper overflow-hidden bg-surface-container-low p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTripType('both_ways');
                      setNewDirection('to_campus');
                      setNewTimeSlot('morning_1');
                      setNewDepartureTime('07:00 AM');
                      setNewReturnTimeSlot('return_2');
                      setNewReturnDepartureTime('02:30 PM');
                    }}
                    className={`py-2 px-1 text-center text-xs font-bold transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                      newTripType === 'both_ways'
                        ? 'bg-primary-container text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">sync_alt</span>
                    <span>ذهاب وعودة (Both Ways)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTripType('to_campus');
                      setNewDirection('to_campus');
                      setNewTimeSlot('morning_1');
                      setNewDepartureTime('07:00 AM');
                    }}
                    className={`py-2 px-1 text-center text-xs font-bold transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                      newTripType === 'to_campus'
                        ? 'bg-primary-container text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">trending_flat</span>
                    <span>ذهاب فقط (To Campus)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewTripType('from_campus');
                      setNewDirection('from_campus');
                      setNewTimeSlot('return_2');
                      setNewDepartureTime('02:30 PM');
                    }}
                    className={`py-2 px-1 text-center text-xs font-bold transition rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                      newTripType === 'from_campus'
                        ? 'bg-primary-container text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">keyboard_backspace</span>
                    <span>عودة فقط (From Campus)</span>
                  </button>
                </div>
              </div>

              {/* Region Category Selector */}
              <div>
                <label className="font-bold text-text-primary block mb-1">المنطقة / Region Category</label>
                <div className="flex rounded-lg border border-border-whisper overflow-hidden bg-surface-container">
                  {ROUTE_CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setModalCategory(cat.key);
                        const first = PREDEFINED_ROUTES.find(r => r.category === cat.key);
                        if (first) setNewRouteId(first.id);
                      }}
                      className={`flex-1 py-1.5 text-center text-xs font-bold transition flex items-center justify-center gap-1 ${
                        modalCategory === cat.key ? 'bg-primary-container text-white' : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                      <span>{cat.labelAr} ({cat.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-primary block mb-1">
                    Route / الخط ({modalCategory === 'cairo' ? 'القاهرة' : modalCategory === 'suez' ? 'السويس' : 'الشروق وبدر'})
                  </label>
                  <select
                    value={newRouteId}
                    onChange={(e) => setNewRouteId(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-medium focus:ring-1 focus:ring-primary-container"
                  >
                    {modalRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.nameAr} ({r.nameEn})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-text-primary block mb-1">Date / التاريخ</label>
                  <input
                    type="date"
                    value={newTripDate}
                    onChange={(e) => setNewTripDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>

              {/* Both Ways Dual Shift Configuration */}
              {newTripType === 'both_ways' ? (
                <div className="space-y-3 bg-primary-container/5 border border-primary-container/20 rounded-xl p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-primary-container flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">swap_horiz</span>
                      جدولة شفتي الذهاب والعودة معاً (Dual Shift Scheduling)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                      2 حافلات متزامنة
                    </span>
                  </div>

                  {/* Arrival Leg (To Campus) */}
                  <div className="p-2.5 rounded-lg bg-surface-container border border-border-whisper space-y-2">
                    <span className="font-bold text-text-primary text-[11px] flex items-center gap-1 text-emerald-500">
                      <span className="material-symbols-outlined text-sm">login</span>
                      1. شفت الذهاب للجامعة / Morning Arrival Leg
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-text-secondary block mb-1">الشفت / Arrival Shift</label>
                        <select
                          value={newTimeSlot}
                          onChange={(e) => {
                            const s = e.target.value as TimeSlot;
                            setNewTimeSlot(s);
                            if (s === 'morning_1') setNewDepartureTime('07:00 AM');
                            if (s === 'morning_2') setNewDepartureTime('09:30 AM');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary text-xs font-medium focus:ring-1 focus:ring-primary-container"
                        >
                          <option value="morning_1">Morning 1 (09:00 AM Arrival)</option>
                          <option value="morning_2">Morning 2 (11:30 AM Arrival)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-text-secondary block mb-1">وقت التحرك / Departure</label>
                        <input
                          type="text"
                          value={newDepartureTime}
                          onChange={(e) => setNewDepartureTime(e.target.value)}
                          placeholder="07:00 AM"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono text-xs focus:ring-1 focus:ring-primary-container"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Return Leg (From Campus) */}
                  <div className="p-2.5 rounded-lg bg-surface-container border border-border-whisper space-y-2">
                    <span className="font-bold text-text-primary text-[11px] flex items-center gap-1 text-blue-400">
                      <span className="material-symbols-outlined text-sm">logout</span>
                      2. شفت العودة للمنزل / Afternoon Return Leg
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-text-secondary block mb-1">شفت العودة / Return Shift</label>
                        <select
                          value={newReturnTimeSlot}
                          onChange={(e) => {
                            const s = e.target.value as TimeSlot;
                            setNewReturnTimeSlot(s);
                            if (s === 'return_1') setNewReturnDepartureTime('12:30 PM');
                            if (s === 'return_2') setNewReturnDepartureTime('02:30 PM');
                            if (s === 'return_3') setNewReturnDepartureTime('05:30 PM');
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary text-xs font-medium focus:ring-1 focus:ring-primary-container"
                        >
                          <option value="return_1">Return 1 (12:30 PM)</option>
                          <option value="return_2">Return 2 (02:30 PM)</option>
                          <option value="return_3">Return 3 (05:30 PM)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-text-secondary block mb-1">وقت التحرك / Departure</label>
                        <input
                          type="text"
                          value={newReturnDepartureTime}
                          onChange={(e) => setNewReturnDepartureTime(e.target.value)}
                          placeholder="02:30 PM"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono text-xs focus:ring-1 focus:ring-primary-container"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-text-primary block mb-1">Direction / الاتجاه</label>
                      <select
                        value={newDirection}
                        onChange={(e) => {
                          const dir = e.target.value as Direction;
                          setNewDirection(dir);
                          setNewTripType(dir);
                          if (dir === 'to_campus') {
                            setNewTimeSlot('morning_1');
                            setNewDepartureTime('07:00 AM');
                          } else {
                            setNewTimeSlot('return_1');
                            setNewDepartureTime('12:30 PM');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-medium focus:ring-1 focus:ring-primary-container"
                      >
                        <option value="to_campus">To Campus (ذهاب للجامعة)</option>
                        <option value="from_campus">From Campus (عودة للمنزل)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-text-primary block mb-1">Shift / الشفت</label>
                      <select
                        value={newTimeSlot}
                        onChange={(e) => {
                          const slot = e.target.value as TimeSlot;
                          setNewTimeSlot(slot);
                          if (slot === 'morning_1') setNewDepartureTime('07:00 AM');
                          else if (slot === 'morning_2') setNewDepartureTime('09:30 AM');
                          else if (slot === 'return_1') setNewDepartureTime('12:30 PM');
                          else if (slot === 'return_2') setNewDepartureTime('02:30 PM');
                          else if (slot === 'return_3') setNewDepartureTime('05:30 PM');
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-medium focus:ring-1 focus:ring-primary-container"
                      >
                        {newDirection === 'to_campus' ? (
                          <>
                            <option value="morning_1">Morning 1 (09:00 AM Arrival)</option>
                            <option value="morning_2">Morning 2 (11:30 AM Arrival)</option>
                          </>
                        ) : (
                          <>
                            <option value="return_1">Return 1 (12:30 PM)</option>
                            <option value="return_2">Return 2 (02:30 PM)</option>
                            <option value="return_3">Return 3 (05:30 PM)</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-text-primary block mb-1">Departure Time / وقت التحرك</label>
                    <input
                      type="text"
                      value={newDepartureTime}
                      onChange={(e) => setNewDepartureTime(e.target.value)}
                      placeholder="e.g. 07:00 AM"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                    />
                  </div>
                </div>
              )}

              {/* Seats & Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-text-primary block mb-1">Seats / عدد المقاعد</label>
                  <input
                    type="number"
                    value={newTotalSeats}
                    onChange={(e) => setNewTotalSeats(parseInt(e.target.value) || 50)}
                    min={1}
                    max={100}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                  />
                </div>

                <div>
                  <label className="font-bold text-text-primary block mb-1">Price (EGP) / سعر المقعد</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(parseFloat(e.target.value) || 160)}
                    min={0}
                    step={10}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                  />
                </div>
              </div>

              {/* Assign Driver */}
              <div>
                <label className="font-bold text-text-primary block mb-1">Assign Driver / تعيين السائق</label>
                <select
                  value={newDriverPhone}
                  onChange={(e) => setNewDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-arabic font-medium focus:ring-1 focus:ring-primary-container"
                >
                  <option value="">No Driver Assigned</option>
                  {personnel.drivers.map(d => (
                    <option key={d.phone} value={d.phone}>
                      {d.nameAr} ({d.nameEn}) — {d.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign Line Supervisor */}
              <div>
                <label className="font-bold text-text-primary block mb-1">Assign Line Supervisor / مرافق الخط</label>
                <select
                  value={newSupervisorPhone}
                  onChange={(e) => setNewSupervisorPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-arabic font-medium focus:ring-1 focus:ring-primary-container"
                >
                  <option value="">No Supervisor Assigned</option>
                  {personnel.supervisors.map(s => (
                    <option key={s.phone} value={s.phone}>
                      {s.nameAr} ({s.nameEn}) — {s.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-surface-container-low rounded-xl border border-border-whisper flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-container font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary-container text-white font-bold hover:opacity-90 shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                >
                  <span className="material-symbols-outlined text-base">
                    {newTripType === 'both_ways' ? 'sync_alt' : 'add_circle'}
                  </span>
                  <span>
                    {newTripType === 'both_ways'
                      ? 'جدولة الذهاب والعودة معاً (Schedule Both Ways)'
                      : 'Confirm & Schedule Shift'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- REUSE / CLONE OLD SCHEDULE MODAL --- */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container border border-border-whisper rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border-whisper bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-xl text-primary-container">content_copy</span>
                <div>
                  <h3 className="font-bold text-base text-text-primary">Reuse Old Schedule</h3>
                  <p className="text-[11px] text-text-secondary">Duplicate all shifts and personnel to a new date.</p>
                </div>
              </div>
              <button onClick={() => setShowCloneModal(false)} className="p-1 rounded-lg hover:bg-surface-container text-text-secondary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCloneSchedule} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-primary-container/10 border border-primary-container/20 rounded-xl space-y-1 text-text-primary">
                <p className="font-bold">⚡ 1-Click Operational Replication</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  This will copy all 5 shifts across all routes (Port Tawfik, Nabi Allah, El Salam) along with assigned drivers and line supervisors from the source date.
                </p>
              </div>

              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Source Date (Copy From) / تاريخ الجدول السابق
                </label>
                <input
                  type="date"
                  value={cloneSourceDate}
                  onChange={(e) => setCloneSourceDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div>
                <label className="font-bold text-text-primary block mb-1">
                  Target Date (Deploy To) / التاريخ الجديد
                </label>
                <input
                  type="date"
                  value={cloneTargetDate}
                  onChange={(e) => setCloneTargetDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low border border-border-whisper text-text-primary font-mono focus:ring-1 focus:ring-primary-container"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-whisper">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 rounded-lg text-text-secondary hover:bg-surface-container font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary-container text-on-primary-container font-bold hover:opacity-90 shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">file_copy</span>
                  <span>Duplicate & Deploy Roster</span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
                <p className="text-xs text-text-secondary">Clean testing action: reset roster</p>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              This action clears the operational shifts schedule, removes test bookings, and wipes Redis seat lock keys so you can test one isolated shift at a time.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-text-primary block">Select Purge Scope:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPurgeTarget('all')}
                  className={`p-3 rounded-xl border text-left transition-all ${purgeTarget === 'all' ? 'bg-rose-500/20 border-rose-500 text-text-primary font-bold' : 'bg-surface border-border-whisper text-text-secondary'}`}
                >
                  <div className="text-xs font-bold">تصفير الكل / Wipe All Dates</div>
                  <div className="text-[10px] text-text-tertiary">حذف كافة الشفتات لجميع التواريخ (All dates)</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPurgeTarget('date')}
                  className={`p-3 rounded-xl border text-left transition-all ${purgeTarget === 'date' ? 'bg-rose-500/20 border-rose-500 text-text-primary font-bold' : 'bg-surface border-border-whisper text-text-secondary'}`}
                >
                  <div className="text-xs font-bold">تاريخ اليوم فقط / Selected Date</div>
                  <div className="text-[10px] text-text-tertiary">فقط شفتات يوم {selectedDate}</div>
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

      {/* --- INTERACTIVE BUS SEAT MAP & PASSENGER INSPECTOR MODAL --- */}
      {inspectingTripId !== null && (
        <BusSeatInspectorModal
          tripId={inspectingTripId}
          onClose={() => setInspectingTripId(null)}
        />
      )}
    </div>
  );
}
