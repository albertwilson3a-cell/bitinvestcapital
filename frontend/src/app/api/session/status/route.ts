import { NextResponse, type NextRequest } from 'next/server';
import { backendUrl, SESSION_COOKIE } from '@/lib/server/config';

/**
 * Who is signed in, for public pages. Always 200: { user: null } for visitors
 * or an expired session, so the homepage never logs a 401.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const headers = { 'cache-control': 'no-store' };
  if (!token) return NextResponse.json({ user: null }, { headers });
  try {
    const upstream = await fetch(`${backendUrl()}/api/auth/me`, {
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!upstream.ok) {
      const res = NextResponse.json({ user: null }, { headers });
      if (upstream.status === 401) res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    return NextResponse.json({ user: await upstream.json() }, { headers });
  } catch {
    return NextResponse.json({ user: null }, { headers });
  }
}
