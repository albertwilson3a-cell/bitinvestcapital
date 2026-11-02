import type { UserRole } from '../generated/prisma/client.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

/** What `req.user` holds on JWT-protected routes. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
