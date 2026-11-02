import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * CSRF defence in depth (the cookie is already SameSite=Lax): state-changing
 * requests must come from this site's own pages.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) {
    // Browsers send Origin on POST/PUT/DELETE; fall back to Fetch Metadata.
    return request.headers.get('sec-fetch-site') !== 'cross-site';
  }
  try {
    return new URL(origin).host === request.headers.get('host');
  } catch {
    return false;
  }
}
