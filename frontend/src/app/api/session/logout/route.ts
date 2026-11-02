import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/server/config';
import { isSameOrigin } from '@/lib/server/origin';

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ message: 'Cross-site request blocked' }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
