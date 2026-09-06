import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const resendApiKey = process.env.RESEND_API_KEY || 're_mock_key';
const emailFrom = process.env.EMAIL_FROM || 'Bus Aesh <onboarding@resend.dev>';
const sandboxOverrideRecipient = process.env.SANDBOX_OVERRIDE_RECIPIENT || '';

const resend = new Resend(resendApiKey);

const timeSlotLabels: Record<string, string> = {
  morning_1: '09:00 AM (Shift 1)',
  morning_2: '11:30 AM (Shift 2)',
  return_1: '12:30 PM (Return 1)',
  return_2: '02:30 PM (Return 2)',
  return_3: '05:30 PM (Return 3)',
  return: 'Return Trip',
};

export class EmailService {
  static getEffectiveRecipient(originalEmail: string): string {
    if (emailFrom.includes('onboarding@resend.dev')) {
      return sandboxOverrideRecipient;
    }
    return originalEmail;
  }

  static async sendForgotPasswordEmail(email: string, name: string, tempPassword: string) {
    const recipient = this.getEffectiveRecipient(email);
    console.log(`[Email] Sending password reset code to ${recipient} (original: ${email})...`);
    if (resendApiKey === 're_mock_key') return;

    await resend.emails.send({
      from: emailFrom,
      to: recipient,
      subject: `🔑 Bus Aesh: Password Reset Code`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #38bdf8; margin-bottom: 16px;">🔑 Password Reset Request</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>You requested a password reset for your Bus Aesh account.</p>
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; border: 1px solid #334155;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase;">Temporary Password</p>
            <p style="font-family: monospace; font-size: 28px; font-weight: bold; color: #38bdf8; margin: 0; letter-spacing: 2px;">${tempPassword}</p>
          </div>
          <p style="color: #f59e0b; font-size: 13px;">⚠️ Use this temporary password to log in. You can update your password in your settings once logged in.</p>
          <p style="color: #64748b; font-size: 11px; margin-top: 24px;">If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  static async sendConfirmationEmail(
    email: string,
    name: string,
    trip: any,
    seatNumber: number,
    qrToken: string,
    legType: string,
    bookingType: string,
    paymentId: string
  ) {
    const recipient = this.getEffectiveRecipient(email);
    if (resendApiKey === 're_mock_key') return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}`;
    const legLabel = legType === 'from_campus' ? 'Return Home' : 'Trip to Campus';
    const legLabelAr = legType === 'from_campus' ? 'عودة للمنزل' : 'ذهاب للجامعة';

    await resend.emails.send({
      from: emailFrom,
      to: recipient,
      subject: `🚌 Bus Aesh Ticket: ${trip.route.nameEn} — Seat ${seatNumber}`,
      html: this.buildInvoiceHtml({
        name,
        bookingType,
        legs: [
          {
            legLabel,
            legLabelAr,
            routeAr: trip.route.nameAr,
            routeEn: trip.route.nameEn,
            date: trip.tripDate,
            departureTime: new Date(trip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timeSlot: timeSlotLabels[trip.timeSlot] || trip.timeSlot,
            seatNumber,
            qrUrl,
          },
        ],
        paymentId,
        amount: '160.00 EGP',
        cancellationLockHours: trip.cancellationLockHours,
      }),
    });
  }

  static async sendRoundTripEmailConfirmation(
    email: string,
    name: string,
    toCampusTrip: any,
    toCampusSeat: number,
    toCampusQR: string,
    fromCampusTrip: any,
    fromCampusSeat: number,
    fromCampusQR: string,
    paymentId: string
  ) {
    const recipient = this.getEffectiveRecipient(email);
    if (resendApiKey === 're_mock_key') return;

    const arrivalQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(toCampusQR)}`;
    const returnQRUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fromCampusQR)}`;

    await resend.emails.send({
      from: emailFrom,
      to: recipient,
      subject: `🚌 Bus Aesh Round-Trip Tickets: ${toCampusTrip.route.nameEn}`,
      html: this.buildInvoiceHtml({
        name,
        bookingType: 'round_trip',
        legs: [
          {
            legLabel: 'Trip to Campus',
            legLabelAr: 'ذهاب للجامعة',
            routeAr: toCampusTrip.route.nameAr,
            routeEn: toCampusTrip.route.nameEn,
            date: toCampusTrip.tripDate,
            departureTime: new Date(toCampusTrip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timeSlot: timeSlotLabels[toCampusTrip.timeSlot] || toCampusTrip.timeSlot,
            seatNumber: toCampusSeat,
            qrUrl: arrivalQRUrl,
          },
          {
            legLabel: 'Return Home',
            legLabelAr: 'عودة للمنزل',
            routeAr: fromCampusTrip.route.nameAr,
            routeEn: fromCampusTrip.route.nameEn,
            date: fromCampusTrip.tripDate,
            departureTime: new Date(fromCampusTrip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            timeSlot: timeSlotLabels[fromCampusTrip.timeSlot] || fromCampusTrip.timeSlot,
            seatNumber: fromCampusSeat,
            qrUrl: returnQRUrl,
          },
        ],
        paymentId,
        amount: '320.00 EGP',
        cancellationLockHours: toCampusTrip.cancellationLockHours,
      }),
    });
  }

  static async sendSwapNotificationEmail(email: string, name: string, oldTrip: any, newTrip: any, seatNumber: number, qrToken: string) {
    const recipient = this.getEffectiveRecipient(email);
    if (resendApiKey === 're_mock_key') return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}`;
    await resend.emails.send({
      from: emailFrom,
      to: recipient,
      subject: `⚠️ Bus Reassignment: New Seat Assigned`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0f172a; color: #e2e8f0; padding: 32px; border-radius: 12px;">
          <h2 style="color: #f59e0b; margin-bottom: 16px;">⚠️ Notice: Ticket Reassignment</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your bus ticket has been reassigned due to operational schedule updates.</p>
          <hr style="border: 1px solid #334155; margin: 24px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; color: #94a3b8;">Old Trip:</td><td style="padding: 8px;">${oldTrip.route.nameEn} (${oldTrip.tripDate})</td></tr>
            <tr><td style="padding: 8px; color: #94a3b8;">New Trip:</td><td style="padding: 8px; color: #38bdf8;">${newTrip.route.nameEn} (${newTrip.tripDate})</td></tr>
            <tr><td style="padding: 8px; color: #94a3b8;">New Seat:</td><td style="padding: 8px; font-weight: bold; font-size: 18px;">${seatNumber}</td></tr>
          </table>
          <hr style="border: 1px solid #334155; margin: 24px 0;" />
          <p style="color: #f59e0b;">⚠️ Your old QR code is now invalidated. Present this new QR code to board:</p>
          <div style="text-align: center; padding: 16px;">
            <img src="${qrUrl}" alt="New QR Code" style="border: 3px solid #38bdf8; border-radius: 8px; padding: 8px; background: white;" />
          </div>
        </div>
      `,
    });
  }

  private static buildInvoiceHtml(data: {
    name: string;
    bookingType: string;
    legs: Array<{
      legLabel: string;
      legLabelAr: string;
      routeAr: string;
      routeEn: string;
      date: string;
      departureTime: string;
      timeSlot: string;
      seatNumber: number;
      qrUrl: string;
    }>;
    paymentId: string;
    amount: string;
    cancellationLockHours: number;
  }): string {
    const bookingTypeLabel = data.bookingType === 'round_trip' ? '🔄 Round Trip' : '➡️ One Way';
    const bookingTypeLabelAr = data.bookingType === 'round_trip' ? 'ذهاب وعودة' : 'اتجاه واحد';

    const legSections = data.legs.map((leg) => `
      <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-bottom: 16px; border-left: 4px solid ${leg.legLabel.includes('Return') ? '#a78bfa' : '#38bdf8'};">
        <h3 style="color: ${leg.legLabel.includes('Return') ? '#a78bfa' : '#38bdf8'}; margin: 0 0 12px 0; font-size: 16px;">
          ${leg.legLabel} — ${leg.legLabelAr}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #94a3b8;">Route / المسار:</td><td style="padding: 6px 0;">${leg.routeEn} — ${leg.routeAr}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Date / التاريخ:</td><td style="padding: 6px 0;">${leg.date}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Time Slot / الوقت:</td><td style="padding: 6px 0;">${leg.timeSlot}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Departure / المغادرة:</td><td style="padding: 6px 0;">${leg.departureTime}</td></tr>
          <tr><td style="padding: 6px 0; color: #94a3b8;">Seat / المقعد:</td><td style="padding: 6px 0; font-weight: bold; font-size: 18px; color: #38bdf8;">${leg.seatNumber}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 16px; padding: 12px; background: white; border-radius: 8px; display: inline-block;">
          <img src="${leg.qrUrl}" alt="${leg.legLabel} QR Code" style="width: 200px; height: 200px;" />
          <p style="color: #475569; font-size: 11px; margin: 8px 0 0 0;">${leg.legLabel} QR — Show this to board</p>
        </div>
      </div>
    `).join('');

    return `
      <div style="max-width: 620px; margin: 0 auto; font-family: 'Segoe UI', Arial, sans-serif; background: #0b0f19; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px; text-align: center; border-bottom: 2px solid #334155;">
          <h1 style="color: #38bdf8; margin: 0; font-size: 24px;">🚌 Bus Aesh</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Galala University Transport Service</p>
          <p style="color: #94a3b8; margin: 2px 0 0 0; font-size: 13px;">خدمة النقل - جامعة الجلالة</p>
        </div>
        <div style="padding: 24px 32px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 24px;">
            <div>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">Passenger / الراكب</p>
              <p style="font-size: 18px; font-weight: bold; margin: 4px 0;">${data.name}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">Booking Type / نوع الحجز</p>
              <p style="font-size: 14px; margin: 4px 0;">${bookingTypeLabel} — ${bookingTypeLabelAr}</p>
            </div>
          </div>
          <hr style="border: 1px solid #334155; margin: 0 0 24px 0;" />
          ${legSections}
          <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin-top: 16px; border-left: 4px solid #22c55e;">
            <h3 style="color: #22c55e; margin: 0 0 12px 0; font-size: 16px;">💳 Payment Details — تفاصيل الدفع</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 6px 0; color: #94a3b8;">Transaction ID:</td><td style="padding: 6px 0; font-family: monospace;">${data.paymentId}</td></tr>
              <tr><td style="padding: 6px 0; color: #94a3b8;">Amount / المبلغ:</td><td style="padding: 6px 0; font-weight: bold; font-size: 18px; color: #22c55e;">${data.amount}</td></tr>
              <tr><td style="padding: 6px 0; color: #94a3b8;">Status / الحالة:</td><td style="padding: 6px 0; color: #22c55e;">✅ Paid — مدفوع</td></tr>
            </table>
          </div>
        </div>
        <div style="background: #0f172a; padding: 16px 32px; text-align: center; border-top: 1px solid #334155;">
          <p style="color: #64748b; font-size: 11px; margin: 0;">Bus Aesh — Galala University Transport © ${new Date().getFullYear()}</p>
        </div>
      </div>
    `;
  }
}
