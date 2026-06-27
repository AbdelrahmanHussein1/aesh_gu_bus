'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Route, Trip, Seat, Booking, AuditLog, GroupedBooking, ManifestEntry, BookingType, Direction, TimeSlot, PaymentMethod, Role, User } from '@/lib/types';
import { getMockRoutes, generateMockTrips, generateMockSeats, generateRoundTripSeats, generateMockManifest, generateOfflineBooking, addMockAuditLog, getAuditLogs } from '@/lib/offline';
import { API_URL } from '@/lib/api';
import confetti from 'canvas-confetti';

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
}

const AppContext = createContext<(AppState & AppActions) | null>(null);

const MOCK_USERS: Record<string, User> = {
  'aes400196@gu.edu.eg': { id: 'user-default-id', email: 'aes400196@gu.edu.eg', fullName: 'Abdelrahman Ehab', role: 'rider' },
  'supervisor@gu.edu.eg': { id: 'supervisor-id', email: 'supervisor@gu.edu.eg', fullName: 'Supervisor Aesh', role: 'supervisor' },
  'admin@gu.edu.eg': { id: 'admin-id', email: 'admin@gu.edu.eg', fullName: 'System Administrator', role: 'admin' },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>('rider');
  const [isOffline, setIsOffline] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<Direction>('to_campus');
  const [selectedDate, setSelectedDate] = useState('2026-06-27');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [activeArrivalTrip, setActiveArrivalTrip] = useState<Trip | null>(null);
  const [activeReturnTrip, setActiveReturnTrip] = useState<Trip | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('to_campus');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('morning_1');
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

  useEffect(() => {
    const savedToken = localStorage.getItem('aesh_web_token');
    const savedUser = localStorage.getItem('aesh_web_user');
    if (savedToken && savedUser) {
      const parsed = JSON.parse(savedUser);
      setToken(savedToken);
      setUser(parsed);
      setRole(parsed.role);
    }
    loadOfflineData();
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
    }
  }, [selectedRouteId, selectedDate, isOffline, routes]);

  useEffect(() => {
    if (trips.length === 0) { setActiveTrip(null); setActiveArrivalTrip(null); setActiveReturnTrip(null); return; }
    if (bookingType === 'round_trip') {
      const arrTrips = trips.filter(t => t.direction === 'to_campus' && t.timeSlot === timeSlot);
      const retTrips = trips.filter(t => t.direction === 'from_campus' && t.timeSlot === 'return');
      setActiveArrivalTrip(arrTrips[0] || null);
      setActiveReturnTrip(retTrips[0] || null);
    } else {
      const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
      const slot = bookingType === 'to_campus' ? timeSlot : 'return';
      const matched = trips.filter(t => t.direction === dir && t.timeSlot === slot);
      setActiveTrip(matched[0] || null);
    }
  }, [trips, bookingType, timeSlot]);

  useEffect(() => {
    setSelectedSeat(null);
    setHeldExpiresAt(null);
    if (bookingType === 'round_trip') {
      if (activeArrivalTrip && activeReturnTrip) {
        setSeats(generateRoundTripSeats(activeArrivalTrip.id, activeReturnTrip.id, user?.id || ''));
        const interval = setInterval(() => {
          setSeats(prev => {
            const freeSeats = prev.filter(s => s.status === 'free');
            if (freeSeats.length === 0 || Math.random() > 0.3) return prev;
            const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
            return prev.map(s => s.seatNumber === randomSeat.seatNumber ? { ...s, status: 'held' as const, userId: 'another-user-uuid' } : s);
          });
        }, 5000);
        return () => clearInterval(interval);
      } else { setSeats([]); }
    } else {
      if (activeTrip) {
        setSeats(generateMockSeats(activeTrip.id, user?.id || ''));
        const interval = setInterval(() => {
          setSeats(prev => {
            const freeSeats = prev.filter(s => s.status === 'free');
            if (freeSeats.length === 0 || Math.random() > 0.3) return prev;
            const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
            return prev.map(s => s.seatNumber === randomSeat.seatNumber ? { ...s, status: 'held' as const, userId: 'another-user-uuid' } : s);
          });
        }, 5000);
        return () => clearInterval(interval);
      } else { setSeats([]); }
    }
  }, [activeTrip, activeArrivalTrip, activeReturnTrip, bookingType]);

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

  useEffect(() => {
    if (role === 'supervisor' && (activeTrip || (activeArrivalTrip && activeReturnTrip))) {
      const tripId = activeTrip?.id || activeArrivalTrip?.id || 0;
      setSupervisorManifest(generateMockManifest(tripId));
    }
  }, [role, activeTrip, activeArrivalTrip]);

  const getUserBookings = () => {
    if (typeof window === 'undefined') return;
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const mine = all.filter(b => b.riderEmail === user?.email);
    setMyBookings(mine);
  };

  useEffect(() => { getUserBookings(); }, [user]);

  const handleSeatClick = useCallback(async (seatNumber: number, currentStatus: string) => {
    if (currentStatus === 'booked') return;
    const uid = user?.id || '';

    if (selectedSeat === seatNumber) {
      setSelectedSeat(null);
      setHeldExpiresAt(null);
      setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'free' as const, userId: null } : s));
    } else {
      if (selectedSeat) {
        setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'free' as const, userId: null } : s));
      }
      setSelectedSeat(seatNumber);
      setLockingSeatNumber(seatNumber);
      setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'held' as const, userId: uid } : s));
      setHeldExpiresAt(Date.now() + 300000);
      setLockingSeatNumber(null);
    }
  }, [selectedSeat, user]);

  const handleCheckoutSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !user) return;
    if (bookingType === 'round_trip' && (!activeArrivalTrip || !activeReturnTrip)) return;
    if (bookingType !== 'round_trip' && !activeTrip) return;

    setIsPaying(true);
    setCheckoutError('');

    await new Promise(r => setTimeout(r, 1500));

    const newBookings = generateOfflineBooking(
      bookingType,
      activeTrip, activeArrivalTrip, activeReturnTrip,
      selectedSeat, paymentMethod, receiptRef,
      user.id, user.fullName, user.email,
    );

    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    localStorage.setItem('aesh_bookings', JSON.stringify([...all, ...newBookings]));
    setMyBookings(prev => [...newBookings, ...prev]);

    addMockAuditLog('SEAT_BOOKED', `Rider booked seat ${selectedSeat}`);
    setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' as const, userId: user.id } : s));

    setIsPaying(false);
    setShowCheckout(false);
    setSelectedSeat(null);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  }, [selectedSeat, user, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip, paymentMethod, receiptRef]);

  const handleCancelBooking = useCallback((bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
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
    if (activeTrip) setSeats(generateMockSeats(activeTrip.id, user?.id || ''));
    if (activeArrivalTrip && activeReturnTrip) setSeats(generateRoundTripSeats(activeArrivalTrip.id, activeReturnTrip.id, user?.id || ''));
  }, [activeTrip, activeArrivalTrip, activeReturnTrip, user]);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 800));
    const mockUser = MOCK_USERS[email] || MOCK_USERS['aes400196@gu.edu.eg'];
    localStorage.setItem('aesh_web_token', 'mock-offline-token');
    localStorage.setItem('aesh_web_user', JSON.stringify(mockUser));
    setToken('mock-offline-token');
    setUser(mockUser);
    setRole(mockUser.role);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('aesh_web_token');
    localStorage.removeItem('aesh_web_user');
    setToken('');
    setUser(null);
    setRole('rider');
    setSelectedSeat(null);
    setMyBookings([]);
  }, []);

  const switchRole = useCallback((newRole: Role) => {
    setRole(newRole);
    const mockUser = MOCK_USERS[newRole === 'rider' ? 'aes400196@gu.edu.eg' : newRole === 'supervisor' ? 'supervisor@gu.edu.eg' : 'admin@gu.edu.eg'];
    setUser(mockUser);
  }, []);

  const handleSimulatedScan = useCallback(async () => {
    if (!scanInputToken) return;
    setIsScanning(true);
    setScanResult(null);
    await new Promise(r => setTimeout(r, 800));
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const parts = scanInputToken.split('.');
    if (parts.length < 5) {
      setScanResult({ success: false, result: 'invalid', message: 'ERROR: Scan Invalid' });
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
    const updated = all.map(b => b.id === target.id ? target : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    addMockAuditLog('ATTENDANCE_SCAN', `Rider ${target.riderName} scanned on board`);
    setScanResult({ success: true, result: 'valid', riderName: target.riderName, seatNumber: target.seatNumber, route: target.routeAr, time: checkInTime });
    setIsScanning(false);
    const tripId = target.tripId;
    setSupervisorManifest(generateMockManifest(tripId));
  }, [scanInputToken]);

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
    await new Promise(r => setTimeout(r, 1000));
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const targetTripNum = parseInt(swapTripId);
    const targetSeatNum = parseInt(swapSeatNumber);
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
    if (activeTrip) { setSeats(generateMockSeats(activeTrip.id, user?.id || '')); setSupervisorManifest(generateMockManifest(activeTrip.id)); }
    alert('Passenger reassigned successfully.');
  }, [swapBookingTarget, swapTripId, swapSeatNumber, activeTrip, user]);

  const handleSupervisorCancel = useCallback((bookingId: string) => {
    const reason = window.prompt('Enter cancellation reason:');
    if (reason === null) return;
    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    const updated = all.map(b => b.id === bookingId ? { ...b, status: 'cancelled' as const, cancelReason: reason } : b);
    localStorage.setItem('aesh_bookings', JSON.stringify(updated));
    addMockAuditLog('SUPERVISOR_CANCEL', `Supervisor cancelled booking ${bookingId}`);
    if (activeTrip) { setSeats(generateMockSeats(activeTrip.id, user?.id || '')); setSupervisorManifest(generateMockManifest(activeTrip.id)); }
    alert('Passenger booking cancelled.');
  }, [activeTrip, user]);

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
    activeTrip, activeArrivalTrip, activeReturnTrip, bookingType, timeSlot, seats, selectedSeat,
    heldExpiresAt, lockingSeatNumber, myBookings, expandedTicketId, justBoardedBookingIds, auditLogs,
    supervisorManifest, showCheckout, paymentMethod, checkoutError, isPaying, cardNumber, receiptRef,
    cancelLockHours, swapBookingTarget, swapTripId, swapSeatNumber, isSwapping, scanInputToken, scanResult, sidebarCollapsed, mobileSidebarOpen,
    isScanning, isCameraActive, cameraError, cameraStream, showCameraPermissionGuide,
    login, logout, switchRole, setSelectedRouteId, setSelectedDirection, setSelectedDate,
    setBookingType, setTimeSlot, setActiveTrip, setActiveArrivalTrip, setActiveReturnTrip,
    handleSeatClick, setShowCheckout, setPaymentMethod, setCardNumber, setReceiptRef,
    handleCheckoutSubmit, handleCancelBooking, setExpandedTicketId, setSwapBookingTarget, setSwapBookingTargetOpen,
    setSwapTripId, setSwapSeatNumber, handleSupervisorSwapSubmit, handleSupervisorCancel,
    setScanInputToken, setScanResult, setIsCameraActive, setCameraError, setShowCameraPermissionGuide,
    handleSimulatedScan, startCameraScan, stopCameraScan, setCancelLockHours,
    setIsScanning, setIsSwapping, getGroupedBookings, toggleSidebar, setMobileSidebarOpen,
  };

  return <AppContext.Provider value={value}>{children as ReactNode}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
