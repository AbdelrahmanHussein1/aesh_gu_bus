import { NativeModules, Platform } from 'react-native';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getInitialApiUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return normalizeApiUrl(configured);

  const scriptUrl = NativeModules.SourceCode?.scriptURL as string | undefined;
  const match = scriptUrl?.match(/^https?:\/\/([^/:]+)/i);
  if (!match?.[1]) return '';

  const localDevHost = match[1] === 'localhost' || match[1] === '127.0.0.1';
  const host = Platform.OS === 'android' && localDevHost ? '10.0.2.2' : match[1];
  return `http://${host}:3000`;
}

export function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Enter the API server URL.');

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Enter a valid API URL, including http:// or https://.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('Use an http:// or https:// URL without embedded credentials.');
  }

  return trimmed;
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  baseUrl: string;
  token?: string;
  body?: unknown;
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { baseUrl, token, body, timeoutMs = 12000, headers: suppliedHeaders, ...init } = options;
  if (!baseUrl) throw new ApiError('Configure the API server URL to continue.', 0, 'API_URL_REQUIRED');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    ...(suppliedHeaders as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const responseText = await response.text();
    let payload: any = null;
    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        payload = { message: responseText };
      }
    }

    if (!response.ok) {
      const message = payload?.messageEn || payload?.messageAr || payload?.message || payload?.error || `Request failed (${response.status}).`;
      throw new ApiError(message, response.status, payload?.code, payload);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) throw new ApiError('The server took too long to respond. Try again.', 0, 'TIMEOUT');
    throw new ApiError('Could not connect to the API server. Check the server URL and connection.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export function toWebSocketUrl(baseUrl: string): string {
  if (!baseUrl) return '';
  return baseUrl.replace(/^http/i, 'ws');
}
