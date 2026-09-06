'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Route, Trip, Seat, Booking, AuditLog, GroupedBooking, ManifestEntry, BookingType, Direction, TimeSlot, PaymentMethod, Role, User } from '@/lib/types';
import { getMockRoutes, generateMockTrips, generateMockSeats, generateRoundTripSeats, generateMockManifest, generateOfflineBooking, addMockAuditLog, getAuditLogs } from '@/lib/offline';
import { getApiBaseUrl, getApiUrls } from '@/lib/api';

interface AppState {
  token: string;
  user: User | null;
  role: Role;
  isOffline: boolean;
  routes: Route[];
  selectedRouteId: number;
  selectedDirection: Direction;
  selectedDate: string;
  trips: Trip[];
  activeTrip: Trip | null;
  activeArrivalTrip: Trip | null;
  activeReturnTrip: Trip | null;
  bookingType: BookingType;
  timeSlot: TimeSlot;
  returnTimeSlot: TimeSlot;
  seats: Seat[];
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
  setScanInputToken: (v: string) => void;
  setScanResult: (v: any) => void;
  setIsCameraActive: (v: boolean) => void;
  setCameraError: (v: string | null) => void;
  setShowCameraPermissionGuide: (v: boolean) => void;
  handleSimulatedScan: () => void;
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
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

const MOCK_USERS: Record<string, User> = {
  'aes400196@gu.edu.eg': { id: 'user-default-id', email: 'aes400196@gu.edu.eg', fullName: 'Abdelrahman Ehab', role: 'rider' },
  'supervisor@gu.edu.eg': { id: 'supervisor-id', email: 'supervisor@gu.edu.eg', fullName: 'Supervisor Aesh', role: 'supervisor' },
  'admin@gu.edu.eg': { id: 'admin-id', email: 'admin@gu.edu.eg', fullName: 'System Administrator', role: 'admin' },
};

function playSuccessChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    // Harmonious multi-tone success chime (C5 -> E5 -> G5 -> C6)
    const tones = [523.25, 659.25, 783.99, 1046.5];
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  } catch {}
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('rider');
  const [isOffline, setIsOffline] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(29);
  const [selectedDirection, setSelectedDirection] = useState<Direction>('to_campus');
  const [selectedDate, setSelectedDate] = useState('2026-06-04');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeArrivalTrip, setActiveArrivalTrip] = useState<Trip | null>(null);
  const [activeReturnTrip, setActiveReturnTrip] = useState<Trip | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('to_campus');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning_1');
  const [returnTimeSlot, setReturnTimeSlot] = useState<TimeSlot>('return_1');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [heldExpiresAt, setHeldExpiresAt] = useState<number | null>(null);
  const [lockingSeatNumber, setLockingSeatNumber] = useState<number | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [justBoardedBookingIds, setJustBoardedBookingIds] = useState<Set<string>>(new Set());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [supervisorManifest, setSupervisorManifest] = useState<ManifestEntry[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('visa_mock');
  const [checkoutError, setCheckoutError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [cancelLockHours, setCancelLockHours] = useState(3);
  const [swapBookingTarget, setSwapBookingTarget] = useState<ManifestEntry | null>(null);
  const [swapTripId, setSwapTripId] = useState('');
  const [swapSeatNumber, setSwapSeatNumber] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [scanInputToken, setScanInputToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [showCameraPermissionGuide, setShowCameraPermissionGuide] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Authenticate helper with backend
  const authenticateWithBackend = useCallback(async (email: string, pass = '1Key@GALALA') => {
    try {
      const apiUrl = getApiBaseUrl();
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, deviceInfo: 'Bus Aesh Web Portal' }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        setRole(data.user.role);
        localStorage.setItem('aesh_web_token', data.token);
        localStorage.setItem('aesh_web_user', JSON.stringify(data.user));
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
    const savedToken = localStorage.getItem('aesh_web_token');
    const savedUser = localStorage.getItem('aesh_web_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setRole(parsed.role);
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

    const init = async () => {
      const apiUrl = getApiBaseUrl();
      try {
        const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setIsOffline(false);
          const routesRes = await fetch(`${apiUrl}/api/routes`);
          if (routesRes.ok) {
            const data = await routesRes.json();
            if (data && data.length > 0) {
              setRoutes(data);
              setSelectedRouteId(data[0].id);
            }
          }
          return;
        }
      } catch (err) {
        console.warn('Backend unavailable, using offline mode:', err);
      }
      setIsOffline(true);
      loadOfflineData();
    };
    init();
  }, []);


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

  useEffect(() => {
    if (isOffline) {
      const mockTrips = generateMockTrips(selectedRouteId, selectedDate, routes);
      setTrips(mockTrips);
    } else if (selectedRouteId && selectedDate) {
      const fetchLiveTrips = async () => {
        try {
          const apiUrl = getApiBaseUrl();
          const res = await fetch(`${apiUrl}/api/trips?date=${selectedDate}&routeId=${selectedRouteId}`);
          if (res.ok) {
            const data = await res.json();
            setTrips(data);
          }
        } catch (e) {
          console.error('Failed to fetch live trips:', e);
        }
      };
      fetchLiveTrips();
    }
  }, [selectedRouteId, selectedDate, isOffline, routes]);

  useEffect(() => {
    if (trips.length === 0) { setActiveTrip(null); setActiveArrivalTrip(null); setActiveReturnTrip(null); return; }
    if (bookingType === 'round_trip') {
      const arrTrips = trips.filter(t => t.direction === 'to_campus');
      const retTrips = trips.filter(t => t.direction === 'from_campus');
      setActiveArrivalTrip(arrTrips.find(t => t.timeSlot === timeSlot) || arrTrips[0] || null);
      setActiveReturnTrip(retTrips.find(t => t.timeSlot === returnTimeSlot) || retTrips[0] || null);
    } else {
      const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
      const slot = bookingType === 'to_campus' ? timeSlot : returnTimeSlot;
      const matched = trips.filter(t => t.direction === dir);
      setActiveTrip(matched.find(t => t.timeSlot === slot) || matched[0] || null);
    }
  }, [trips, bookingType, timeSlot, returnTimeSlot]);

  // Load and sync real seat map from backend
  const loadSeatMap = useCallback(async () => {
    const apiUrl = getApiBaseUrl();
    const tid = activeTrip ? activeTrip.id : activeArrivalTrip ? activeArrivalTrip.id : null;

    if (!isOffline && tid) {
      try {
        const res = await fetch(`${apiUrl}/api/trips/${tid}/seats`);
        if (res.ok) {
          const data: Seat[] = await res.json();
          setSeats(data);
          return;
        }
      } catch (err) {
        console.warn('Live seats fetch failed, using fallback:', err);
      }
    }

    // Offline / fallback seats
    if (bookingType === 'round_trip') {
      if (activeArrivalTrip && activeReturnTrip) {
        setSeats(generateRoundTripSeats(activeArrivalTrip.id, activeReturnTrip.id, user?.id || ''));
      } else { setSeats([]); }
    } else {
      if (activeTrip) {
        setSeats(generateMockSeats(activeTrip.id, user?.id || ''));
      } else { setSeats([]); }
    }
  }, [activeTrip, activeArrivalTrip, activeReturnTrip, bookingType, isOffline, user]);

  useEffect(() => {
    setSelectedSeat(null);
    setHeldExpiresAt(null);
    loadSeatMap();

    if (!isOffline) {
      const interval = setInterval(loadSeatMap, 5000);
      return () => clearInterval(interval);
    }
  }, [loadSeatMap, isOffline]);

  useEffect(() => {
    if (!heldExpiresAt) return;
    const interval = setInterval(() => {
      if (Date.now() >= heldExpiresAt) {
        setSelectedSeat(null);
        setHeldExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [heldExpiresAt]);

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

  // Real-Time Seat Synchronization via WebSocket
  useEffect(() => {
    const tid = activeTrip ? activeTrip.id : activeArrivalTrip ? activeArrivalTrip.id : null;
    if (isOffline || !tid || typeof window === 'undefined') return;

    const { wsUrl } = getApiUrls();
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/trips/${tid}/seats`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'seat_locked') {
            setSeats(prev => prev.map(s => s.seatNumber === msg.seatNumber ? { ...s, status: 'held' } : s));
          } else if (msg.type === 'seat_unlocked' || msg.type === 'booking_cancelled') {
            setSeats(prev => prev.map(s => s.seatNumber === msg.seatNumber ? { ...s, status: 'free' } : s));
          } else if (msg.type === 'seat_booked') {
            setSeats(prev => prev.map(s => s.seatNumber === msg.seatNumber ? { ...s, status: 'booked' } : s));
          } else if (msg.type === 'rider_boarded') {
            handleRiderBoardedNotification(msg);
          }
        } catch {}
      };
    } catch (e) {
      console.warn('Trip seats WebSocket error:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [activeTrip, activeArrivalTrip, isOffline, handleRiderBoardedNotification]);

  // Real-Time User Session Displacement & Boarding Listener via WebSocket
  useEffect(() => {
    if (isOffline || !token || typeof window === 'undefined') return;

    const { wsUrl } = getApiUrls();
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/user/session?token=${encodeURIComponent(token)}`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SESSION_TERMINATED') {
            window.dispatchEvent(new CustomEvent('session_displaced', { detail: msg }));
          } else if (msg.type === 'rider_boarded') {
            handleRiderBoardedNotification(msg);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (socket) socket.close();
    };
  }, [token, isOffline, handleRiderBoardedNotification]);

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
  }, [activeTrip, activeArrivalTrip, isOffline, token]);

  useEffect(() => {
    if (role === 'supervisor') {
      loadSupervisorManifest();
      const interval = setInterval(loadSupervisorManifest, 3000);
      return () => clearInterval(interval);
    }
  }, [role, loadSupervisorManifest]);

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
            return;
          }
        }
      } catch {}
    }

    // Fallback to localStorage
    if (typeof window === 'undefined') return;
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const mine = all.filter(b => b.riderEmail === user.email);
    setMyBookings(mine);
  }, [user, isOffline, token]);

  useEffect(() => { 
    getUserBookings(); 
  }, [getUserBookings]);

  const handleSeatClick = useCallback(async (seatNumber: number, currentStatus: string) => {
    if (currentStatus === 'booked') return;
    const uid = user?.id || '';
    const tid = activeTrip ? activeTrip.id : activeArrivalTrip ? activeArrivalTrip.id : null;
    const apiUrl = getApiBaseUrl();

    if (selectedSeat === seatNumber) {
      setSelectedSeat(null);
      setHeldExpiresAt(null);
      setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'free' as const, userId: null } : s));
      if (!isOffline && tid && token) {
        fetch(`${apiUrl}/api/trips/${tid}/seats/${seatNumber}/unlock`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } else {
      if (selectedSeat && !isOffline && tid && token) {
        fetch(`${apiUrl}/api/trips/${tid}/seats/${selectedSeat}/unlock`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      setSelectedSeat(seatNumber);
      setLockingSeatNumber(seatNumber);
      setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'held' as const, userId: uid } : (s.seatNumber === selectedSeat ? { ...s, status: 'free' as const, userId: null } : s)));
      setHeldExpiresAt(Date.now() + 300000);
      setLockingSeatNumber(null);

      if (!isOffline && tid && token) {
        fetch(`${apiUrl}/api/trips/${tid}/seats/${seatNumber}/lock`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    }
  }, [selectedSeat, user, activeTrip, activeArrivalTrip, isOffline, token]);

  const handleCheckoutSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !user) return;
    if (bookingType === 'round_trip' && (!activeArrivalTrip || !activeReturnTrip)) return;
    if (bookingType !== 'round_trip' && !activeTrip) return;

    setIsPaying(true);
    setCheckoutError('');

    const apiUrl = getApiBaseUrl();
    let apiBookingSuccess = false;

    if (!isOffline && token) {
      try {
        if (bookingType === 'round_trip') {
          const res = await fetch(`${apiUrl}/api/bookings/round-trip`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              toCampusTripId: activeArrivalTrip!.id,
              toCampusSeatNumber: selectedSeat,
              fromCampusTripId: activeReturnTrip!.id,
              fromCampusSeatNumber: selectedSeat,
              paymentMethod,
              receiptRef: receiptRef || undefined,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const serverMsg = typeof data.error === 'string'
              ? data.error
              : (typeof data.message === 'string'
                  ? data.message
                  : (data.error ? JSON.stringify(data.error) : 'Round trip booking failed'));

            if (res.status === 409 || data.code === 'SEAT_ALREADY_BOOKED') {
              setCheckoutError(serverMsg || 'عذراً، هذا المقعد محجوز بالفعل. يرجى اختيار مقعد متاح.');
              setSelectedSeat(null);
              loadSeatMap();
              setIsPaying(false);
              return;
            }
            throw new Error(serverMsg);
          }
          apiBookingSuccess = true;
        } else {
          const targetTrip = activeTrip!;
          const resolvedLegType = targetTrip.direction === 'from_campus' ? 'from_campus' : 'to_campus';
          const res = await fetch(`${apiUrl}/api/bookings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              tripId: targetTrip.id,
              seatNumber: selectedSeat,
              paymentMethod,
              bookingType: 'one_way',
              legType: resolvedLegType,
              receiptRef: receiptRef || undefined,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const serverMsg = typeof data.error === 'string'
              ? data.error
              : (typeof data.message === 'string'
                  ? data.message
                  : (data.error ? JSON.stringify(data.error) : 'Booking failed'));

            if (res.status === 409 || data.code === 'SEAT_ALREADY_BOOKED') {
              setCheckoutError(serverMsg || 'عذراً، هذا المقعد محجوز بالفعل. يرجى اختيار مقعد متاح.');
              setSelectedSeat(null);
              loadSeatMap();
              setIsPaying(false);
              return;
            }
            throw new Error(serverMsg);
          }
          apiBookingSuccess = true;
        }
      } catch (err: any) {
        const errorText = typeof err === 'string'
          ? err
          : (typeof err?.message === 'string' && err.message !== '[object Object]'
              ? err.message
              : 'فشلت عملية الحجز. يرجى المحاولة مرة أخرى.');
        setCheckoutError(errorText);
        setIsPaying(false);
        return;
      }
    }

    const newBookings = generateOfflineBooking(
      bookingType,
      activeTrip, activeArrivalTrip, activeReturnTrip,
      selectedSeat, paymentMethod, receiptRef,
      user.id, user.fullName, user.email,
    );

    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    localStorage.setItem('aesh_bookings', JSON.stringify([...all, ...newBookings]));

    if (apiBookingSuccess) {
      await getUserBookings();
      await loadSeatMap();
      if (role === 'supervisor') await loadSupervisorManifest();
    } else {
      setMyBookings(prev => [...newBookings, ...prev]);
      setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' as const, userId: user.id } : s));
    }

    addMockAuditLog('SEAT_BOOKED', `Rider booked seat ${selectedSeat} (${paymentMethod})`);

    setIsPaying(false);
    setShowCheckout(false);
    setSelectedSeat(null);

    if (typeof window !== 'undefined') {
      import('canvas-confetti').then(module => {
        const confetti = module.default;
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }).catch(() => {});
    }
  }, [selectedSeat, user, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip, paymentMethod, receiptRef, isOffline, token, getUserBookings, loadSeatMap, loadSupervisorManifest, role]);

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    const apiUrl = getApiBaseUrl();

    if (!isOffline && token) {
      try {
        await fetch(`${apiUrl}/api/bookings/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId, reason: 'Rider requested cancellation' }),
        });
        getUserBookings();
        loadSeatMap();
        return;
      } catch (e) {
        console.warn('API cancellation failed, applying local cancellation:', e);
      }
    }

    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const booking = all.find(b => b.id === bookingId);
    if (!booking) return;
    const updated = all.map(b => {
      if (b.id === bookingId || (booking.pairedBookingId && b.id === booking.pairedBookingId)) return { ...b, status: 'cancelled' as const };
      return b;
    });
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    setMyBookings(prev => prev.map(b => (b.id === bookingId || (booking.pairedBookingId && b.id === booking.pairedBookingId)) ? { ...b, status: 'cancelled' } : b));
    addMockAuditLog('SEAT_CANCELLED', `Rider cancelled booking ${bookingId}`);
    loadSeatMap();
  }, [isOffline, token, getUserBookings, loadSeatMap]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authenticateWithBackend(email, password);
    if (data) return;

    const mockUser = MOCK_USERS[email] || MOCK_USERS['aes400196@gu.edu.eg'];
    localStorage.setItem('aesh_web_token', 'mock-offline-token');
    localStorage.setItem('aesh_web_user', JSON.stringify(mockUser));
    setToken('mock-offline-token');
    setUser(mockUser);
    setRole(mockUser.role);
  }, [authenticateWithBackend]);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aesh_web_token');
      localStorage.removeItem('aesh_web_user');
      window.location.href = '/';
    }
    setToken('');
    setUser(null);
    setRole('rider');
    setSelectedSeat(null);
    setMyBookings([]);
  }, []);

  const switchRole = useCallback(async (newRole: Role) => {
    const email = newRole === 'rider' ? 'aes400196@gu.edu.eg' : newRole === 'supervisor' ? 'supervisor@gu.edu.eg' : 'admin@gu.edu.eg';
    const data = await authenticateWithBackend(email);
    if (data) {
      setRole(newRole);
      return;
    }

    const mockUser = MOCK_USERS[email];
    setRole(newRole);
    setUser(mockUser);
    setToken(`mock-${newRole}-token`);
    localStorage.setItem('aesh_web_token', `mock-${newRole}-token`);
    localStorage.setItem('aesh_web_user', JSON.stringify(mockUser));
  }, [authenticateWithBackend]);

  const verifyScanToken = useCallback(async (tokenToVerify: string) => {
    if (!tokenToVerify) return;
    setIsScanning(true);
    setScanResult(null);

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        const res = await fetch(`${apiUrl}/api/scan/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            token: tokenToVerify,
            expectedLegType: activeTrip?.direction || 'to_campus',
          }),
        });
        const data = await res.json();
        setScanResult(data);
        setIsScanning(false);
        loadSupervisorManifest();
        return;
      } catch (err) {
        console.warn('API verify failed, falling back to local verify:', err);
      }
    }

    await new Promise(r => setTimeout(r, 800));
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const parts = tokenToVerify.split('.');
    if (parts.length < 5) {
      setScanResult({ success: false, result: 'invalid', message: 'ERROR: Scan Invalid (Unrecognized format)' });
      setIsScanning(false);
      return;
    }
    const [bookingHex] = parts;
    const target = all.find(b => b.id.replace(/-/g, '') === bookingHex);
    if (!target) {
      setScanResult({ success: false, result: 'invalid', message: 'ERROR: Booking Record Not Found' });
      setIsScanning(false);
      return;
    }
    if (target.status === 'cancelled') {
      setScanResult({ success: false, result: 'expired', message: 'ERROR: Ticket Cancelled' });
      setIsScanning(false);
      return;
    }
    if (target.isBoarded) {
      setScanResult({ success: false, result: 'already_checked_in', message: `Already checked in at ${target.boardedAt}` });
      setIsScanning(false);
      return;
    }
    const checkInTime = new Date().toLocaleTimeString();
    target.isBoarded = true;
    target.boardedAt = checkInTime;
    target.qrUsedAt = new Date().toISOString();
    const updated = all.map(b => b.id === target.id ? target : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    setMyBookings(prev => prev.map(b => b.id === target.id ? { ...b, isBoarded: true, qrUsedAt: new Date().toISOString() } : b));
    setJustBoardedBookingIds(prev => new Set(prev).add(target.id));
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
    }
    addMockAuditLog('ATTENDANCE_SCAN', `Rider ${target.riderName} scanned on board`);
    setScanResult({ success: true, result: 'valid', riderName: target.riderName, seatNumber: target.seatNumber, route: target.routeAr, time: checkInTime });
    setIsScanning(false);
    loadSupervisorManifest();
  }, [activeTrip, isOffline, token, loadSupervisorManifest]);

  const handleSimulatedScan = useCallback(() => {
    verifyScanToken(scanInputToken);
  }, [scanInputToken, verifyScanToken]);

  const startCameraScan = useCallback(async () => {
    setIsCameraActive(true);
    setCameraError(null);
    setScanResult(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera not available in this context');
      setIsCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
    } catch {
      setCameraError('Camera access denied');
      setIsCameraActive(false);
    }
  }, []);

  const stopCameraScan = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  }, [cameraStream]);

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

    await new Promise(r => setTimeout(r, 800));
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
    const reason = window.prompt('Enter cancellation reason:');
    if (reason === null) return;

    const apiUrl = getApiBaseUrl();
    if (!isOffline && token) {
      try {
        await fetch(`${apiUrl}/api/bookings/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId, reason }),
        });
        loadSupervisorManifest();
        loadSeatMap();
        alert('Passenger booking cancelled.');
        return;
      } catch (e) {
        console.warn('API cancellation failed:', e);
      }
    }

    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const updated = all.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const, cancelReason: reason } : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    addMockAuditLog('SUPERVISOR_CANCEL', `Supervisor cancelled booking ${bookingId}`);
    loadSupervisorManifest();
    loadSeatMap();
    alert('Passenger booking cancelled.');
  }, [isOffline, token, loadSupervisorManifest, loadSeatMap]);

  const setSwapBookingTargetOpen = useCallback((t: ManifestEntry | null) => {
    setSwapBookingTarget(t);
    setSwapSeatNumber('');
    setSwapTripId('');
  }, []);

  const getGroupedBookings = useCallback((): GroupedBooking[] => {
    const grouped: GroupedBooking[] = [];
    const visited = new Set<string>();
    myBookings.forEach(b => {
      if (visited.has(b.id)) return;
      if (b.bookingType === 'round_trip' && b.pairedBookingId) {
        const partner = myBookings.find(p => p.id === b.pairedBookingId);
        if (partner) {
          visited.add(partner.id);
          const arrival = b.legType === 'to_campus' ? b : partner;
          const returnLeg = b.legType === 'from_campus' ? b : partner;
          grouped.push({ type: 'round_trip', id: `${arrival.id}-${returnLeg.id}`, status: arrival.status === 'cancelled' || returnLeg.status === 'cancelled' ? 'cancelled' : 'confirmed', arrival, returnLeg });
          visited.add(b.id);
          return;
        }
      }
      grouped.push({ type: 'one_way', id: b.id, status: b.status, booking: b });
      visited.add(b.id);
    });
    return grouped;
  }, [myBookings]);

  const value = {
    token, user, role, isOffline, routes, selectedRouteId, selectedDirection, selectedDate, trips,
    activeTrip, activeArrivalTrip, activeReturnTrip, bookingType, timeSlot, returnTimeSlot, seats, selectedSeat,
    heldExpiresAt, lockingSeatNumber, myBookings, expandedTicketId, justBoardedBookingIds, auditLogs,
    supervisorManifest, showCheckout, paymentMethod, checkoutError, isPaying, cardNumber, receiptRef,
    cancelLockHours, swapBookingTarget, swapTripId, swapSeatNumber, isSwapping, scanInputToken, scanResult, sidebarCollapsed, mobileSidebarOpen,
    isScanning, isCameraActive, cameraError, cameraStream, showCameraPermissionGuide,
    login, logout, switchRole, setSelectedRouteId, setSelectedDirection, setSelectedDate,
    setBookingType, setTimeSlot, setReturnTimeSlot, setActiveTrip, setActiveArrivalTrip, setActiveReturnTrip,
    handleSeatClick, setShowCheckout, setPaymentMethod, setCardNumber, setReceiptRef,
    handleCheckoutSubmit, handleCancelBooking, setExpandedTicketId, setSwapBookingTarget, setSwapBookingTargetOpen,
    setSwapTripId, setSwapSeatNumber, handleSupervisorSwapSubmit, handleSupervisorCancel,
    setScanInputToken, setScanResult, setIsCameraActive, setCameraError, setShowCameraPermissionGuide,
    handleSimulatedScan, startCameraScan, stopCameraScan, setCancelLockHours,
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
