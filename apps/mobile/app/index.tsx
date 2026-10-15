import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  Alert,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ApiError, apiRequest, normalizeApiUrl, toWebSocketUrl } from '../src/api';
import { useAppContext } from '../src/app-context';
import { formatDepartureTime } from '../src/format';
import type { Route, Seat, Ticket, Trip } from '../src/types';
import TicketCard from '../src/components/TicketCard';
import styles from '../src/styles/home';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {}

const triggerLocalNotification = async (title: string, body: string) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (err) {
    console.log('Local push notification error:', err);
  }
};

const FACULTIES = [
  'Computer Science & Engineering',
  'Engineering',
  'Medicine',
  'Dentistry',
  'Pharmacy',
  'Administrative Sciences',
  'Art & Design',
  'Applied Health Sciences',
];

function authenticatedUser(data: any) {
  const account = data?.user;
  if (!data?.token || !account?.id || !account?.email || !account?.role) {
    throw new ApiError('The server did not return a complete authenticated session.', 502, 'INVALID_SESSION');
  }
  return {
    id: String(account.id),
    email: String(account.email),
    fullName: String(account.fullName || account.email),
    role: String(account.role),
    token: String(data.token),
  };
}

export default function AppHome() {
  const router = useRouter();
  const { serverUrl, setServerUrl, user, setUser, signOut } = useAppContext();

  // Server URL configuration
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Student Registration States
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regStep, setRegStep] = useState<'details' | 'verify_code'>('details');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAcademicId, setRegAcademicId] = useState('');
  const [regFaculty, setRegFaculty] = useState(FACULTIES[0]);
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regVerificationId, setRegVerificationId] = useState('');
  const [registrationPreverified, setRegistrationPreverified] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Selector states
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState<'to_campus' | 'from_campus'>('to_campus');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const operationalDates = React.useMemo(() => {
    const base = new Date();
    const offsets = [-1, 0, 1, 2, 3, 4, 5];
    const ARABIC_DAYS: Record<string, string> = {
      'SUN': 'الأحد', 'MON': 'الإثنين', 'TUE': 'الثلاثاء', 'WED': 'الأربعاء',
      'THU': 'الخميس', 'FRI': 'الجمعة', 'SAT': 'السبت'
    };
    return offsets.map(offset => {
      const cur = new Date(base);
      cur.setDate(base.getDate() + offset);
      const date = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      const day = String(cur.getDate());
      const month = cur.toLocaleDateString('en-US', { month: 'short' });
      const weekday = cur.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const weekdayAr = ARABIC_DAYS[weekday] || weekday;
      return {
        date,
        day,
        month,
        weekday,
        weekdayAr,
        isYesterday: offset === -1,
        isToday: offset === 0,
        isTomorrow: offset === 1,
        isBookable: offset >= 1,
      };
    });
  }, []);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  
  // Seat state
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [seatsError, setSeatsError] = useState<string | null>(null);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  
  // Zero-fare booking confirmation
  const [bookingConfirmationVisible, setBookingConfirmationVisible] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const bookingInProgress = useRef(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ tripId: number; seatNumber: number } | null>(null);
  const fetchTripsRef = useRef<() => Promise<void>>(async () => undefined);
  const routeRequestId = useRef(0);
  const tripRequestId = useRef(0);
  const seatRequestId = useRef(0);
  const ticketRequestId = useRef(0);

  // Routes always come from the API; an unavailable server is not a route list.
  const fetchRoutes = useCallback(async () => {
    const requestId = ++routeRequestId.current;
    setIsLoadingRoutes(true);
    setRoutesError(null);
    try {
      const data = await apiRequest<Route[]>('/api/routes', { baseUrl: serverUrl });
      if (!Array.isArray(data)) throw new ApiError('The server returned an invalid route list.', 502, 'INVALID_RESPONSE');
      if (requestId !== routeRequestId.current) return;
      setRoutes(data);
      setSelectedRouteId(current => data.some(route => route.id === current) ? current : data[0]?.id ?? null);
    } catch (error) {
      if (requestId !== routeRequestId.current) return;
      setRoutes([]);
      setSelectedRouteId(null);
      setRoutesError(error instanceof Error ? error.message : 'Could not load routes.');
    } finally {
      if (requestId === routeRequestId.current) setIsLoadingRoutes(false);
    }
  }, [serverUrl]);

  const fetchSeatsForTrip = useCallback(async (tripId: number) => {
    const requestId = ++seatRequestId.current;
    setIsLoadingSeats(true);
    setSeatsError(null);
    setSeats([]);
    setSelectedSeat(null);
    try {
      const data = await apiRequest<Seat[]>(`/api/trips/${tripId}/seats`, {
        baseUrl: serverUrl,
        token: user?.token,
      });
      if (!Array.isArray(data)) throw new ApiError('The server returned an invalid seat map.', 502, 'INVALID_RESPONSE');
      if (requestId === seatRequestId.current) setSeats(data);
    } catch (error) {
      if (requestId === seatRequestId.current) setSeatsError(error instanceof Error ? error.message : 'Could not load seats.');
    } finally {
      if (requestId === seatRequestId.current) setIsLoadingSeats(false);
    }
  }, [serverUrl, user?.token]);

  // Trips and seat maps are never generated on the device.
  const fetchTrips = useCallback(async () => {
    const requestId = ++tripRequestId.current;
    if (!selectedRouteId) {
      setIsLoadingTrips(false);
      setTrips([]);
      setActiveTrip(null);
      setSeats([]);
      setSelectedSeat(null);
      setTripsError(null);
      return;
    }
    setIsLoadingTrips(true);
    setTripsError(null);
    setTrips([]);
    setActiveTrip(null);
    setSeats([]);
    setSelectedSeat(null);
    try {
      const data = await apiRequest<Trip[]>(
        `/api/trips?date=${encodeURIComponent(selectedDate)}&routeId=${selectedRouteId}&direction=${selectedDirection}`,
        { baseUrl: serverUrl, token: user?.token },
      );
      if (!Array.isArray(data)) throw new ApiError('The server returned an invalid trip list.', 502, 'INVALID_RESPONSE');
      if (requestId !== tripRequestId.current) return;
      setTrips(data);
      const nextTrip = data[0] ?? null;
      setActiveTrip(nextTrip);
      if (nextTrip) await fetchSeatsForTrip(nextTrip.id);
    } catch (error) {
      if (requestId !== tripRequestId.current) return;
      setTripsError(error instanceof Error ? error.message : 'Could not load trips.');
    } finally {
      if (requestId === tripRequestId.current) setIsLoadingTrips(false);
    }
  }, [serverUrl, selectedDate, selectedRouteId, selectedDirection, user?.token, fetchSeatsForTrip]);
  fetchTripsRef.current = fetchTrips;

  const fetchMyBookings = useCallback(async (): Promise<Ticket[] | null> => {
    const requestId = ++ticketRequestId.current;
    if (!user?.token) {
      setMyTickets([]);
      return null;
    }
    setIsLoadingTickets(true);
    setTicketsError(null);
    try {
      const data = await apiRequest<any[]>('/api/bookings/my', {
        baseUrl: serverUrl,
        token: user.token,
      });
      if (!Array.isArray(data)) throw new ApiError('The server returned an invalid booking list.', 502, 'INVALID_RESPONSE');
      if (requestId !== ticketRequestId.current) return null;
      const tickets: Ticket[] = data.map(booking => ({
        id: String(booking.id),
        tripId: Number(booking.tripId),
        route: booking.routeEn || booking.routeAr || null,
        seatNumber: Number(booking.seatNumber),
        date: booking.tripDate || null,
        time: booking.departureTime || booking.timeSlot || null,
        boardingCode: booking.boardingCode || null,
        qrToken: booking.qrToken || null,
        status: String(booking.status),
        paymentStatus: booking.paymentStatus || null,
        cancelReason: booking.cancelReason || null,
        isBoarded: Boolean(booking.qrUsedAt),
      }));
      setMyTickets(tickets);
      return tickets;
    } catch (error) {
      if (requestId === ticketRequestId.current) {
        setTicketsError(error instanceof Error ? error.message : 'Could not load your bookings.');
      }
      return null;
    } finally {
      if (requestId === ticketRequestId.current) setIsLoadingTickets(false);
    }
  }, [serverUrl, user?.token]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    if (user?.token) void fetchMyBookings();
    else {
      ticketRequestId.current++;
      setMyTickets([]);
      setTicketsError(null);
      setIsLoadingTickets(false);
      setPendingBooking(null);
      setBookingConfirmationVisible(false);
      setPassword('');
      setRegPassword('');
    }
  }, [user?.token, serverUrl, fetchMyBookings]);

  // 5. Live WebSocket listener for real-time notifications
  useEffect(() => {
    if (!user?.token || !serverUrl) return;
    const wsUrl = toWebSocketUrl(serverUrl);
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/user/session`, user.token || '');
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Supervisor Cancellation Notice
          if (msg.type === 'SUPERVISOR_CANCELLED_TICKET') {
            triggerLocalNotification(
              'تم إلغاء الحجز',
              `قام مشرف الخط بإلغاء حجز المقعد رقم (${msg.seatNumber}).`
            );
            Alert.alert(
              'تم إلغاء الحجز',
              msg.messageAr || `قام مشرف الرحلة بإلغاء حجزك للمقعد رقم (${msg.seatNumber}).`,
              [{ text: "فهمت (Dismiss)" }]
            );
            setMyTickets(prev => prev.map(t => (t.id === String(msg.bookingId)) ? {
              ...t,
              status: 'cancelled',
              cancelReason: msg.messageAr,
            } : t));
          } 
          // New Bus Announced / Dropped
          else if (msg.type === 'NEW_TRIP_ANNOUNCED') {
            triggerLocalNotification(
              "🚌 باص جديد متاح الآن! — New Bus Line Added",
              msg.messageAr || `تمت إضافة حافلة جديدة لتاريخ ${msg.tripDate}. اضغط هنا لحجز مقعدك فوراً!`
            );
            Alert.alert(
              "🚌 باص جديد متاح الآن!",
              msg.messageAr || `تمت إضافة باص جديد على رحلات الجلالة. الحجز متاح الآن!`,
              [{ text: "عرض الرحلات", onPress: () => fetchTripsRef.current() }]
            );
          }
          // Boarding Confirmed
          else if (msg.type === 'rider_boarded') {
            setMyTickets(prev => prev.map(t => (t.id === String(msg.bookingId)) ? {
              ...t,
              isBoarded: true,
            } : t));
          }
          // Single-Device Displacement Alert
          else if (msg.type === 'SESSION_TERMINATED') {
            Alert.alert(
              "⚠️ جلسة من جهاز آخر",
              "تم تسجيل الدخول إلى هذا الحساب من جهاز آخر. تم إنهاء جلستك لحماية بياناتك.",
              [{ text: 'تسجيل الدخول مجدداً', onPress: signOut }]
            );
            signOut();
          }
        } catch {}
      };
    } catch (e) {
      console.log('Mobile WS listener error:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [user?.token, serverUrl, signOut]);

  // Handle Login via Real API
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setIsLoggingIn(true);

    try {
      const data = await apiRequest<any>('/api/auth/login', {
        baseUrl: serverUrl,
        method: 'POST',
        body: { email: email.trim(), password },
      });
      setUser(authenticatedUser(data));
    } catch (err: any) {
      Alert.alert('Login Error', err.message || 'Unable to reach the authentication server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Student Registration Step 1: Request Outlook OTP
  const handleRegisterSendOtp = async () => {
    if (!regEmail || !regAcademicId) {
      Alert.alert('Error', 'Galala Email (@gu.edu.eg) and Academic ID are required');
      return;
    }

    const cleanEmail = regEmail.toLowerCase().trim();
    if (!cleanEmail.endsWith('@gu.edu.eg') && !cleanEmail.endsWith('@galala.edu.eg')) {
      Alert.alert('Domain Error', 'Registration is restricted to official Galala University student emails (@gu.edu.eg).');
      return;
    }

    setRegLoading(true);
    try {
      const data = await apiRequest<any>('/api/auth/verify-student', {
        baseUrl: serverUrl,
        method: 'POST',
        body: {
          email: cleanEmail,
          fullName: regName.trim(),
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
        },
      });
      if (!data?.verificationId) throw new ApiError('The server did not return a verification ID.', 502, 'INVALID_VERIFICATION');

      Alert.alert(
        '📧 رمز التحقق',
        'تم إرسال رمز التحقق (OTP) إلى بريد Outlook الأكاديمي الخاص بك. يرجى مراجعة صندوق الوارد.',
        [{ text: 'متابعة' }]
      );
      setRegOtp('');
      setRegVerificationId(String(data.verificationId));
      setRegistrationPreverified(data.status === 'APPROVED');
      setRegStep('verify_code');
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Could not verify student ID.');
    } finally {
      setRegLoading(false);
    }
  };

  // Student Registration Step 2: Confirm OTP & Create Account
  const handleRegisterConfirm = async () => {
    if (!registrationPreverified && !regOtp) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setRegLoading(true);
    try {
      // 1. Confirm code
      if (!registrationPreverified) {
        await apiRequest('/api/auth/confirm-code', {
          baseUrl: serverUrl,
          method: 'POST',
          body: { email: regEmail.toLowerCase().trim(), code: regOtp.trim() },
        });
      }

      // 2. Register user
      await apiRequest('/api/auth/register', {
        baseUrl: serverUrl,
        method: 'POST',
        body: {
          email: regEmail.toLowerCase().trim(),
          password: regPassword,
          fullName: regName.trim(),
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
          phone: regPhone,
          role: 'rider',
          sheerIdVerificationId: regVerificationId,
        },
      });

      const session = await apiRequest<any>('/api/auth/login', {
        baseUrl: serverUrl,
        method: 'POST',
        body: { email: regEmail.toLowerCase().trim(), password: regPassword },
      });

      Alert.alert('🎉 تم التسجيل بنجاح', 'مرحباً بك في منظومة باصات جامعة الجلالة! تم تسجيل حسابك بنجاح.');
      setShowRegisterModal(false);
      setUser(authenticatedUser(session));
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Registration failed.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSeatSelect = (seatNum: number, status: string) => {
    if (status !== 'free' || Number(activeTrip?.priceEgp) !== 0 || !user?.token) return;
    setSelectedSeat(selectedSeat === seatNum ? null : seatNum);
  };

  const handleBookingSubmit = async () => {
    if (!selectedSeat || !activeTrip || !user?.token || Number(activeTrip.priceEgp) !== 0 || bookingInProgress.current || pendingBooking) return;
    bookingInProgress.current = true;
    setIsBooking(true);
    setBookingError(null);
    const seatNumber = selectedSeat;
    try {
      const data = await apiRequest<any>('/api/bookings', {
        baseUrl: serverUrl,
        token: user.token,
        method: 'POST',
        body: {
          tripId: activeTrip.id,
          seatNumber,
          paymentMethod: 'none',
          bookingType: 'one_way',
          legType: selectedDirection,
        },
      });
      if (!data?.success || !data?.bookingId || !data?.qrToken || Number(data?.seatNumber) !== seatNumber) {
        throw new ApiError('The server did not return a complete booking ticket. Refresh bookings before retrying.', 502, 'INVALID_BOOKING_RESPONSE');
      }
      setSelectedSeat(null);
      setPendingBooking(null);
      setBookingConfirmationVisible(false);
      const [bookingsLoaded] = await Promise.all([fetchMyBookings(), fetchSeatsForTrip(activeTrip.id)]);
      if (!bookingsLoaded) {
        Alert.alert('Booking confirmed', 'Your booking was created on the server. The ticket list could not refresh; use Refresh to load it.');
      } else {
        Alert.alert('Booking confirmed', 'Your free seat is booked. The ticket and boarding QR were issued by the server.');
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      if (apiError?.status === 409 || apiError?.code === 'SEAT_ALREADY_BOOKED') {
        const tickets = await fetchMyBookings();
        const ownBooking = tickets?.find(ticket => ticket.tripId === activeTrip.id && ticket.seatNumber === seatNumber && ['confirmed', 'swapped'].includes(ticket.status));
        setSelectedSeat(null);
        setBookingConfirmationVisible(false);
        await fetchSeatsForTrip(activeTrip.id);
        if (ownBooking) {
          setPendingBooking(null);
          Alert.alert('Booking found', 'This seat is already booked on your account. Your server-issued ticket is in My Boarding Tickets.');
        } else {
          Alert.alert('Seat unavailable', 'That seat was just booked. The seat map has been refreshed.');
        }
      } else if (apiError?.status === 0 || (apiError?.status !== undefined && apiError.status >= 500) || apiError?.code === 'INVALID_BOOKING_RESPONSE') {
        setPendingBooking({ tripId: activeTrip.id, seatNumber });
        setBookingError('The connection failed after sending this request. The server may have booked the seat. Reconnect and check booking status before trying again.');
      } else {
        setBookingError(error instanceof Error ? error.message : 'Booking failed. No ticket was created on this device.');
      }
    } finally {
      bookingInProgress.current = false;
      setIsBooking(false);
    }
  };

  const handleBookingStatusCheck = async () => {
    if (!pendingBooking || !user?.token || bookingInProgress.current) return;
    bookingInProgress.current = true;
    setIsBooking(true);
    const { tripId, seatNumber } = pendingBooking;
    try {
      const tickets = await fetchMyBookings();
      if (!tickets) {
        setBookingError('Could not check the server yet. Reconnect and check booking status again.');
        return;
      }
      const ownBooking = tickets.find(ticket => ticket.tripId === tripId && ticket.seatNumber === seatNumber && ['confirmed', 'swapped'].includes(ticket.status));
      if (ownBooking) {
        setPendingBooking(null);
        setSelectedSeat(null);
        setBookingConfirmationVisible(false);
        Alert.alert('Booking found', 'The server booked this seat. Your ticket is in My Boarding Tickets.');
      } else {
        setPendingBooking(null);
        setSelectedSeat(null);
        setBookingConfirmationVisible(false);
        setBookingError(null);
        Alert.alert('No booking found', 'The server has no booking for that seat. Choose an available seat to try again.');
      }
      if (activeTrip?.id === tripId) await fetchSeatsForTrip(tripId);
    } finally {
      bookingInProgress.current = false;
      setIsBooking(false);
    }
  };

  // Login Screen
  if (!user) {
    return (
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.loginContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
        {/* Server Config Button */}
        <TouchableOpacity 
          onPress={() => { setCustomServerInput(serverUrl); setShowServerModal(true); }}
          style={styles.serverConfigBtn}
        >
          <Text style={styles.serverConfigBtnText}>⚙️ Server: {serverUrl ? serverUrl.replace(/https?:\/\//, '') : 'Not configured'}</Text>
        </TouchableOpacity>

        <Image 
          source={require('../assets/icon.png')} 
          style={styles.logoImage} 
          resizeMode="contain"
        />
        <Text style={styles.title}>bus<Text style={{color: '#38bdf8'}}>.aesh</Text></Text>
        <Text style={styles.subtitle}>Galala University Transit System</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Galala Email / Username</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            placeholder="student@gu.edu.eg"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#64748b"
            style={styles.input}
          />
        </View>

        <TouchableOpacity 
          onPress={handleLogin}
          disabled={isLoggingIn}
          style={styles.button}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="#0b0f19" />
          ) : (
            <Text style={styles.buttonText}>Log In to Transit Portal</Text>
          )}
        </TouchableOpacity>

        {/* Register Button */}
        <TouchableOpacity 
          onPress={() => { setRegStep('details'); setRegistrationPreverified(false); setShowRegisterModal(true); }}
          style={styles.registerBtn}
        >
          <Text style={styles.registerBtnText}>🎓 Register as Galala Student (حساب جديد)</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Galala University Transportation</Text>
          <Text style={styles.infoTextSub}>Students: Please register with your @gu.edu.eg email.</Text>
        </View>

        {/* Server Config Modal */}
        <Modal
          visible={showServerModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowServerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Configure API Server</Text>
              <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4}}>
                Enter your VirtualBox VM IP, LAN IP, or Cloudflare Tunnel URL:
              </Text>
              <TextInput
                value={customServerInput}
                onChangeText={setCustomServerInput}
                placeholder="http://192.168.1.7:3000"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                style={[styles.input, {marginTop: 12}]}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowServerModal(false)}
                  style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
                >
                  <Text style={styles.modalActionText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      setServerUrl(customServerInput);
                      setShowServerModal(false);
                    } catch (error) {
                      Alert.alert('Invalid server URL', error instanceof Error ? error.message : 'Enter a valid API URL.');
                    }
                  }}
                  style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
                >
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Save URL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Student Registration Modal */}
        <Modal
          visible={showRegisterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRegisterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, {maxHeight: '85%'}]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>
                  {regStep === 'details' ? '🎓 New Student Registration' : '🔐 Verify Outlook Email'}
                </Text>
                <Text style={{color: '#94a3b8', fontSize: 12, marginTop: 4, marginBottom: 12}}>
                  {regStep === 'details' 
                    ? 'Registration is restricted to Galala University students (@gu.edu.eg).'
                    : registrationPreverified ? 'Your student status was approved by the university verification service.' : 'A 6-digit OTP code has been sent to your Outlook mailbox.'}
                </Text>

                {regStep === 'details' ? (
                  <View style={{gap: 10}}>
                    <View>
                      <Text style={styles.label}>Full Name</Text>
                      <TextInput
                        value={regName}
                        onChangeText={setRegName}
                        placeholder="Ahmed Mohamed Ali"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Galala University Email (@gu.edu.eg)</Text>
                      <TextInput
                        value={regEmail}
                        onChangeText={setRegEmail}
                        autoCapitalize="none"
                        placeholder="student@gu.edu.eg"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Academic ID (رقم القيد)</Text>
                      <TextInput
                        value={regAcademicId}
                        onChangeText={setRegAcademicId}
                        placeholder="21010012"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Phone Number (رقم الهاتف)</Text>
                      <TextInput
                        value={regPhone}
                        onChangeText={setRegPhone}
                        keyboardType="phone-pad"
                        placeholder="010XXXXXXXX"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <View>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        value={regPassword}
                        onChangeText={setRegPassword}
                        secureTextEntry
                        placeholder="••••••••"
                        placeholderTextColor="#64748b"
                        style={styles.input}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleRegisterSendOtp}
                      disabled={regLoading}
                      style={[styles.button, {marginTop: 10}]}
                    >
                      {regLoading ? (
                        <ActivityIndicator color="#0b0f19" />
                      ) : (
                        <Text style={styles.buttonText}>Send Outlook OTP Code</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{gap: 12}}>
                    {registrationPreverified ? (
                      <Text style={styles.emptyHint}>The server verified this student automatically. Continue to create the account.</Text>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => Linking.openURL('https://outlook.office.com/mail/')}
                          style={styles.outlookBtn}
                        >
                          <Text style={styles.outlookBtnText}>📥 Open Galala Outlook Webmail</Text>
                        </TouchableOpacity>
                        <View>
                          <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
                          <TextInput
                            value={regOtp}
                            onChangeText={setRegOtp}
                            keyboardType="number-pad"
                            maxLength={6}
                            placeholder="Enter the code sent to your email"
                            placeholderTextColor="#64748b"
                            style={[styles.input, {textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: 'bold'}]}
                          />
                        </View>
                      </>
                    )}

                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        onPress={() => setRegStep('details')}
                        style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
                      >
                        <Text style={styles.modalActionText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleRegisterConfirm}
                        disabled={regLoading}
                        style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
                      >
                        {regLoading ? (
                          <ActivityIndicator color="#0b0f19" />
                        ) : (
                          <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Verify & Complete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => setShowRegisterModal(false)}
                  style={{marginTop: 16, alignItems: 'center'}}
                >
                  <Text style={{color: '#64748b', fontSize: 12}}>Close Window</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Logged-in screen (Rider Portal / Supervisor console hub)
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRoleBadge}>{user.role === 'supervisor' ? '👮 Line Supervisor' : user.role === 'admin' ? '🛡️ Administrator' : '🎓 Galala Student'}</Text>
        </View>
        
        {/* Sign Out */}
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Supervisor quick switch */}
      {['supervisor', 'admin'].includes(user.role) && (
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/scanner', params: { legType: selectedDirection } })}
          style={styles.supervisorBanner}
        >
          <Text style={styles.supervisorBannerText}>🚀 Open Camera QR & Code Boarding Scanner</Text>
        </TouchableOpacity>
      )}

      {/* Route & Date selector card */}
      <View style={styles.card}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={styles.cardTitle}>1. Choose Route & Time</Text>
          <TouchableOpacity onPress={fetchTrips} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
        
        {/* Route select chips */}
        <View style={{ marginBottom: 12, marginTop: 8 }}>
          <Text style={styles.selectLabel}>Select Bus Line (خط الباص)</Text>
          {isLoadingRoutes ? <ActivityIndicator color="#38bdf8" style={{marginTop: 10}} /> : null}
          {routesError ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{routesError}</Text>
              <TouchableOpacity onPress={fetchRoutes} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {routes.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelectedRouteId(r.id)}
                style={[styles.chip, selectedRouteId === r.id && styles.activeChip]}
              >
                <Text style={[styles.chipText, selectedRouteId === r.id && styles.activeChipText]}>
                  {r.nameEn || r.nameAr}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {!isLoadingRoutes && !routesError && routes.length === 0 ? <Text style={styles.emptyHint}>No routes are configured on the server.</Text> : null}
        </View>

        {/* Direction toggle */}
        <View style={styles.directionToggle}>
          <TouchableOpacity
            onPress={() => setSelectedDirection('to_campus')}
            style={[styles.directionBtn, selectedDirection === 'to_campus' && styles.activeDirectionBtn]}
          >
            <Text style={[styles.directionBtnText, selectedDirection === 'to_campus' && styles.activeDirectionBtnText]}>
              🚌 To Galala (صباحاً)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedDirection('from_campus')}
            style={[styles.directionBtn, selectedDirection === 'from_campus' && styles.activeDirectionBtn]}
          >
            <Text style={[styles.directionBtnText, selectedDirection === 'from_campus' && styles.activeDirectionBtnText]}>
              🏠 From Galala (عودة)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Operational Date Selector */}
        <View style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={styles.selectLabel}>Operational Date (تاريخ الحجز)</Text>
            <Text style={{ fontSize: 10, color: '#38bdf8', fontWeight: 'bold' }}>Choose a travel date</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {operationalDates.map(od => {
              const isSelected = selectedDate === od.date;

              // Today: Green outline anchor (closed for new bookings)
              if (od.isToday) {
                return (
                  <View
                    key={od.date}
                    style={[
                      styles.dateCard,
                      {
                        borderColor: '#10b981',
                        borderWidth: 2,
                        backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      }
                    ]}
                  >
                    <View style={[styles.dateBadge, { backgroundColor: '#10b981' }]}>
                      <Text style={[styles.dateBadgeText, { color: '#022c22' }]}>TODAY • اليوم</Text>
                    </View>
                    <Text style={[styles.dateDayText, { color: '#6ee7b7' }]}>{od.day}</Text>
                    <Text style={[styles.dateSubText, { color: '#a7f3d0' }]}>{od.month} • {od.weekdayAr}</Text>
                    <Text style={[styles.dateStatusBadge, { color: '#34d399', backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                      انتهى حجز اليوم
                    </Text>
                  </View>
                );
              }

              // Tomorrow and upcoming advance days (bookable)
              if (od.isBookable) {
                return (
                  <TouchableOpacity
                    key={od.date}
                    onPress={() => setSelectedDate(od.date)}
                    style={[
                      styles.dateCard,
                      isSelected ? {
                        borderColor: '#38bdf8',
                        borderWidth: 2,
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      } : {
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        backgroundColor: '#020617',
                      }
                    ]}
                  >
                    <View style={[styles.dateBadge, isSelected ? { backgroundColor: '#38bdf8' } : { backgroundColor: '#1e293b' }]}>
                      <Text style={[styles.dateBadgeText, isSelected ? { color: '#0b0f19' } : { color: '#94a3b8' }]}>
                        {od.isTomorrow ? 'TOMORROW • غداً' : od.weekdayAr}
                      </Text>
                    </View>
                    <Text style={[styles.dateDayText, isSelected && { color: '#38bdf8' }]}>{od.day}</Text>
                    <Text style={styles.dateSubText}>{od.month} • {od.weekdayAr}</Text>
                    <Text style={[styles.dateStatusBadge, isSelected && { color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
                      متاح للحجز
                    </Text>
                  </TouchableOpacity>
                );
              }

              // Past dates (e.g. Yesterday)
              return (
                <View
                  key={od.date}
                  style={[
                    styles.dateCard,
                    {
                      borderColor: '#1e293b',
                      borderWidth: 1,
                      backgroundColor: '#020617',
                      opacity: 0.4,
                    }
                  ]}
                >
                  <Text style={[styles.dateBadgeText, { color: '#64748b' }]}>YESTERDAY • أمس</Text>
                  <Text style={[styles.dateDayText, { color: '#64748b' }]}>{od.day}</Text>
                  <Text style={[styles.dateSubText, { color: '#475569' }]}>{od.month}</Text>
                  <Text style={[styles.dateStatusBadge, { color: '#64748b' }]}>منتهي</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Available Trips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Scheduled Buses ({selectedDate})</Text>
        {isLoadingTrips ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 12}} />
        ) : tripsError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{tripsError}</Text>
            <TouchableOpacity onPress={fetchTrips} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : trips.length === 0 ? (
          <Text style={{color: '#64748b', fontSize: 12, marginVertical: 8}}>No trips are scheduled for this route and date.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 8}}>
            {trips.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => { setActiveTrip(t); void fetchSeatsForTrip(t.id); }}
                style={[styles.tripCard, activeTrip?.id === t.id && styles.activeTripCard]}
              >
                <Text style={[styles.tripCardTitle, activeTrip?.id === t.id && {color: '#38bdf8'}]}>
                  {t.bus?.name || 'Bus details unavailable'}
                </Text>
                <Text style={styles.tripCardSub}>{t.departureTime ? formatDepartureTime(t.departureTime) : t.timeSlot || 'Departure time unavailable'}</Text>
                {t.bus?.licensePlate ? <Text style={styles.tripCardPlate}>Plate: {t.bus.licensePlate}</Text> : null}
                <Text style={styles.tripCardPrice}>{Number(t.priceEgp).toFixed(2)} EGP</Text>
                {Number(t.priceEgp) > 0 ? <Text style={styles.paidUnavailable}>Paid booking unavailable in app</Text> : null}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Seat Selection */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>3. Select Seat (اختر المقعد)</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#1e293b' }]} />
            <Text style={styles.legendText}>Available (متاح)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#ef444433' }]} />
            <Text style={styles.legendText}>Booked (محجوز)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.legendText}>Selected (محدد)</Text>
          </View>
        </View>

        {isLoadingSeats ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 16}} />
        ) : seatsError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{seatsError}</Text>
            {activeTrip ? <TouchableOpacity onPress={() => fetchSeatsForTrip(activeTrip.id)} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity> : null}
          </View>
        ) : !activeTrip ? (
          <Text style={styles.emptyHint}>Choose a server-provided trip to see its seat map.</Text>
        ) : seats.length === 0 ? (
          <Text style={styles.emptyHint}>No seat data was returned for this trip.</Text>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 12 }}>
            <View style={styles.busLayout}>
              <View style={styles.busFront}>
                <Text style={styles.busFrontText}>Driver (السائق)</Text>
              </View>

              <View style={styles.gridRowContainer}>
                {seats.map((seat) => {
                  const isSelected = selectedSeat === seat.seatNumber;
                  let seatColor = '#1e293b';
                  if (seat.status !== 'free') seatColor = '#ef444433';
                  if (isSelected) seatColor = '#38bdf8';

                  // Center aisle space after seat 2
                  const isAisle = (seat.seatNumber % 4 === 2);

                  if (isAisle) {
                    return (
                      <React.Fragment key={seat.seatNumber}>
                        <TouchableOpacity
                          disabled={seat.status !== 'free' || Number(activeTrip.priceEgp) !== 0}
                          onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                          style={[styles.seat, { backgroundColor: seatColor }]}
                        >
                          <Text style={[styles.seatText, isSelected && {color: '#0b0f19'}]}>{seat.seatNumber}</Text>
                        </TouchableOpacity>
                        <View style={styles.aisleSpace} />
                      </React.Fragment>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={seat.seatNumber}
                      disabled={seat.status !== 'free' || Number(activeTrip.priceEgp) !== 0}
                      onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                      style={[styles.seat, { backgroundColor: seatColor }]}
                    >
                      <Text style={[styles.seatText, isSelected && {color: '#0b0f19'}]}>{seat.seatNumber}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedSeat && Number(activeTrip.priceEgp) === 0 && !pendingBooking && (
              <TouchableOpacity
                onPress={() => { setBookingError(null); setBookingConfirmationVisible(true); }}
                style={styles.payBtn}
              >
                <Text style={styles.payBtnText}>Continue with free seat {selectedSeat} · 0 EGP</Text>
              </TouchableOpacity>
            )}
            {Number(activeTrip.priceEgp) > 0 ? <Text style={styles.paidUnavailable}>Paid bookings are currently unavailable in the mobile app.</Text> : null}
          </View>
        )}
      </View>

      {pendingBooking ? (
        <View style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>The booking result for seat {pendingBooking.seatNumber} is unknown. Check the server before booking another seat.</Text>
          <TouchableOpacity onPress={handleBookingStatusCheck} disabled={isBooking} style={styles.retryBtn}>
            <Text style={styles.retryText}>{isBooking ? 'Checking…' : 'Check booking status'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Ticket History List */}
      <View style={{ marginTop: 12, marginBottom: 40 }}>
        <View style={styles.ticketListHeader}>
          <Text style={styles.sectionHeader}>🎟️ My Boarding Tickets</Text>
          <TouchableOpacity onPress={() => void fetchMyBookings()} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {isLoadingTickets ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 12}} />
        ) : ticketsError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{ticketsError}</Text>
            <TouchableOpacity onPress={() => void fetchMyBookings()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : myTickets.length === 0 ? (
          <Text style={styles.noTicketsText}>No bookings were returned for this account.</Text>
        ) : (
          myTickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
        )}
      </View>

      {/* Server-verified zero-fare booking confirmation */}
      <Modal
        visible={bookingConfirmationVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingConfirmationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm free booking</Text>
            <View style={styles.modalDetails}>
              <Text style={styles.detailsText}>Route: <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeTrip?.route?.nameEn || activeTrip?.routeEn || 'Route details unavailable'}</Text></Text>
              <Text style={styles.detailsText}>Departure: <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeTrip?.departureTime ? formatDepartureTime(activeTrip.departureTime) : activeTrip?.timeSlot || 'Time unavailable'}</Text></Text>
              <Text style={styles.detailsText}>Selected Seat: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>Seat {selectedSeat}</Text></Text>
              <Text style={styles.detailsText}>Fare: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>0 EGP</Text></Text>
            </View>
            {bookingError ? <Text style={styles.inlineErrorText}>{bookingError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setBookingConfirmationVisible(false)}
                style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={pendingBooking ? handleBookingStatusCheck : handleBookingSubmit}
                disabled={isBooking || (!pendingBooking && (!selectedSeat || Number(activeTrip?.priceEgp) !== 0))}
                style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
              >
                {isBooking ? (
                  <ActivityIndicator color="#0b0f19" />
                ) : (
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>{pendingBooking ? 'Check booking status' : 'Book free seat'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
