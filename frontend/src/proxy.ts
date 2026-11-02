import { NextResponse, type NextRequest } from 'next/server';

// Must match src/lib/server/config.ts (proxy runs separately from route handlers).
const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-bic_session' : 'bic_session';

/**
 * Optimistic check only: no cookie → send to sign-in before rendering the
 * dashboard shell. The backend validates the token on every data request.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
