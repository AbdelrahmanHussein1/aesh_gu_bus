'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Calendar, 
  QrCode, 
  User, 
  Shield, 
  Camera, 
  CreditCard, 
  CheckCircle, 
  AlertTriangle, 
  LogOut, 
  Settings, 
  Activity, 
  RefreshCw,
  ChevronDown,
  Ticket
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsQR from 'jsqr';

// Shared config (Dynamically resolves to computer's local IP if accessed on mobile device)
const getApiUrls = () => {
  if (typeof window === 'undefined') {
    return {
      apiUrl: 'http://localhost:3000',
      wsUrl: 'ws://localhost:3000'
    };
  }
  const hostname = window.location.hostname;
  const host = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;
  return {
    apiUrl: `http://${host}:3000`,
    wsUrl: `ws://${host}:3000`
  };
};

const { apiUrl: API_URL, wsUrl: WS_URL } = getApiUrls();

function formatErrorMessage(error: any): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const messages: string[] = [];
    for (const key of Object.keys(error)) {
      if (key !== '_errors' && error[key] && typeof error[key] === 'object' && (error[key] as any)._errors) {
        messages.push(`${key}: ${(error[key] as any)._errors.join(', ')}`);
      }
    }
    if (error._errors && Array.isArray(error._errors) && error._errors.length > 0) {
      messages.push(error._errors.join(', '));
    }
    return messages.join(' | ') || JSON.stringify(error);
  }
  return String(error);
}

