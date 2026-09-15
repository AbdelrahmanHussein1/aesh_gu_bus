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

dotenv.config();

const port = parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET must be configured');
const resendApiKey = process.env.RESEND_API_KEY || 're_mock_key';

const fastify = Fastify({
  logger: true,
});

// Configure Plugins
await fastify.register(cors, {
  origin: true, // Allow all origins for production web + mobile app
  credentials: true,
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
  return { status: 'OK', time: new Date() };
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
    const token = (req.query as any)?.token;

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

    if (resendApiKey === 're_mock_key') {
      console.log('\n⚠️  [Email] Running in MOCK MODE — no real emails will be sent.');
      console.log('    To enable real emails, set RESEND_API_KEY in apps/api/.env\n');
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
