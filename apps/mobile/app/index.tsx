import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Modal, 
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { ApiError, apiRequest, toWebSocketUrl } from '../src/api';
import { useAppContext } from '../src/app-context';
import { formatDepartureTime } from '../src/format';
import type { Route, Seat, Ticket, Trip } from '../src/types';
import TicketCard from '../src/components/TicketCard';
import AccountScreen from '../src/components/AccountScreen';
import RiderBookingPanel from '../src/components/RiderBookingPanel';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function AppHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serverUrl, user, signOut } = useAppContext();

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

  if (!user) return <AccountScreen />;

  // Logged-in screen (Rider Portal / Supervisor console hub)
  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRoleBadge}>{user.role === 'supervisor' ? '👮 Line Supervisor' : user.role === 'admin' ? '🛡️ Administrator' : '🎓 Galala Student'}</Text>
        </View>
        
        {/* Sign Out */}
        <TouchableOpacity accessibilityRole="button" onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Supervisor quick switch */}
      {['supervisor', 'admin'].includes(user.role) && (
        <TouchableOpacity 
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/scanner', params: { legType: selectedDirection } })}
          style={styles.supervisorBanner}
        >
          <Text style={styles.supervisorBannerText}>🚀 Open Camera QR & Code Boarding Scanner</Text>
        </TouchableOpacity>
      )}

      <RiderBookingPanel
        routes={routes} selectedRouteId={selectedRouteId} routesError={routesError} isLoadingRoutes={isLoadingRoutes}
        selectedDirection={selectedDirection} selectedDate={selectedDate} trips={trips} activeTrip={activeTrip}
        isLoadingTrips={isLoadingTrips} tripsError={tripsError} seats={seats} selectedSeat={selectedSeat}
        isLoadingSeats={isLoadingSeats} seatsError={seatsError} hasPendingBooking={!!pendingBooking}
        fetchRoutes={fetchRoutes} fetchTrips={fetchTrips} fetchSeatsForTrip={fetchSeatsForTrip}
        selectRoute={setSelectedRouteId} selectDirection={setSelectedDirection} selectDate={setSelectedDate}
        selectTrip={trip => { setActiveTrip(trip); void fetchSeatsForTrip(trip.id); }}
        handleSeatSelect={handleSeatSelect}
        confirmBooking={() => { setBookingError(null); setBookingConfirmationVisible(true); }}
      />

      {pendingBooking ? (
        <View style={styles.inlineError}>
          <Text accessibilityRole="alert" style={styles.inlineErrorText}>The booking result for seat {pendingBooking.seatNumber} is unknown. Check the server before booking another seat.</Text>
          <TouchableOpacity accessibilityRole="button" onPress={handleBookingStatusCheck} disabled={isBooking} style={styles.retryBtn}>
            <Text style={styles.retryText}>{isBooking ? 'Checking…' : 'Check booking status'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Ticket History List */}
      <View style={{ marginTop: 12, marginBottom: 40 }}>
        <View style={styles.ticketListHeader}>
          <Text style={[styles.sectionHeader, { flex: 1, paddingRight: 8 }]}>🎟️ My Boarding Tickets</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => void fetchMyBookings()} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {isLoadingTickets ? (
          <ActivityIndicator color="#38bdf8" style={{marginVertical: 12}} />
        ) : ticketsError ? (
          <View style={styles.inlineError}>
            <Text accessibilityRole="alert" style={styles.inlineErrorText}>{ticketsError}</Text>
            <TouchableOpacity accessibilityRole="button" onPress={() => void fetchMyBookings()} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
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
          <View style={[styles.modalContent, { maxHeight: '90%', paddingBottom: Math.max(24, insets.bottom) }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Confirm free booking</Text>
            <View style={styles.modalDetails}>
              <Text style={styles.detailsText}>Route: <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeTrip?.route?.nameEn || activeTrip?.routeEn || 'Route details unavailable'}</Text></Text>
              <Text style={styles.detailsText}>Departure: <Text style={{fontWeight: 'bold', color: '#fff'}}>{activeTrip?.departureTime ? formatDepartureTime(activeTrip.departureTime) : activeTrip?.timeSlot || 'Time unavailable'}</Text></Text>
              <Text style={styles.detailsText}>Selected Seat: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>Seat {selectedSeat}</Text></Text>
              <Text style={styles.detailsText}>Fare: <Text style={{fontWeight: 'bold', color: '#38bdf8'}}>0 EGP</Text></Text>
            </View>
            {bookingError ? <Text accessibilityRole="alert" style={styles.inlineErrorText}>{bookingError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity accessibilityRole="button"
                onPress={() => setBookingConfirmationVisible(false)}
                style={[styles.modalActionBtn, {backgroundColor: '#1e293b'}]}
              >
                <Text style={styles.modalActionText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button"
                onPress={pendingBooking ? handleBookingStatusCheck : handleBookingSubmit}
                disabled={isBooking || (!pendingBooking && (!selectedSeat || Number(activeTrip?.priceEgp) !== 0))}
                style={[styles.modalActionBtn, {backgroundColor: '#38bdf8'}, isBooking && styles.disabledButton]}
              >
                {isBooking ? (
                  <ActivityIndicator color="#0b0f19" />
                ) : (
                  <Text style={[styles.modalActionText, {color: '#0b0f19'}]}>{pendingBooking ? 'Check booking status' : 'Book free seat'}</Text>
                )}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}
