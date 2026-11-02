import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as JwtStrategyBase } from 'passport-jwt';
import { Strategy as LocalStrategyBase } from 'passport-local';
import type { User } from '../generated/prisma/client.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { AuthUser, JwtPayload } from './auth.types.js';

@Injectable()
export class LocalStrategy extends PassportStrategy(LocalStrategyBase, 'local') {
  constructor(private readonly auth: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  validate(email: string, password: string): Promise<User> {
    return this.auth.validateCredentials(email, password);
  }
}

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtStrategyBase, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      // Tokens minted for another app or by another issuer are rejected outright.
      issuer: config.getOrThrow<string>('JWT_ISSUER'),
      audience: config.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  /** Re-checks the account on every request so deleted/unverified users lose access. */
  async validate(payload: JwtPayload & { iat?: number }): Promise<AuthUser> {
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isVerified || user.suspendedAt) {
      throw new UnauthorizedException();
    }
    // A password change signs out every session issued before it.
    if (user.passwordChangedAt && (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      throw new UnauthorizedException();
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
