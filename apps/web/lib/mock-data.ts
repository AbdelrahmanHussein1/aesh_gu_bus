/**
 * Mock data fallbacks for Offline / Simulation Mode
 * Kept separate from UI components to keep bundles lean and maintain separation of concerns.
 */

export const SIMULATED_AUDIT_LOGS = [
  {
    id: 101,
    action: 'BOOKING_CONFIRMED',
    entityType: 'booking',
    entityId: 'bk-9901',
    time: new Date(Date.now() - 15 * 60000).toISOString(),
    ipAddress: '192.168.1.7',
    user: {
      fullName: 'Student Passenger',
      email: 'student.transit@gu.edu.eg',
      academicId: 'GU-2024-001',
      phone: '01000000001',
      faculty: 'Computer Science & Engineering',
      role: 'rider',
    },
    details: { seatNumber: 14, tripId: 2901, boardingCode: 'GU-8A2F', fare: 160, paymentMethod: 'Instapay', receiptRef: 'INSTA-88291' },
  },
  {
    id: 102,
    action: 'SEAT_LOCK_HELD',
    entityType: 'trip_seat',
    entityId: '2901:14',
    time: new Date(Date.now() - 20 * 60000).toISOString(),
    ipAddress: '192.168.1.7',
    user: {
      fullName: 'Student Passenger',
      email: 'student.transit@gu.edu.eg',
      academicId: 'GU-2024-001',
      phone: '01000000001',
      faculty: 'Computer Science & Engineering',
      role: 'rider',
    },
    details: { seatNumber: 14, tripId: 2901, lockTtlSeconds: 300 },
  },
  {
    id: 103,
    action: 'BOARDING_CHECKED',
    entityType: 'boarding_log',
    entityId: 'bd-501',
    time: new Date(Date.now() - 45 * 60000).toISOString(),
    ipAddress: '192.168.1.15',
    user: {
      fullName: 'Gate Supervisor',
      email: 'supervisor.gate@gu.edu.eg',
      academicId: 'SUP-01',
      phone: '01000000002',
      faculty: 'Transport Operations',
      role: 'supervisor',
    },
    details: { bookingId: 'bk-8812', riderName: 'Student Passenger B', seatNumber: 5, tripId: 2901, scanMethod: 'QR_CAMERA', result: 'VALID' },
  },
  {
    id: 104,
    action: 'TRIP_CREATED',
    entityType: 'trip',
    entityId: '2901',
    time: new Date(Date.now() - 120 * 60000).toISOString(),
    ipAddress: '192.168.1.1',
    user: {
      fullName: 'Fleet Administrator',
      email: 'admin.transit@gu.edu.eg',
      academicId: 'ADM-01',
      phone: '01000000003',
      faculty: 'Central Administration',
      role: 'admin',
    },
    details: { routeId: 29, busId: 1, capacity: 50, departureTime: '07:00 AM', timeSlot: 'morning_1' },
  },
];

export const SIMULATED_DATABASE_USERS = [
  { id: 'usr-01', fullName: 'Student Passenger A', fullNameAr: 'طالب جامعي أ', email: 'student.a@gu.edu.eg', phone: '01000000001', role: 'rider', academicId: 'GU-2024-001', faculty: 'Computer Science & Engineering', isSheerIdVerified: true, createdAt: '2026-09-07T10:15:00Z' },
  { id: 'usr-02', fullName: 'Student Passenger B', fullNameAr: 'طالب جامعي ب', email: 'student.b@gu.edu.eg', phone: '01000000002', role: 'rider', academicId: 'GU-2024-002', faculty: 'Engineering', isSheerIdVerified: true, createdAt: '2026-09-06T14:20:00Z' },
  { id: 'usr-03', fullName: 'Student Passenger C', fullNameAr: 'طالب جامعي ج', email: 'student.c@gu.edu.eg', phone: '01000000003', role: 'rider', academicId: 'GU-2024-003', faculty: 'Medicine', isSheerIdVerified: true, createdAt: '2026-09-05T09:00:00Z' },
  { id: 'usr-04', fullName: 'Campus Fleet Driver', fullNameAr: 'سائق الأسطول', email: 'driver.fleet@gu.edu.eg', phone: '01000000004', role: 'supervisor', academicId: 'DRV-101', faculty: 'Fleet Operations (Driver)', isSheerIdVerified: true, createdAt: '2026-06-01T08:00:00Z' },
  { id: 'usr-05', fullName: 'Campus Line Supervisor', fullNameAr: 'مشرف الخط', email: 'supervisor.line@gu.edu.eg', phone: '01000000005', role: 'supervisor', academicId: 'SUP-202', faculty: 'Line Operations (Supervisor)', isSheerIdVerified: true, createdAt: '2026-06-01T08:00:00Z' },
  { id: 'usr-06', fullName: 'Operations Admin', fullNameAr: 'مسؤول العمليات', email: 'admin.ops@gu.edu.eg', phone: '01000000006', role: 'admin', academicId: 'ADM-001', faculty: 'Central Administration', isSheerIdVerified: true, createdAt: '2026-01-01T00:00:00Z' },
];

