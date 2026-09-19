type JsonPayload = Record<string, unknown>;

function webhookHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (secret) {
    headers['x-n8n-secret'] = secret;
  }
  return headers;
}

async function postWebhook(url: string | undefined, payload: JsonPayload, label: string): Promise<boolean> {
  if (!url) {
    console.warn(`[n8n] ${label}: webhook URL is not set; skipping automation.`);
    return false;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: webhookHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error(`[n8n] ${label}: webhook failed (${response.status}) ${url}`);
      return false;
    }

    console.log(`[n8n] ${label}: webhook accepted`);
    return true;
  } catch (error) {
    console.error(`[n8n] ${label}: webhook request failed:`, error);
    return false;
  }
}

export type BookingLegPayload = {
  kind: 'go' | 'return';
  label: string;
  labelAr: string;
  route: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  seatNumber: number;
  qrToken: string;
  boardingCode: string;
  qrImageUrl: string;
};

export class N8nService {
  static qrImageUrl(value: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&format=png&data=${encodeURIComponent(value)}`;
  }

  static notifyStudentOtp(params: {
    fullName: string;
    email: string;
    academicId: string;
    otp: string;
  }): Promise<boolean> {
    return postWebhook(process.env.N8N_OTP_WEBHOOK_URL, {
      event: 'otp',
      fullName: params.fullName,
      email: params.email,
      academicId: params.academicId,
      otp: params.otp,
      expiresInMinutes: 15,
    }, 'otp');
  }

  static notifyBookingConfirmation(params: {
    studentName: string;
    studentId: string;
    studentEmail: string;
    route: string;
    date: string;
    price: string;
    bookingRef: string;
    paymentRef: string;
    bookingType: 'one_way' | 'round_trip';
    legs: BookingLegPayload[];
  }): Promise<boolean> {
    return postWebhook(process.env.N8N_BOOKING_WEBHOOK_URL, {
      event: 'booking',
      ...params,
      hasReturn: params.legs.length > 1,
    }, 'booking');
  }
}
