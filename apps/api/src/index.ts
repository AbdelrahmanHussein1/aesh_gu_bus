import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { redis } from './redis.js';
import { SessionService } from './services/session.service.js';
import { WebSocketHub } from './websocket/hub.js';
import { authRoutes } from './routes/auth.routes.js';
import { tripsRoutes } from './routes/trips.routes.js';
import { bookingsRoutes } from './routes/bookings.routes.js';
import { supervisorRoutes } from './routes/supervisor.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { EmailOutboxService } from './services/email-outbox.service.js';
import { MailService } from './services/mail.service.js';

dotenv.config();

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  throw new Error('JWT_SECRET environment variable is missing.');
}
const configuredOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3001,http://127.0.0.1:3001')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const getWebSocketToken = (request: any): string | undefined => {
  const protocolHeader = request.headers?.['sec-websocket-protocol'];
  if (typeof protocolHeader === 'string') {
    return protocolHeader.split(',')[0]?.trim() || undefined;
  }
  return undefined;
};

const fastify = Fastify({
  logger: true,
});

// Configure Plugins
await fastify.register(cors, {
  origin: configuredOrigins.length > 0 ? configuredOrigins : false,
  credentials: true,
});

// Security Headers Hook
fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// In-Memory Rate Limiting for Auth Endpoints (15 requests per 60s per IP)
const authRateLimitMap = new Map<string, { count: number; expiresAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of authRateLimitMap.entries()) {
    if (data.expiresAt <= now) {
      authRateLimitMap.delete(ip);
    }
  }
}, 30000);

fastify.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api/auth/')) {
    const ip = request.ip || 'unknown';
    const now = Date.now();
    const entry = authRateLimitMap.get(ip);

    if (!entry || entry.expiresAt <= now) {
      authRateLimitMap.set(ip, { count: 1, expiresAt: now + 60000 });
    } else {
      entry.count += 1;
      if (entry.count > 25) {
        reply.status(429).send({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please wait one minute before trying again.',
          messageAr: 'تم تجاوز الحد الأقصى للمحاولات. يرجى الانتظار لمدة دقيقة والمحاولة مجدداً.',
        });
        return;
      }
    }
  }
});

// Request Body Sanitizer Hook (Guards against script injections)
fastify.addHook('preValidation', async (request: any) => {
  if (request.body && typeof request.body === 'object') {
    const sanitize = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
          obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
        } else if (obj[key] && typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    };
    sanitize(request.body);
  }
});

await fastify.register(jwt, {
  secret: jwtSecret,
});

await fastify.register(websocket);

// Authentication Middleware with Single-Device Concurrency Check
fastify.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // Enforce single-device session concurrency
  const userId = request.user?.id;
  const sessionId = request.user?.sessionId;

  if (userId && sessionId) {
    const isValid = await SessionService.validateSession(userId, sessionId);
    if (!isValid) {
      return reply.status(401).send({
        error: 'CONCURRENT_SESSION_DISPLACED',
        message: 'Your account was logged into from another device. This session has been terminated.',
        messageAr: 'تم تسجيل الدخول إلى هذا الحساب من جهاز آخر. تم إنهاء هذه الجلسة لحماية بياناتك.',
      });
    }
  }
});

// Health Check
fastify.get('/health', async () => {
  const mail = MailService.getHealth();
  try {
    const email = await EmailOutboxService.getSummary();
    return { status: 'OK', time: new Date(), email: { ...email, checkedAt: mail.checkedAt } };
  } catch {
    return {
      status: 'OK',
      time: new Date(),
      email: { status: 'degraded', pending: null, failed: null, checkedAt: mail.checkedAt },
    };
  }
});

// 1. WebSocket: Live Seat Map Updates per Trip Room
fastify.route({
  method: 'GET',
  url: '/ws/trips/:tripId/seats',
  wsHandler: (connection, req) => {
    const tripId = parseInt((req.params as any).tripId);
    const socket = (connection as any).socket || connection;
    if (isNaN(tripId)) {
      socket.close();
      return;
    }

    const token = getWebSocketToken(req);
    try {
      fastify.jwt.verify(token || '');
    } catch {
      socket.close(4001, 'Invalid auth token');
      return;
    }

    WebSocketHub.joinTripRoom(tripId, socket);
    console.log(`[WebSocket] Client joined trip room: ${tripId}`);

    const cleanup = () => {
      WebSocketHub.leaveTripRoom(tripId, socket);
      console.log(`[WebSocket] Client left trip room: ${tripId}`);
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  },
  handler: (request, reply) => {
    reply.status(400).send({ error: 'Only WebSocket connections allowed' });
  },
});

// 2. WebSocket: User Session Notification Channel (Displacement alerts)
fastify.route({
  method: 'GET',
  url: '/ws/user/session',
  wsHandler: (connection, req) => {
    const socket = (connection as any).socket || connection;
    const token = getWebSocketToken(req);

    if (!token) {
      socket.close(4000, 'Missing auth token');
      return;
    }

    try {
      const decoded: any = fastify.jwt.verify(token);
      const userId = decoded.id;
      WebSocketHub.registerUserSocket(userId, socket);

      const cleanup = () => {
        WebSocketHub.unregisterUserSocket(userId, socket);
      };

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    } catch {
      socket.close(4001, 'Invalid auth token');
    }
  },
  handler: (request, reply) => {
    reply.status(400).send({ error: 'Only WebSocket connections allowed' });
  },
});

// Register Domain Modular Routes
await fastify.register(authRoutes);
await fastify.register(tripsRoutes);
await fastify.register(bookingsRoutes);
await fastify.register(supervisorRoutes);
await fastify.register(adminRoutes);

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`[${signal}] Shutting down Fastify server gracefully...`);
  await EmailOutboxService.stop();
  await MailService.close();
  await fastify.close();
  await redis.quit();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Launch Fastify Server
async function start() {
  try {
    await fastify.listen({ port, host });
    console.log(`Fastify production server running on http://${host}:${port}`);
    void MailService.start();
    EmailOutboxService.start();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
