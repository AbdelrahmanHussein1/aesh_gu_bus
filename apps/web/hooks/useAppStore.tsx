'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { Route, Trip, Seat, Booking, AuditLog, GroupedBooking, ManifestEntry, BookingType, Direction, TimeSlot, PaymentMethod, Role, User } from '@/lib/types';
import type { SupervisorCancellationAlertData } from '@/components/booking/SupervisorCancellationModal';
import { getMockRoutes, generateMockManifest, addMockAuditLog, getAuditLogs } from '@/lib/offline';
import { getApiBaseUrl, getApiUrls } from '@/lib/api';
import { useRiderSeats, type SeatLoadStatus } from './useRiderSeats';
import { useRiderBooking } from './useRiderBooking';
import { useRiderTrips } from './useRiderTrips';
import { useSupervisorScanner } from './useSupervisorScanner';
import { playSuccessChime } from './boardingFeedback';
import { getTodayDateString, getTomorrowDateString } from '@/lib/dateUtils';

export { getTodayDateString, getTomorrowDateString } from '@/lib/dateUtils';

interface AppState {
  isAuthLoading: boolean;
  token: string;
  user: User | null;
  role: Role;
  isOffline: boolean;
  routes: Route[];
  selectedRouteId: number;
  selectedDirection: Direction;
  selectedDate: string;
  trips: Trip[];
  isTripsLoading: boolean;
  tripsError: string;
  lastTripsRefreshTime: Date | null;
  activeTrip: Trip | null;
  activeArrivalTrip: Trip | null;
  activeReturnTrip: Trip | null;
  bookingType: BookingType;
  timeSlot: TimeSlot;
  returnTimeSlot: TimeSlot;
  seats: Seat[];
  seatLoadStatus: SeatLoadStatus;
  seatError: string;
  selectedSeat: number | null;
  heldExpiresAt: number | null;
  lockingSeatNumber: number | null;
  myBookings: Booking[];
  expandedTicketId: string | null;
  justBoardedBookingIds: Set<string>;
  auditLogs: AuditLog[];
  supervisorManifest: ManifestEntry[];
  showCheckout: boolean;
  paymentMethod: PaymentMethod;
  checkoutError: string;
  isPaying: boolean;
  cardNumber: string;
  receiptRef: string;
  cancelLockHours: number;
  swapBookingTarget: ManifestEntry | null;
  swapTripId: string;
  swapSeatNumber: string;
  isSwapping: boolean;
  scanInputToken: string;
  scanResult: any;
  isScanning: boolean;
  isCameraActive: boolean;
  cameraError: string | null;
  cameraStream: MediaStream | null;
  showCameraPermissionGuide: boolean;
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  supervisorCancelAlert: SupervisorCancellationAlertData | null;
}

interface AppActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (r: Role) => void;
  setSelectedRouteId: (id: number) => void;
  setSelectedDirection: (d: Direction) => void;
  setSelectedDate: (d: string) => void;
  setBookingType: (t: BookingType) => void;
  setTimeSlot: (s: TimeSlot) => void;
  setReturnTimeSlot: (s: TimeSlot) => void;
  setActiveTrip: (t: Trip | null) => void;
  setActiveArrivalTrip: (t: Trip | null) => void;
  setActiveReturnTrip: (t: Trip | null) => void;
  handleSeatClick: (seatNumber: number, currentStatus: string) => void;
  setShowCheckout: (v: boolean) => void;
  setPaymentMethod: (m: PaymentMethod) => void;
  setCardNumber: (v: string) => void;
  setReceiptRef: (v: string) => void;
  handleCheckoutSubmit: (e: React.FormEvent) => Promise<void>;
  handleCancelBooking: (bookingId: string) => void;
  setExpandedTicketId: (id: string | null) => void;
  setSwapBookingTarget: (t: ManifestEntry | null) => void;
  setSwapTripId: (v: string) => void;
  setSwapSeatNumber: (v: string) => void;
  handleSupervisorSwapSubmit: (e: React.FormEvent) => void;
  handleSupervisorCancel: (bookingId: string) => void;
  dismissSupervisorCancelAlert: () => void;
  setScanInputToken: (v: string) => void;
  setScanResult: (v: any) => void;
  setIsCameraActive: (v: boolean) => void;
  setCameraError: (v: string | null) => void;
  setShowCameraPermissionGuide: (v: boolean) => void;
  handleSimulatedScan: () => void;
  verifyScanToken: (value: string) => Promise<void>;
  retrySeatMap: () => Promise<void>;
  startCameraScan: () => void;
  stopCameraScan: () => void;
  setCancelLockHours: (v: number) => void;
  setSwapBookingTargetOpen: (t: ManifestEntry | null) => void;
  setIsScanning: (v: boolean) => void;
  setIsSwapping: (v: boolean) => void;
  getGroupedBookings: () => GroupedBooking[];
  toggleSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setIsOffline: (v: boolean) => void;
  refreshTrips: () => Promise<void>;
  handleManualBoardPassenger: (bookingId: string, tripId?: number) => Promise<void>;
  handleManualBoardAll: (tripId: number) => Promise<void>;
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

