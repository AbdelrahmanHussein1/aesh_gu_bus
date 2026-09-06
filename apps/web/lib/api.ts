export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  const { protocol, hostname, port, origin } = window.location;

  // If accessed via Cloudflare Tunnel or public domain without custom port, use same origin with Next.js rewrites
  if (hostname.includes('trycloudflare.com') || (!port && (protocol === 'http:' || protocol === 'https:'))) {
    return origin;
  }

  // Local VM or LAN access (e.g. 192.168.1.11 or localhost)
  const host = (hostname === 'localhost' || hostname === '127.0.0.1') ? 'localhost' : hostname;
  return `${protocol}//${host}:3000`;
};

export const getApiUrls = () => {
  const apiUrl = getApiBaseUrl();
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  return { apiUrl, wsUrl };
};

export const API_URL = typeof window !== 'undefined' ? getApiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed', code: `HTTP_${res.status}` }));

    if (res.status === 401 && (err.error === 'CONCURRENT_SESSION_DISPLACED' || err.code === 'CONCURRENT_SESSION_DISPLACED')) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('session_displaced', { detail: err }));
      }
    }

    const errorObj = new Error(err.message || err.error || `HTTP ${res.status}`);
    (errorObj as any).code = err.code || `HTTP_${res.status}`;
    (errorObj as any).data = err;
    throw errorObj;
  }

  return res.json();
}

export async function fetchApiAuth<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
  });
}
