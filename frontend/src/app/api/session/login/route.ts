import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl } from '@/lib/server/config';
import { isSameOrigin } from '@/lib/server/origin';

/**
 * Sign-in step 1: checks the password. The backend emails a one-time code and
 * returns a challenge id; no session is created until /api/session/verify.
 */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-site request blocked' }, { status: 403 });
  }
  let credentials: { email?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: 'Body must be JSON' }, { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(`${backendUrl()}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ email: credentials.email, password: credentials.password }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'The server is unreachable. Try again shortly.' }, { status: 502 });
  }
  const body = (await upstream.json().catch(() => null)) as { status?: string; challengeId?: string; email?: string; expiresInSeconds?: number; message?: unknown } | null;
  if (!upstream.ok || body?.status !== 'code_required') {
    return NextResponse.json({ message: body?.message ?? 'Sign-in failed' }, { status: upstream.ok ? 500 : upstream.status });
  }
  return NextResponse.json({ status: body.status, challengeId: body.challengeId, email: body.email, expiresInSeconds: body.expiresInSeconds });
}
