'use client';

/**
 * Browser-side API client. Every call goes to this app's own /api/backend/* route,
 * which attaches the httpOnly session cookie as a Bearer token and forwards to NestJS.
 * The JWT is never readable by page scripts.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages[0] ?? `Request failed (${status})`);
  }
}

function toMessages(body: unknown, status: number): string[] {
  const m = (body as { message?: unknown } | null)?.message;
  if (Array.isArray(m)) return m.map(String);
  if (typeof m === 'string') return [m];
  return [`Request failed (${status})`];
}

let redirecting = false;

export async function api<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, ...rest } = init;
  const res = await fetch(`/api/backend/${path.replace(/^\/+/, '')}`, {
    ...rest,
    headers: { accept: 'application/json', ...(rest.body ? { 'content-type': 'application/json' } : {}), ...rest.headers },
    cache: 'no-store',
  });
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && auth && !redirecting && typeof window !== 'undefined') {
      redirecting = true;
      await fetch('/api/session/logout', { method: 'POST' }).catch(() => undefined);
      const next = encodeURIComponent(window.location.pathname);
      // Deliberately a full page load (not router.push): it discards every cached query of the expired session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}&expired=1`);
    }
    throw new ApiError(res.status, toMessages(body, res.status));
  }
  return body as T;
}

export async function session<T>(action: 'login' | 'verify' | 'logout', payload?: unknown): Promise<T> {
  const res = await fetch(`/api/session/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, toMessages(body, res.status));
  return body as T;
}
