import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl, SESSION_COOKIE } from '@/lib/server/config';
import { isSameOrigin } from '@/lib/server/origin';

/**
 * Backend-for-frontend relay: /api/backend/<path> → BACKEND_URL/api/<path>,
 * attaching the httpOnly session cookie as the Bearer token. NestJS remains the
 * authority on who may do what; this route only carries the credential.
 */

const SEGMENT = /^[A-Za-z0-9._~-]+$/;
// Token-issuing endpoints must go through /api/session/* so the JWT never reaches page scripts.
const BLOCKED = new Set(['auth/login', 'auth/login/verify']);

async function relay(request: NextRequest, ctx: RouteContext<'/api/backend/[...path]'>) {
  const { path } = await ctx.params;
  if (!path.length || path.some((s) => !SEGMENT.test(s) || s === '.' || s === '..')) {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }
  const joined = path.join('/');
  if (BLOCKED.has(joined)) {
    return NextResponse.json({ message: 'Use /api/session/login' }, { status: 404 });
  }
  if (request.method !== 'GET' && !isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-site request blocked' }, { status: 403 });
  }

  const target = `${backendUrl()}/api/${joined}${request.nextUrl.search}`;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return NextResponse.json({ message: 'The server is unreachable. Try again shortly.' }, { status: 502 });
  }

  const res = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
  // A rejected token is useless; drop it so the user gets a clean sign-in.
  if (upstream.status === 401 && token) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const GET = relay;
export const POST = relay;
export const PUT = relay;
export const PATCH = relay;
export const DELETE = relay;
