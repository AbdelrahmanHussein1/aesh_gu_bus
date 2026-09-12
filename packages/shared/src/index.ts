import { z } from 'zod';

function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength) | 0;

  for (let j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0
        );
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  let result = '';
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

function hexToBytes(hex: string): string {
  let str = '';
  for (let c = 0; c < hex.length; c += 2) {
    str += String.fromCharCode(parseInt(hex.substr(c, 2), 16));
  }
  return str;
}

// Native crypto detection with bundler-safe fallback
declare const __non_webpack_require__: any;
let nodeCrypto: any = null;
try {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const req = typeof __non_webpack_require__ !== 'undefined' 
      ? __non_webpack_require__ 
      : (typeof require !== 'undefined' ? require : null);
    if (req) {
      nodeCrypto = req('crypto');
    }
  }
} catch {
  // In browser/edge environments, nodeCrypto will be null
}

function universalHmacSha256(message: string, key: string): string {
  if (nodeCrypto && typeof nodeCrypto.createHmac === 'function') {
    return nodeCrypto.createHmac('sha256', key).update(message).digest('hex');
  }
  // Fallback implementation for non-Node environments
  const blockSize = 64;
  if (key.length > blockSize) {
    key = hexToBytes(sha256Hex(key));
  }
  while (key.length < blockSize) {
    key += '\x00';
  }
  let oKeyPad = '', iKeyPad = '';
  for (let i = 0; i < blockSize; i++) {
    oKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x5c);
    iKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x36);
  }
  const innerHash = hexToBytes(sha256Hex(iKeyPad + message));
  return sha256Hex(oKeyPad + innerHash);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  if (nodeCrypto && typeof nodeCrypto.timingSafeEqual === 'function' && typeof Buffer !== 'undefined') {
    try {
      return nodeCrypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

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
  bookingType: z.enum(['one_way', 'round_trip', 'to_campus', 'from_campus']).default('one_way').transform(v => (v === 'round_trip' ? 'round_trip' : 'one_way')),
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

export const GALALA_FACULTIES = [
  'Computer Science & Engineering',
  'Engineering',
  'Medicine',
  'Dentistry',
  'Pharmacy',
  'Administrative Sciences',
  'Art & Design',
  'Applied Health Sciences',
  'Physiotherapy',
  'Basic Sciences',
] as const;
export type GalalaFaculty = typeof GALALA_FACULTIES[number];

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

/**
 * Generates a short, highly memorable alphanumeric boarding code.
 * Format: GU-XXXX (e.g. GU-7B2K)
 * Excludes ambiguous characters (0, O, 1, I) to prevent confusion.
 */
export function generateBoardingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GU-${code}`;
}

// Compact QR Token Codec
// Format: bookingIdHex.tripIdHex.seatNumberHex.dateCompact.versionHex.legTypeCode.signatureHex
// legTypeCode: 0 = to_campus, 1 = from_campus
export class QRCodec {
  /**
   * Serializes a QR payload and appends an HMAC signature.
   * Universal: works seamlessly across Node.js (ESM & CJS), Next.js, and React Native Expo.
   */
  static encode(payload: QRPayload, secret: string): string {
    const bookingHex = payload.bookingId.replace(/-/g, '').toLowerCase();
    const tripHex = payload.tripId.toString(16);
    const seatHex = payload.seatNumber.toString(16);
    const dateCompact = payload.date.replace(/-/g, '');
    const versionHex = payload.version.toString(16);
    const legCode = payload.legType === 'to_campus' ? '0' : '1';

    const message = `${bookingHex}.${tripHex}.${seatHex}.${dateCompact}.${versionHex}.${legCode}`;
    
    // Universal HMAC-SHA256 signature truncated to 16 hex characters (8 bytes)
    const signature = universalHmacSha256(message, secret).substring(0, 16);

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
   * Universal: works seamlessly across Node.js, Next.js, and React Native Expo.
   */
  static verify(token: string, secret: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 7) {
      return false;
    }

    const [bookingHex, tripHex, seatHex, dateCompact, versionHex, legCode, signature] = parts;
    const message = `${bookingHex}.${tripHex}.${seatHex}.${dateCompact}.${versionHex}.${legCode}`;

    const expectedSignature = universalHmacSha256(message, secret).substring(0, 16);
    return constantTimeEqual(signature.toLowerCase(), expectedSignature.toLowerCase());
  }
}

