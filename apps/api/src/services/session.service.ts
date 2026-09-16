import crypto from 'node:crypto';
import { redis } from '../redis.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export class SessionService {
  /**
   * Creates a new unique session for the given user, displacing any existing session on other devices.
   */
  static async createSession(userId: string, deviceInfo?: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const redisKey = `active_session:${userId}`;

    try {
      // 1. Store in Redis
      await redis.set(redisKey, sessionId, 'EX', SESSION_TTL_SECONDS);
    } catch (err) {
      console.warn('[SessionService] Redis set failed, relying on PostgreSQL:', err);
    }

    try {
      // 2. Persist in database
      await db.update(schema.users)
        .set({
          currentSessionId: sessionId,
          lastLoginDevice: deviceInfo || 'Unknown Device',
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } catch (err) {
      console.error('[SessionService] Failed to persist session in DB:', err);
    }

    return sessionId;
  }

  /**
   * Validates whether the token's sessionId matches the user's currently active session.
   * If another device logged in, this returns false.
   */
  static async validateSession(userId: string, sessionId?: string): Promise<boolean> {
    if (!userId || !sessionId) {
      return false;
    }

    const redisKey = `active_session:${userId}`;
    try {
      const activeSession = await redis.get(redisKey);
      if (activeSession) {
        return activeSession === sessionId;
      }
    } catch (err) {
      console.warn('[SessionService] Redis get failed, checking DB fallback:', err);
    }

    // Fallback to PostgreSQL
    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          currentSessionId: true,
        },
      });

      if (user && user.currentSessionId) {
        if (user.currentSessionId === sessionId) {
          // Re-populate Redis cache
          try {
            await redis.set(redisKey, sessionId, 'EX', SESSION_TTL_SECONDS);
          } catch (err) {
            console.warn('[SessionService] Redis cache re-population failed:', err);
          }
          return true;
        }
      }
    } catch (err) {
      console.error('[SessionService] Database session lookup error:', err);
    }

    return false;
  }

  /**
   * Explicitly terminates the user's active session upon logout.
   */
  static async terminateSession(userId: string): Promise<void> {
    const redisKey = `active_session:${userId}`;
    try {
      await redis.del(redisKey);
    } catch (err) {
      console.warn('[SessionService] Redis cache re-population failed:', err);
    }

    try {
      await db.update(schema.users)
        .set({
          currentSessionId: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));
    } catch (err) {
      console.error('[SessionService] Failed to clear DB session:', err);
    }
  }
}
