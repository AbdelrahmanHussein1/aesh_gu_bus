export type Role = 'rider' | 'supervisor' | 'admin';
export type Direction = 'to_campus' | 'from_campus';
export type BookingType = 'to_campus' | 'from_campus' | 'round_trip' | 'one_way';
export type TimeSlot = 'morning_1' | 'morning_2' | 'return_1' | 'return_2' | 'return_3' | 'return';
export type PaymentMethod = 'visa_mock' | 'instapay' | 'telda';
export type SeatStatus = 'free' | 'held' | 'booked';
export type TripStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type BookingStatus = 'confirmed' | 'cancelled' | 'swapped';

export interface PersonnelContact {
  nameAr: string;
  nameEn: string;
  phone: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface Route {
  id: number;
  nameAr: string;
  nameEn: string;
}

export interface Bus {
  name: string;
  licensePlate: string;
  totalSeats: number;
}

export interface Trip {
  id: number;
  routeId: number;
  tripDate: string;
  direction: Direction;
  timeSlot: TimeSlot;
  priceEgp: number;
  departureTime: string;
  returnTime?: string;
  status: TripStatus;
  bus: Bus;
  route?: Route;
  totalSeats?: number;
  bookedSeats?: number;
  driver?: PersonnelContact | null;
  supervisors?: PersonnelContact[];
}

export interface PersonnelItem {
  id: string;
  nameAr: string;
  nameEn: string;
  phone: string;
}

export interface TripFormData {
  routeId: number;
  direction: Direction;
  timeSlot: TimeSlot;
  tripDate: string;
  departureTime: string;
  returnTime?: string;
  driverName?: string;
  driverPhone?: string;
  supervisorNames?: string[];
  totalSeats: number;
  priceEgp: number;
}

export interface Seat {
  seatNumber: number;
  status: SeatStatus;
  userId: string | null;
}

export interface Booking {
  id: string;
  tripId: number;
  seatNumber: number;
  userId: string;
  status: BookingStatus;
  bookingType: BookingType;
  legType: Direction;
  pairedBookingId?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  receiptRef: string;
  qrToken: string;
  tripDate: string;
  routeAr: string;
  departureTime: string;
  riderName: string;
  riderEmail: string;
  isBoarded: boolean;
  boardedAt: string | null;
  qrUsedAt?: string;
  driver?: PersonnelContact | null;
  supervisors?: PersonnelContact[];
}

export interface ManifestEntry {
  bookingId: string;
  seatNumber: number;
  status: BookingStatus;
  paymentStatus: string;
  receiptRef: string;
  riderName: string;
  riderEmail: string;
  isBoarded: boolean;
  boardedAt: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  details: string;
  time: Date;
}

export interface ScanResult {
  success: boolean;
  result: string;
  message?: string;
  riderName?: string;
  seatNumber?: number;
  route?: string;
  time?: string;
  bus?: string;
}

export interface GroupedBooking {
  type: 'round_trip' | 'one_way';
  id: string;
  status: BookingStatus;
  arrival?: Booking;
  returnLeg?: Booking;
  booking?: Booking;
}
