import { redis } from '../redis.js';
import { WebSocketHub } from '../websocket/hub.js';

/**
 * Cache Key Namespaces:
 * - cache:schedules:<date>:<routeId>
 * - cache:fleet:<date>:<routeId>:<direction>:<timeSlot>:<status>:<search>
 * - cache:trips:<date>:<direction>:<timeSlot>
 * - cache:trip_seats:<tripId>
 * - cache:seat_details:<tripId>
 */

export class CacheService {
  /**
   * Retrieve JSON parsed value from Redis cache
   */
  static async getCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[CacheService] Error reading cache key "${key}":`, err);
      return null;
    }
  }

  /**
   * Store data in Redis cache with TTL in seconds
   */
  static async setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      await redis.set(key, payload, 'EX', ttlSeconds);
    } catch (err) {
      console.warn(`[CacheService] Error setting cache key "${key}":`, err);
    }
  }

  /**
   * Delete a single cache key
   */
  static async deleteCache(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn(`[CacheService] Error deleting cache key "${key}":`, err);
    }
  }

  /**
   * Invalidate all keys matching a wildcard pattern
   */
  static async invalidatePattern(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (Array.isArray(keys) && keys.length > 0) {
        return await redis.del(...keys);
      }
      return 0;
    } catch (err) {
      console.warn(`[CacheService] Error invalidating pattern "${pattern}":`, err);
      return 0;
    }
  }

  /**
   * Invalidate all schedule, fleet, and public trips caches.
   * Also broadcasts a lightweight sync signal to connected clients.
   */
  static async invalidateTripsAndFleetCache(tripId?: number): Promise<void> {
    try {
      await Promise.all([
        this.invalidatePattern('cache:schedules:*'),
        this.invalidatePattern('cache:fleet:*'),
        this.invalidatePattern('cache:trips:*'),
        tripId
          ? Promise.all([
              this.deleteCache(`cache:trip_seats:${tripId}`),
              this.deleteCache(`cache:seat_details:${tripId}`),
            ])
          : Promise.all([
              this.invalidatePattern('cache:trip_seats:*'),
              this.invalidatePattern('cache:seat_details:*'),
            ]),
      ]);

      // Broadcast invalidation event to all active WebSockets
      WebSocketHub.broadcastToAll({
        type: 'SCHEDULE_UPDATED',
        tripId: tripId || null,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[CacheService] Error invalidating trips and fleet caches:', err);
    }
  }

  /**
   * Invalidate seat maps for a specific trip (e.g. after lock, unlock, booking, scan, swap)
   */
  static async invalidateSeatCache(tripId: number): Promise<void> {
    try {
      await Promise.all([
        this.deleteCache(`cache:trip_seats:${tripId}`),
        this.deleteCache(`cache:seat_details:${tripId}`),
        this.invalidatePattern('cache:fleet:*'), // Fleet status displays seat counts
      ]);
    } catch (err) {
      console.warn(`[CacheService] Error invalidating seat cache for trip #${tripId}:`, err);
    }
  }
}
