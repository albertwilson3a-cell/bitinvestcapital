import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl, isProduction, SESSION_COOKIE } from '@/lib/server/config';
import { isSameOrigin } from '@/lib/server/origin';

/**
 * Sign-in step 2: exchanges the emailed code for a session. The JWT is stored
 * in an httpOnly cookie and never returned to the browser.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-site request blocked' }, { status: 403 });
  }
  let input: { challengeId?: unknown; code?: unknown };
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body must be JSON' }, { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}/api/auth/login/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ challengeId: input.challengeId, code: input.code }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'The server is unreachable. Try again shortly.' }, { status: 502 });
  }
  const body = (await upstream.json().catch(() => null)) as { accessToken?: string; expiresIn?: number; user?: unknown; message?: unknown } | null;
  if (!upstream.ok || !body?.accessToken) {
    return NextResponse.json({ message: body?.message ?? 'Sign-in failed' }, { status: upstream.ok ? 500 : upstream.status });
  }
  const res = NextResponse.json({ user: body.user });
  res.cookies.set({ name: SESSION_COOKIE, value: body.accessToken, httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/', maxAge: body.expiresIn ?? 3600 });
  return res;
}
