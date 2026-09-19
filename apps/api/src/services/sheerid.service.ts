import crypto from 'node:crypto';
import axios from 'axios';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';
import { Resend } from 'resend';
import { MailService } from './mail.service.js';

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
      lower.endsWith('@gu.edu.eg') ||
      lower.endsWith('@galala.edu.eg') ||
      lower.endsWith('@outlook.com') ||
      lower.startsWith('aes') ||
      lower.startsWith('std.') ||
      lower.startsWith('test.')
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
        message: 'Use a Galala University email (@gu.edu.eg) or an Outlook email (@outlook.com)',
        messageAr: 'استخدم بريد جامعة الجلالة (@gu.edu.eg) أو بريد Outlook (@outlook.com)',
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
          return {
            success: true,
            verificationId: response.data.verificationId || `sheer_${academicId}`,
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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const verificationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    await db.insert(schema.verificationTokens).values({
      email: email.toLowerCase().trim(),
      token: verificationToken,
      code: verificationCode,
      academicId: academicId.trim(),
      expiresAt,
    });

    // Log verification code to server console for testing/audit
    console.log(`[SheerID Verification] 🔐 Verification OTP for ${email} (Academic ID: ${academicId}) is: ${verificationCode}`);

    // Send verification OTP via MailService (Microsoft 365 / Outlook SMTP, Resend, or Console)
    try {
      await MailService.sendStudentOtpEmail({
        email: email.toLowerCase().trim(),
        fullName,
        academicId,
        otp: verificationCode,
      });
    } catch (err: any) {
      console.warn('[SheerIDService] MailService delivery encountered error:', err?.message);
    }

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

    const record = await db.query.verificationTokens.findFirst({
      where: and(
        eq(schema.verificationTokens.email, cleanEmail),
        eq(schema.verificationTokens.code, cleanCode),
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

    return true;
  }
}
