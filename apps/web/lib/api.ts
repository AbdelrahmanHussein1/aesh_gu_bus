export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
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
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchApiAuth<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options?.headers },
  });
}
