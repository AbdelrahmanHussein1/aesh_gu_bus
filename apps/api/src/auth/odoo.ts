import axios from 'axios';

interface OdooAuthResult {
  uid: number;
  partner_id: number;
  name: string;
  email: string;
}

/**
 * Tries to authenticate credentials against the Odoo ERP.
 * Uses the configured ERP provider, with a development-only mock mode.
 */
export async function authenticateOdoo(email: string, pass: string): Promise<OdooAuthResult> {
  const isMock = process.env.MOCK_ERP === 'true';

  if (isMock && process.env.NODE_ENV === 'production') {
    throw new Error('Mock ERP authentication is disabled in production');
  }

  // Helper to generate deterministic unique ID based on email string
  const getDeterministicId = (str: string, seed: number) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash % 10000000);
  };

  if (isMock) {
    console.log('[Odoo Auth] Using Mock/Direct Authentication for account:', email);
    const uid = getDeterministicId(email, 12226);
    const partner_id = getDeterministicId(email, 14002);
    return {
      uid,
      partner_id,
      name: `Student Passenger (${email.split('@')[0]})`,
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
