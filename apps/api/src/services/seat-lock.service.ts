import { redis } from '../redis.js';

export function seatLockKey(tripId: number, seatNumber: number): string {
  return `seat_lock:${tripId}:${seatNumber}`;
}

export function seatLockKeysForTrip(tripId: number, capacity: number): string[] {
  return Array.from({ length: capacity }, (_, i) => seatLockKey(tripId, i + 1));
}

type TripCapacity = { id: number; capacity: number };

/**
 * Count held seats for many trips with one MGET command.
 * Replaces one Redis command per trip on the fleet endpoint.
 */
export async function countHeldSeatsForTrips(trips: TripCapacity[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (trips.length === 0) return counts;

  try {
    const keysByTrip = trips.map(trip => seatLockKeysForTrip(trip.id, trip.capacity));
    const keys = keysByTrip.flat();
    const locks = await redis.mget(...keys);
    let offset = 0;
    for (let i = 0; i < trips.length; i++) {
      const tripLocks = locks.slice(offset, offset + keysByTrip[i].length);
      counts.set(trips[i].id, tripLocks.filter(Boolean).length);
      offset += keysByTrip[i].length;
    }
  } catch {
    for (const trip of trips) counts.set(trip.id, 0);
  }

  return counts;
}

/**
 * Read all seat lock holders for one trip (1 mget).
 */
export async function getSeatLockHolders(
  tripId: number,
  totalSeats: number
): Promise<Map<number, string>> {
  const holders = new Map<number, string>();
  try {
    const lockValues = await redis.mget(...seatLockKeysForTrip(tripId, totalSeats));
    for (let i = 0; i < lockValues.length; i++) {
      const val = lockValues[i];
      if (val) holders.set(i + 1, val);
    }
  } catch {}
  return holders;
}

/**
 * Fetch TTL (seconds) for held seats in one Redis round-trip (pipeline).
 */
export async function getSeatLockTtls(
  tripId: number,
  seatNumbers: number[]
): Promise<Map<number, number>> {
  const ttls = new Map<number, number>();
  if (seatNumbers.length === 0) return ttls;

  try {
    const pipeline = redis.pipeline();
    for (const seatNumber of seatNumbers) {
      pipeline.ttl(seatLockKey(tripId, seatNumber));
    }

    const results = await pipeline.exec();
    if (!results) return ttls;

    for (let i = 0; i < seatNumbers.length; i++) {
      const [, ttl] = results[i] ?? [null, -2];
      const seconds = typeof ttl === 'number' && ttl > 0 ? ttl : 300;
      ttls.set(seatNumbers[i], seconds);
    }
  } catch {
    for (const seatNumber of seatNumbers) ttls.set(seatNumber, 300);
  }

  return ttls;
}
