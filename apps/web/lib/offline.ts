import type { Route, Trip, Seat, Booking, ManifestEntry, AuditLog, BookingType, Direction, TimeSlot, PersonnelContact } from './types';
import { generateBoardingCode } from '@bus-aesh/shared';
import { getTodayDateString } from './dateUtils';

const ERP_ROUTES: Route[] = [
  { id: 29, nameAr: 'بورتوفيق - السويس', nameEn: 'Port Tawfik (Suez)' },
  { id: 33, nameAr: 'السويس (مسجد نبى الله داوود)', nameEn: 'Suez (Nabi Allah Dawoud)' },
  { id: 30, nameAr: 'السلام - المستقبل', nameEn: 'El Salam & El Mostakbal' },
  { id: 1, nameAr: 'العبور', nameEn: 'El Obour' },
  { id: 3, nameAr: 'اكتوبر', nameEn: '6th of October' },
  { id: 4, nameAr: 'حدائق الاهرام', nameEn: 'Hadayek Al Ahram' },
  { id: 6, nameAr: 'جامعة القاهرة', nameEn: 'Cairo University' },
  { id: 7, nameAr: 'المعادى', nameEn: 'Maadi' },
  { id: 12, nameAr: 'مدينة نصر', nameEn: 'Nasr City' },
  { id: 25, nameAr: 'مدينتى', nameEn: 'Madinaty' },
  { id: 27, nameAr: 'التجمع الخامس', nameEn: 'New Cairo (5th Settlement)' },
];

// Real Drivers and Line Supervisors directory
const PERSONNEL_DIRECTORY: Record<string, PersonnelContact> = {
  '01021561196': { nameAr: 'محمد صبحي', nameEn: 'Mohamed Sobhi', phone: '01021561196' },
  '01034972249': { nameAr: 'اشرف حسن', nameEn: 'Ashraf Hassan', phone: '01034972249' },
  '01270628098': { nameAr: 'السيد عبد الجواد', nameEn: 'El Sayed Abdel Gawad', phone: '01270628098' },
  '01064384157': { nameAr: 'عادل محمدين', nameEn: 'Adel Mohamedin', phone: '01064384157' },
  '01093192601': { nameAr: 'ابراهيم السبع', nameEn: 'Ibrahim El Sabea', phone: '01093192601' },
  '01003711827': { nameAr: 'محمد ابراهيم', nameEn: 'Mohamed Ibrahim', phone: '01003711827' },
  '01283970678': { nameAr: 'محمد عبد الباري', nameEn: 'Mohamed Abdel Bary', phone: '01283970678' },
  '01275467090': { nameAr: 'ممدوح بدران', nameEn: 'Mamdouh Badran', phone: '01275467090' },
  '01224393146': { nameAr: 'احمد السيد', nameEn: 'Ahmed El Sayed', phone: '01224393146' },
  '01202333289': { nameAr: 'احمد عبد الرحيم', nameEn: 'Ahmed Abdel Rahim', phone: '01202333289' },
  '01097973886': { nameAr: 'محمد سعيد', nameEn: 'Mohamed Saeed', phone: '01097973886' },
  '01207565158': { nameAr: 'محمد محمود', nameEn: 'Mohamed Mahmoud', phone: '01207565158' },
  '01004778719': { nameAr: 'محمد مختار', nameEn: 'Mohamed Mokhtar', phone: '01004778719' },
  '01116739222': { nameAr: 'محمود الصياد', nameEn: 'Mahmoud El Sayyad', phone: '01116739222' },
  '01067994014': { nameAr: 'السعيد عرفه', nameEn: 'El Saeed Arafa', phone: '01067994014' },
  '01282783018': { nameAr: 'محمود عبد الله', nameEn: 'Mahmoud Abdullah', phone: '01282783018' },
  '01222749275': { nameAr: 'غريب عبد الجواد', nameEn: 'Gharib Abdel Gawad', phone: '01222749275' },
  '01010204921': { nameAr: 'وائل عبد الخالق', nameEn: 'Wael Abdel Khaleq', phone: '01010204921' },
  '01007967214': { nameAr: 'عماد عيسى', nameEn: 'Emad Issa', phone: '01007967214' },
  '01066553376': { nameAr: 'السيد منصور', nameEn: 'El Sayed Mansour', phone: '01066553376' },
  '01024374538': { nameAr: 'عبدالله عبد الخالق', nameEn: 'Abdullah Abdel Khaleq', phone: '01024374538' },
  '01064987136': { nameAr: 'محمد مصطفى', nameEn: 'Mohamed Mostafa', phone: '01064987136' },
  '01002572162': { nameAr: 'محمد قطب', nameEn: 'Mohamed Kotb', phone: '01002572162' },
};

export function getMockRoutes(): Route[] {
  return ERP_ROUTES;
}

