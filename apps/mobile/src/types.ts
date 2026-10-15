export interface Route {
  id: number;
  nameEn?: string | null;
  nameAr?: string | null;
}

export interface Trip {
  id: number;
  routeId: number;
  tripDate: string;
  departureTime?: string | null;
  timeSlot?: string | null;
  priceEgp: number | string;
  totalSeats?: number;
  bus?: { name?: string | null; licensePlate?: string | null } | null;
  route?: Route | null;
  routeEn?: string | null;
  routeAr?: string | null;
}

export interface Seat {
  seatNumber: number;
  status: string;
}

export interface Ticket {
  id: string;
  tripId: number;
  route: string | null;
  seatNumber: number;
  date: string | null;
  time: string | null;
  boardingCode: string | null;
  qrToken: string | null;
  status: string;
  paymentStatus: string | null;
  cancelReason?: string | null;
  isBoarded: boolean;
}
