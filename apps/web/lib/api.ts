export const getApiUrls = () => {
  if (typeof window === 'undefined') return { apiUrl: 'http://localhost:3000', wsUrl: 'ws://localhost:3000' };
  const hostname = window.location.hostname;
  const host = hostname === 'localhost' || hostname === '127.0.0.1' ? 'localhost' : hostname;
  return { apiUrl: `http://${host}:3000`, wsUrl: `ws://${host}:3000` };
};

const { apiUrl: API_URL } = getApiUrls();
export { API_URL };

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
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