export function generateMockTrips(routeId: number, selectedDate: string, routes: Route[]): Trip[] {
  const matchedRoute = routes.find(r => r.id === routeId);
  if (!matchedRoute) return [];

  // Default assigned driver & supervisors according to route
  let driverPhone = '01021561196'; // Mohamed Sobhi default
  let superPhones = ['01283970678', '01275467090']; // Mohamed Abdel Bary, Mamdouh Badran
  if (routeId === 33) {
    driverPhone = '01093192601'; // Ibrahim El Sabea
    superPhones = ['01034972249', '01282783018']; // Ashraf Hassan, Mahmoud Abdullah
  } else if (routeId === 30) {
    driverPhone = '01270628098'; // El Sayed Abdel Gawad
    superPhones = ['01275467090', '01207565158']; // Mamdouh Badran, Mohamed Mahmoud
  }

  const driver = PERSONNEL_DIRECTORY[driverPhone] || null;
  const supervisors = superPhones.map(p => PERSONNEL_DIRECTORY[p]).filter(Boolean);
  const lateDriver = PERSONNEL_DIRECTORY['01064384157'] || null; // Adel Mohamedin
  const lateSupervisors = [PERSONNEL_DIRECTORY['01003711827']].filter(Boolean); // Mohamed Ibrahim

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
      driver,
      supervisors,
    },
    {
      id: routeId * 100 + 2,
      routeId,
      tripDate: selectedDate,
      direction: 'to_campus',
      timeSlot: 'morning_2',
      priceEgp: 160,
      departureTime: '09:30 AM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/وصول/11:30`, licensePlate: `د هـ و ${200 + routeId}`, totalSeats: 50 },
      driver: lateDriver,
      supervisors: lateSupervisors,
    },
    {
      id: routeId * 100 + 3,
      routeId,
      tripDate: selectedDate,
      direction: 'from_campus',
      timeSlot: 'return_1',
      priceEgp: 160,
      departureTime: '12:30 PM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/عودة/12:30`, licensePlate: `س ص ع ${300 + routeId}`, totalSeats: 50 },
      driver,
      supervisors,
    },
    {
      id: routeId * 100 + 4,
      routeId,
      tripDate: selectedDate,
      direction: 'from_campus',
      timeSlot: 'return_2',
      priceEgp: 160,
      departureTime: '02:30 PM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/عودة/2:30`, licensePlate: `س ص ع ${400 + routeId}`, totalSeats: 50 },
      driver,
      supervisors,
    },
    {
      id: routeId * 100 + 5,
      routeId,
      tripDate: selectedDate,
      direction: 'from_campus',
      timeSlot: 'return_3',
      priceEgp: 160,
      departureTime: '05:30 PM',
      status: 'scheduled',
      bus: { name: `${matchedRoute.nameEn}/عودة/5:30`, licensePlate: `س ص ع ${500 + routeId}`, totalSeats: 50 },
      driver,
      supervisors,
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
    riderName: b.riderName || 'Student Passenger',
    riderEmail: b.riderEmail || 'student@gu.edu.eg',
    boardingCode: b.boardingCode || ('GU-' + b.id.substring(0, 4).toUpperCase()),
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
        qrToken: arrivalToken, boardingCode: generateBoardingCode(), tripDate: activeArrivalTrip.tripDate, routeAr: activeArrivalTrip.bus.name.split('/')[0],
        departureTime: activeArrivalTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
        driver: activeArrivalTrip.driver, supervisors: activeArrivalTrip.supervisors,
      },
      {
        id: returnId, tripId: activeReturnTrip.id, seatNumber: selectedSeat, userId, status: 'confirmed',
        bookingType: 'round_trip', legType: 'from_campus', pairedBookingId: arrivalId,
        paymentMethod: paymentMethod as any, paymentStatus: paymentMethod === 'visa_mock' ? 'paid' : 'receipt_uploaded',
        receiptRef: paymentMethod === 'visa_mock' ? `MOCK-TX-${Math.floor(100000 + Math.random() * 900000)}` : receiptRef,
        qrToken: returnToken, boardingCode: generateBoardingCode(), tripDate: activeReturnTrip.tripDate, routeAr: activeReturnTrip.bus.name.split('/')[0],
        departureTime: activeReturnTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
        driver: activeReturnTrip.driver, supervisors: activeReturnTrip.supervisors,
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
      qrToken: token, boardingCode: generateBoardingCode(), tripDate: activeTrip.tripDate, routeAr: activeTrip.bus.name.split('/')[0],
      departureTime: activeTrip.departureTime, riderName: userName, riderEmail: userEmail, isBoarded: false, boardedAt: null,
      driver: activeTrip.driver, supervisors: activeTrip.supervisors,
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

export function getAllPersonnel(): { drivers: PersonnelContact[]; supervisors: PersonnelContact[] } {
  const all = Object.values(PERSONNEL_DIRECTORY);
  const driverPhones = new Set(['01021561196', '01034972249', '01270628098', '01064384157', '01093192601', '01003711827']);
  return {
    drivers: all.filter(p => driverPhones.has(p.phone)),
    supervisors: all.filter(p => !driverPhones.has(p.phone)),
  };
}

export function getCustomOfflineTrips(): Trip[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem('aesh_custom_trips') || '[]');
  } catch {
    return [];
  }
}

