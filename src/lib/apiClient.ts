import { Storage } from './storage';

interface ApiRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

function getAuthHeaders(): Record<string, string> {
  const { token } = Storage.getAuthState();
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, headers = {}, ...fetchOptions } = options;

  const mergedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(skipAuth ? {} : getAuthHeaders()),
    ...headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    headers: mergedHeaders,
  });

  const data = await response.json().catch(() => ({} as T));

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function apiGet<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, { ...options, method: 'GET' });
}

export async function apiPost<T = unknown>(url: string, body?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    ...options,
    method: 'POST',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export async function apiDelete<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, { ...options, method: 'DELETE' });
}

export async function apiPatch<T = unknown>(url: string, body?: unknown, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
  return apiFetch<T>(url, {
    ...options,
    method: 'PATCH',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
