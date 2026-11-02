import 'server-only';

export const isProduction = process.env.NODE_ENV === 'production';

/**
 * Session cookie. In production the __Host- prefix makes browsers require Secure,
 * Path=/ and no Domain, so no subdomain can set or overwrite it.
 */
export const SESSION_COOKIE = isProduction ? '__Host-bic_session' : 'bic_session';

/** NestJS API base URL. Required in production; defaults to the local API in development. */
export function backendUrl(): string {
  const raw = process.env.BACKEND_URL?.trim();
  if (!raw) {
    if (isProduction) throw new Error('BACKEND_URL is not set (e.g. https://api.bitinvestcapital.com)');
    return 'http://localhost:3000';
  }
  return raw.replace(/\/+$/, '');
}