export function saveCustomOfflineTrips(trips: Trip[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aesh_custom_trips', JSON.stringify(trips));
}

export function getOfflineAllTrips(date?: string, routeId?: number): Trip[] {
  const routes = ERP_ROUTES;
  let allTrips: Trip[] = [];
  const targetDate = date || getTodayDateString();

  // Base generated trips for routes
  routes.forEach(r => {
    allTrips.push(...generateMockTrips(r.id, targetDate, routes));
  });

  // Merge with custom saved trips
  const custom = getCustomOfflineTrips().filter(t => t.tripDate === targetDate);
  allTrips = [...allTrips, ...custom];

  if (routeId) {
    allTrips = allTrips.filter(t => t.routeId === routeId);
  }

  // Attach booked seats count from offline bookings
  const bookings: Booking[] = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('aesh_bookings') || '[]') : [];
  return allTrips.map(t => {
    const bookedCount = bookings.filter(b => b.tripId === t.id && b.status === 'confirmed').length;
    return {
      ...t,
      bookedSeats: bookedCount,
      totalSeats: t.bus.totalSeats,
      route: routes.find(r => r.id === t.routeId),
    };
  });
}

export function cloneOfflineSchedule(sourceDate: string, targetDate: string, routeIds?: number[]): { success: boolean; count: number } {
  const sourceTrips = getOfflineAllTrips(sourceDate);
  const filtered = routeIds && routeIds.length > 0 ? sourceTrips.filter(t => routeIds.includes(t.routeId)) : sourceTrips;
  
  if (filtered.length === 0) {
    return { success: false, count: 0 };
  }

  const existingCustom = getCustomOfflineTrips();
  const newTrips: Trip[] = filtered.map((st, idx) => ({
    ...st,
    id: Date.now() + idx,
    tripDate: targetDate,
    status: 'scheduled',
    bookedSeats: 0,
  }));

  saveCustomOfflineTrips([...existingCustom, ...newTrips]);
  addMockAuditLog('SCHEDULE_CLONED', `Cloned ${newTrips.length} shifts from ${sourceDate} to ${targetDate}`);
  return { success: true, count: newTrips.length };
}

export function purgeOfflineShifts(date?: string): { success: boolean; count: number } {
  if (typeof window === 'undefined') return { success: true, count: 0 };
  const existingCustom = getCustomOfflineTrips();
  let remaining: Trip[] = [];
  if (date && date !== 'all') {
    remaining = existingCustom.filter(t => t.tripDate !== date);
  }
  saveCustomOfflineTrips(remaining);
  localStorage.setItem('aesh_offline_purged_flag', 'true');
  addMockAuditLog('SHIFTS_PURGED', `Purged ${existingCustom.length - remaining.length} offline shifts for ${date || 'all dates'}`);
  return { success: true, count: existingCustom.length - remaining.length };
}

export function createSingleOfflineTestShift(date?: string, routeId = 1): { success: boolean; trip: Trip } {
  const targetDate = date || getTodayDateString();
  const matchedRoute = ERP_ROUTES.find(r => r.id === routeId) || ERP_ROUTES[0];
  const driver = PERSONNEL_DIRECTORY['01021561196']; // Mohamed Sobhi
  const supervisor = PERSONNEL_DIRECTORY['01275467090']; // Mamdouh Badran

  const testTrip: Trip = {
    id: Date.now(),
    routeId: matchedRoute.id,
    tripDate: targetDate,
    direction: 'to_campus',
    timeSlot: 'morning_1',
    priceEgp: 160,
    departureTime: '07:00 AM',
    status: 'scheduled',
    totalSeats: 50,
    bookedSeats: 0,
    bus: {
      name: `${matchedRoute.nameEn}/TestBus-101`,
      licensePlate: `أ ب ج ${100 + matchedRoute.id}`,
      totalSeats: 50,
    },
    route: matchedRoute,
    driver,
    supervisors: supervisor ? [supervisor] : [],
  };

  const existingCustom = getCustomOfflineTrips();
  saveCustomOfflineTrips([...existingCustom, testTrip]);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('aesh_offline_purged_flag');
  }
  addMockAuditLog('TEST_SHIFT_CREATED', `Created single test shift #${testTrip.id} on ${matchedRoute.nameEn} for ${targetDate}`);
  return { success: true, trip: testTrip };
}
