import type { Route, Trip, Seat, Booking, ManifestEntry, AuditLog, BookingType, Direction, TimeSlot } from './types';

const ERP_ROUTES: Route[] = [
  { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
  { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
  { id: 4, nameAr: 'حدائق الاهرام', nameEn: 'Hadayek Al Ahram' },
  { id: 6, nameAr: 'جامعة القاهرة', nameEn: 'Cairo University' },
  { id: 7, nameAr: 'المعادى', nameEn: 'Maadi' },
  { id: 12, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
  { id: 25, nameAr: 'مدينتى', nameEn: 'Madinaty' },
  { id: 27, nameAr: 'التجمع الخامس', nameEn: 'New Cairo (5th Settlement)' },
];

export function getMockRoutes(): Route[] {
  return ERP_ROUTES;
}

export function generateMockTrips(routeId: number, selectedDate: string, routes: Route[]): Trip[] {
  const matchedRoute = routes.find(r => r.id === routeId);
  if (!matchedRoute) return [];

  return [
    {
      id: routeId * 100 + 1,
      routeId,
      tripDate: selectedDate,
      direction: 'to_campus',
      timeSlot: 'morning_1',
      priceEgp: 160,
      departureTime: '07:00 AM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/وصول/9:00`, licensePlate: `أ ب ج ${100 + routeId}`, totalSeats: 50 },
    },
    {
      id: routeId * 100 + 2,
      routeId,
      tripDate: selectedDate,
      direction: 'to_campus',
      timeSlot: 'morning_2',
      priceEgp: 160,
      departureTime: '10:30 AM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/وصول/11:30`, licensePlate: `د هـ و ${200 + routeId}`, totalSeats: 50 },
    },
    {
      id: routeId * 100 + 3,
      routeId,
      tripDate: selectedDate,
      direction: 'from_campus',
      timeSlot: 'return',
      priceEgp: 160,
      departureTime: '04:45 PM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/عودة/4:45`, licensePlate: `س ص ع ${300 + routeId}`, totalSeats: 50 },
    },
  ];
}

function getLocalBookings(): Booking[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('aesh_bookings') || '[]'); }
  catch { return []; }
}

export function generateMockSeats(tripId: number, userId: string): Seat[] {
  const allBookings = getLocalBookings();
  const tripBookings = allBookings.filter(b => b.tripId === tripId && b.status === 'confirmed');
  return Array.from({ length: 50 }, (_, i) => {
    const seatNumber = i + 1;
    const booking = tripBookings.find(b => b.seatNumber === seatNumber);
    const isRandomHold = Math.random() < 0.15 && !booking;
    return {
      seatNumber,
      status: booking ? 'booked' : (isRandomHold ? 'held' as const : 'free' as const),
      userId: booking ? booking.userId : (isRandomHold ? 'some-other-uuid' : null),
    };
  });
}

export function generateRoundTripSeats(arrivalTripId: number, returnTripId: number, userId: string): Seat[] {
  const allBookings = getLocalBookings();
  const arrBookings = allBookings.filter(b => b.tripId === arrivalTripId && b.status === 'confirmed');
  const retBookings = allBookings.filter(b => b.tripId === returnTripId && b.status === 'confirmed');
  return Array.from({ length: 50 }, (_, i) => {
    const seatNumber = i + 1;
    const b1 = arrBookings.find(b => b.seatNumber === seatNumber);
    const b2 = retBookings.find(b => b.seatNumber === seatNumber);
    const isBooked = b1 || b2;
    const isRandomHold = Math.random() < 0.15 && !isBooked;
    return {
      seatNumber,
      status: isBooked ? 'booked' : (isRandomHold ? 'held' as const : 'free' as const),
      userId: isBooked ? (b1?.userId || b2?.userId || null) : (isRandomHold ? 'some-other-uuid' : null),
    };
  });
}

export function generateMockManifest(tripId: number): ManifestEntry[] {
  const allBookings = getLocalBookings();
  return allBookings.filter(b => b.tripId === tripId).map(b => ({
    bookingId: b.id,
    seatNumber: b.seatNumber,
    status: b.status,
    paymentStatus: b.paymentStatus,
    receiptRef: b.receiptRef,
    riderName: b.riderName || 'Test Student',
    riderEmail: b.riderEmail || 'aes400196@gu.edu.eg',
    isBoarded: b.isBoarded || false,
    boardedAt: b.boardedAt || null,
  }));
}

export function generateOfflineBooking(
  bookingType: BookingType,
  activeTrip: Trip | null,
  activeArrivalTrip: Trip | null,
  activeReturnTrip: Trip | null,
  selectedSeat: number,
  paymentMethod: string,
  receiptRef: string,
  userId: string,
  userName: string,
  userEmail: string,
): Booking[] {
  if (bookingType === 'round_trip' && activeArrivalTrip && activeReturnTrip) {
    const arrivalId = `book-${Math.random().toString(36).substring(2, 9)}`;
    const returnId = `book-${Math.random().toString(36).substring(2, 9)}`;
    const arrivalToken = `${arrivalId.replace(/-/g, '')}.${activeArrivalTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeArrivalTrip.tripDate.replace(/-/g, '')}.1.0.mockhmacsig`;
    const returnToken = `${returnId.replace(/-/g, '')}.${activeReturnTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeReturnTrip.tripDate.replace(/-/g, '')}.1.1.mockhmacsig`;
    return [
      {
        id: arrivalId, tripId: activeArrivalTrip.id, seatNumber: selectedSeat, userId, status: 'confirmed',
        bookingType: 'round_trip', legType: 'to_campus', pairedBookingId: returnId,
        paymentMethod: paymentMethod as any, paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
        receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
        qrToken: arrivalToken, tripDate: activeArrivalTrip.tripDate, routeAr: activeArrivalTrip.bus.name.split('/')[0],
        departureTime: activeArrivalTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
      },
      {
        id: returnId, tripId: activeReturnTrip.id, seatNumber: selectedSeat, userId, status: 'confirmed',
        bookingType: 'round_trip', legType: 'from_campus', pairedBookingId: arrivalId,
        paymentMethod: paymentMethod as any, paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
        receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
        qrToken: returnToken, tripDate: activeReturnTrip.tripDate, routeAr: activeReturnTrip.bus.name.split('/')[0],
        departureTime: activeReturnTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
      },
    ];
  }

  if (activeTrip) {
    const bookingId = `book-${Math.random().toString(36).substring(2, 9)}`;
    const legCode = bookingType === 'to_campus' ? '0' : '1';
    const token = `${bookingId.replace(/-/g, '')}.${activeTrip.id.toString(16)}.${selectedSeat.toString(16)}.${activeTrip.tripDate.replace(/-/g, '')}.1.${legCode}.mockhmacsig`;
    return [{
      id: bookingId, tripId: activeTrip.id, seatNumber: selectedSeat, userId, status: 'confirmed',
      bookingType: 'one_way', legType: bookingType === 'to_campus' ? 'to_campus' : 'from_campus',
      paymentMethod: paymentMethod as any, paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
      receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
      qrToken: token, tripDate: activeTrip.tripDate, routeAr: activeTrip.bus.name.split('/')[0],
      departureTime: activeTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
    }];
  }
  return [];
}

export function addMockAuditLog(action: string, details: string): AuditLog[] {
  const logs: AuditLog[] = JSON.parse(localStorage.getItem('aesh_audit_logs') || '[]');
  const newLog = { id: logs.length + 1, action, details, time: new Date() };
  const updated = [newLog, ...logs];
  localStorage.setItem('aesh_audit_logs', JSON.stringify(updated));
  return updated;
}

export function getAuditLogs(): AuditLog[] {
  return JSON.parse(localStorage.getItem('aesh_audit_logs') || '[]');
}
