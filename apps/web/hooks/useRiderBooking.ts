'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { Booking, BookingType, GroupedBooking, PaymentMethod, Role, Seat, Trip, User } from '@/lib/types';
import { getApiBaseUrl } from '@/lib/api';
import { addMockAuditLog, generateOfflineBooking } from '@/lib/offline';
import type { SeatLoadStatus } from './useRiderSeats';

const OFFLINE_MODE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true';
interface Options {
  selectedSeat: number | null; user: User | null; bookingType: BookingType;
  activeTrip: Trip | null; activeArrivalTrip: Trip | null; activeReturnTrip: Trip | null;
  isOffline: boolean; token: string; role: Role; seatLoadStatus: SeatLoadStatus; lockingSeatNumber: number | null;
  myBookings: Booking[]; setMyBookings: Dispatch<SetStateAction<Booking[]>>;
  setSeats: (update: Seat[] | ((prev: Seat[]) => Seat[])) => void;
  setSelectedSeat: (seat: number | null) => void;
  getUserBookings: () => Promise<void>; loadSeatMap: () => Promise<void>; loadSupervisorManifest: () => Promise<void>;
}

export function useRiderBooking({ selectedSeat, user, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip, isOffline, token, role, seatLoadStatus, lockingSeatNumber, myBookings, setMyBookings, setSeats, setSelectedSeat, getUserBookings, loadSeatMap, loadSupervisorManifest }: Options) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('instapay');
  const [checkoutError, setCheckoutError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const checkoutBusy = useRef(false);
  useEffect(() => {
    setShowCheckout(false);
    setCheckoutError('');
  }, [user?.id, bookingType, activeTrip?.id, activeArrivalTrip?.id, activeReturnTrip?.id]);
  const handleCheckoutSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !user || seatLoadStatus !== 'ready' || lockingSeatNumber !== null || checkoutBusy.current) return;
    if (bookingType === 'round_trip' && (!activeArrivalTrip || !activeReturnTrip)) return;
    if (bookingType !== 'round_trip' && !activeTrip) return;

    checkoutBusy.current = true;
    try {
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

    if (!apiBookingSuccess && (!isOffline || !OFFLINE_MODE_ENABLED)) {
      setCheckoutError('Booking is unavailable while the backend is offline. Please try again later.');
      setIsPaying(false);
      return;
    }

    if (apiBookingSuccess) {
      await getUserBookings();
      await loadSeatMap();
      if (role === 'supervisor') await loadSupervisorManifest();
      setIsPaying(false);
      setShowCheckout(false);
      setSelectedSeat(null);
      return;
    }

    const newBookings = generateOfflineBooking(
      bookingType,
      activeTrip, activeArrivalTrip, activeReturnTrip,
      selectedSeat, paymentMethod, receiptRef,
      user.id, user.fullName, user.email,
    );

    const all: Booking[] = JSON.parse(localStorage.getItem('aesh_bookings') || '[]');
    localStorage.setItem('aesh_bookings', JSON.stringify([...all, ...newBookings]));

    setMyBookings(prev => [...newBookings, ...prev]);
    setSeats(prev => prev.map(s => s.seatNumber === selectedSeat ? { ...s, status: 'booked' as const, userId: user.id } : s));

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
    } finally { checkoutBusy.current = false; setIsPaying(false); }
  }, [seatLoadStatus, lockingSeatNumber, selectedSeat, user, bookingType, activeTrip, activeArrivalTrip, activeReturnTrip, paymentMethod, receiptRef, isOffline, token, getUserBookings, loadSeatMap, loadSupervisorManifest, role]);

  const handleCancelBooking = useCallback(async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    const apiUrl = getApiBaseUrl();

    if (!isOffline && token) {
      try {
        const response = await fetch(`${apiUrl}/api/bookings/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookingId, reason: 'Rider requested cancellation' }),
        });
        if (!response.ok) throw new Error('Cancellation was rejected by the server.');
        getUserBookings();
        loadSeatMap();
        return;
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Cancellation failed. Please retry.');
        return;
      }
    }

    if (!isOffline || !OFFLINE_MODE_ENABLED) return;
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


  return { showCheckout, setShowCheckout, paymentMethod, setPaymentMethod, checkoutError, isPaying, cardNumber, setCardNumber, receiptRef, setReceiptRef, handleCheckoutSubmit, handleCancelBooking, getGroupedBookings };
}
