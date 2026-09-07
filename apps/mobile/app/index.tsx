import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  Alert,
  Image,
  NativeModules,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {}

const getDefaultApiUrl = () => {
  const scriptURL = NativeModules.SourceCode?.scriptURL;
  if (scriptURL) {
    const match = scriptURL.match(/http:\/\/([^:/]+)/);
    if (match && match[1]) {
      return `http://${match[1]}:3000`;
    }
  }
  return 'https://movers-primarily-ham-determines.trycloudflare.com';
};

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

export default function AppHome() {
  const router = useRouter();

  // Server URL configuration
  const [serverUrl, setServerUrl] = useState(getDefaultApiUrl());
  const [showServerModal, setShowServerModal] = useState(false);
  const [customServerInput, setCustomServerInput] = useState('');

  // Auth states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [user, setUser] = useState<any>(null);

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
  const [regLoading, setRegLoading] = useState(false);

  // Selector states
  const [routes, setRoutes] = useState<any[]>([
    { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
    { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
    { id: 4, nameAr: 'حدائق الاهرام', nameEn: 'Hadayek Al Ahram' },
    { id: 12, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
    { id: 25, nameAr: 'مدينتى', nameEn: 'Madinaty' },
    { id: 29, nameAr: 'بورتوفيق', nameEn: 'Port Tawfik (Suez)' },
    { id: 33, nameAr: 'نبي الله', nameEn: 'Suez (Nabi Allah)' },
  ]);
  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [selectedDirection, setSelectedDirection] = useState<'to_campus' | 'from_campus'>('to_campus');
  const [selectedDate, setSelectedDate] = useState('2026-09-07');
  const [trips, setTrips] = useState<any[]>([]);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  
  // Seat state
  const [seats, setSeats] = useState<any[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  
  // Checkout
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'visa' | 'instapay'>('visa');
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // 1. Fetch Real Routes
  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch(`${serverUrl}/api/routes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setRoutes(data);
          if (!data.some((r: any) => r.id === selectedRouteId)) {
            setSelectedRouteId(data[0].id);
          }
        }
      }
    } catch {}
  }, [serverUrl, selectedRouteId]);

  // 2. Fetch Real Trips
  const fetchTrips = useCallback(async () => {
    setIsLoadingTrips(true);
    try {
      const url = `${serverUrl}/api/trips?date=${selectedDate}&routeId=${selectedRouteId}&direction=${selectedDirection}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTrips(data);
          setActiveTrip(data[0]);
          fetchSeatsForTrip(data[0].id);
          setIsLoadingTrips(false);
          return;
        }
      }
    } catch {}

    // Fallback trip if backend has no scheduled trip for this exact slot
    const matched = routes.find(r => r.id === selectedRouteId);
    const fallbackTrip = {
      id: selectedRouteId * 10 + 1,
      routeId: selectedRouteId,
      name: `${matched?.nameEn || 'Galala Line'}/07:00 AM`,
      departureTime: `${selectedDate}T07:00:00+02:00`,
      time: selectedDirection === 'to_campus' ? '07:00 AM' : '04:45 PM',
      priceEgp: 160,
      totalSeats: 50,
      bus: { name: 'Superjet Bus 104', licensePlate: 'أ ب ج 402' }
    };
    setTrips([fallbackTrip]);
    setActiveTrip(fallbackTrip);
    generateFallbackSeats();
    setIsLoadingTrips(false);
  }, [serverUrl, selectedDate, selectedRouteId, selectedDirection, routes]);

  // 3. Fetch Real Seats for Trip
  const fetchSeatsForTrip = async (tripId: number) => {
    setIsLoadingSeats(true);
    try {
      const res = await fetch(`${serverUrl}/api/trips/${tripId}/seats`);
      if (res.ok) {
        const data = await res.json();
        if (data?.seats && Array.isArray(data.seats)) {
          setSeats(data.seats);
          setIsLoadingSeats(false);
          return;
        }
      }
    } catch {}
    generateFallbackSeats();
    setIsLoadingSeats(false);
  };

  const generateFallbackSeats = () => {
    const mockSeats = Array.from({ length: 50 }, (_, i) => ({
      seatNumber: i + 1,
      status: (i === 3 || i === 7 || i === 12) ? 'booked' : 'free',
      userId: null
    }));
    setSeats(mockSeats);
  };

  // 4. Fetch User Tickets
  const fetchMyBookings = async (authToken?: string) => {
    const token = authToken || user?.token;
    if (!token) return;
    try {
      const res = await fetch(`${serverUrl}/api/bookings/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formatted = data.map((b: any) => ({
            id: b.id,
            route: b.trip?.route?.nameEn || b.trip?.route?.nameAr || 'Galala Route',
            seatNumber: b.seatNumber,
            date: b.trip?.tripDate || selectedDate,
            time: b.trip?.timeSlot || '07:00 AM',
            boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
            qrToken: b.qrToken || `${b.id}.token`,
            status: b.status,
            cancelReason: b.cancelReason,
            isBoarded: b.qrUsedAt !== null,
          }));
          setMyTickets(formatted);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // 5. Live WebSocket listener for real-time notifications
  useEffect(() => {
    if (!user) return;
    const wsUrl = serverUrl.replace(/^http/, 'ws');
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${wsUrl}/ws/user/session?token=${user.token || user.id}`);
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Supervisor Cancellation Notice
          if (msg.type === 'SUPERVISOR_CANCELLED_TICKET') {
            triggerLocalNotification(
              "⚠️ تم إلغاء حجزك واسترداد المبلغ",
              `قام مشرف الخط بإلغاء حجز المقعد رقم (${msg.seatNumber}). تم استرداد المبلغ بالكامل (160 ج.م) لحسابك.`
            );
            Alert.alert(
              "⚠️ تم إلغاء الحجز واسترداد المبلغ",
              msg.messageAr || `قام مشرف الرحلة بإلغاء حجزك للمقعد رقم (${msg.seatNumber}). تم تحويل 160 ج.م كاسترداد فوري لحسابك.`,
              [{ text: "فهمت (Dismiss)" }]
            );
            setMyTickets(prev => prev.map(t => (t.id === msg.bookingId || t.seatNumber === msg.seatNumber) ? {
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
              [{ text: "عرض الرحلات", onPress: () => fetchTrips() }]
            );
            fetchTrips();
          }
          // Boarding Confirmed
          else if (msg.type === 'rider_boarded') {
            setMyTickets(prev => prev.map(t => (t.id === msg.bookingId || t.seatNumber === msg.seatNumber) ? {
              ...t,
              isBoarded: true,
            } : t));
          }
          // Single-Device Displacement Alert
          else if (msg.type === 'SESSION_TERMINATED') {
            Alert.alert(
              "⚠️ جلسة من جهاز آخر",
              "تم تسجيل الدخول إلى هذا الحساب من جهاز آخر. تم إنهاء جلستك لحماية بياناتك.",
              [{ text: "تسجيل الدخول مجدداً", onPress: () => setUser(null) }]
            );
            setUser(null);
          }
        } catch {}
      };
    } catch (e) {
      console.log('Mobile WS listener error:', e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [user, serverUrl, fetchTrips]);

  // Handle Login via Real API
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setIsLoggingIn(true);

    try {
      const res = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageAr || data.error || 'Login failed');
      }

      const loggedUser = {
        id: data.user?.id || 'usr-' + Date.now(),
        email: data.user?.email || email,
        fullName: data.user?.fullName || email.split('@')[0],
        role: data.user?.role || 'rider',
        token: data.token,
      };

      setUser(loggedUser);
      fetchMyBookings(data.token);
    } catch (err: any) {
      // Fallback demo login if server not reached
      Alert.alert(
        'Server Notice',
        `Live login attempt (${err.message}). Connecting in demo session...`,
        [{
          text: 'Continue in Demo',
          onPress: () => {
            const isSuper = email.startsWith('supervisor') || email.startsWith('driver');
            setUser({
              id: isSuper ? 'user-super' : 'user-student',
              email,
              fullName: isSuper ? 'Supervisor Aesh' : email.split('@')[0] || 'Galala Student',
              role: isSuper ? 'supervisor' : 'rider',
              token: 'demo-token',
            });
          }
        }]
      );
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
    if (!cleanEmail.endsWith('@gu.edu.eg') && !cleanEmail.endsWith('@galala.edu.eg') && !cleanEmail.startsWith('test.')) {
      Alert.alert('Domain Error', 'Registration is restricted to official Galala University student emails (@gu.edu.eg).');
      return;
    }

    setRegLoading(true);
    try {
      const res = await fetch(`${serverUrl}/api/auth/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: regName || 'Galala Student',
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageAr || data.error || 'Verification failed');
      }

      Alert.alert(
        '📧 رمز التحقق',
        'تم إرسال رمز التحقق (OTP) إلى بريد Outlook الأكاديمي الخاص بك. يرجى مراجعة صندوق الوارد.',
        [{ text: 'متابعة' }]
      );
      if (data.devCode) {
        setRegOtp(data.devCode);
      }
      setRegStep('verify_code');
    } catch (err: any) {
      Alert.alert('Verification Notice', err.message || 'Could not verify student ID. Using demo verification code 123456.');
      setRegOtp('123456');
      setRegStep('verify_code');
    } finally {
      setRegLoading(false);
    }
  };

  // Student Registration Step 2: Confirm OTP & Create Account
  const handleRegisterConfirm = async () => {
    if (!regOtp) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setRegLoading(true);
    try {
      // 1. Confirm code
      await fetch(`${serverUrl}/api/auth/confirm-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail.toLowerCase().trim(), code: regOtp.trim() }),
      });

      // 2. Register user
      const res = await fetch(`${serverUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail.toLowerCase().trim(),
          password: regPassword || '123456',
          fullName: regName || 'Galala Student',
          academicId: regAcademicId.trim(),
          faculty: regFaculty,
          phone: regPhone || '01000000000',
          role: 'rider',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.messageAr || data.error || 'Registration failed');
      }

      Alert.alert('🎉 تم التسجيل بنجاح', 'مرحباً بك في منظومة باصات جامعة الجلالة! تم تسجيل حسابك بنجاح.');
      setShowRegisterModal(false);
      
      // Auto login
      const loggedUser = {
        id: data.user?.id || 'usr-' + Date.now(),
        email: data.user?.email || regEmail,
        fullName: data.user?.fullName || regName,
        role: 'rider',
        token: data.token,
      };
      setUser(loggedUser);
      fetchMyBookings(data.token);
    } catch (err: any) {
      Alert.alert('Notice', err.message || 'Registration completed in local mode.');
      setShowRegisterModal(false);
      setUser({
        id: 'usr-new-' + Date.now(),
        email: regEmail,
        fullName: regName || 'Galala Student',
        role: 'rider',
        token: 'demo-token',
      });
    } finally {
      setRegLoading(false);
    }
  };

  const handleSeatSelect = (seatNum: number, status: string) => {
    if (status === 'booked') return;
    setSelectedSeat(selectedSeat === seatNum ? null : seatNum);
  };

  // Real Booking Submission
  const handleBookingSubmit = async () => {
    if (!selectedSeat || !activeTrip) return;
    setIsProcessingPay(true);

    try {
      const res = await fetch(`${serverUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token || ''}`,
        },
        body: JSON.stringify({
          tripId: activeTrip.id,
          seatNumber: selectedSeat,
          paymentMethod,
          bookingType: 'one_way',
          legType: selectedDirection,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newTicket = {
          id: data.booking?.id || `book-${Date.now()}`,
          route: routes.find(r => r.id === selectedRouteId)?.nameEn || 'Galala Line',
          seatNumber: selectedSeat,
          time: activeTrip.time || '07:00 AM',
          date: selectedDate,
          boardingCode: data.booking?.boardingCode || ('GU-' + Math.random().toString(36).substring(2, 6).toUpperCase()),
          qrToken: data.booking?.qrToken || `mock.qr.${Date.now()}`,
          status: 'confirmed',
          isBoarded: false,
        };

        setMyTickets(prev => [newTicket, ...prev]);
        setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' } : s));
        setIsProcessingPay(false);
        setCheckoutVisible(false);
        setSelectedSeat(null);
        Alert.alert("تم تأكيد الحجز بنجاح", "تم حجز مقعدك وإصدار كود الصعود الخاص بك. تجد تذكرتك في الأسفل.");
        return;
      }
    } catch {}

    // Fallback ticket creation
    const bookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
    const boardingCode = 'GU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const fallbackTicket = {
      id: bookingId,
      route: routes.find(r => r.id === selectedRouteId)?.nameEn || 'Galala Line',
      seatNumber: selectedSeat,
      time: activeTrip.time || '07:00 AM',
      date: selectedDate,
      boardingCode,
      qrToken: `${bookingId}.token`,
      status: 'confirmed',
      isBoarded: false,
    };

    setMyTickets(prev => [fallbackTicket, ...prev]);
    setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' } : s));
    setIsProcessingPay(false);
    setCheckoutVisible(false);
    setSelectedSeat(null);
    Alert.alert("Success", "Seat booked successfully! View your QR code and unique Boarding Code below.");
  };

  // Login Screen
  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.loginContainer}>
        {/* Server Config Button */}
        <TouchableOpacity 
          onPress={() => { setCustomServerInput(serverUrl); setShowServerModal(true); }}
          style={styles.serverConfigBtn}
        >
          <Text style={styles.serverConfigBtnText}>⚙️ Server: {serverUrl.replace(/https?:\/\//, '')}</Text>
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
          onPress={() => { setRegStep('details'); setShowRegisterModal(true); }}
          style={styles.registerBtn}
        >
          <Text style={styles.registerBtnText}>🎓 Register as Galala Student (حساب جديد)</Text>
        </TouchableOpacity>

        {/* Demo helpers */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Galala University Transportation</Text>
          <Text style={styles.infoTextSub}>Students: Please register with your @gu.edu.eg email.</Text>
          <Text style={styles.infoTextSub}>Supervisors: supervisor@gu.edu.eg / 123456</Text>
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
                    if (customServerInput) setServerUrl(customServerInput.trim());
                    setShowServerModal(false);
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
                    : 'A 6-digit OTP code has been sent to your Outlook mailbox.'}
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
                    {/* Outlook Button */}
                    <TouchableOpacity
                      onPress={() => Linking.openURL('https://outlook.office.com/mail/')}
                      style={styles.outlookBtn}
                    >
                      <Text style={styles.outlookBtnText}>📥 Open Galala Outlook Webmail</Text>
                    </TouchableOpacity>

                    {/* Quick Demo Fill */}
                    <TouchableOpacity
                      onPress={() => setRegOtp('123456')}
                      style={styles.demoFillBtn}
                    >
                      <Text style={styles.demoFillBtnText}>⚡ Use Quick Test Code: 123456</Text>
                    </TouchableOpacity>

                    <View>
                      <Text style={styles.label}>Enter 6-Digit OTP Code</Text>
                      <TextInput
                        value={regOtp}
                        onChangeText={setRegOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="123456"
                        placeholderTextColor="#64748b"
                        style={[styles.input, {textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: 'bold'}]}
                      />
                    </View>

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
    );
  }

  // Logged-in screen (Rider Portal / Supervisor console hub)
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRoleBadge}>{user.role === 'supervisor' ? '👮 Line Supervisor' : '🎓 Galala Student'}</Text>
        </View>
        
        {/* Sign Out */}
        <TouchableOpacity onPress={() => setUser(null)} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Supervisor quick switch */}
      {user.role === 'supervisor' && (
        <TouchableOpacity 
          onPress={() => router.push({ pathname: '/scanner', params: { legType: selectedDirection, token: user.token } })}
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
      </View>

      {/* Available Trips */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>2. Scheduled Buses ({selectedDate})</Text>
        {isLoadingTrips ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 12}} />
        ) : trips.length === 0 ? (
          <Text style={{color: '#64748b', fontSize: 12, marginVertical: 8}}>No trips available for this route.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 8}}>
            {trips.map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => { setActiveTrip(t); fetchSeatsForTrip(t.id); }}
                style={[styles.tripCard, activeTrip?.id === t.id && styles.activeTripCard]}
              >
                <Text style={[styles.tripCardTitle, activeTrip?.id === t.id && {color: '#38bdf8'}]}>
                  {t.bus?.name || 'Galala Transit Bus'}
                </Text>
                <Text style={styles.tripCardSub}>{t.time || t.timeSlot || '07:00 AM'}</Text>
                <Text style={styles.tripCardPlate}>Plate: {t.bus?.licensePlate || 'أ ب ج 402'}</Text>
                <Text style={styles.tripCardPrice}>160.00 EGP</Text>
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
                  if (seat.status === 'booked') seatColor = '#ef444433';
                  if (isSelected) seatColor = '#38bdf8';

                  // Center aisle space after seat 2
                  const isAisle = (seat.seatNumber % 4 === 2);

                  if (isAisle) {
                    return (
                      <React.Fragment key={seat.seatNumber}>
                        <TouchableOpacity
                          disabled={seat.status === 'booked'}
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
                      disabled={seat.status === 'booked'}
                      onPress={() => handleSeatSelect(seat.seatNumber, seat.status)}
                      style={[styles.seat, { backgroundColor: seatColor }]}
                    >
                      <Text style={[styles.seatText, isSelected && {color: '#0b0f19'}]}>{seat.seatNumber}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedSeat && (
              <TouchableOpacity
                onPress={() => setCheckoutVisible(true)}
                style={styles.payBtn}
              >
                <Text style={styles.payBtnText}>Book Seat {selectedSeat} (160 EGP)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Ticket History List */}
      <View style={{ marginTop: 12, marginBottom: 40 }}>
        <Text style={styles.sectionHeader}>🎟️ My Boarding Tickets & QR Codes</Text>
        
        {myTickets.length === 0 ? (
          <Text style={styles.noTicketsText}>No active tickets found. Book a seat above to get your ticket.</Text>
        ) : (
          myTickets.map(t => (
            <View key={t.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <View>
                  <Text style={styles.ticketRoute}>{t.route}</Text>
                  <Text style={styles.ticketTime}>{t.date} • {t.time}</Text>
                </View>
                <View style={styles.ticketSeatBadge}>
                  <Text style={styles.ticketSeatText}>Seat {t.seatNumber}</Text>
                </View>
              </View>

              {/* Status Display: Cancelled / Boarded / Scannable QR + Manual Code */}
              {t.status === 'cancelled' ? (
                <View style={styles.cancelledBox}>
                  <View style={styles.cancelledIcon}>
                    <Text style={{ fontSize: 20, color: '#ef4444', fontWeight: 'bold' }}>✕</Text>
                  </View>
                  <Text style={styles.cancelledTitle}>CANCELLED BY SUPERVISOR</Text>
                  <Text style={styles.refundText}>💰 Full Refund Processed (160 EGP)</Text>
                  <Text style={styles.cancelReasonText}>{t.cancelReason || 'Amount credited back to your account'}</Text>
                </View>
              ) : t.isBoarded ? (
                <View style={styles.boardedBox}>
                  <View style={styles.boardedIcon}>
                    <Text style={{ fontSize: 22, color: '#22c55e', fontWeight: 'bold' }}>✓</Text>
                  </View>
                  <Text style={styles.boardedTitle}>PASSENGER BOARDED</Text>
                  <Text style={{ fontSize: 10, color: '#16a34a', marginTop: 2 }}>Gate Verified</Text>
                </View>
              ) : (
                <View style={styles.qrContainer}>
                  {/* Scannable Ticket Box */}
                  <View style={styles.qrWrapper}>
                    <View style={{width: 140, height: 140, backgroundColor: 'white', padding: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center'}}>
                      <Text style={{fontSize: 28}}>📲</Text>
                      <Text style={{fontSize: 9, color: '#0f172a', marginTop: 4, fontWeight: '900', textAlign: 'center'}}>
                        GALALA TRANSIT PASS
                      </Text>
                      <Text style={{fontSize: 8, color: '#64748b', textAlign: 'center', marginTop: 2}}>
                        Scan for Boarding
                      </Text>
                    </View>
                  </View>

                  {/* Manual Memorizable Boarding Code */}
                  <View style={styles.manualCodeBox}>
                    <Text style={styles.manualCodeLabel}>ALTERNATIVE BOARDING CODE (كود الصعود اليدوي)</Text>
                    <Text style={styles.manualCodeValue}>
                      {t.boardingCode || ('GU-' + t.id.substring(0, 4).toUpperCase())}
                    </Text>
                    <Text style={styles.manualCodeSub}>
                      Give this code to the supervisor if phone camera scan is not available.
                    </Text>
                  </View>
                  <Text style={styles.qrTokenText} numberOfLines={1}>Token: {t.qrToken}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* CHECKOUT MODAL */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCheckoutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Checkout — Bus Aesh</Text>
            
            <View style={styles.modalDetails}>
              <Text style={styles.detailsText}>Trip: <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeTrip?.name || 'Galala Route'}</Text></Text>
              <Text style={styles.detailsText}>Selected Seat: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>Seat {selectedSeat}</Text></Text>
              <Text style={styles.detailsText}>Amount: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>160.00 EGP</Text></Text>
            </View>

            {/* Payment Method selector */}
            <View style={styles.paymentMethodRow}>
              <TouchableOpacity
                onPress={() => setPaymentMethod('visa')}
                style={[styles.paymentMethodBtn, paymentMethod === 'visa' && styles.activePaymentBtn]}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'visa' && styles.activePaymentText]}>Credit Card</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPaymentMethod('instapay')}
                style={[styles.paymentMethodBtn, paymentMethod === 'instapay' && styles.activePaymentBtn]}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === 'instapay' && styles.activePaymentText]}>Instapay</Text>
              </TouchableOpacity>
            </View>

            {paymentMethod === 'visa' ? (
              <View style={{gap: 8, marginTop: 12}}>
                <TextInput
                  placeholder="Card Number"
                  placeholderTextColor="#64748b"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  style={styles.input}
                />
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TextInput
                    placeholder="MM/YY"
                    placeholderTextColor="#64748b"
                    style={[styles.input, {flex: 1}]}
                  />
                  <TextInput
                    placeholder="CVV"
                    secureTextEntry
                    placeholderTextColor="#64748b"
                    style={[styles.input, {flex: 1}]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.instapayContainer}>
                <Text style={styles.instapayAddress}>Send to: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>01007883492@instapay</Text></Text>
                <TextInput
                  placeholder="Enter Transfer Ref / Mobile No."
                  placeholderTextColor="#64748b"
                  value={receiptRef}
                  onChangeText={setReceiptRef}
                  style={styles.input}
                />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCheckoutVisible(false)}
                style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleBookingSubmit}
                disabled={isProcessingPay}
                style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}]}
              >
                {isProcessingPay ? (
                  <ActivityIndicator color="#0b0f19" />
                ) : (
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0b0f19',
    padding: 16,
    paddingTop: 48,
  },
  loginContainer: {
    flexGrow: 1,
    backgroundColor: '#0b0f19',
    padding: 24,
    justifyContent: 'center',
  },
  serverConfigBtn: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    marginBottom: 16,
  },
  serverConfigBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logoImage: {
    width: 64,
    height: 64,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#38bdf8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#0b0f19',
    fontSize: 14,
    fontWeight: 'bold',
  },
  registerBtn: {
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  registerBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoBox: {
    marginTop: 24,
    padding: 14,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoTextSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  outlookBtn: {
    backgroundColor: '#0078d4',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 4,
  },
  outlookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  demoFillBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoFillBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRoleBadge: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  signOutBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  signOutText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  supervisorBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38bdf8',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  supervisorBannerText: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  refreshBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  refreshBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  selectLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeChip: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  chipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '500',
  },
  activeChipText: {
    color: '#38bdf8',
    fontWeight: 'bold',
  },
  directionToggle: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  directionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeDirectionBtn: {
    backgroundColor: '#38bdf8',
  },
  directionBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeDirectionBtnText: {
    color: '#0b0f19',
  },
  tripCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    borderRadius: 14,
    marginRight: 10,
    minWidth: 160,
  },
  activeTripCard: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  tripCardTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tripCardSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tripCardPlate: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  tripCardPrice: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 6,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 10,
  },
  busLayout: {
    width: 260,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 16,
  },
  busFront: {
    alignSelf: 'center',
    width: 90,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    marginBottom: 16,
  },
  busFrontText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  gridRowContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  seat: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seatText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aisleSpace: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtn: {
    width: '100%',
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  payBtnText: {
    color: '#0b0f19',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 10,
  },
  noTicketsText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },
  ticketCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  ticketRoute: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  ticketTime: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  ticketSeatBadge: {
    backgroundColor: '#38bdf81a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf833',
  },
  ticketSeatText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelledBox: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginVertical: 8,
  },
  cancelledIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  cancelledTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ef4444',
    letterSpacing: 2,
  },
  refundText: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
    fontWeight: 'bold',
  },
  cancelReasonText: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  boardedBox: {
    width: '100%',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginVertical: 8,
  },
  boardedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  boardedTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#22c55e',
    letterSpacing: 2,
  },
  qrContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  manualCodeBox: {
    marginTop: 8,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 12,
    alignItems: 'center',
  },
  manualCodeLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  manualCodeValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#38bdf8',
    letterSpacing: 3,
    marginVertical: 4,
  },
  manualCodeSub: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
  qrTokenText: {
    fontSize: 8,
    color: '#475569',
    marginTop: 6,
    width: '100%',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalDetails: {
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 4,
  },
  detailsText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 12,
  },
  paymentMethodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activePaymentBtn: {
    backgroundColor: '#38bdf8',
  },
  paymentMethodText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activePaymentText: {
    color: '#0b0f19',
  },
  instapayContainer: {
    marginTop: 12,
    gap: 8,
  },
  instapayAddress: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  modalActionBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  }
});
