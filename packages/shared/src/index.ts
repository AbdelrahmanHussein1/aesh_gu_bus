import { z } from 'zod';
import crypto from 'node:crypto';

// Time Slot Schema & Types
export const TimeSlotSchema = z.enum([
  'morning_1', // Shift 1: ~09:00 AM Arrival
  'morning_2', // Shift 2: 11:30 AM Arrival
  'return_1',  // Return 1: 12:30 PM Departure
  'return_2',  // Return 2: 02:30 PM Departure
  'return_3',  // Return 3: 05:30 PM Departure
  'return',    // Backwards compatibility legacy alias
]);
export type TimeSlot = z.infer<typeof TimeSlotSchema>;

// Types
export interface QRPayload {
  bookingId: string; // UUID
  tripId: number;
  seatNumber: number;
  date: string; // YYYY-MM-DD
  version: number;
  legType: 'to_campus' | 'from_campus'; // Which leg this QR is for
}

// Zod Schemas for validations
export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(4, { message: "Password must be at least 4 characters" })
});

export const CreateBookingSchema = z.object({
  tripId: z.number().int().positive(),
  seatNumber: z.number().int().min(1).max(100),
  paymentMethod: z.enum(['visa_mock', 'instapay', 'telda']),
  bookingType: z.enum(['one_way', 'round_trip']).default('one_way'),
  legType: z.enum(['to_campus', 'from_campus']).default('to_campus'),
  receiptImage: z.string().optional(), // Base64 receipt for Instapay/Telda manual validation
  receiptRef: z.string().optional()
});

export const CreateRoundTripBookingSchema = z.object({
  // Arrival leg
  toCampusTripId: z.number().int().positive(),
  toCampusSeatNumber: z.number().int().min(1).max(100),
  // Return leg
  fromCampusTripId: z.number().int().positive(),
  fromCampusSeatNumber: z.number().int().min(1).max(100),
  // Payment
  paymentMethod: z.enum(['visa_mock', 'instapay', 'telda']),
  receiptImage: z.string().optional(),
  receiptRef: z.string().optional(),
});

export const SwapBookingSchema = z.object({
  bookingId: z.string().uuid(),
  targetTripId: z.number().int().positive(),
  targetSeatNumber: z.number().int().min(1).max(100),
  reason: z.string().optional()
});

export const CancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().optional()
});

export const VerifyScanSchema = z.object({
  token: z.string(),
  expectedLegType: z.enum(['to_campus', 'from_campus']).optional(), // What leg the supervisor is scanning for
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deviceInfo: z.string().optional()
});

export const RegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  role: z.enum(['rider', 'supervisor', 'admin']).default('rider'),
  password: z.string().min(4, { message: "Password must be at least 4 characters" }),
  academicId: z.string().optional(),
  faculty: z.string().optional(),
  phone: z.string().optional(),
  sheerIdVerificationId: z.string().optional(),
});

export const VerifySheerIdSchema = z.object({
  email: z.string().email(),
  academicId: z.string().min(4),
  fullName: z.string().min(2),
  faculty: z.string().optional(),
});

// Compact QR Token Codec
// Format: bookingIdHex.tripIdHex.seatNumberHex.dateCompact.versionHex.legTypeCode.signatureHex
// legTypeCode: 0 = to_campus, 1 = from_campus
export class QRCodec {
  /**
   * Serializes a QR payload and appends an HMAC signature.
   * Can only be run in environment with Node crypto support (e.g. Fastify backend).
   */
  static encode(payload: QRPayload, secret: string): string {
    if (!crypto) {
      throw new Error('QRCodec.encode() requires Node.js crypto module — not available in this environment');
    }

    const bookingHex = payload.bookingId.replace(/-/g, '').toLowerCase();
    const tripHex = payload.tripId.toString(16);
    const seatHex = payload.seatNumber.toString(16);
    const dateCompact = payload.date.replace(/-/g, '');
    const versionHex = payload.version.toString(16);
    const legCode = payload.legType === 'to_campus' ? '0' : '1';

    const message = `${bookingHex}.${tripHex}.${seatHex}.${dateCompact}.${versionHex}.${legCode}`;
    
    // Create HMAC signature and truncate to 16 hex characters (8 bytes)
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const signature = hmac.digest('hex').substring(0, 16);

    return `${message}.${signature}`;
  }

  /**
   * Decodes a token string into a QR payload without signature verification.
   * Safe to run in React Native / browser as it only performs string parsing.
   */
  static decode(token: string): QRPayload {
    const parts = token.split('.');
    if (parts.length < 6) {
      throw new Error('Invalid token structure: expected at least 6 dot-separated parts');
    }

    const [bookingHex, tripHex, seatHex, dateCompact, versionHex, legCode] = parts;

    // Restore UUID hyphens
    if (bookingHex.length !== 32) {
      throw new Error('Invalid booking ID length');
    }
    const bookingId = [
      bookingHex.substring(0, 8),
      bookingHex.substring(8, 12),
      bookingHex.substring(12, 16),
      bookingHex.substring(16, 20),
      bookingHex.substring(20)
    ].join('-');

    const tripId = parseInt(tripHex, 16);
    const seatNumber = parseInt(seatHex, 16);
    
    // Restore date format YYYY-MM-DD
    if (dateCompact.length !== 8) {
      throw new Error('Invalid date length');
    }
    const date = `${dateCompact.substring(0, 4)}-${dateCompact.substring(4, 6)}-${dateCompact.substring(6)}`;
    const version = parseInt(versionHex, 16);
    const legType: 'to_campus' | 'from_campus' = legCode === '1' ? 'from_campus' : 'to_campus';

    return {
      bookingId,
      tripId,
      seatNumber,
      date,
      version,
      legType,
    };
  }

  /**
   * Verifies the HMAC signature of a token string.
   * Can only be run in environment with Node crypto support.
   */
  static verify(token: string, secret: string): boolean {
    if (!crypto) {
      throw new Error('QRCodec.verify() requires Node.js crypto module — not available in this environment');
    }

    const parts = token.split('.');
    if (parts.length !== 7) {
      return false;
    }

    const [bookingHex, tripHex, seatHex, dateCompact, versionHex, legCode, signature] = parts;
    const message = `${bookingHex}.${tripHex}.${seatHex}.${dateCompact}.${versionHex}.${legCode}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(message);
    const expectedSignature = hmac.digest('hex').substring(0, 16);

    // Guard against length mismatch — timingSafeEqual throws RangeError on different lengths
    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  }
}
