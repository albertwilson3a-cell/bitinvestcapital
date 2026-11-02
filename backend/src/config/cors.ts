import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Builds a matcher that accepts exactly:
 *   https://<root>            e.g. https://bitinvestcapital.com
 *   https://<sub>.<root>      e.g. https://app.bitinvestcapital.com, https://a.b.bitinvestcapital.com
 * and nothing else: no http, no ports, no look-alikes such as
 * https://evilbitinvestcapital.com or https://bitinvestcapital.com.evil.io.
 * `extra` adds exact origins (e.g. http://localhost:5173 for development).
 */
export function createOriginMatcher(rootDomain: string, extra: string[] = []) {
  const pattern = new RegExp(`^https://([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)*${escapeRegExp(rootDomain.toLowerCase())}$`);
  const exact = new Set(extra.map((o) => o.trim().replace(/\/+$/, '').toLowerCase()).filter(Boolean));
  return (origin: string): boolean => {
    const o = origin.toLowerCase();
    return pattern.test(o) || exact.has(o);
  };
}

export function buildCorsOptions(rootDomain: string, extra: string[]): CorsOptions {
  const allowed = createOriginMatcher(rootDomain, extra);
  return {
    // Requests without an Origin header (server-to-server, the Next.js BFF, curl) are
    // not subject to CORS; for browser requests only listed origins get CORS headers.
    origin: (origin, cb) => cb(null, !origin || allowed(origin)),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false, // bearer tokens, never cookies, cross-origin
    maxAge: 600,
  };
}
