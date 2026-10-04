import crypto from 'node:crypto';
import axios from 'axios';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { Resend } from 'resend';
import { MailService } from './mail.service.js';
import { redisClient } from '../redis.js';

const resendApiKey = process.env.RESEND_API_KEY || 're_mock_key';
const emailFrom = process.env.EMAIL_FROM || 'Bus Aesh <onboarding@resend.dev>';
const sandboxRecipient = process.env.SANDBOX_OVERRIDE_RECIPIENT || '';
const sheerIdApiKey = process.env.SHEERID_API_KEY;
const sheerIdProgramId = process.env.SHEERID_PROGRAM_ID || 'galala-university-students';

const resend = new Resend(resendApiKey);

export interface VerificationResult {
  success: boolean;
  verificationId: string;
  status: 'APPROVED' | 'PENDING_CODE' | 'REJECTED';
  message: string;
  messageAr: string;
  devCode?: string;
}

export class SheerIDService {
  /**
   * Validates if the email domain belongs to Galala University or authorized testers.
   */
  static isGalalaEmail(email: string): boolean {
    const lower = email.toLowerCase().trim();
    return (
      /^[^@\s]+@gu\.edu\.eg$/.test(lower) ||
      /^[^@\s]+@galala\.edu\.eg$/.test(lower)
    );
  }

  /**
   * Validates Academic ID format (Galala standard: e.g. 21010012 or alphanumeric ID).
   */
  static isValidAcademicId(academicId: string): boolean {
    if (!academicId) return false;
    const clean = academicId.trim();
    // Allow format like 'std123456' or 5-14 digits
    return /^[a-zA-Z]{2,4}\d{4,10}$/.test(clean) || /^\d{5,14}$/.test(clean);
  }

  /**
   * Initiates student verification via SheerID API or Galala Institutional verification token.
   */
  static async verifyStudent(params: {
    email: string;
    fullName: string;
    academicId: string;
    faculty?: string;
  }): Promise<VerificationResult> {
    const { email, fullName, academicId, faculty } = params;

    // 1. Email format check
    if (!this.isGalalaEmail(email)) {
      return {
        success: false,
        verificationId: '',
        status: 'REJECTED',
        message: 'Must use an official Galala University email address (@gu.edu.eg)',
        messageAr: 'يجب استخدام البريد الإلكتروني الرسمي لجامعة الجلالة (@gu.edu.eg)',
      };
    }

    // 2. Academic ID check
    if (!this.isValidAcademicId(academicId)) {
      return {
        success: false,
        verificationId: '',
        status: 'REJECTED',
        message: 'Invalid Galala University Academic ID format (e.g. 21010012 or aes123456)',
        messageAr: 'رقم القيد الأكاديمي غير صالح (مثال: 21010012 أو aes123456)',
      };
    }

    // 3. SheerID Live Verification if API Key configured
    if (sheerIdApiKey) {
      try {
        const response = await axios.post(
          'https://services.sheerid.com/rest/v2/verification',
          {
            programId: sheerIdProgramId,
            trackingId: `gu_${academicId}_${Date.now()}`,
            email,
            firstName: fullName.split(' ')[0] || fullName,
            lastName: fullName.split(' ').slice(1).join(' ') || 'Student',
            metadata: {
              academicId,
              university: 'Galala University',
              faculty: faculty || 'General',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${sheerIdApiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          }
        );

        const status = response.data?.currentStep || response.data?.status;
        if (status === 'SUCCESS' || status === 'APPROVED') {
          const verificationId = response.data.verificationId || `sheer_${academicId}`;
          await db.insert(schema.verificationTokens).values({
            email: email.toLowerCase().trim(),
            token: verificationId,
            code: 'approved',
            academicId: academicId.trim(),
            isVerified: true,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          });
          return {
            success: true,
            verificationId,
            status: 'APPROVED',
            message: 'Student status verified successfully via SheerID',
            messageAr: 'تم التحقق من القيد الطلابي بجامعة الجلالة بنجاح عبر SheerID',
          };
        }
      } catch (err: any) {
        console.warn('[SheerIDService] Live SheerID API call failed, falling back to institutional code:', err?.message);
      }
    }

    // 4. Institutional Verification Code Flow (Fallback & default robust mechanism)
    const resendKey = `student_verification_resend:${email.toLowerCase().trim()}`;
    const resendCount = await redisClient.incr(resendKey);
    if (resendCount === 1) {
      await redisClient.expire(resendKey, 900);
    }
    if (resendCount > 3) {
      throw new Error('Too many verification requests. Please try again later.');
    }

    const verificationCode = crypto.randomInt(100000, 1000000).toString();
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await db.insert(schema.verificationTokens).values({
      email: email.toLowerCase().trim(),
      token: verificationToken,
      code: verificationCode,
      academicId: academicId.trim(),
      expiresAt,
    });

    // Send verification OTP via MailService (Microsoft 365 / Outlook SMTP, Resend, or Console)
    await MailService.sendStudentOtpEmail({
      email: email.toLowerCase().trim(),
      fullName,
      academicId,
      otp: verificationCode,
    });

    return {
      success: true,
      verificationId: verificationToken,
      status: 'PENDING_CODE',
      message: 'Verification code sent to your university email address.',
      messageAr: 'تم إرسال كود التحقق بنجاح إلى بريدك الجامعي.',
    };
  }

  /**
   * Confirms a 6-digit verification code.
   */
  static async confirmCode(email: string, code: string): Promise<boolean> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const attemptKey = `student_verification_attempts:${cleanEmail}`;
    const attempts = await redisClient.incr(attemptKey);
    if (attempts === 1) {
      await redisClient.expire(attemptKey, 900);
    }
    if (attempts > 5) {
      return false;
    }

    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.email, cleanEmail),
        eq(schema.verificationTokens.code, cleanCode),
        eq(schema.verificationTokens.isVerified, false),
        gt(schema.verificationTokens.expiresAt, new Date())
      ),
      orderBy: [desc(schema.verificationTokens.createdAt)],
    });

    if (!record) {
      return false;
    }

    // Mark verified
    await db.update(schema.verificationTokens)
      .set({ isVerified: true })
      .where(eq(schema.verificationTokens.id, record.id));

    await redisClient.del(attemptKey);
    return true;
  }
}