export const SIMULATED_DATABASE_BUSES = [
  { id: 1, name: 'Galala Bus 101', licensePlate: 'أ ب ج 101', totalSeats: 50, status: 'active', model: 'Mercedes Tourismo 2024' },
  { id: 2, name: 'Galala Bus 102', licensePlate: 'أ ب ج 102', totalSeats: 50, status: 'active', model: 'Mercedes Tourismo 2024' },
  { id: 3, name: 'Galala Bus 103', licensePlate: 'أ ب ج 103', totalSeats: 50, status: 'active', model: 'Mercedes Tourismo 2024' },
  { id: 4, name: 'Galala Bus 104', licensePlate: 'أ ب ج 104', totalSeats: 50, status: 'maintenance', model: 'MAN Lion Coach 2023' },
];

export const SIMULATED_DATABASE_BOOKINGS = [
  {
    id: 'bk-9901',
    seatNumber: 14,
    status: 'confirmed',
    bookingType: 'one_way',
    legType: 'to_campus',
    boardingCode: 'GU-8A2F',
    paymentStatus: 'paid',
    receiptRef: 'INSTA-88291',
    createdAt: '2026-09-07T08:30:00Z',
    user: { fullName: 'Student Passenger A', email: 'student.a@gu.edu.eg', phone: '01000000001', academicId: 'GU-2024-001', faculty: 'Computer Science & Engineering' },
    trip: { id: 2901, tripDate: '2026-09-07', departureTime: '07:00 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 101' },
  },
  {
    id: 'bk-9902',
    seatNumber: 5,
    status: 'confirmed',
    bookingType: 'one_way',
    legType: 'to_campus',
    boardingCode: 'GU-1F4C',
    paymentStatus: 'paid',
    receiptRef: 'VISA-44910',
    createdAt: '2026-09-07T08:45:00Z',
    user: { fullName: 'Student Passenger B', email: 'student.b@gu.edu.eg', phone: '01000000002', academicId: 'GU-2024-002', faculty: 'Engineering' },
    trip: { id: 2901, tripDate: '2026-09-07', departureTime: '07:00 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 101' },
  },
  {
    id: 'bk-9903',
    seatNumber: 22,
    status: 'swapped',
    bookingType: 'one_way',
    legType: 'to_campus',
    boardingCode: 'GU-3C9A',
    paymentStatus: 'paid',
    receiptRef: 'TELDA-12903',
    createdAt: '2026-09-07T09:10:00Z',
    user: { fullName: 'Student Passenger C', email: 'student.c@gu.edu.eg', phone: '01000000003', academicId: 'GU-2024-003', faculty: 'Medicine' },
    trip: { id: 2902, tripDate: '2026-09-07', departureTime: '09:30 AM', direction: 'to_campus', routeName: 'بورتوفيق - السويس', busName: 'باص 102' },
  },
];

export const SIMULATED_STUDENTS = [
  { name: 'Student Passenger 1', email: 'student1@gu.edu.eg', academicId: 'GU-2024-001', faculty: 'Computer Science & AI', phone: '01000000001' },
  { name: 'Student Passenger 2', email: 'student2@gu.edu.eg', academicId: 'GU-2024-002', faculty: 'Engineering', phone: '01000000002' },
  { name: 'Student Passenger 3', email: 'student3@gu.edu.eg', academicId: 'GU-2024-003', faculty: 'Medicine', phone: '01000000003' },
  { name: 'Student Passenger 4', email: 'student4@gu.edu.eg', academicId: 'GU-2024-004', faculty: 'Dentistry', phone: '01000000004' },
  { name: 'Student Passenger 5', email: 'student5@gu.edu.eg', academicId: 'GU-2024-005', faculty: 'Pharmacy', phone: '01000000005' },
  { name: 'Student Passenger 6', email: 'student6@gu.edu.eg', academicId: 'GU-2024-006', faculty: 'Administrative Sciences', phone: '01000000006' },
  { name: 'Student Passenger 7', email: 'student7@gu.edu.eg', academicId: 'GU-2024-007', faculty: 'Art & Design', phone: '01000000007' },
  { name: 'Student Passenger 8', email: 'student8@gu.edu.eg', academicId: 'GU-2024-008', faculty: 'Applied Health Sciences', phone: '01000000008' },
  { name: 'Student Passenger 9', email: 'student9@gu.edu.eg', academicId: 'GU-2024-009', faculty: 'Physiotherapy', phone: '01000000009' },
  { name: 'Student Passenger 10', email: 'student10@gu.edu.eg', academicId: 'GU-2024-010', faculty: 'Basic Sciences', phone: '01000000010' },
];
