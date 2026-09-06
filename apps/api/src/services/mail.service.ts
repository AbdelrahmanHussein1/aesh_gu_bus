import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';
const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
const emailFrom = process.env.EMAIL_FROM || (smtpUser ? `Galala University Bus <${smtpUser}>` : 'Bus Aesh <onboarding@resend.dev>');
const resendApiKey = process.env.RESEND_API_KEY || '';

let transporter: any = null;
if (smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false,
    },
  });
}

const resend = resendApiKey && resendApiKey !== 're_mock_key' ? new Resend(resendApiKey) : null;

export class MailService {
  /**
   * Sends a high-priority verification OTP email to a student's Outlook / Galala email.
   */
  static async sendStudentOtpEmail(params: {
    email: string;
    fullName: string;
    academicId: string;
    otp: string;
  }): Promise<{ success: boolean; method: string }> {
    const { email, fullName, academicId, otp } = params;

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>رمز التحقق لجامعة الجلالة</title>
</head>
<body style="margin: 0; padding: 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b1120; color: #f1f5f9;">
  <div style="max-width: 540px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #002b49 0%, #0369a1 100%); padding: 24px; text-align: center; border-bottom: 2px solid #38bdf8;">
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">جامعة الجلالة — Galala University</h1>
      <p style="color: #bae6fd; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">منظومة النقل الذكي للطلاب (Bus Aesh Transit)</p>
    </div>

    <!-- Body -->
    <div style="padding: 28px; text-align: center;">
      <div style="display: inline-block; padding: 4px 12px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; color: #38bdf8; font-size: 11px; font-weight: 700; margin-bottom: 16px;">
        🔐 بريد Outlook الأكاديمي الرسمي
      </div>

      <h2 style="color: #f8fafc; font-size: 18px; margin: 0 0 8px 0;">رمز تفعيل الحساب والتحقق من القيد</h2>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0; line-height: 1.6;">
        مرحباً <strong>${fullName}</strong>،<br>
        تم استلام طلب تسجيل حساب طالب باستخدام الرقم الأكاديمي (<strong>${academicId}</strong>).
      </p>

      <!-- OTP Box -->
      <div style="background: #1e293b; border: 2px dashed #38bdf8; border-radius: 12px; padding: 20px; margin: 20px 0;">
        <span style="display: block; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">كود التحقق الخاص بك (One-Time Password)</span>
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #38bdf8;">${otp}</span>
      </div>

      <p style="color: #f59e0b; font-size: 12px; margin: 16px 0 24px 0;">
        ⏱️ هذا الرمز صالح للاستخدام خلال <strong>15 دقيقة</strong> فقط.
      </p>

      <!-- Open Outlook Button -->
      <a href="https://outlook.office.com/mail/" target="_blank" style="display: inline-block; padding: 12px 24px; background: #0284c7; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
        📥 فتح بريد Outlook الجامعي (outlook.office.com)
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #0b0f19; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">إذا لم تقم بطلب هذا الرمز، يُرجى تجاهل هذه الرسالة أو التواصل مع دعم تقنية المعلومات بجامعة الجلالة.</p>
      <p style="margin: 4px 0 0 0; color: #475569;">© 2026 Galala University Transit System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // 1. Try Microsoft 365 / Outlook SMTP first if configured
    if (transporter) {
      try {
        console.log(`[MailService] Sending OTP to Outlook email ${email} via SMTP (${smtpHost}:${smtpPort})...`);
        await transporter.sendMail({
          from: emailFrom,
          to: email,
          subject: `رمز التحقق الخاص بحسابك في باصات جامعة الجلالة: ${otp}`,
          html: htmlContent,
        });
        console.log(`[MailService] ✅ OTP email delivered via SMTP to ${email}`);
        return { success: true, method: 'smtp' };
      } catch (err: any) {
        console.warn(`[MailService] SMTP delivery failed (${err.message}). Falling back...`);
      }
    }

    // 2. Try Resend if configured
    if (resend) {
      try {
        console.log(`[MailService] Sending OTP to ${email} via Resend...`);
        await resend.emails.send({
          from: emailFrom,
          to: email,
          subject: `رمز التحقق الخاص بجامعة الجلالة: ${otp}`,
          html: htmlContent,
        });
        console.log(`[MailService] ✅ OTP email sent via Resend to ${email}`);
        return { success: true, method: 'resend' };
      } catch (err: any) {
        console.warn(`[MailService] Resend delivery failed (${err.message}).`);
      }
    }

    // 3. Fallback / Dev Mode Logging
    console.log(`\n================================================================`);
    console.log(`  📧 [GALALA OUTLOOK EMAIL OTP]`);
    console.log(`  Student: ${fullName} (${email})`);
    console.log(`  Academic ID: ${academicId}`);
    console.log(`  🔑 OTP Verification Code: ${otp}`);
    console.log(`  👉 To configure real Outlook sending, set in .env:`);
    console.log(`     SMTP_USER=your_email@gu.edu.eg`);
    console.log(`     SMTP_PASS=your_outlook_app_password`);
    console.log(`================================================================\n`);

    return { success: true, method: 'logged' };
  }
}