export default function AppMain() {
  // Global App States
  const [isOfflineMode, setIsOfflineMode] = useState(true);
  const [role, setRole] = useState<'rider' | 'supervisor' | 'admin'>('rider');
  const [loggedInUser, setLoggedInUser] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('aes400196@gu.edu.eg');
  const [loginPassword, setLoginPassword] = useState('1Key@GALALA');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Registration Form States
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerRole, setRegisterRole] = useState<'rider' | 'supervisor' | 'admin'>('rider');
  const [registerPassword, setRegisterPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Forgot Password Form States
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Selection States
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1);
  const [selectedDirection, setSelectedDirection] = useState<'to_campus' | 'from_campus'>('to_campus');
  const [selectedDate, setSelectedDate] = useState<string>('2026-06-25');
  const [trips, setTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [activeArrivalTrip, setActiveArrivalTrip] = useState<any>(null);
  const [activeReturnTrip, setActiveReturnTrip] = useState<any>(null);
  const [bookingType, setBookingType] = useState<'to_campus' | 'from_campus' | 'round_trip'>('to_campus');
  const [timeSlot, setTimeSlot] = useState<'morning_1' | 'morning_2' | 'return'>('morning_1');
  const [tick, setTick] = useState(0);

  // Helper for localStorage parsing
  const getLocalBookings = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    } catch {
      return [];
    }
  };
  
  // Seat state
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [lockingSeatNumber, setLockingSeatNumber] = useState<number | null>(null);
  const [heldExpiresAt, setHeldExpiresAt] = useState<number | null>(null);
  
  // Checkout Modal
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'visa_mock' | 'instapay' | 'telda'>('visa_mock');
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  
  // User Bookings
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [justBoardedBookingIds, setJustBoardedBookingIds] = useState<Set<string>>(new Set());
  
  // Supervisor Console
  const [supervisorManifest, setSupervisorManifest] = useState<any[]>([]);
  const [swapBookingTarget, setSwapBookingTarget] = useState<any>(null);
  const [swapTripId, setSwapTripId] = useState<string>('');
  const [swapSeatNumber, setSwapSeatNumber] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);

  // Driver Scanner
  const [scanInputToken, setScanInputToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Live Camera Scanner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraPermissionGuide, setShowCameraPermissionGuide] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanAnimationRef = useRef<number | null>(null);

  // Admin Config
  const [cancelLockHours, setCancelLockHours] = useState(3);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // WebSockets
  const wsRefs = useRef<WebSocket[]>([]);

  // 1. Detect if API backend is alive, fetch initial data, and load local credentials
  useEffect(() => {
    // Load local auth state
    const savedToken = localStorage.getItem('aesh_web_token');
    const savedUser = localStorage.getItem('aesh_web_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setLoggedInUser(parsedUser);
      setRole(parsedUser.role);
    }

    async function checkBackend() {
      try {
        const res = await fetch(`${API_URL}/health`);
        if (res.ok) {
          setIsOfflineMode(false);
          console.log('[App] Connected to live Fastify backend.');
          loadBackendRoutes();
        } else {
          loadOfflineMockData();
        }
      } catch (e) {
        setIsOfflineMode(true);
        console.log('[App] Backend not running. Initializing offline mockup engine...');
        loadOfflineMockData();
      }
    }
    checkBackend();
  }, []);

  // 2. Refresh trips when date or route changes
  useEffect(() => {
    if (isOfflineMode) {
      updateMockTrips();
    } else {
      loadBackendTrips();
    }
  }, [selectedRouteId, selectedDate, isOfflineMode]);

  // Set default active trips when trips list or bookingType/timeSlot changes
  useEffect(() => {
    if (trips.length === 0) {
      setActiveTrip(null);
      setActiveArrivalTrip(null);
      setActiveReturnTrip(null);
      return;
    }

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

  // 3. Connect WebSockets or setup mock real-time when trip changes
  useEffect(() => {
    setSelectedSeat(null);
    setHeldExpiresAt(null);

    if (bookingType === 'round_trip') {
      if (!activeArrivalTrip || !activeReturnTrip) {
        setSeats([]);
        return;
      }

      if (isOfflineMode) {
        loadMockSeatsForRoundTrip(activeArrivalTrip.id, activeReturnTrip.id);
        const interval = setInterval(() => {
          setSeats(prev => {
            const freeSeats = prev.filter(s => s.status === 'free');
            if (freeSeats.length === 0) return prev;
            const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
            if (Math.random() > 0.3) return prev;
            
            return prev.map(s => s.seatNumber === randomSeat.seatNumber ? 
              { ...s, status: 'held', userId: 'another-user-uuid' } : s
            );
          });
        }, 5000);
        return () => clearInterval(interval);
      } else {
        loadBackendSeatsForRoundTrip(activeArrivalTrip.id, activeReturnTrip.id);
        connectWebSockets([activeArrivalTrip.id, activeReturnTrip.id]);
        return () => {
          wsRefs.current.forEach(ws => ws.close());
        };
      }
    } else {
      if (!activeTrip) {
        setSeats([]);
        return;
      }

      if (isOfflineMode) {
        loadMockSeats(activeTrip.id);
        const interval = setInterval(() => {
          setSeats(prev => {
            const freeSeats = prev.filter(s => s.status === 'free');
            if (freeSeats.length === 0) return prev;
            const randomSeat = freeSeats[Math.floor(Math.random() * freeSeats.length)];
            if (Math.random() > 0.3) return prev;
            
            return prev.map(s => s.seatNumber === randomSeat.seatNumber ? 
              { ...s, status: 'held', userId: 'another-user-uuid' } : s
            );
          });
        }, 5000);
        return () => clearInterval(interval);
      } else {
        loadBackendSeats(activeTrip.id);
        connectWebSockets([activeTrip.id]);
        return () => {
          wsRefs.current.forEach(ws => ws.close());
        };
      }
    }
  }, [activeTrip, activeArrivalTrip, activeReturnTrip, bookingType, isOfflineMode]);

  // Fetch Supervisor manifest when active in supervisor tab
  useEffect(() => {
    if (role === 'supervisor' && activeTrip) {
      if (isOfflineMode) {
        loadMockManifest(activeTrip.id);
      } else {
        loadBackendManifest(activeTrip.id);
      }
    }
  }, [role, activeTrip, isOfflineMode]);

  // Hold timer countdown loop
  useEffect(() => {
    if (!heldExpiresAt) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((heldExpiresAt - Date.now()) / 1000));
      setTick(t => t + 1);
      if (diff <= 0) {
        setSelectedSeat(null);
        setHeldExpiresAt(null);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [heldExpiresAt]);

  // --- OFFLINE MOCKUP DATA ENGINE ---

  const loadOfflineMockData = () => {
    // Standard routes from ERP
    const erpRoutes = [
      { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
      { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
      { id: 4, nameAr: 'حدائق الاهرام', nameEn: 'Hadayek Al Ahram' },
      { id: 6, nameAr: 'جامعة القاهرة', nameEn: 'Cairo University' },
      { id: 7, nameAr: 'المعادى', nameEn: 'Maadi' },
      { id: 12, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
      { id: 25, nameAr: 'مدينتى', nameEn: 'Madinaty' },
      { id: 27, nameAr: 'التجمع الخامس', nameEn: 'New Cairo (5th Settlement)' }
    ];
    setRoutes(erpRoutes);
    setSelectedRouteId(1);
    
    // Seed some mock bookings to local storage if empty
    if (!localStorage.getItem('aesh_bookings')) {
      localStorage.setItem('aesh_bookings', JSON.stringify([]));
    }
    if (!localStorage.getItem('aesh_audit_logs')) {
      const initialLogs = [
        { id: 1, action: 'SYSTEM_BOOT', details: 'Offline simulation mode started', time: new Date() }
      ];
      localStorage.setItem('aesh_audit_logs', JSON.stringify(initialLogs));
      setAuditLogs(initialLogs);
    } else {
      setAuditLogs(JSON.parse(localStorage.getItem('aesh_audit_logs') || '[]'));
    }
  };

  const updateMockTrips = () => {
    const matchedRoute = routes.find(r => r.id === selectedRouteId);
    if (!matchedRoute) return;

    // Simulate 3 slots per route (2 to campus, 1 return)
    const mockTripsList = [
      {
        id: selectedRouteId * 100 + 1,
        routeId: selectedRouteId,
        tripDate: selectedDate,
        direction: 'to_campus',
        timeSlot: 'morning_1',
        priceEgp: 160,
        departureTime: '07:00 AM',
        status: 'scheduled',
        bus: { name: `${matchedRoute.nameEn}/وصول/9:00`, licensePlate: `أ ب ج ${100 + selectedRouteId}`, totalSeats: 50 }
      },
      {
        id: selectedRouteId * 100 + 2,
        routeId: selectedRouteId,
        tripDate: selectedDate,
        direction: 'to_campus',
        timeSlot: 'morning_2',
        priceEgp: 160,
        departureTime: '10:30 AM',
        status: 'scheduled',
        bus: { name: `${matchedRoute.nameEn}/وصول/11:30`, licensePlate: `د هـ و ${200 + selectedRouteId}`, totalSeats: 50 }
      },
      {
        id: selectedRouteId * 100 + 3,
        routeId: selectedRouteId,
        tripDate: selectedDate,
        direction: 'from_campus',
        timeSlot: 'return',
        priceEgp: 160,
        departureTime: '04:45 PM',
        status: 'scheduled',
        bus: { name: `${matchedRoute.nameEn}/عودة/4:45`, licensePlate: `س ص ع ${300 + selectedRouteId}`, totalSeats: 50 }
      }
    ];

    setTrips(mockTripsList);
  };

  const loadMockSeats = (tripId: number) => {
    const allBookings = getLocalBookings();
    const tripBookings = allBookings.filter((b: any) => b.tripId === tripId && b.status === 'confirmed');

    // Create 50 seats
    const mockSeats = Array.from({ length: 50 }, (_, i) => {
      const seatNumber = i + 1;
      const booking = tripBookings.find((b: any) => b.seatNumber === seatNumber);
      
      const isRandomHold = Math.random() < 0.15 && !booking;
      
      return {
        seatNumber,
        status: booking ? 'booked' : (isRandomHold ? 'held' : 'free'),
        userId: booking ? booking.userId : (isRandomHold ? 'some-other-uuid' : null)
      };
    });
    setSeats(mockSeats);
  };

  const loadMockSeatsForRoundTrip = (arrivalTripId: number, returnTripId: number) => {
    const allBookings = getLocalBookings();
    const arrBookings = allBookings.filter((b: any) => b.tripId === arrivalTripId && b.status === 'confirmed');
    const retBookings = allBookings.filter((b: any) => b.tripId === returnTripId && b.status === 'confirmed');

    const mergedSeats = Array.from({ length: 50 }, (_, i) => {
      const seatNumber = i + 1;
      const b1 = arrBookings.find((b: any) => b.seatNumber === seatNumber);
      const b2 = retBookings.find((b: any) => b.seatNumber === seatNumber);

      const isBooked = b1 || b2;
      const isRandomHold = Math.random() < 0.15 && !isBooked;

      return {
        seatNumber,
        status: isBooked ? 'booked' : (isRandomHold ? 'held' : 'free'),
        userId: isBooked ? (b1?.userId || b2?.userId) : (isRandomHold ? 'some-other-uuid' : null)
      };
    });
    setSeats(mergedSeats);
  };

  const loadMockManifest = (tripId: number) => {
    const allBookings = getLocalBookings();
    const tripBookings = allBookings.filter((b: any) => b.tripId === tripId);
    
    // Map to supervisor manifest
    const manifest = tripBookings.map((b: any) => ({
      bookingId: b.id,
      seatNumber: b.seatNumber,
      status: b.status,
      paymentStatus: b.paymentStatus,
      receiptRef: b.receiptRef,
      riderName: b.riderName || 'Test Student',
      riderEmail: b.riderEmail || 'aes400196@gu.edu.eg',
      isBoarded: b.isBoarded || false,
      boardedAt: b.boardedAt || null
    }));
    setSupervisorManifest(manifest);
  };

  // --- BACKEND API COMMUNICATIONS ---

  const loadBackendRoutes = async () => {
    try {
      const res = await fetch(`${API_URL}/api/routes`);
      const data = await res.json();
      setRoutes(data);
      if (data.length > 0) setSelectedRouteId(data[0].erpPointId);
    } catch (e) {
      console.error('Failed to load backend routes', e);
    }
  };

  const loadBackendTrips = async () => {
    try {
      const res = await fetch(`${API_URL}/api/trips?date=${selectedDate}&routeId=${selectedRouteId}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
        if (data.length > 0) {
          setActiveTrip(data[0]);
        } else {
          setActiveTrip(null);
          setSeats([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadBackendSeats = async (tripId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/trips/${tripId}/seats`);
      const data = await res.json();
      setSeats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBackendSeatsForRoundTrip = async (arrivalTripId: number, returnTripId: number) => {
    try {
      const [arrRes, retRes] = await Promise.all([
        fetch(`${API_URL}/api/trips/${arrivalTripId}/seats`),
        fetch(`${API_URL}/api/trips/${returnTripId}/seats`)
      ]);
      const arrSeats = await arrRes.json();
      const retSeats = await retRes.json();
      
      const merged = arrSeats.map((s1: any) => {
        const s2 = retSeats.find((s: any) => s.seatNumber === s1.seatNumber) || { status: 'free', userId: null };
        
        let status = 'free';
        let userId = null;
        
        if (s1.status === 'booked' || s2.status === 'booked') {
          status = 'booked';
          userId = s1.userId || s2.userId;
        } else if (s1.status === 'held' || s2.status === 'held') {
          status = 'held';
          userId = s1.userId || s2.userId;
        }
        
        return {
          seatNumber: s1.seatNumber,
          status,
          userId
        };
      });
      setSeats(merged);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBackendManifest = async (tripId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/trips/${tripId}/manifest`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupervisorManifest(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const connectWebSockets = (tripIds: number[]) => {
    wsRefs.current.forEach(ws => ws.close());
    wsRefs.current = [];

    tripIds.forEach(tripId => {
      const ws = new WebSocket(`${WS_URL}/ws/trips/${tripId}/seats`);
      wsRefs.current.push(ws);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log('[WebSocket Msg Received]', msg);
        
        // Update seat map based on events
        setSeats(prev => {
          return prev.map(s => {
            if (s.seatNumber === msg.seatNumber) {
              if (msg.type === 'seat_locked') {
                return { ...s, status: 'held', userId: msg.userId };
              } else if (msg.type === 'seat_unlocked') {
                if (bookingType === 'round_trip') {
                  if (activeArrivalTrip && activeReturnTrip) {
                    loadBackendSeatsForRoundTrip(activeArrivalTrip.id, activeReturnTrip.id);
                  }
                } else {
                  return { ...s, status: 'free', userId: null };
                }
              } else if (msg.type === 'seat_booked') {
                return { ...s, status: 'booked', userId: msg.userId };
              }
            }
            return s;
          });
        });

        // Refresh manifest if supervisor
        if (role === 'supervisor') {
          loadBackendManifest(tripId);
        }

        // Real-time synchronization for boarding and cancellation events
        if (msg.type === 'rider_boarded' || msg.type === 'booking_cancelled') {
          if (role === 'rider') {
            loadUserBookings();
            // Trigger scan animation on the rider's side
            if (msg.type === 'rider_boarded' && msg.bookingId) {
              const boardedId = String(msg.bookingId);
              setJustBoardedBookingIds(prev => {
                const next = new Set(prev);
                next.add(boardedId);
                return next;
              });
              // Auto-expand the ticket that was just scanned
              // For one-way: expandedTicketId = bookingId
              // For round-trip: expandedTicketId = "arrId-retId", find the matching group
              setMyBookings(current => {
                const matched = current.find((b: any) => String(b.id) === boardedId);
                if (matched && matched.bookingType === 'round_trip' && matched.pairedBookingId) {
                  // Find the paired booking to construct the grouped ID
                  const paired = current.find((p: any) => String(p.id) === String(matched.pairedBookingId));
                  if (paired) {
                    const arrival = matched.legType === 'to_campus' ? matched : paired;
                    const returnLeg = matched.legType === 'from_campus' ? matched : paired;
                    setExpandedTicketId(`${arrival.id}-${returnLeg.id}`);
                  }
                } else {
                  setExpandedTicketId(boardedId);
                }
                return current; // Don't modify the bookings, just use them for lookup
              });
              // Clear animation state after 4 seconds
              setTimeout(() => {
                setJustBoardedBookingIds(prev => {
                  const next = new Set(prev);
                  next.delete(boardedId);
                  return next;
                });
              }, 4000);
            }
          }
          if (role === 'supervisor') {
            loadBackendManifest(tripId);
          }
          // Also reload seats state in real-time
          if (bookingType === 'round_trip') {
            if (activeArrivalTrip && activeReturnTrip) {
              loadBackendSeatsForRoundTrip(activeArrivalTrip.id, activeReturnTrip.id);
            }
          } else if (activeTrip) {
            loadBackendSeats(activeTrip.id);
          }
        }
      };

      const handleCloseOrError = () => {
        console.log(`[WebSocket] Closed or error for trip ${tripId}`);
      };
      ws.onclose = handleCloseOrError;
      ws.onerror = handleCloseOrError;
    });
  };

  // --- ACTIONS: LOCKING & BOOKING ---

  const handleSeatClick = async (seatNumber: number, currentStatus: string) => {
    if (currentStatus === 'booked' || currentStatus === 'held') return;
    
    // Toggle lock
    if (selectedSeat === seatNumber) {
      // Unlock
      setSelectedSeat(null);
      setHeldExpiresAt(null);
      if (isOfflineMode) {
        setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'free', userId: null } : s));
      } else {
        if (bookingType === 'round_trip') {
          await Promise.all([
            fetch(`${API_URL}/api/trips/${activeArrivalTrip.id}/seats/${seatNumber}/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({})
            }),
            fetch(`${API_URL}/api/trips/${activeReturnTrip.id}/seats/${seatNumber}/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({})
            })
          ]);
        } else {
          await fetch(`${API_URL}/api/trips/${activeTrip.id}/seats/${seatNumber}/unlock`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({})
          });
        }
      }
    } else {
      // If we had a previously selected seat, unlock it first
      if (selectedSeat) {
        if (isOfflineMode) {
          setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'free', userId: null } : s));
        } else {
          if (bookingType === 'round_trip') {
            await Promise.all([
              fetch(`${API_URL}/api/trips/${activeArrivalTrip.id}/seats/${selectedSeat}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
              }),
              fetch(`${API_URL}/api/trips/${activeReturnTrip.id}/seats/${selectedSeat}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
              })
            ]);
          } else {
            await fetch(`${API_URL}/api/trips/${activeTrip.id}/seats/${selectedSeat}/unlock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({})
            });
          }
        }
      }

      // Lock new seat
      setSelectedSeat(seatNumber);
      setLockingSeatNumber(seatNumber);
      
      if (isOfflineMode) {
        setSeats(prev => prev.map(s => s.seatNumber === seatNumber ? { ...s, status: 'held', userId: loggedInUser.id } : s));
        setHeldExpiresAt(Date.now() + 300000);
        setLockingSeatNumber(null);
      } else {
        try {
          if (bookingType === 'round_trip') {
            const [arrRes, retRes] = await Promise.all([
              fetch(`${API_URL}/api/trips/${activeArrivalTrip.id}/seats/${seatNumber}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
              }),
              fetch(`${API_URL}/api/trips/${activeReturnTrip.id}/seats/${seatNumber}/lock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({})
              })
            ]);

            if (arrRes.ok && retRes.ok) {
              const data = await arrRes.json();
              setHeldExpiresAt(data.expiresAt);
            } else {
              await Promise.all([
                fetch(`${API_URL}/api/trips/${activeArrivalTrip.id}/seats/${seatNumber}/unlock`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({})
                }),
                fetch(`${API_URL}/api/trips/${activeReturnTrip.id}/seats/${seatNumber}/unlock`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({})
                })
              ]);
              alert('Seat lock conflict on one of the trips. Please select another seat.');
              setSelectedSeat(null);
            }
          } else {
            const res = await fetch(`${API_URL}/api/trips/${activeTrip.id}/seats/${seatNumber}/lock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({})
            });
            if (res.ok) {
              const data = await res.json();
              setHeldExpiresAt(data.expiresAt);
            } else {
              const err = await res.json();
              alert(err.error || 'Failed to lock seat');
              setSelectedSeat(null);
            }
          }
        } catch (e) {
          alert('Network connection error');
          setSelectedSeat(null);
        } finally {
          setLockingSeatNumber(null);
        }
      }
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingType === 'round_trip') {
      if (!selectedSeat || !activeArrivalTrip || !activeReturnTrip) return;
    } else {
      if (!selectedSeat || !activeTrip) return;
    }
    
    setIsPaying(true);
    setCheckoutError('');

    if (isOfflineMode) {
      setTimeout(() => {
        if (bookingType === 'round_trip') {
          const arrivalBookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
          const returnBookingId = `book-${Math.random().toString(36).substring(2, 9)}`;

          const arrivalToken = `${arrivalBookingId.replace(/-/g, '')}.${activeArrivalTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeArrivalTrip.tripDate.replace(/-/g, '')}.1.0.mockhmacsig`;
          const returnToken = `${returnBookingId.replace(/-/g, '')}.${activeReturnTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeReturnTrip.tripDate.replace(/-/g, '')}.1.1.mockhmacsig`;

          const arrivalBooking = {
            id: arrivalBookingId,
            tripId: activeArrivalTrip.id,
            seatNumber: selectedSeat,
            status: 'confirmed',
            bookingType: 'round_trip',
            legType: 'to_campus',
            pairedBookingId: returnBookingId,
            paymentMethod,
            paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
            receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
            qrToken: arrivalToken,
            tripDate: activeArrivalTrip.tripDate,
            routeAr: activeArrivalTrip.bus.name.split('/')[0],
            departureTime: activeArrivalTrip.departureTime,
            riderName: loggedInUser.fullName,
            riderEmail: loggedInUser.email,
            isBoarded: false,
            boardedAt: null
          };

          const returnBooking = {
            id: returnBookingId,
            tripId: activeReturnTrip.id,
            seatNumber: selectedSeat,
            status: 'confirmed',
            bookingType: 'round_trip',
            legType: 'from_campus',
            pairedBookingId: arrivalBookingId,
            paymentMethod,
            paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
            receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
            qrToken: returnToken,
            tripDate: activeReturnTrip.tripDate,
            routeAr: activeReturnTrip.bus.name.split('/')[0],
            departureTime: activeReturnTrip.departureTime,
            riderName: loggedInUser.fullName,
            riderEmail: loggedInUser.email,
            isBoarded: false,
            boardedAt: null
          };

          const all = getLocalBookings();
          localStorage.setItem('aesh_bookings', JSON.stringify([...all, arrivalBooking, returnBooking]));
          setMyBookings(prev => [arrivalBooking, returnBooking, ...prev]);

          addMockAuditLog('SEAT_BOOKED', `Rider booked round-trip seat ${selectedSeat} on Trips ${activeArrivalTrip.id} & ${activeReturnTrip.id}`);
          setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked', userId: loggedInUser.id } : s));
        } else {
          const bookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
          const legCode = bookingType === 'to_campus' ? '0' : '1';
          const compactToken = `${bookingId.replace(/-/g, '')}.${activeTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeTrip.tripDate.replace(/-/g, '')}.1.${legCode}.mockhmacsig`;
          
          const newBooking = {
            id: bookingId,
            tripId: activeTrip.id,
            seatNumber: selectedSeat,
            status: 'confirmed',
            bookingType: 'one_way',
            legType: bookingType === 'to_campus' ? 'to_campus' : 'from_campus',
            paymentMethod,
            paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
            receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
            qrToken: compactToken,
            tripDate: activeTrip.tripDate,
            routeAr: activeTrip.bus.name.split('/')[0],
            departureTime: activeTrip.departureTime,
            riderName: loggedInUser.fullName,
            riderEmail: loggedInUser.email,
            isBoarded: false,
            boardedAt: null
          };

          const all = getLocalBookings();
          localStorage.setItem('aesh_bookings', JSON.stringify([...all, newBooking]));
          setMyBookings(prev => [newBooking, ...prev]);

          addMockAuditLog('SEAT_BOOKED', `Rider booked seat ${selectedSeat} on Trip ID ${activeTrip.id}`);
          setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked', userId: loggedInUser.id } : s));
        }

        setIsPaying(false);
        setShowCheckout(false);
        setSelectedSeat(null);
        
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 1500);
    } else {
      try {
        let res;
        if (bookingType === 'round_trip') {
          res = await fetch(`${API_URL}/api/bookings/round-trip`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              toCampusTripId: activeArrivalTrip.id,
              toCampusSeatNumber: selectedSeat,
              fromCampusTripId: activeReturnTrip.id,
              fromCampusSeatNumber: selectedSeat,
              paymentMethod,
              receiptRef
            })
          });
        } else {
          res = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
              tripId: activeTrip.id,
              seatNumber: selectedSeat,
              paymentMethod,
              bookingType: 'one_way',
              legType: bookingType === 'to_campus' ? 'to_campus' : 'from_campus',
              receiptRef
            })
          });
        }

        if (res.ok) {
          loadUserBookings();
          setIsPaying(false);
          setShowCheckout(false);
          setSelectedSeat(null);
          
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        } else {
          const err = await res.json();
          setCheckoutError(formatErrorMessage(err.error) || 'Payment failed');
          setIsPaying(false);
        }
      } catch (e) {
        setCheckoutError('Connection lost to payment gate');
        setIsPaying(false);
      }
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    const confirmation = window.confirm("Are you sure you want to cancel this booking?");
    if (!confirmation) return;

    if (isOfflineMode) {
      const all = getLocalBookings();
      const booking = all.find((b: any) => b.id === bookingId);
      if (!booking) return;

      const updated = all.map((b: any) => {
        if (b.id === bookingId || (booking.pairedBookingId && b.id === booking.pairedBookingId)) {
          return { ...b, status: 'cancelled' };
        }
        return b;
      });
      localStorage.setItem('aesh_bookings', JSON.stringify(updated));
      
      setMyBookings(prev => prev.map(b => (b.id === bookingId || (booking.pairedBookingId && b.id === booking.pairedBookingId)) ? { ...b, status: 'cancelled' } : b));
      addMockAuditLog('SEAT_CANCELLED', `Rider cancelled booking ${bookingId}`);
      if (activeTrip) loadMockSeats(activeTrip.id);
      if (activeArrivalTrip && activeReturnTrip) loadMockSeatsForRoundTrip(activeArrivalTrip.id, activeReturnTrip.id);
      alert("Ticket cancelled successfully.");
    } else {
      try {
        const res = await fetch(`${API_URL}/api/bookings/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId })
        });

        if (res.ok) {
          loadUserBookings();
          if (activeTrip) loadBackendSeats(activeTrip.id);
          alert("Ticket cancelled successfully.");
        } else {
          const err = await res.json();
          alert(formatErrorMessage(err.error) || "Failed to cancel ticket");
        }
      } catch (e) {
        alert("Failed to connect to API");
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    if (isOfflineMode) {
      setTimeout(() => {
        let mockUser = {
          id: 'user-default-id',
          email: loginEmail,
          fullName: 'Abdelrahman Ehab',
          role: 'rider'
        };

        if (loginEmail === 'supervisor@gu.edu.eg' || loginEmail === 'driver@gu.edu.eg') {
          mockUser = { id: 'supervisor-id', email: loginEmail, fullName: 'Supervisor Aesh (Merged)', role: 'supervisor' };
        } else if (loginEmail === 'admin@gu.edu.eg') {
          mockUser = { id: 'admin-id', email: loginEmail, fullName: 'System Administrator', role: 'admin' };
        }

        localStorage.setItem('aesh_web_token', 'mock-offline-token');
        localStorage.setItem('aesh_web_user', JSON.stringify(mockUser));
        setToken('mock-offline-token');
        setLoggedInUser(mockUser);
        setRole(mockUser.role as any);
        setIsLoggingIn(false);
      }, 800);
    } else {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password: loginPassword })
        });

        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('aesh_web_token', data.token);
          localStorage.setItem('aesh_web_user', JSON.stringify(data.user));
          setToken(data.token);
          setLoggedInUser(data.user);
          setRole(data.user.role);
          setLoginPassword('');
        } else {
          const err = await res.json();
          setLoginError(formatErrorMessage(err.error) || 'Authentication failed');
        }
      } catch (err) {
        setLoginError('Could not connect to authentication API');
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsRegistering(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registerEmail,
          fullName: registerName,
          role: registerRole,
          password: registerPassword
        })
      });

      if (res.ok) {
        const loginRes = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: registerEmail, password: registerPassword })
        });

        if (loginRes.ok) {
          const data = await loginRes.json();
          localStorage.setItem('aesh_web_token', data.token);
          localStorage.setItem('aesh_web_user', JSON.stringify(data.user));
          setToken(data.token);
          setLoggedInUser(data.user);
          setRole(data.user.role);
          
          setRegisterName('');
          setRegisterEmail('');
          setRegisterPassword('');
          setRegisterRole('rider');
        } else {
          setLoginEmail(registerEmail);
          setLoginPassword(registerPassword);
          setAuthTab('login');
          alert('Registration successful! Please log in.');
        }
      } else {
        const err = await res.json();
        setLoginError(formatErrorMessage(err.error) || 'Registration failed');
      }
    } catch (err) {
      setLoginError('Could not connect to registration API');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setResetSuccessMessage('');
    setIsResetting(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      if (res.ok) {
        setResetSuccessMessage('A temporary password has been sent to your email.');
        setForgotEmail('');
        setTimeout(() => {
          setAuthTab('login');
          setResetSuccessMessage('');
        }, 4000);
      } else {
        const err = await res.json();
        setLoginError(formatErrorMessage(err.error) || 'Failed to request password reset');
      }
    } catch (err) {
      setLoginError('Could not connect to authentication API');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogOut = () => {
    localStorage.removeItem('aesh_web_token');
    localStorage.removeItem('aesh_web_user');
    setToken('');
    setLoggedInUser(null);
    setSelectedSeat(null);
    setMyBookings([]);
  };

  const loadUserBookings = async () => {
    if (isOfflineMode) {
      const all = getLocalBookings();
      const mine = all.filter((b: any) => b.riderEmail === loggedInUser?.email);
      setMyBookings(mine);
    } else {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/bookings/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMyBookings(data);
        }
      } catch (e) {
        console.error('Failed to load backend bookings', e);
      }
    }
  };

  // Run on mount or user role select
  useEffect(() => {
    loadUserBookings();
  }, [loggedInUser, isOfflineMode]);

  // --- SUPERVISOR ACTIONS: SWAP & CANCEL ---

  const handleSupervisorCancel = async (bookingId: string) => {
    const reason = window.prompt("Enter cancellation reason:");
    if (reason === null) return; // cancelled

    if (isOfflineMode) {
      const all = getLocalBookings();
      const updated = all.map((b: any) => b.id === bookingId ? { ...b, status: 'cancelled', cancelReason: reason } : b);
      localStorage.setItem('aesh_bookings', JSON.stringify(updated));
      
      addMockAuditLog('SUPERVISOR_CANCEL', `Supervisor cancelled booking ${bookingId} for reason: ${reason}`);
      if (activeTrip) {
        loadMockSeats(activeTrip.id);
        loadMockManifest(activeTrip.id);
      }
      alert('Passenger booking cancelled.');
    } else {
      try {
        const res = await fetch(`${API_URL}/api/bookings/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ bookingId, reason })
        });
        if (res.ok) {
          if (activeTrip) {
            loadBackendSeats(activeTrip.id);
            loadBackendManifest(activeTrip.id);
          }
          alert('Passenger booking cancelled.');
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSupervisorSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapBookingTarget || !swapTripId || !swapSeatNumber) return;

    setIsSwapping(true);
    const targetTripNum = parseInt(swapTripId);
    const targetSeatNum = parseInt(swapSeatNumber);

    if (isOfflineMode) {
      setTimeout(() => {
        const all = getLocalBookings();
        
        // Verify target occupancy
        const conflict = all.find((b: any) => b.tripId === targetTripNum && b.seatNumber === targetSeatNum && b.status === 'confirmed');
        if (conflict) {
          alert('Target seat is already occupied!');
          setIsSwapping(false);
          return;
        }

        const updated = all.map((b: any) => {
          if (b.id === swapBookingTarget.bookingId) {
            const updatedToken = `${b.id.replace(/-/g, '')}.${targetTripNum.toString(16)}.${targetSeatNum.toString(16)}.${b.tripDate.replace(/-/g, '')}.2.mockhmacsig`;
            return {
              ...b,
              tripId: targetTripNum,
              seatNumber: targetSeatNum,
              status: 'swapped',
              qrToken: updatedToken,
              qrVersion: (b.qrVersion || 1) + 1
            };
          }
          return b;
        });

        localStorage.setItem('aesh_bookings', JSON.stringify(updated));
        addMockAuditLog('SUPERVISOR_SWAP', `Supervisor swapped booking ${swapBookingTarget.bookingId} to Trip ${targetTripNum} Seat ${targetSeatNum}`);

        if (activeTrip) {
          loadMockSeats(activeTrip.id);
          loadMockManifest(activeTrip.id);
        }

        setIsSwapping(false);
        setSwapBookingTarget(null);
        alert('Passenger reassigned successfully.');
      }, 1000);
    } else {
      try {
        const res = await fetch(`${API_URL}/api/bookings/swap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            bookingId: swapBookingTarget.bookingId,
            targetTripId: targetTripNum,
            targetSeatNumber: targetSeatNum
          })
        });

        if (res.ok) {
          if (activeTrip) {
            loadBackendSeats(activeTrip.id);
            loadBackendManifest(activeTrip.id);
          }
          setSwapBookingTarget(null);
          alert('Passenger reassigned successfully.');
        } else {
          const err = await res.json();
          alert(formatErrorMessage(err.error) || 'Failed to reassign');
        }
      } catch (e) {
        alert('Network connection error');
      } finally {
        setIsSwapping(false);
      }
    }
  };

  // --- DRIVER SIMULATED CAMERA SCAN ---

  // --- BROWSER CAMERA SCANNING IMPLEMENTATION ---

  const startCameraScan = async () => {
    setIsCameraActive(true);
    setCameraError(null);
    setScanResult(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Insecure Context Blocked: Browsers restrict camera access to secure connections (HTTPS or localhost). ' +
        'Since you are testing on your phone over local Wi-Fi HTTP, you must enable your browser flag to trust this address (e.g. go to chrome://flags/#unsafely-treat-insecure-origin-as-secure in Chrome, add "http://192.168.1.9:3001", enable, and relaunch).'
      );
      setIsCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        scanAnimationRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.error('[Camera] Access denied or error:', err);
      setCameraError('Camera access denied. Please grant permission in your browser settings.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScan = () => {
    if (scanAnimationRef.current) {
      cancelAnimationFrame(scanAnimationRef.current);
      scanAnimationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const scanTick = () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        console.log('[Camera] Decoded QR:', code.data);
        
        // Scan successful
        setScanInputToken(code.data);
        
        // Stop camera tracks immediately
        if (scanAnimationRef.current) {
          cancelAnimationFrame(scanAnimationRef.current);
          scanAnimationRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);

        // Process verify call
        processScanVerify(code.data);
        return;
      }
    }

    scanAnimationRef.current = requestAnimationFrame(scanTick);
  };

  const processScanVerify = async (tokenString: string) => {
    setIsScanning(true);
    setScanResult(null);

    if (isOfflineMode) {
      setTimeout(() => {
        setIsScanning(false);
        const all = getLocalBookings();
        
        // Basic offline token parsing
        const parts = tokenString.split('.');
        if (parts.length < 5) {
          setScanResult({ success: false, result: 'invalid', message: 'ERROR: Scan Invalid (Signature Tampered/Invalid Format)' });
          return;
        }

        const [bookingHex, tripHex, seatHex, dateHex, versionHex, legCode] = parts;
        const targetBooking = all.find((b: any) => b.id.replace(/-/g, '') === bookingHex);

        if (!targetBooking) {
          setScanResult({ success: false, result: 'invalid', message: 'ERROR: Booking Record Not Found' });
          return;
        }

        if (targetBooking.status === 'cancelled') {
          setScanResult({ success: false, result: 'expired', message: 'ERROR: Ticket Cancelled / Refunded' });
          return;
        }

        // Check leg type
        const expectedLegCode = selectedDirection === 'to_campus' ? '0' : '1';
        if (legCode && legCode !== expectedLegCode) {
          setScanResult({
            success: false,
            result: 'wrong_leg',
            message: `WRONG LEG: This is a ${legCode === '0' ? 'University' : 'Return'} ticket, but you are scanning for ${selectedDirection === 'to_campus' ? 'University' : 'Return'} leg.`
          });
          return;
        }

        // Check if correct trip (mock match check)
        const scanTripId = parseInt(tripHex, 16);
        if (activeTrip && scanTripId !== activeTrip.id) {
          setScanResult({ 
            success: false, 
            result: 'wrong_bus', 
            message: `WRONG BUS! Rider belongs on Route: ${targetBooking.routeAr || 'Different Route'}, Bus: ${targetBooking.busName || 'Assigned Bus'}` 
          });
          return;
        }

        if (targetBooking.isBoarded) {
          setScanResult({ 
            success: false, 
            result: 'already_checked_in', 
            message: `ALREADY CHECKED IN at ${targetBooking.boardedAt}` 
          });
          return;
        }

        // Confirm Boarding
        const checkInTime = new Date().toLocaleTimeString();
        targetBooking.isBoarded = true;
        targetBooking.boardedAt = checkInTime;

        const updated = all.map((b: any) => b.id === targetBooking.id ? targetBooking : b);
        localStorage.setItem('aesh_bookings', JSON.stringify(updated));

        addMockAuditLog('ATTENDANCE_SCAN', `Rider ${targetBooking.riderName} scanned on board (Trip: ${targetBooking.tripId}, Seat: ${targetBooking.seatNumber})`);

        setScanResult({
          success: true,
          result: 'valid',
          riderName: targetBooking.riderName,
          seatNumber: targetBooking.seatNumber,
          route: targetBooking.routeAr || 'El Obour',
          time: checkInTime
        });

        if (activeTrip) loadMockManifest(activeTrip.id);
      }, 800); // 0.8s scan simulation for UX feel
    } else {
      try {
        const res = await fetch(`${API_URL}/api/scan/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ token: tokenString })
        });
        const data = await res.json();
        setIsScanning(false);
        setScanResult(data);
        if (activeTrip && data.success) {
          loadBackendManifest(activeTrip.id);
        }
      } catch (e) {
        setIsScanning(false);
        setScanResult({ success: false, result: 'invalid', message: 'API connection failed' });
      }
    }
  };

  const handleSimulatedScan = async () => {
    if (!scanInputToken) return;
    await processScanVerify(scanInputToken);
  };

  // Unmount camera stream cleanup hook
  useEffect(() => {
    return () => {
      if (scanAnimationRef.current) {
        cancelAnimationFrame(scanAnimationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // --- HELPER LOGGERS ---
  const addMockAuditLog = (action: string, details: string) => {
    const logs = JSON.parse(localStorage.getItem('aesh_audit_logs') || '[]');
    const newLog = {
      id: logs.length + 1,
      action,
      details,
      time: new Date()
    };
    const updated = [newLog, ...logs];
    localStorage.setItem('aesh_audit_logs', JSON.stringify(updated));
    setAuditLogs(updated);
  };

  // --- SWITCH ROLE HELPER ---
  const handleRoleChange = (newRole: 'rider' | 'supervisor' | 'admin') => {
    if (!isOfflineMode) {
      let email = 'aes400196@gu.edu.eg';
      let pass = '1Key@GALALA';
      if (newRole === 'supervisor') {
        email = 'supervisor@gu.edu.eg';
        pass = 'super123';
      } else if (newRole === 'admin') {
        email = 'admin@gu.edu.eg';
        pass = 'admin123';
      }
      setLoginEmail(email);
      setLoginPassword(pass);
      handleLogOut();
      setRole(newRole);
      return;
    }

    setRole(newRole);
    // Simulating custom logged-in user characteristics based on selected view
    if (newRole === 'rider') {
      setLoggedInUser({ id: 'user-default-id', email: 'aes400196@gu.edu.eg', fullName: 'Abdelrahman Ehab', role: 'rider' });
    } else if (newRole === 'supervisor') {
      setLoggedInUser({ id: 'supervisor-id', email: 'supervisor@gu.edu.eg', fullName: 'Supervisor Aesh', role: 'supervisor' });
    } else if (newRole === 'admin') {
      setLoggedInUser({ id: 'admin-id', email: 'admin@gu.edu.eg', fullName: 'System Administrator', role: 'admin' });
    }
  };

  const getGroupedBookings = () => {
    const grouped: any[] = [];
    const visited = new Set<string>();

    myBookings.forEach((b: any) => {
      if (visited.has(b.id)) return;

      if (b.bookingType === 'round_trip' && b.pairedBookingId) {
        const partner = myBookings.find((p: any) => p.id === b.pairedBookingId);
        if (partner) {
          visited.add(partner.id);
          const arrival = b.legType === 'to_campus' ? b : partner;
          const returnLeg = b.legType === 'from_campus' ? b : partner;
          grouped.push({
            type: 'round_trip',
            id: `${arrival.id}-${returnLeg.id}`,
            arrival,
            returnLeg,
            status: arrival.status === 'cancelled' || returnLeg.status === 'cancelled' ? 'cancelled' : 'confirmed',
          });
          visited.add(b.id);
          return;
        }
      }

      grouped.push({
        type: 'one_way',
        id: b.id,
        booking: b,
        status: b.status,
      });
      visited.add(b.id);
    });

    return grouped;
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden font-sans">
        {/* Decorative background gradients */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md space-y-8 glass-panel border-slate-800 p-8 rounded-3xl relative z-10 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-4 animate-bounce">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              bus<span className="text-sky-400 font-medium">.aesh</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-medium">Galala University Booking Console</p>
          </div>

          {/* Auth Tab Selector */}
          {authTab === 'forgot-password' ? (
            <div className="text-center pb-2">
              <h2 className="text-lg font-bold text-white">Reset Password</h2>
              <p className="text-xs text-slate-400 mt-1">Enter your email to receive a temporary password</p>
            </div>
          ) : (
            <div className="flex border-b border-slate-900">
              <button
                type="button"
                onClick={() => { setAuthTab('login'); setLoginError(''); }}
                className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${authTab === 'login' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab('register'); setLoginError(''); }}
                className={`flex-1 pb-3 text-center text-sm font-semibold border-b-2 transition-all ${authTab === 'register' ? 'border-sky-400 text-sky-400' : 'border-transparent text-slate-500 hover:text-slate-400'}`}
              >
                Create Account
              </button>
            </div>
          )}

          {loginError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {authTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="login-email-input" className="text-xs text-slate-400 font-semibold block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    id="login-email-input"
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@gu.edu.eg"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password-input" className="text-xs text-slate-400 font-semibold block">Password</label>
                  <button
                    type="button"
                    onClick={() => { setAuthTab('forgot-password'); setLoginError(''); }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <Settings className="w-4 h-4" />
                  </span>
                  <input 
                    id="login-password-input"
                    type="password" 
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/25"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Logging in via ERP...</span>
                  </>
                ) : (
                  <span>Log In with ERP Credentials</span>
                )}
              </button>
            </form>
          )}

          {authTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="register-name-input" className="text-xs text-slate-400 font-semibold block">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    id="register-name-input"
                    type="text" 
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-email-input" className="text-xs text-slate-400 font-semibold block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    id="register-email-input"
                    type="email" 
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-role-select" className="text-xs text-slate-400 font-semibold block">Account Role</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <Shield className="w-4 h-4" />
                  </span>
                  <select
                    id="register-role-select"
                    required
                    value={registerRole}
                    onChange={(e: any) => setRegisterRole(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 appearance-none"
                  >
                    <option value="rider" className="bg-slate-900 text-slate-100">Rider / Student</option>
                    <option value="supervisor" className="bg-slate-900 text-slate-100">Supervisor / Driver</option>
                    <option value="admin" className="bg-slate-900 text-slate-100">Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="register-password-input" className="text-xs text-slate-400 font-semibold block">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <Settings className="w-4 h-4" />
                  </span>
                  <input 
                    id="register-password-input"
                    type="password" 
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/25"
              >
                {isRegistering ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <span>Register & Log In</span>
                )}
              </button>
            </form>
          )}

          {authTab === 'forgot-password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
              {resetSuccessMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{resetSuccessMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="forgot-email-input" className="text-xs text-slate-400 font-semibold block">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input 
                    id="forgot-email-input"
                    type="email" 
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isResetting}
                className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-500/25"
              >
                {isResetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Reset Email...</span>
                  </>
                ) : (
                  <span>Send Reset Password</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setAuthTab('login'); setLoginError(''); }}
                className="w-full py-2.5 text-center text-xs text-slate-400 hover:text-slate-300 font-medium transition"
              >
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* Quick Demo Login Grid */}
          <div className="pt-4 border-t border-slate-900 space-y-3">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">Quick Demo Accounts (Autofill)</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setLoginEmail('aes400196@gu.edu.eg'); setLoginPassword('1Key@GALALA'); }}
                className="p-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition"
              >
                <p className="text-xs text-sky-400 font-semibold">Rider</p>
                <p className="text-[9px] text-slate-500 truncate">aes400196@gu...</p>
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('supervisor@gu.edu.eg'); setLoginPassword('super123'); }}
                className="p-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition"
              >
                <p className="text-xs text-violet-400 font-semibold">Supervisor</p>
                <p className="text-[9px] text-slate-500 truncate">supervisor@...</p>
              </button>
              <button
                type="button"
                onClick={() => { setLoginEmail('admin@gu.edu.eg'); setLoginPassword('admin123'); }}
                className="p-2.5 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 rounded-xl text-left transition"
              >
                <p className="text-xs text-pink-400 font-semibold">Admin</p>
                <p className="text-[9px] text-slate-500 truncate">admin@gu.edu...</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Top Banner (Status and Simulator Settings) */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-400 to-violet-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Bus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              bus<span className="text-sky-400 font-medium">.aesh</span>
            </h1>
            <p className="text-xs text-slate-400">Galala University Booking Console</p>
          </div>
        </div>

        {/* Offline / Online banner toggle */}
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 ${
            isOfflineMode ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
            {isOfflineMode ? 'Offline Simulation Mode' : 'Connected to API'}
          </div>

          {/* Quick Tab Swapping Panel */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
            <button 
              onClick={() => handleRoleChange('rider')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                role === 'rider' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rider
            </button>
            <button 
              onClick={() => handleRoleChange('supervisor')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                role === 'supervisor' ? 'bg-violet-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Supervisor
            </button>
            <button 
              onClick={() => handleRoleChange('admin')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                role === 'admin' ? 'bg-pink-500 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>

          {/* User Profile & Log Out */}
          {loggedInUser && (
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-200">{loggedInUser.fullName}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{loggedInUser.email}</p>
              </div>
              <button
                onClick={handleLogOut}
                title="Log Out"
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Route/Trip Selectors & Manifest/Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-400" />
              1. Route Settings
            </h2>
            
            {/* Route Dropdown */}
            <div className="space-y-1">
              <label htmlFor="bus-line-select" className="text-xs text-slate-400 font-medium">Select Bus Line</label>
              <select 
                id="bus-line-select"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-400"
              >
                {routes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nameAr} ({r.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Booking Type Selector */}
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Booking Type</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setBookingType('to_campus')}
                  className={`py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition ${
                    bookingType === 'to_campus' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Univ. Only
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('from_campus')}
                  className={`py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition ${
                    bookingType === 'from_campus' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Return Only
                </button>
                <button
                  type="button"
                  onClick={() => setBookingType('round_trip')}
                  className={`py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold transition ${
                    bookingType === 'round_trip' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Round Trip
                </button>
              </div>
            </div>

            {/* Time Shift Selector */}
            {(bookingType === 'to_campus' || bookingType === 'round_trip') && (
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Morning Shift</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTimeSlot('morning_1')}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${
                      timeSlot === 'morning_1' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Shift 1 (05-10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeSlot('morning_2')}
                    className={`py-2 rounded-lg text-xs font-semibold transition ${
                      timeSlot === 'morning_2' ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Shift 2 (10-11:30)
                  </button>
                </div>
              </div>
            )}

            {/* Date Input */}
            <div className="space-y-1">
              <label htmlFor="travel-date-input" className="text-xs text-slate-400 font-medium">Travel Date</label>
              <div className="relative">
                <input 
                  id="travel-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Active Buses Card */}
          <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Active Bus Options</h3>
            <div className="space-y-3">
              {bookingType === 'round_trip' ? (
                <>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">Arrival Bus (To Campus)</span>
                    {activeArrivalTrip ? (
                      <div className="p-4 rounded-xl border border-sky-400/30 bg-sky-500/10 text-white flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-sm">{activeArrivalTrip.bus.name}</h4>
                          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-sky-400" /> Departure: {activeArrivalTrip.departureTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-300">{activeArrivalTrip.bus.licensePlate}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">No active arrival trip scheduled.</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400">Return Bus (From Campus)</span>
                    {activeReturnTrip ? (
                      <div className="p-4 rounded-xl border border-violet-400/30 bg-violet-500/10 text-white flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-sm">{activeReturnTrip.bus.name}</h4>
                          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-violet-400" /> Departure: {activeReturnTrip.departureTime}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold text-slate-300">{activeReturnTrip.bus.licensePlate}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-2">No active return trip scheduled.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {trips.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No active trips scheduled for this date.</p>
                  ) : (
                    trips
                      .filter(t => {
                        const dir = bookingType === 'to_campus' ? 'to_campus' : 'from_campus';
                        const slot = bookingType === 'to_campus' ? timeSlot : 'return';
                        return t.direction === dir && t.timeSlot === slot;
                      })
                      .map(trip => (
                        <button
                          key={trip.id}
                          onClick={() => setActiveTrip(trip)}
                          className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${
                            activeTrip?.id === trip.id 
                              ? 'bg-sky-500/10 border-sky-400 text-white shadow-lg shadow-sky-500/5' 
                              : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <h4 className="font-semibold text-sm">{trip.bus.name}</h4>
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Departure: {trip.departureTime}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
                              {trip.priceEgp} EGP
                            </span>
                            <p className="text-[10px] text-slate-500 mt-1.5">{trip.bus.licensePlate}</p>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Columns (Role Dependent Panels) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TAB 1: RIDER INTERFACE */}
          {role === 'rider' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Bus Seat Layout Column */}
              <div className="md:col-span-2 glass-panel rounded-2xl p-6 border-slate-800 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Bus className="w-5 h-5 text-sky-400" />
                      2. Seat Selection
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Click a free seat to hold and purchase</p>
                  </div>
                  
                  {/* Legend */}
                  <div className="flex gap-3 text-[10px]">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-800 rounded"></span> Free</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded"></span> Held</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 rounded"></span> Sold</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-500 rounded"></span> Yours</div>
                  </div>
                </div>

                {(bookingType === 'round_trip' ? (activeArrivalTrip && activeReturnTrip) : activeTrip) ? (
                  <div className="w-full max-w-[340px] bg-slate-950 p-6 rounded-3xl border border-slate-800 relative">
                    
                    {/* Bus Dashboard Front */}
                    <div className="w-full border-b-2 border-dashed border-slate-800 pb-4 mb-6 flex justify-between items-center">
                      <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center">
                        <span className="w-4 h-4 rounded-full border border-slate-600"></span>
                      </div>
                      <div className="text-slate-600 text-xs font-semibold tracking-widest uppercase">Front of Bus</div>
                      <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-600 text-xs">🛞</div>
                    </div>

                    {/* Dynamic Seat Grid */}
                    <div className="grid grid-cols-5 gap-y-4 gap-x-2">
                      {seats.map((seat, index) => {
                        const isAisle = index % 5 === 2; // Column index 2 is aisle
                        const seatNum = seat.seatNumber;
                        const isSelectedByMe = selectedSeat === seatNum;
                        
                        let seatBg = 'bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-800';
                        if (seat.status === 'booked') {
                          seatBg = 'bg-red-500/20 border-red-500/30 text-red-400 cursor-not-allowed';
                        } else if (seat.status === 'held') {
                          seatBg = seat.userId === loggedInUser.id
                            ? 'bg-sky-500/30 border-sky-400 text-sky-200 animate-pulse'
                            : 'bg-amber-500/20 border-amber-500/30 text-amber-400 cursor-not-allowed';
                        } else if (isSelectedByMe) {
                          seatBg = 'bg-sky-500 text-white border-sky-300 shadow-lg shadow-sky-500/30';
                        }

                        if (isAisle) {
                          return (
                            <React.Fragment key={`row-${index}`}>
                              <div className="col-span-1 flex items-center justify-center text-slate-700 text-[10px]">Aisle</div>
                              <button
                                disabled={seat.status === 'booked' || (seat.status === 'held' && seat.userId !== loggedInUser.id)}
                                onClick={() => handleSeatClick(seatNum, seat.status)}
                                className={`h-11 rounded-lg text-xs font-bold transition-all ${seatBg}`}
                              >
                                {seatNum}
                              </button>
                            </React.Fragment>
                          );
                        }

                        return (
                          <button
                            key={seatNum}
                            disabled={seat.status === 'booked' || (seat.status === 'held' && seat.userId !== loggedInUser.id)}
                            onClick={() => handleSeatClick(seatNum, seat.status)}
                            className={`h-11 rounded-lg text-xs font-bold transition-all ${seatBg}`}
                          >
                            {seatNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center text-slate-500">Select a bus trip on the left to see seats</div>
                )}

                {/* Checkout Trigger Box */}
                {selectedSeat && (
                  <div className="w-full max-w-[340px] mt-6 bg-sky-500/10 border border-sky-400/30 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                      <p className="text-xs text-sky-300">Seat {selectedSeat} Reserved</p>
                      {heldExpiresAt && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Hold expires in: {Math.max(0, Math.floor((heldExpiresAt - Date.now()) / 1000))}s
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowCheckout(true)}
                      className="px-4 py-2 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-400 transition"
                    >
                      Proceed to Pay 160 EGP
                    </button>
                  </div>
                )}
              </div>

              {/* Booking Tickets / History Column */}
              <div className="md:col-span-1 space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-sky-400" />
                  My Boarding Passes
                </h3>
                
                {getGroupedBookings().length === 0 ? (
                  <div className="glass-panel rounded-2xl p-6 text-center text-slate-500 text-xs italic border-slate-800">
                    No active ticket purchases.
                  </div>
                ) : (
                  getGroupedBookings().map((g: any) => {
                    if (g.type === 'round_trip') {
                      const arr = g.arrival;
                      const ret = g.returnLeg;
                      const isExpanded = expandedTicketId === g.id;
                      const arrJustBoarded = justBoardedBookingIds.has(String(arr.id));
                      const retJustBoarded = justBoardedBookingIds.has(String(ret.id));
                      const arrBoarded = !!arr.qrUsedAt;
                      const retBoarded = !!ret.qrUsedAt;
                      const anyJustBoarded = arrJustBoarded || retJustBoarded;

                      return (
                        <div 
                          key={g.id} 
                          className={`glass-panel rounded-2xl border-slate-850 relative overflow-hidden transition-all duration-500 ${
                            g.status === 'cancelled' ? 'opacity-40' :
                            anyJustBoarded ? 'ticket-boarded' :
                            (arrBoarded && retBoarded) ? 'ticket-boarded' : ''
                          }`}
                        >
                          {/* Compact Header — always visible, click to expand */}
                          <button
                            onClick={() => setExpandedTicketId(isExpanded ? null : g.id)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                (arrBoarded && retBoarded) ? 'bg-green-500/20' :
                                arrBoarded || retBoarded ? 'bg-amber-500/20' : 'bg-sky-500/20'
                              }`}>
                                {(arrBoarded && retBoarded) ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <QrCode className={`w-5 h-5 ${
                                    arrBoarded || retBoarded ? 'text-amber-400' : 'text-sky-400'
                                  }`} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">Round Trip</span>
                                  {(arrBoarded || retBoarded) && (
                                    <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${
                                      (arrBoarded && retBoarded) ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                      {(arrBoarded && retBoarded) ? '✓ Both Scanned' : arrBoarded ? '✓ Arrival Scanned' : '✓ Return Scanned'}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-sm mt-1 truncate">{arr.routeAr || 'El Obour'}</h4>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3" /> {arr.tripDate} · Seat {arr.seatNumber}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 ticket-chevron ${isExpanded ? 'rotated' : ''}`} />
                          </button>

                          {/* Collapsible Content */}
                          <div className={`ticket-collapse-enter ${isExpanded ? 'open' : ''}`}>
                            <div className="px-4 pb-4 space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Arrival Leg QR */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-sky-300">1. Arrival Bus</p>
                                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" /> {arr.departureTime}
                                  </p>
                                  <p className="text-xs font-bold text-sky-400">Seat: {arr.seatNumber}</p>
                                  {arr.status === 'confirmed' && (
                                    <div className="space-y-2">
                                      <div className={`relative mx-auto rounded-lg overflow-hidden transition-all duration-500 ${
                                        arrJustBoarded ? 'qr-scanned-overlay' : ''
                                      } ${!arrBoarded ? 'qr-scan-line' : ''}`}
                                        style={{ width: '80px', height: '80px' }}
                                      >
                                        {arrBoarded ? (
                                          <div className="w-full h-full bg-green-500/10 border-2 border-green-500/30 rounded-lg flex flex-col items-center justify-center">
                                            <CheckCircle className={`w-8 h-8 text-green-400 ${arrJustBoarded ? 'qr-checkmark-anim' : ''}`} />
                                            <span className="text-[8px] text-green-400 font-bold mt-1">BOARDED</span>
                                          </div>
                                        ) : (
                                          <div className="w-full h-full bg-white p-1 rounded-lg">
                                            <img 
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(arr.qrToken)}`} 
                                              alt="Arrival QR"
                                              className="w-full h-full"
                                            />
                                          </div>
                                        )}
                                        {arrJustBoarded && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-12 h-12 rounded-full bg-green-500/30 qr-ripple" />
                                          </div>
                                        )}
                                      </div>
                                      {!arrBoarded && (
                                        <button
                                          onClick={() => {
                                            setScanInputToken(arr.qrToken);
                                            alert("Arrival QR Token copied to simulated scanner!");
                                          }}
                                          className="text-[9px] text-sky-400 hover:underline flex items-center gap-1 justify-center w-full"
                                        >
                                          <QrCode className="w-2.5 h-2.5" /> Simulate Arrival
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Return Leg QR */}
                                <div className="space-y-2 border-l border-slate-850 pl-4">
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-violet-300">2. Return Bus</p>
                                  <p className="text-[11px] text-slate-300 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" /> {ret.departureTime}
                                  </p>
                                  <p className="text-xs font-bold text-sky-400">Seat: {ret.seatNumber}</p>
                                  {ret.status === 'confirmed' && (
                                    <div className="space-y-2">
                                      <div className={`relative mx-auto rounded-lg overflow-hidden transition-all duration-500 ${
                                        retJustBoarded ? 'qr-scanned-overlay' : ''
                                      } ${!retBoarded ? 'qr-scan-line' : ''}`}
                                        style={{ width: '80px', height: '80px' }}
                                      >
                                        {retBoarded ? (
                                          <div className="w-full h-full bg-green-500/10 border-2 border-green-500/30 rounded-lg flex flex-col items-center justify-center">
                                            <CheckCircle className={`w-8 h-8 text-green-400 ${retJustBoarded ? 'qr-checkmark-anim' : ''}`} />
                                            <span className="text-[8px] text-green-400 font-bold mt-1">BOARDED</span>
                                          </div>
                                        ) : (
                                          <div className="w-full h-full bg-white p-1 rounded-lg">
                                            <img 
                                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ret.qrToken)}`} 
                                              alt="Return QR"
                                              className="w-full h-full"
                                            />
                                          </div>
                                        )}
                                        {retJustBoarded && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="w-12 h-12 rounded-full bg-green-500/30 qr-ripple" />
                                          </div>
                                        )}
                                      </div>
                                      {!retBoarded && (
                                        <button
                                          onClick={() => {
                                            setScanInputToken(ret.qrToken);
                                            alert("Return QR Token copied to simulated scanner!");
                                          }}
                                          className="text-[9px] text-sky-400 hover:underline flex items-center gap-1 justify-center w-full"
                                        >
                                          <QrCode className="w-2.5 h-2.5" /> Simulate Return
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Boarding status summary */}
                              {(arrBoarded || retBoarded) && (
                                <div className="bg-slate-800/40 rounded-lg p-3 text-[10px] text-slate-400 space-y-1">
                                  {arrBoarded && <p>✓ Arrival checked in{arr.qrUsedAt ? ` at ${new Date(arr.qrUsedAt).toLocaleTimeString()}` : ''}</p>}
                                  {retBoarded && <p>✓ Return checked in{ret.qrUsedAt ? ` at ${new Date(ret.qrUsedAt).toLocaleTimeString()}` : ''}</p>}
                                </div>
                              )}

                              {g.status === 'confirmed' && !arrBoarded && !retBoarded && (
                                <div className="pt-2 border-t border-slate-850 text-right">
                                  <button
                                    onClick={() => handleCancelBooking(arr.id)}
                                    className="text-[10px] text-red-400 hover:underline font-semibold"
                                  >
                                    Cancel Round Trip (Both Seats)
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const b = g.booking;
                      const isExpanded = expandedTicketId === g.id;
                      const isJustBoarded = justBoardedBookingIds.has(String(b.id));
                      const isBoarded = !!b.qrUsedAt;

                      return (
                        <div 
                          key={g.id} 
                          className={`glass-panel rounded-2xl border-slate-850 relative overflow-hidden transition-all duration-500 ${
                            g.status === 'cancelled' ? 'opacity-40' :
                            isJustBoarded ? 'ticket-boarded' :
                            isBoarded ? 'ticket-boarded' : ''
                          }`}
                        >
                          {/* Compact Header — always visible, click to expand */}
                          <button
                            onClick={() => setExpandedTicketId(isExpanded ? null : g.id)}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isBoarded ? 'bg-green-500/20' : 'bg-sky-500/20'
                              }`}>
                                {isBoarded ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <QrCode className="w-5 h-5 text-sky-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                                    b.status === 'confirmed' ? 'bg-sky-500/20 text-sky-400' : 'bg-red-500/20 text-red-400'
                                  }`}>
                                    {b.status}
                                  </span>
                                  <span className="text-[9px] text-slate-500 uppercase font-semibold">
                                    {b.legType === 'to_campus' ? 'To Campus' : 'Return'}
                                  </span>
                                  {isBoarded && (
                                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                                      ✓ Scanned
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-semibold text-sm mt-1 truncate">{b.routeAr || 'El Obour'}</h4>
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3" /> {b.tripDate} · Seat {b.seatNumber}
                                </p>
                              </div>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 ticket-chevron ${isExpanded ? 'rotated' : ''}`} />
                          </button>

                          {/* Collapsible Content */}
                          <div className={`ticket-collapse-enter ${isExpanded ? 'open' : ''}`}>
                            <div className="px-4 pb-4 space-y-3">
                              {/* Trip Details */}
                              <div className="bg-slate-800/40 rounded-lg p-3 space-y-1.5">
                                <p className="text-xs text-slate-300 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-500" /> Departure: {b.departureTime}
                                </p>
                                <p className="text-sm font-bold text-sky-400">Seat: {b.seatNumber}</p>
                              </div>

                              {/* QR Code Section */}
                              {b.status === 'confirmed' && (
                                <div className="flex flex-col items-center space-y-3">
                                  <div className={`relative rounded-xl overflow-hidden transition-all duration-500 ${
                                    isJustBoarded ? 'qr-scanned-overlay' : ''
                                  } ${!isBoarded ? 'qr-scan-line' : ''}`}
                                    style={{ width: '140px', height: '140px' }}
                                  >
                                    {isBoarded ? (
                                      <div className="w-full h-full bg-green-500/10 border-2 border-green-500/30 rounded-xl flex flex-col items-center justify-center">
                                        <CheckCircle className={`w-12 h-12 text-green-400 ${isJustBoarded ? 'qr-checkmark-anim' : ''}`} />
                                        <span className="text-xs text-green-400 font-bold mt-2">BOARDED</span>
                                        {b.qrUsedAt && (
                                          <span className="text-[9px] text-green-400/60 mt-0.5">
                                            {new Date(b.qrUsedAt).toLocaleTimeString()}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="w-full h-full bg-white p-2 rounded-xl">
                                        <img 
                                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(b.qrToken)}`} 
                                          alt="Ticket QR"
                                          className="w-full h-full"
                                        />
                                      </div>
                                    )}
                                    {isJustBoarded && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-16 h-16 rounded-full bg-green-500/30 qr-ripple" />
                                      </div>
                                    )}
                                  </div>

                                  {!isBoarded && (
                                    <button
                                      onClick={() => {
                                        setScanInputToken(b.qrToken);
                                        alert("QR Token copied to simulated scanner!");
                                      }}
                                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                                    >
                                      <QrCode className="w-3 h-3" /> Simulate Scan
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Cancel Button — only if not yet boarded */}
                              {b.status === 'confirmed' && !isBoarded && (
                                <div className="pt-2 border-t border-slate-800 text-right">
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    className="text-[10px] text-red-400 hover:underline"
                                  >
                                    Cancel Seat
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SUPERVISOR CONSOLE (With integrated Boarding Scanner) */}
          {role === 'supervisor' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              
              {/* Manifest Table */}
              <div className="xl:col-span-2 glass-panel rounded-2xl p-6 border-slate-800 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-violet-400" />
                      Supervisor Operations Panel
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Manage live rosters, boarding logs, and swap seats</p>
                  </div>
                  <div className="text-xs text-violet-400 bg-violet-500/10 px-3 py-1 rounded-md border border-violet-500/20">
                    Route: {activeTrip?.bus.name || 'No bus active'}
                  </div>
                </div>

                {/* Roster Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase font-semibold">
                        <th className="py-3 px-4">Seat</th>
                        <th className="py-3 px-4">Rider</th>
                        <th className="py-3 px-4">Booking Status</th>
                        <th className="py-3 px-4">Boarding State</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-sm">
                      {supervisorManifest.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 italic">No passengers currently booked on this trip.</td>
                        </tr>
                      ) : (
                        supervisorManifest.map(row => (
                          <tr key={row.bookingId} className="hover:bg-slate-900/30">
                            <td className="py-3.5 px-4 font-bold text-sky-400">{row.seatNumber}</td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-200">{row.riderName}</div>
                              <div className="text-xs text-slate-500">{row.riderEmail}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                row.status === 'confirmed' || row.status === 'swapped' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {row.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              {row.isBoarded ? (
                                <span className="text-emerald-400 flex items-center gap-1.5 text-xs">
                                  <CheckCircle className="w-4 h-4" /> Boarded ({row.boardedAt})
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1.5 text-xs">
                                  <Clock className="w-4 h-4" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              {row.status !== 'cancelled' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSwapBookingTarget(row);
                                      setSwapSeatNumber('');
                                      setSwapTripId('');
                                    }}
                                    className="text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                                  >
                                    Reassign (Swap)
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Attendance Scanner Card */}
              <div className="xl:col-span-1 glass-panel rounded-2xl p-6 border-slate-800 flex flex-col items-center h-fit space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-white flex items-center justify-center gap-2 mb-1">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    Boarding Scanner
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verify passengers' tickets and log boarding events.
                  </p>
                </div>

                {/* Mobile Camera Scan Frame */}
                <div className="w-full max-w-[280px] aspect-[3/4] bg-slate-950 rounded-2xl border-4 border-slate-800 relative overflow-hidden flex flex-col p-6 text-center justify-center">
                  {/* Hidden Canvas for decoding frame stream */}
                  <canvas ref={canvasRef} className="hidden" />

                  {isCameraActive && (
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {/* Scanner overlay reticle */}
                  {(isCameraActive || isScanning || !scanResult) && (
                    <div className="absolute inset-4 border border-dashed border-emerald-500/40 rounded-xl pointer-events-none flex items-center justify-center z-10">
                      <div className="w-full h-0.5 bg-emerald-400 absolute animate-bounce"></div>
                    </div>
                  )}

                  {isScanning ? (
                    <div className="my-auto space-y-3 z-20 relative">
                      <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-850 shadow-xl inline-block mx-auto">
                        <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto" />
                        <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest mt-2">Verifying...</p>
                      </div>
                    </div>
                  ) : scanResult ? (
                    <div className="my-auto space-y-4 px-2 z-20 relative bg-slate-950/95 py-4 rounded-xl border border-slate-850 shadow-xl">
                      {scanResult.success ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto border border-emerald-500/35 animate-pulse">
                            <CheckCircle className="w-8 h-8 text-emerald-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white uppercase">Valid Ticket</h4>
                            <p className="text-xs text-slate-400 mt-1 font-semibold text-emerald-300">
                              {scanResult.riderName}
                            </p>
                            <p className="text-lg font-extrabold text-sky-400 mt-1">Seat: {scanResult.seatNumber}</p>
                            <p className="text-[10px] text-slate-500 mt-2">Bus: {scanResult.bus || 'Obour Line'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto border border-red-500/35">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-red-400 uppercase">Access Denied</h4>
                            <p className="text-xs text-slate-300 mt-2 font-medium">{scanResult.message}</p>
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => setScanResult(null)}
                        className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-semibold hover:bg-slate-700"
                      >
                        Scan Next
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    <div className="absolute bottom-4 left-0 right-0 z-20">
                      <span className="bg-slate-950/80 px-3 py-1 rounded-full text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        Camera Viewfinder Active
                      </span>
                    </div>
                  ) : (
                    <div className="my-auto text-slate-500 space-y-2 z-10">
                      <QrCode className="w-12 h-12 mx-auto opacity-30" />
                      <p className="text-xs">Camera is inactive</p>
                    </div>
                  )}
                </div>

                {/* Camera Activation Controls */}
                <div className="w-full flex flex-col gap-2">
                  {cameraError && (
                    <p className="text-center text-[10px] text-red-400 font-medium bg-red-500/10 border border-red-500/15 p-2.5 rounded-xl">
                      {cameraError}
                    </p>
                  )}

                  {isCameraActive ? (
                    <button
                      onClick={stopCameraScan}
                      className="w-full py-2.5 px-4 bg-red-500 hover:bg-red-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Camera className="w-4 h-4" /> Stop Camera
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowCameraPermissionGuide(true)}
                      disabled={isScanning}
                      className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/15"
                    >
                      <Camera className="w-4 h-4" /> Start Camera
                    </button>
                  )}
                </div>

                {/* Simulated scan text input as fallback */}
                <div className="w-full space-y-2 pt-3 border-t border-slate-900">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Or Paste Token Manually:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={scanInputToken}
                      onChange={(e) => setScanInputToken(e.target.value)}
                      placeholder="bookingId.tripId.seat.date.version.sig"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      onClick={handleSimulatedScan}
                      disabled={!scanInputToken || isScanning || isCameraActive}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold disabled:opacity-40 transition"
                    >
                      Verify
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADMIN SETTINGS PANEL */}
          {role === 'admin' && (
            <div className="glass-panel rounded-2xl p-6 border-slate-800 space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  Admin Configuration Panel
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Control global university policies, lock windows and review audit logs</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Configuration Slider */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300">Policy Configurations</h3>
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Cancellation Lock-out Hours</span>
                        <span className="text-pink-400">{cancelLockHours} Hours</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="24"
                        value={cancelLockHours}
                        onChange={(e) => {
                          setCancelLockHours(Number(e.target.value));
                          addMockAuditLog('POLICY_CHANGED', `Admin updated cancellation lock window to ${e.target.value} hours`);
                        }}
                        className="w-full accent-pink-500" 
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Riders cannot cancel seats within this number of hours before departure.</p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 space-y-2">
                      <h4 className="text-xs font-semibold text-slate-400">Mock Data Settings</h4>
                      <button
                        onClick={() => {
                          localStorage.setItem('aesh_bookings', JSON.stringify([]));
                          setMyBookings([]);
                          if (activeTrip) loadMockSeats(activeTrip.id);
                          addMockAuditLog('CLEAR_DATABASE', 'Admin cleared local simulation database');
                          alert('Database wiped.');
                        }}
                        className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl hover:bg-red-500/20 transition"
                      >
                        Wipe All Booking Logs
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Logs list */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-pink-400" />
                    System Audit Trail
                  </h3>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 h-[280px] overflow-y-auto space-y-3 text-xs seat-scrollbar">
                    {auditLogs.map(log => (
                      <div key={log.id} className="pb-2 border-b border-slate-900 flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">{log.action}</span>
                          <p className="text-slate-300 mt-0.5">{log.details}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 shrink-0">
                          {new Date(log.time).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL: CAMERA PERMISSION GUIDE */}
      {showCameraPermissionGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border-slate-800 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
              <Camera className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Camera Access Required</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                bus.aesh needs access to your device's camera to scan ticket QR codes and verify passenger attendance.
              </p>
              <p className="text-xs text-emerald-400 font-semibold bg-emerald-950/45 py-2 px-3 rounded-xl border border-emerald-900/40 inline-block mt-2">
                Please click "Allow" on the browser prompt that appears next.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCameraPermissionGuide(false)}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl text-xs font-semibold border border-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCameraPermissionGuide(false);
                  startCameraScan();
                }}
                className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/15"
              >
                Allow Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: HIGH-FIDELITY MOCK PAYMENTS / RECEIPT UPLOAD */}
      {showCheckout && selectedSeat && (bookingType === 'round_trip' ? (activeArrivalTrip && activeReturnTrip) : activeTrip) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border-slate-800 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-sky-400" />
                  aesh.payment gateway
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Galala Booking Transaction Portal</p>
              </div>
              <button 
                onClick={() => setShowCheckout(false)}
                className="text-slate-400 hover:text-white text-lg font-medium"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Rider name</span>
                <span className="font-semibold text-slate-200">{loggedInUser.fullName}</span>
              </div>
              {bookingType === 'round_trip' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arrival Bus</span>
                    <span className="font-semibold text-slate-200">{activeArrivalTrip.bus.name.split('/')[0]} ({activeArrivalTrip.departureTime})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Return Bus</span>
                    <span className="font-semibold text-slate-200">{activeReturnTrip.bus.name.split('/')[0]} ({activeReturnTrip.departureTime})</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-400">Bus Line</span>
                  <span className="font-semibold text-slate-200">{activeTrip.bus.name.split('/')[0]} ({activeTrip.departureTime})</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Seat Number</span>
                <span className="font-bold text-sky-400">{selectedSeat}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-2">
                <span className="text-slate-300 font-semibold">Total Amount</span>
                <span className="font-extrabold text-sky-400">160.00 EGP</span>
              </div>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold">Choose Payment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('visa_mock')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      paymentMethod === 'visa_mock' ? 'bg-sky-500/10 border-sky-400 text-sky-300' : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    Credit Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('instapay')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      paymentMethod === 'instapay' ? 'bg-sky-500/10 border-sky-400 text-sky-300' : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    Instapay
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('telda')}
                    className={`py-2 rounded-xl text-xs font-semibold border ${
                      paymentMethod === 'telda' ? 'bg-sky-500/10 border-sky-400 text-sky-300' : 'bg-slate-950 border-slate-850 text-slate-500'
                    }`}
                  >
                    Telda
                  </button>
                </div>
              </div>

              {paymentMethod === 'visa_mock' ? (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Card Number (Simulated)</label>
                    <input
                      type="text"
                      required
                      placeholder="4000 1234 5678 9010"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">Expiry Date</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400">CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={3}
                        placeholder="123"
                        className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-850 text-xs text-slate-300 space-y-2">
                    <p className="flex justify-between">
                      <span>Recipient Address:</span>
                      <strong className="text-sky-400">
                        {paymentMethod === 'instapay' ? '01007883492@instapay' : 'telda.link/abdelrahman_aesh'}
                      </strong>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Please send exactly **160 EGP** via {paymentMethod} to the address above. Upload the receipt file or type the transaction reference number below.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Transaction Ref / Phone Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9812739182"
                      value={receiptRef}
                      onChange={(e: any) => setReceiptRef(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">Upload Receipt Screenshot (Mockup)</label>
                    <input
                      type="file"
                      className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none text-slate-400"
                    />
                  </div>
                </div>
              )}

              {checkoutError && (
                <div className="text-red-400 text-xs font-semibold py-1">{checkoutError}</div>
              )}

              <button
                type="submit"
                disabled={isPaying}
                className="w-full mt-4 py-3.5 bg-gradient-to-tr from-sky-400 to-sky-500 text-slate-950 font-bold rounded-xl text-sm hover:from-sky-300 hover:to-sky-400 transition flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10"
              >
                {isPaying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing Transaction...
                  </>
                ) : (
                  'Complete & Authorize Ticket'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPERVISOR SWAP CONFIG */}
      {swapBookingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-filter backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border-slate-800 space-y-6 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Swap Passenger Ticket
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Move rider to another trip or seat</p>
              </div>
              <button 
                onClick={() => setSwapBookingTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSupervisorSwapSubmit} className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs space-y-1">
                <div><span className="text-slate-400">Rider: </span><strong className="text-slate-200">{swapBookingTarget.riderName}</strong></div>
                <div><span className="text-slate-400">Current Seat: </span><strong className="text-sky-400">{swapBookingTarget.seatNumber}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Target Trip ID (Number)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 11, 12"
                  value={swapTripId}
                  onChange={(e: any) => setSwapTripId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Target Seat Number (1-50)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15, 22"
                  value={swapSeatNumber}
                  onChange={(e: any) => setSwapSeatNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sky-400 text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={isSwapping}
                className="w-full py-3 bg-violet-500 hover:bg-violet-400 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2"
              >
                {isSwapping ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Swapping Seat...
                  </>
                ) : (
                  'Reassign Seat'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
