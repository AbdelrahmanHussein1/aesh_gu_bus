import axios from 'axios';

interface OdooAuthResult {
  uid: number;
  partner_id: number;
  name: string;
  email: string;
}

/**
 * Tries to authenticate credentials against the Odoo ERP.
 * Falls back to hardcoded student profile if in MOCK mode or if credentials match.
 */
export async function authenticateOdoo(email: string, pass: string): Promise<OdooAuthResult> {
  const isMock = process.env.MOCK_ERP === 'true';

  // Helper to generate deterministic unique ID based on email string
  const getDeterministicId = (str: string, seed: number) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 10000000);
  };

  // Hardcoded mockup account for development/offline testing
  if (isMock || (email === 'aes400196@gu.edu.eg' && pass === '1Key@GALALA')) {
    console.log('[Odoo Auth] Using Mock Authentication for student:', email);
    const uid = email === 'aes400196@gu.edu.eg' ? 12226 : getDeterministicId(email, 12226);
    const partner_id = email === 'aes400196@gu.edu.eg' ? 14002 : getDeterministicId(email, 14002);
    return {
      uid,
      partner_id,
      name: email === 'aes400196@gu.edu.eg' ? 'Abdelrahman Ehab (Student)' : 'Mock User',
      email: email,
    };
  }

  // Pre-configured mock supervisors for testing — only when MOCK_ERP is enabled
  if (isMock && email.startsWith('supervisor') && pass === 'super123') {
    const uid = email === 'supervisor@gu.edu.eg' ? 90001 : getDeterministicId(email, 90001);
    return {
      uid,
      partner_id: uid,
      name: 'Supervisor Aesh',
      email: email,
    };
  }

  try {
    console.log('[Odoo Auth] Contacting Odoo ERP for:', email);
    const response = await axios.post(
      'https://erp.gu.edu.eg/web/session/authenticate',
      {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          db: 'GU-Live',
          login: email,
          password: pass,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 8000, // 8-second timeout
      }
    );

    const data = response.data;
    if (data.error) {
      throw new Error(data.error.data?.message || data.error.message || 'ERP Authentication failed');
    }

    if (data.result && data.result.uid) {
      return {
        uid: data.result.uid,
        partner_id: data.result.partner_id,
        name: data.result.name,
        email: data.result.username || email,
      };
    }

    throw new Error('Invalid credentials');
  } catch (err: any) {
    console.error('[Odoo Auth] Error calling ERP:', err.message);
    throw new Error(err.message || 'ERP authentication service unavailable');
  }
}
