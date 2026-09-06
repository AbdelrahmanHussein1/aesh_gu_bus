import { FastifyInstance } from 'fastify';
import { RegisterSchema, LoginSchema } from '@bus-aesh/shared';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { SessionService } from '../services/session.service.js';
import { SheerIDService } from '../services/sheerid.service.js';
import { EmailService } from '../services/email.service.js';
import { WebSocketHub } from '../websocket/hub.js';
import { authenticateOdoo } from '../auth/odoo.js';

export async function authRoutes(fastify: FastifyInstance) {
  // 1. Verify Student Status / Academic ID (SheerID & Institutional Token)
  fastify.post('/api/auth/verify-student', async (request, reply) => {
    const { email, fullName, academicId, faculty } = request.body as any;

    if (!email || !academicId) {
      return reply.status(400).send({ error: 'Email and Academic ID are required' });
    }

    const result = await SheerIDService.verifyStudent({
      email,
      fullName: fullName || 'Galala Student',
      academicId,
      faculty,
    });

    if (!result.success) {
      return reply.status(400).send({
        error: result.message,
        messageAr: result.messageAr,
      });
    }

    return result;
  });

  // 1.1. Confirm 6-digit verification code
  fastify.post('/api/auth/confirm-code', async (request, reply) => {
    const { email, code } = request.body as { email: string; code: string };
    if (!email || !code) {
      return reply.status(400).send({ error: 'Email and verification code are required' });
    }

    const isValid = await SheerIDService.confirmCode(email, code);
    if (!isValid) {
      return reply.status(400).send({
        error: 'Invalid or expired verification code',
        messageAr: 'كود التحقق غير صحيح أو انتهت صلاحيته',
      });
    }

    return { success: true, message: 'Code confirmed successfully' };
  });

  // 1.2. Student Registration with Institutional ID Validation
  fastify.post('/api/auth/register', async (request, reply) => {
    const bodyResult = RegisterSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid registration data';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
    }

    const { email, fullName, role, password, academicId, faculty, phone, sheerIdVerificationId } = bodyResult.data;

    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });

      if (existingUser) {
        return reply.status(400).send({
          error: 'Email already registered',
          messageAr: 'هذا البريد مسجل بالفعل، يرجى تسجيل الدخول',
        });
      }

      // If registered as student (rider), validate Galala credentials
      if (role === 'rider') {
        if (!SheerIDService.isGalalaEmail(email)) {
          return reply.status(400).send({
            error: 'Registration requires official Galala University email (@gu.edu.eg)',
            messageAr: 'التسجيل كطالب يتطلب بريد جامعة الجلالة الرسمي (@gu.edu.eg)',
          });
        }

        if (academicId && !SheerIDService.isValidAcademicId(academicId)) {
          return reply.status(400).send({
            error: 'Invalid Galala University Academic ID',
            messageAr: 'رقم القيد الأكاديمي غير صالح',
          });
        }
      }

      const getDeterministicId = (str: string, seed: number) => {
        let hash = seed;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash % 10000000);
      };

      const erpUid = getDeterministicId(email, 10000);
      const erpPartnerId = getDeterministicId(email, 20000);

      const [newUser] = await db.insert(schema.users).values({
        email: email.toLowerCase().trim(),
        fullName,
        role: role || 'rider',
        password,
        academicId: academicId || null,
        faculty: faculty || null,
        phone: phone || null,
        isSheerIdVerified: Boolean(sheerIdVerificationId || SheerIDService.isGalalaEmail(email)),
        sheerIdVerificationId: sheerIdVerificationId || null,
        erpUid,
        erpPartnerId,
      }).returning();

      return { success: true, user: newUser };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Database error during registration' });
    }
  });

  // 1.3. Forgot Password Endpoint
  fastify.post('/api/auth/forgot-password', async (request, reply) => {
    const { email } = request.body as { email: string };
    if (!email) {
      return reply.status(400).send({ error: 'Email address is required' });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });

      if (!user) {
        return reply.status(404).send({ error: 'No user registered with this email address' });
      }

      const tempPassword = Math.random().toString(36).substring(2, 8).toUpperCase();

      await db.update(schema.users)
        .set({ password: tempPassword })
        .where(eq(schema.users.id, user.id));

      await EmailService.sendForgotPasswordEmail(user.email, user.fullName, tempPassword);

      return { success: true, message: 'Temporary password sent to email.' };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ error: error.message || 'Database error during password reset' });
    }
  });

  // 1.4. Authentication Login with Single-Device Concurrency Enforcement
  fastify.post('/api/auth/login', async (request, reply) => {
    const bodyResult = LoginSchema.safeParse(request.body);
    if (!bodyResult.success) {
      const fieldErrors = bodyResult.error.flatten().fieldErrors;
      const errorMsg = Object.entries(fieldErrors)
        .map(([k, v]) => `${k}: ${(v || []).join(', ')}`)
        .join('; ') || 'Invalid login data';
      return reply.status(400).send({ 
        error: errorMsg,
        message: errorMsg,
        details: bodyResult.error.format() 
      });
    }

    const { email, password } = bodyResult.data;
    const deviceInfo = (request.body as any)?.deviceInfo || request.headers['user-agent'] || 'Web Browser';

    try {
      let user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });

      if (user) {
        if (user.password && user.password !== password) {
          return reply.status(401).send({ error: 'Invalid password' });
        }
      } else {
        // Fallback to Odoo ERP
        const erpUser = await authenticateOdoo(email, password);

        let role = 'rider';
        if (email === 'admin@gu.edu.eg') role = 'admin';
        else if (email.startsWith('supervisor') || email === 'supervisor@gu.edu.eg') role = 'supervisor';

        const [newUser] = await db.insert(schema.users).values({
          email: email.toLowerCase().trim(),
          fullName: erpUser.name,
          role,
          erpUid: erpUser.uid,
          erpPartnerId: erpUser.partner_id,
        }).returning();
        user = newUser;
      }

      // Single-Device Concurrency:
      // 1. Terminate any previous WebSocket sessions for this user on other devices
      WebSocketHub.notifySessionDisplaced(user.id, deviceInfo);

      // 2. Generate new unique session ID and bind in Redis + DB
      const sessionId = await SessionService.createSession(user.id, deviceInfo);

      // 3. Issue JWT with sessionId
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        sessionId,
      }, { expiresIn: '30d' });

      return { token, user, sessionId };
    } catch (error: any) {
      return reply.status(401).send({ error: error.message || 'Login failed' });
    }
  });

  // 1.5. Logout (Terminates Active Session)
  fastify.post('/api/auth/logout', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any) => {
    const userId = request.user?.id;
    if (userId) {
      await SessionService.terminateSession(userId);
    }
    return { success: true };
  });

  // 1.6. Current User Profile & Active Session Check
  fastify.get('/api/auth/me', {
    preValidation: [(fastify as any).authenticate],
  }, async (request: any, reply) => {
    const userId = request.user?.id;
    const sessionId = request.user?.sessionId;

    const isValidSession = await SessionService.validateSession(userId, sessionId);
    if (!isValidSession) {
      return reply.status(401).send({
        error: 'CONCURRENT_SESSION_DISPLACED',
        message: 'Logged in from another device. Your session on this device has expired.',
        messageAr: 'تم تسجيل الدخول من جهاز آخر. تم إنهاء جلستك لحماية حسابك.',
      });
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    return { user };
  });
}