const OFFLINE_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('rider');
  const [isOffline, setIsOffline] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(29);
  const [selectedDirection, setSelectedDirection] = useState<Direction>('to_campus');
  const [selectedDate, setSelectedDate] = useState<string>(getTomorrowDateString());
  const { trips, isTripsLoading, tripsError, lastTripsRefreshTime, refreshTrips, tripContextKey } = useRiderTrips({ userId: user?.id || '', token, selectedRouteId, selectedDate, isOffline, routes });
  const [activeTripSelection, setActiveTrip] = useState<Trip | null>(null);
  const [activeArrivalTripSelection, setActiveArrivalTrip] = useState<Trip | null>(null);
  const [activeReturnTripSelection, setActiveReturnTrip] = useState<Trip | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('to_campus');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning_1');
  const [returnTimeSlot, setReturnTimeSlot] = useState<TimeSlot>('return_1');
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [justBoardedBookingIds, setJustBoardedBookingIds] = useState<Set<string>>(new Set());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [supervisorManifest, setSupervisorManifest] = useState<ManifestEntry[]>([]);
  const [cancelLockHours, setCancelLockHours] = useState(3);
  const [swapBookingTarget, setSwapBookingTarget] = useState<ManifestEntry | null>(null);
  const [swapTripId, setSwapTripId] = useState('');
  const [swapSeatNumber, setSwapSeatNumber] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [supervisorCancelAlert, setSupervisorCancelAlert] = useState<SupervisorCancellationAlertData | null>(null);

  // Authenticate helper with backend
  const authenticateWithBackend = useCallback(async (email: string, pass?: string) => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass || '', deviceInfo: 'Bus Aesh Web Portal' }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        setRole(data.user.role);
        sessionStorage.setItem('aesh_web_token', data.token);
        sessionStorage.setItem('aesh_web_user', JSON.stringify(data.user));
        return data;
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMessage = typeof errData.error === 'string' ? errData.error : (errData.message || 'بيانات الدخول غير صحيحة');
        throw new Error(errMessage);
      }
    } catch (e: any) {
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('NetworkError') && !e.message.includes('abort')) {
        throw e;
      }
      console.warn('[useAppStore] Backend auth failed or unreachable:', e);
    }
    return null;
  }, []);

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem('aesh_web_token');
      const savedUser = sessionStorage.getItem('aesh_web_user');
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed.id === 'user-default-id') {
            sessionStorage.removeItem('aesh_web_token');
            sessionStorage.removeItem('aesh_web_user');
            setToken('');
            setUser(null);
            setRole('rider');
          } else {
            setToken(savedToken);
            setUser(parsed);
            setRole(parsed.role || 'rider');
          }
        } catch {
          setToken('');
          setUser(null);
          setRole('rider');
        }
      } else {
        setToken('');
        setUser(null);
        setRole('rider');
      }
    } finally {
      setIsAuthLoading(false);
    }

    const init = async () => {
      const apiUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setIsOffline(false);
          const savedUser = sessionStorage.getItem('aesh_web_user');
          if (savedUser) {
            const routesRes = await fetch(`${apiUrl}/api/routes`);
            if (routesRes.ok) {
              const data = await routesRes.json();
              if (data && data.length > 0) {
                setRoutes(data);
                setSelectedRouteId(data[0].id);
              }
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Backend unavailable, using offline mode:', err);
      }
      if (OFFLINE_MODE_ENABLED) {
        setIsOffline(true);
      } else {
        setIsOffline(false);
      }
      if (OFFLINE_MODE_ENABLED && sessionStorage.getItem('aesh_web_user')) {
        loadOfflineData();
      }
    };
    init();
  }, []);

  // Fetch routes upon login if not yet loaded
  useEffect(() => {
    if (!user || isOffline) return;
    if (routes.length === 0) {
      const fetchRoutes = async () => {
        const apiUrl = getApiBaseUrl();
        try {
          const routesRes = await fetch(`${apiUrl}/api/routes`);
          if (routesRes.ok) {
            const data = await routesRes.json();
            if (data && data.length > 0) {
              setRoutes(data);
              setSelectedRouteId(data[0].id);
            }
          }
        } catch {}
      };
      fetchRoutes();
    }
  }, [user, routes.length, isOffline]);


  const loadOfflineData = () => {
    const r = getMockRoutes();
    setRoutes(r);
    if (!localStorage.getItem('aesh_bookings')) localStorage.setItem('aesh_bookings', JSON.stringify([]));
    if (!localStorage.getItem('aesh_audit_logs')) {
      const initial = [{ id: 1, action: 'SYSTEM_BOOT', details: 'Offline simulation mode started', time: new Date() }];
      localStorage.setItem('aesh_audit_logs', JSON.stringify(initial));
      setAuditLogs(initial);
    } else {
      setAuditLogs(getAuditLogs());
    }
  };

  // Mask stale selections immediately when route/date/session changes; same-context refreshes preserve choices.
  const activeTrip = trips.find(trip => trip.id === activeTripSelection?.id) || null;
  const activeArrivalTrip = trips.find(trip => trip.id === activeArrivalTripSelection?.id) || null;
  const activeReturnTrip = trips.find(trip => trip.id === activeReturnTripSelection?.id) || null;
  const selectionContext = `${tripContextKey}:${bookingType}:${timeSlot}:${returnTimeSlot}`;
  const lastSelectionContext = useRef('');
  useEffect(() => {
    const preserveSelection = lastSelectionContext.current === selectionContext;
    lastSelectionContext.current = selectionContext;
    if (trips.length === 0) {
      setActiveTrip(null); setActiveArrivalTrip(null); setActiveReturnTrip(null);
      return;
    }
    const select = (list: Trip[], previous: Trip | null, slot: TimeSlot) =>
      (preserveSelection ? list.find(trip => trip.id === previous?.id) : undefined)
      || list.find(trip => trip.timeSlot === slot) || list[0] || null;
    if (bookingType === 'round_trip') {
      const arrivals = trips.filter(trip => trip.direction === 'to_campus');
      const returns = trips.filter(trip => trip.direction === 'from_campus');
      setActiveArrivalTrip(previous => select(arrivals, previous, timeSlot));
      setActiveReturnTrip(previous => select(returns, previous, returnTimeSlot));
      setActiveTrip(null);
    } else {
      const direction = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
      const slot = bookingType === 'to_campus' ? timeSlot : returnTimeSlot;
      setActiveTrip(previous => select(trips.filter(trip => trip.direction === direction), previous, slot));
      setActiveArrivalTrip(null); setActiveReturnTrip(null);
    }
  }, [trips, selectionContext, bookingType, timeSlot, returnTimeSlot]);

  const { seats, selectedSeat, heldExpiresAt, lockingSeatNumber, setSeats, setSelectedSeat, loadSeatMap, handleSeatClick, handleSeatMessage, seatLoadStatus, seatError } = useRiderSeats({ userId: user?.id || '', token, isOffline, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip });

  // Real-Time Boarding Animation & Sound trigger
  const handleRiderBoardedNotification = useCallback((msg: any) => {
    const bId = msg.bookingId;
    setMyBookings(prev => prev.map(b => {
      if (b.id === bId || (b.seatNumber === msg.seatNumber && (!msg.legType || b.legType === msg.legType))) {
        return {
          ...b,
          qrUsedAt: msg.scannedAt || new Date().toISOString(),
          isBoarded: true,
          boardedAt: new Date(msg.scannedAt || Date.now()).toLocaleTimeString(),
        };
      }
      return b;
    }));

    if (bId) {
      setJustBoardedBookingIds(prev => new Set(prev).add(bId));
      setExpandedTicketId(bId);
    }

    playSuccessChime();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: msg }));
      window.dispatchEvent(new CustomEvent('schedule_updated', { detail: msg }));
      import('canvas-confetti').then(mod => {
        mod.default({
          particleCount: 140,
          spread: 85,
          origin: { y: 0.55 },
          colors: ['#22c55e', '#16a34a', '#4ade80', '#38bdf8', '#fbbf24'],
        });
      }).catch(() => {});
    }
  }, []);

  // Real-Time Supervisor Cancellation Alert & Refund Handler (Rider Only)
  const handleSupervisorCancelledNotification = useCallback((msg: any) => {
    // 1. A supervisor or admin should NEVER receive or display this rider refund modal!
    if (role === 'supervisor' || role === 'admin') {
      return;
    }

    // 2. Strictly verify that this cancellation belongs to the currently logged in student
    if (user && msg.userId && user.id !== msg.userId && user.email !== msg.riderEmail) {
      return;
    }

    // Play subtle alert tone if possible
    try {
      if (typeof window !== 'undefined' && ((window as any).AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}

    setSupervisorCancelAlert({
      visible: true,
      bookingId: msg.bookingId,
      boardingCode: msg.boardingCode,
      seatNumber: msg.seatNumber,
      routeNameAr: msg.routeNameAr,
      refundAmount: msg.refundAmount || 160,
      messageAr: msg.messageAr,
      messageEn: msg.messageEn,
      timestamp: msg.timestamp || new Date().toISOString(),
    });

    setMyBookings(prev => prev.map(b => b.id === msg.bookingId ? {
      ...b,
      status: 'cancelled',
      paymentStatus: 'refunded',
      cancelReason: msg.messageAr || msg.reason || 'Cancelled by supervisor with full refund',
    } : b));

    void loadSeatMap();
  }, [role, user, loadSeatMap]);

  const dismissSupervisorCancelAlert = useCallback(() => {
    if (supervisorCancelAlert?.bookingId) {
      try {
        const key = 'aesh_dismissed_cancellations';
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        if (!current.includes(supervisorCancelAlert.bookingId)) {
          current.push(supervisorCancelAlert.bookingId);
          localStorage.setItem(key, JSON.stringify(current));
        }
      } catch {}
    }
    setSupervisorCancelAlert(null);
  }, [supervisorCancelAlert]);

  // Subscribe to both legs so the shared round-trip seat always reflects both maps.
  useEffect(() => {
    if (!user || isOffline || !token || typeof window === 'undefined') return;
    const ids = bookingType === 'round_trip'
      ? activeArrivalTrip && activeReturnTrip ? [activeArrivalTrip.id, activeReturnTrip.id] : []
      : activeTrip ? [activeTrip.id] : [];
    const { wsUrl } = getApiUrls();
    let active = true;
    const sockets = ids.map(tid => {
      const socket = new WebSocket(`${wsUrl}/ws/trips/${tid}/seats`, token);
      socket.onmessage = event => {
        if (!active) return;
        try {
          const msg = JSON.parse(event.data);
          handleSeatMessage(tid, msg);
          if (msg.type === 'rider_boarded') handleRiderBoardedNotification(msg);
          if (msg.type === 'SUPERVISOR_CANCELLED_TICKET') handleSupervisorCancelledNotification(msg);
        } catch {}
      };
      return socket;
    });
    return () => { active = false; sockets.forEach(socket => socket.close()); };
  }, [user?.id, bookingType, activeTrip?.id, activeArrivalTrip?.id, activeReturnTrip?.id, isOffline, token, handleSeatMessage, handleRiderBoardedNotification, handleSupervisorCancelledNotification]);

  // Real-Time User Session Displacement & Boarding Listener via WebSocket
  useEffect(() => {
    if (isOffline || !token || typeof window === 'undefined') return;

    const { wsUrl } = getApiUrls();
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/user/session`, token);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SESSION_TERMINATED') {
            window.dispatchEvent(new CustomEvent('session_displaced', { detail: msg }));
          } else if (msg.type === 'rider_boarded') {
            handleRiderBoardedNotification(msg);
          } else if (msg.type === 'SUPERVISOR_CANCELLED_TICKET') {
            handleSupervisorCancelledNotification(msg);
          } else if (msg.type === 'FLEET_PURGED') {
            if (msg.allDates || !msg.date || msg.date === 'all' || msg.date === selectedDate) {
              setActiveTrip(null);
              setActiveArrivalTrip(null);
              setActiveReturnTrip(null);
            }
            window.dispatchEvent(new CustomEvent('fleet_purged', { detail: msg }));
            window.dispatchEvent(new CustomEvent('schedule_updated', { detail: msg }));
          } else if (msg.type === 'NEW_TRIP_ANNOUNCED' || msg.type === 'TRIP_CANCELLED' || msg.type === 'SCHEDULE_CLONED' || msg.type === 'SCHEDULE_UPDATED') {
            window.dispatchEvent(new CustomEvent('schedule_updated', { detail: msg }));
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (socket) socket.close();
    };
  }, [token, isOffline, handleRiderBoardedNotification, handleSupervisorCancelledNotification]);

  // Live Supervisor Manifest (Polls DB every 3 seconds)
  const loadSupervisorManifest = useCallback(async () => {
    const tid = activeTrip?.id || activeArrivalTrip?.id;
    if (!tid) return;

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/trips/${tid}/manifest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSupervisorManifest(data);
          return;
        }
      } catch (err) {
        console.warn('Live manifest fetch failed:', err);
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) {
      setSupervisorManifest([]);
      return;
    }

    // Fallback: check localStorage bookings
    const allLocal: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const tripBookings = allLocal.filter(b => b.tripId === tid && b.status === 'confirmed');
    if (tripBookings.length > 0) {
      setSupervisorManifest(tripBookings.map(b => ({
        bookingId: b.id,
        seatNumber: b.seatNumber,
        status: b.status,
        bookingType: b.bookingType,
        legType: b.legType,
        paymentStatus: b.paymentStatus,
        receiptRef: b.receiptRef,
        riderName: b.riderName,
        riderEmail: b.riderEmail,
        isBoarded: b.isBoarded,
        boardedAt: b.boardedAt,
      })));
    } else {
      setSupervisorManifest(generateMockManifest(tid));
    }
  }, [activeTrip?.id, activeArrivalTrip?.id, isOffline, token]);

  useEffect(() => {
    if (user && role === 'supervisor') {
      loadSupervisorManifest();
      const interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadSupervisorManifest();
        }
      }, 45000);

      const handleVisibility = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadSupervisorManifest();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [user?.id, role, activeTrip?.id, activeArrivalTrip?.id, isOffline, token]);

  // Fetch real user bookings from database
  const getUserBookings = useCallback(async () => {
    if (!user) return;
    const apiUrl = getApiBaseUrl();

    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setMyBookings(data);

            // Check if any recent booking was cancelled by supervisor and not yet dismissed (Rider only)
            if (role === 'rider') {
              try {
                const dismissedKey = 'aesh_dismissed_cancellations';
                const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
                const recentCancel = data.find((b: any) => 
                  b.status === 'cancelled' && 
                  (b.paymentStatus === 'refunded' || (b.cancelReason && b.cancelReason.toLowerCase().includes('supervisor'))) &&
                  !dismissed.includes(b.id)
                );
                if (recentCancel) {
                  setSupervisorCancelAlert({
                    visible: true,
                    bookingId: recentCancel.id,
                    boardingCode: recentCancel.boardingCode || ('GU-' + recentCancel.id.substring(0, 4).toUpperCase()),
                    seatNumber: recentCancel.seatNumber,
                    routeNameAr: recentCancel.routeAr,
                    refundAmount: 160,
                    messageAr: recentCancel.cancelReason || 'قام مشرف الرحلة بإلغاء حجزك وتم استرداد المبلغ بالكامل (160 ج.م) لحسابك.',
                    messageEn: 'Your booking was cancelled by the line supervisor. A full refund has been issued.',
                    timestamp: recentCancel.cancelledAt || new Date().toISOString(),
                  });
                }
              } catch {}
            }

            return;
          }
        }
      } catch {}
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) {
      setMyBookings([]);
      return;
    }

    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const mine = all.filter(b => b.riderEmail === user.email);
    setMyBookings(mine);
  }, [user, isOffline, token, role]);

  useEffect(() => { 
    getUserBookings(); 
  }, [getUserBookings]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const data = await authenticateWithBackend(email, password);
      if (!data) {
        throw new Error('Authentication service is unavailable');
      }
    } finally {
      setIsAuthLoading(false);
    }
  }, [authenticateWithBackend]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('aesh_web_token');
      sessionStorage.removeItem('aesh_web_user');
      window.location.href = '/';
    }
    setToken('');
    setUser(null);
    setRole('rider');
    setSelectedSeat(null);
    setMyBookings([]);
    setIsAuthLoading(false);
  }, []);

  const switchRole = useCallback(async (newRole: Role) => {
    const email = newRole === 'rider' ? 'student@gu.edu.eg' : newRole === 'supervisor' ? 'supervisor@gu.edu.eg' : 'admin@gu.edu.eg';
    const data = await authenticateWithBackend(email);
    if (data) {
      setRole(newRole);
      return;
    }
    throw new Error('Authentication service is unavailable');
  }, [authenticateWithBackend]);

  const handleSupervisorSwapSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapBookingTarget || !swapTripId || !swapSeatNumber) return;
    setIsSwapping(true);

    const apiUrl = getApiBaseUrl();
    const targetTripNum = parseInt(swapTripId);
    const targetSeatNum = parseInt(swapSeatNumber);

    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/bookings/swap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            bookingId: swapBookingTarget.bookingId,
            newTripId: targetTripNum,
            newSeatNumber: targetSeatNum,
            reason: 'Supervisor operational reassignment',
          }),
        });
        if (res.ok) {
          setIsSwapping(false);
          setSwapBookingTarget(null);
          loadSupervisorManifest();
          loadSeatMap();
          alert('Passenger reassigned successfully.');
          return;
        }
      } catch (err) {
        console.warn('Backend swap failed, applying local swap:', err);
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) { setIsSwapping(false); alert('The server could not reassign this passenger. Please retry.'); return; }
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const conflict = all.find(b => b.tripId === targetTripNum && b.seatNumber === targetSeatNum && b.status === 'confirmed');
    if (conflict) { alert('Target seat is already occupied!'); setIsSwapping(false); return; }
    const updated = all.map(b => {
      if (b.id === swapBookingTarget.bookingId) return { ...b, tripId: targetTripNum, seatNumber: targetSeatNum, status: 'swapped' as const };
      return b;
    });
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    addMockAuditLog('SUPERVISOR_SWAP', `Supervisor swapped booking ${swapBookingTarget.bookingId}`);
    setIsSwapping(false);
    setSwapBookingTarget(null);
    loadSupervisorManifest();
    loadSeatMap();
    alert('Passenger reassigned successfully.');
  }, [swapBookingTarget, swapTripId, swapSeatNumber, isOffline, token, loadSupervisorManifest, loadSeatMap]);

  const handleSupervisorCancel = useCallback(async (bookingId: string) => {
    const reason = window.prompt('أدخل سبب الإلغاء (Enter cancellation reason):');
    if (reason === null) return;

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/supervisor/cancel-booking`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId, reason }),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(`❌ ${data.messageAr || data.error || 'فشل إلغاء الحجز'}`);
          return;
        }
        await loadSupervisorManifest();
        await loadSeatMap();
        alert(`✅ ${data.messageAr || 'تم إلغاء التذكرة بنجاح وإصدار أمر استرداد كامل للمبلغ (160 ج.م).'}`);
        return;
      } catch (e: any) {
        alert(`❌ فشل الاتصال بالخادم: ${e.message}`);
        return;
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) return;
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const updated = all.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const, cancelReason: reason, paymentStatus: 'refunded' } : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    addMockAuditLog('SUPERVISOR_CANCEL', `Supervisor cancelled booking ${bookingId} with refund`);
    loadSupervisorManifest();
    loadSeatMap();
    alert('تم إلغاء التذكرة واحتساب الاسترداد.');
  }, [isOffline, token, loadSupervisorManifest, loadSeatMap]);

  const setSwapBookingTargetOpen = useCallback((t: ManifestEntry | null) => {
    setSwapBookingTarget(t);
    setSwapSeatNumber('');
    setSwapTripId('');
  }, []);

  const handleManualBoardPassenger = useCallback(async (bookingId: string, tripId?: number) => {
    if (!bookingId) return;
    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/supervisor/board-passenger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bookingId }),
        });
        if (res.ok) {
          playSuccessChime();
          setJustBoardedBookingIds(prev => new Set(prev).add(bookingId));
          setSupervisorManifest(prev => prev.map(m => m.bookingId === bookingId ? { ...m, isBoarded: true, boardedAt: new Date().toLocaleTimeString() } : m));
          setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, isBoarded: true, qrUsedAt: new Date().toISOString() } : b));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { bookingId, tripId } }));
            window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId } }));
          }
          await loadSupervisorManifest();
          await refreshTrips();
          return;
        }
      } catch (err) {
        console.warn('Backend manual boarding failed:', err);
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) { alert('The server could not complete this action. Please retry.'); return; }
    // Local / offline fallback
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const target = all.find(b => b.id === bookingId);
    if (target) {
      target.isBoarded = true;
      target.boardedAt = new Date().toLocaleTimeString();
      target.qrUsedAt = new Date().toISOString();
      localStorage.setItem('aesh_bookings', JSON.stringify(all));
      setMyBookings(all);
      setJustBoardedBookingIds(prev => new Set(prev).add(bookingId));
      playSuccessChime();
    }
    setSupervisorManifest(prev => prev.map(m => m.bookingId === bookingId ? { ...m, isBoarded: true, boardedAt: new Date().toLocaleTimeString() } : m));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { bookingId, tripId } }));
      window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId } }));
    }
    loadSupervisorManifest();
  }, [isOffline, token, loadSupervisorManifest, refreshTrips]);

  const handleManualBoardAll = useCallback(async (tripId: number) => {
    if (!tripId) return;
    const confirmBoardAll = window.confirm('هل أنت متأكد من تسجيل صعود جميع الركاب المتبقين في هذه الحافلة؟');
    if (!confirmBoardAll) return;

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/supervisor/board-all-passengers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tripId }),
        });
        if (res.ok) {
          playSuccessChime();
          if (typeof window !== 'undefined') {
            import('canvas-confetti').then(mod => {
              mod.default({
                particleCount: 140,
                spread: 85,
                origin: { y: 0.55 },
                colors: ['#22c55e', '#16a34a', '#4ade80', '#38bdf8', '#fbbf24'],
              });
            }).catch(() => {});
            window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { tripId } }));
            window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId } }));
          }
          await loadSupervisorManifest();
          await refreshTrips();
          return;
        }
      } catch (err) {
        console.warn('Backend boarding all failed:', err);
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) { alert('The server could not complete this action. Please retry.'); return; }
    // Local / offline fallback
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const updated = all.map(b => b.tripId === tripId && b.status === 'confirmed' ? { ...b, isBoarded: true, boardedAt: new Date().toLocaleTimeString(), qrUsedAt: new Date().toISOString() } : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    setMyBookings(updated);
    setSupervisorManifest(prev => prev.map(m => ({ ...m, isBoarded: true, boardedAt: new Date().toLocaleTimeString() })));
    playSuccessChime();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rider_boarded_event', { detail: { tripId } }));
      window.dispatchEvent(new CustomEvent('schedule_updated', { detail: { tripId } }));
    }
    loadSupervisorManifest();
  }, [isOffline, token, loadSupervisorManifest, refreshTrips]);

  const { showCheckout, setShowCheckout, paymentMethod, setPaymentMethod, checkoutError, isPaying, cardNumber, setCardNumber, receiptRef, setReceiptRef, handleCheckoutSubmit, handleCancelBooking, getGroupedBookings } = useRiderBooking({ selectedSeat, user, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip, isOffline, token, role, seatLoadStatus, lockingSeatNumber, myBookings, setMyBookings, setSeats, setSelectedSeat, getUserBookings, loadSeatMap, loadSupervisorManifest });
  const { scanInputToken, setScanInputToken, scanResult, setScanResult, isScanning, setIsScanning, isCameraActive, setIsCameraActive, cameraError, setCameraError, cameraStream, showCameraPermissionGuide, setShowCameraPermissionGuide, verifyScanToken, handleSimulatedScan, startCameraScan, stopCameraScan } = useSupervisorScanner({ activeTrip, isOffline, token, setMyBookings, setJustBoardedBookingIds, loadSupervisorManifest, refreshTrips });

  const value = {
    isAuthLoading, token, user, role, isOffline, routes, selectedRouteId, selectedDirection, selectedDate, trips,
    isTripsLoading, tripsError, lastTripsRefreshTime, refreshTrips,
    activeTrip, activeArrivalTrip, activeReturnTrip, bookingType, timeSlot, returnTimeSlot, seats, selectedSeat,
    seatLoadStatus, seatError, retrySeatMap: loadSeatMap, heldExpiresAt, lockingSeatNumber, myBookings, expandedTicketId, justBoardedBookingIds, auditLogs,
    supervisorManifest, showCheckout, paymentMethod, checkoutError, isPaying, cardNumber, receiptRef,
    cancelLockHours, swapBookingTarget, swapTripId, swapSeatNumber, isSwapping, scanInputToken, scanResult, sidebarCollapsed, mobileSidebarOpen,
    isScanning, isCameraActive, cameraError, cameraStream, showCameraPermissionGuide,
    login, logout, switchRole, setSelectedRouteId, setSelectedDirection, setSelectedDate,
    setBookingType, setTimeSlot, setReturnTimeSlot, setActiveTrip, setActiveArrivalTrip, setActiveReturnTrip,
    handleSeatClick, setShowCheckout, setPaymentMethod, setCardNumber, setReceiptRef,
    handleCheckoutSubmit, handleCancelBooking, setExpandedTicketId, setSwapBookingTarget, setSwapBookingTargetOpen,
    setSwapTripId, setSwapSeatNumber, handleSupervisorSwapSubmit, handleSupervisorCancel, dismissSupervisorCancelAlert, supervisorCancelAlert,
    handleManualBoardPassenger, handleManualBoardAll,
    setScanInputToken, setScanResult, setIsCameraActive, setCameraError, setShowCameraPermissionGuide,
    verifyScanToken, handleSimulatedScan, startCameraScan, stopCameraScan, setCancelLockHours,
    setIsScanning, setIsSwapping, getGroupedBookings, toggleSidebar, setMobileSidebarOpen, setIsOffline,
  };

  const AppContextProvider = AppContext.Provider as any;
  return <AppContextProvider value={value}>{children as any}</AppContextProvider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
