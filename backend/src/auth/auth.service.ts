import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { hashToken, issueVerificationToken } from '../common/crypto/tokens.js';
import { AuthChallengePurpose, type User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChallengeService, maskEmail } from './challenge.service.js';
import { MailService } from '../mail/mail.service.js';
import { CacheService } from '../redis/cache.service.js';
import { toPublicUser, UsersService, type PublicUser } from '../users/users.service.js';
import type { JwtPayload } from './auth.types.js';
import type { RegisterDto } from './dto/auth.dto.js';

export interface RegisterResult {
  message: string;
  user: PublicUser;
}

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: PublicUser;
}

export interface LoginChallengeResult {
  status: 'code_required';
  challengeId: string;
  email: string;
  expiresInSeconds: number;
}

export const GENERIC_RESET_MESSAGE = 'If an account exists for this email, we have sent a link to reset the password.';
const RESET_TTL_MINUTES = 60;

export const GENERIC_RESEND_MESSAGE =
  'If an unverified account exists for this email, a new verification link has been sent.';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  private readonly tokenTtlMinutes: number;
  private readonly resendCooldownSeconds: number;
  private readonly jwtExpiresIn: number;
  /** Compared against when the email is unknown, so timing doesn't reveal accounts. */
  private dummyHash = '';

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly cache: CacheService,
    private readonly challenges: ChallengeService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.bcryptRounds = config.get<number>('BCRYPT_ROUNDS') ?? 12;
    this.tokenTtlMinutes = config.get<number>('VERIFICATION_TOKEN_TTL_MINUTES') ?? 1440;
    this.resendCooldownSeconds = config.get<number>('VERIFICATION_RESEND_COOLDOWN_SECONDS') ?? 60;
    this.jwtExpiresIn = config.get<number>('JWT_EXPIRES_IN_SECONDS') ?? 3600;
  }

  async onModuleInit(): Promise<void> {
    this.dummyHash = await bcrypt.hash('timing-equaliser-not-a-password', this.bcryptRounds);
  }

  async register(dto: RegisterDto): Promise<RegisterResult> {
    if (await this.users.findByEmail(dto.email)) {
      throw new ConflictException('An account with this email already exists');
    }

    let referrerId: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.users.findByReferralCode(dto.referralCode);
      if (!referrer) throw new BadRequestException('referralCode does not match any account');
      referrerId = referrer.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds);
    const verification = issueVerificationToken(this.tokenTtlMinutes);

    const user = await this.users.createAccount({
      email: dto.email,
      passwordHash,
      referrerId,
      verificationTokenHash: verification.hash,
      verificationTokenExpiresAt: verification.expiresAt,
    });

    // The account is committed; a mail outage must not undo it. The user can resend.
    await this.dispatchVerificationEmail(user.email, verification.token);

    return {
      message: 'Account created. Check your email for a link to verify your address.',
      user: toPublicUser(user),
    };
  }

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const matches = await bcrypt.compare(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isVerified) {
      throw new ForbiddenException('Email address not verified. Check your inbox for the verification link.');
    }
    if (user.suspendedAt) {
      throw new ForbiddenException('This account is suspended. Please contact support.');
    }
    return user;
  }

  /** Step 1 of sign-in: the password was right, so email a one-time code. */
  async startLogin(user: User): Promise<LoginChallengeResult> {
    const { id, code } = await this.challenges.create(user.id, AuthChallengePurpose.LOGIN);
    await this.mail.sendLoginCode(user.email, code, this.challenges.ttlMinutes).catch((err: unknown) => {
      this.logger.error(`Failed to send login code: ${err instanceof Error ? err.message : String(err)}`);
    });
    return { status: 'code_required', challengeId: id, email: maskEmail(user.email), expiresInSeconds: this.challenges.ttlMinutes * 60 };
  }

  /** Step 2: a correct code completes sign-in and issues the session token. */
  async verifyLogin(challengeId: string, code: string): Promise<LoginResult> {
    const challenge = await this.challenges.verify(challengeId, AuthChallengePurpose.LOGIN, code);
    const user = await this.users.findById(challenge.userId);
    if (!user || !user.isVerified) throw new UnauthorizedException('Invalid sign-in');
    if (user.suspendedAt) throw new ForbiddenException('This account is suspended. Please contact support.');
    return this.login(user);
  }

  async resendLoginCode(challengeId: string): Promise<{ message: string; expiresInSeconds: number }> {
    const { email, code } = await this.challenges.resend(challengeId, AuthChallengePurpose.LOGIN);
    await this.mail.sendLoginCode(email, code, this.challenges.ttlMinutes).catch(() => undefined);
    return { message: 'A new code has been sent.', expiresInSeconds: this.challenges.ttlMinutes * 60 };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const cooldownKey = `auth:password-reset:${hashToken(email)}`;
    if (this.resendCooldownSeconds > 0) {
      const allowed = await this.cache.setIfAbsent(cooldownKey, '1', this.resendCooldownSeconds);
      if (!allowed) return { message: GENERIC_RESET_MESSAGE };
    }
    const user = await this.users.findByEmail(email);
    if (user) {
      const token = issueVerificationToken(RESET_TTL_MINUTES);
      await this.prisma.user.update({ where: { id: user.id }, data: { passwordResetTokenHash: token.hash, passwordResetExpiresAt: token.expiresAt } });
      await this.mail.sendPasswordReset(user.email, token.token, RESET_TTL_MINUTES).catch((err: unknown) => {
        this.logger.error(`Failed to send password reset: ${err instanceof Error ? err.message : String(err)}`);
      });
    }
    return { message: GENERIC_RESET_MESSAGE };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { passwordResetTokenHash: hashToken(token) } });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired. Request a new one.');
    }
    const passwordHash = await bcrypt.hash(password, this.bcryptRounds);
    // Single use: the token is cleared in the same conditional update that sets the password.
    const updated = await this.prisma.user.updateMany({
      where: { id: user.id, passwordResetTokenHash: user.passwordResetTokenHash },
      data: { passwordHash, passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordChangedAt: new Date() },
    });
    if (!updated.count) throw new BadRequestException('This reset link is invalid or has expired. Request a new one.');
    await this.challenges.revokeAll(user.id);
    await this.mail.sendPasswordChanged(user.email).catch(() => undefined);
    return { message: 'Your password has been changed. You can now sign in.' };
  }

  async login(user: User): Promise<LoginResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    await this.users.recordLogin(user.id);
    return { accessToken, tokenType: 'Bearer', expiresIn: this.jwtExpiresIn, user: toPublicUser(user) };
  }

  async verifyEmail(token: string): Promise<{ message: string; user: PublicUser }> {
    const result = await this.users.consumeVerificationToken(hashToken(token));
    switch (result.status) {
      case 'verified':
        return { message: 'Email verified. You can now sign in.', user: toPublicUser(result.user) };
      case 'expired':
        throw new BadRequestException('Verification link has expired. Request a new one.');
      default:
        throw new BadRequestException('Verification link is invalid or has already been used.');
    }
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const cooldownKey = `auth:verify-resend:${hashToken(email)}`;
    if (this.resendCooldownSeconds > 0) {
      const allowed = await this.cache.setIfAbsent(cooldownKey, '1', this.resendCooldownSeconds);
      if (!allowed) return { message: GENERIC_RESEND_MESSAGE };
    }

    const user = await this.users.findByEmail(email);
    if (user && !user.isVerified) {
      const verification = issueVerificationToken(this.tokenTtlMinutes);
      await this.users.setVerificationToken(user.id, verification.hash, verification.expiresAt);
      await this.dispatchVerificationEmail(user.email, verification.token);
    }
    return { message: GENERIC_RESEND_MESSAGE };
  }

  private async dispatchVerificationEmail(email: string, token: string): Promise<void> {
    try {
      await this.mail.sendVerificationEmail(email, token, this.tokenTtlMinutes);
    } catch (err) {
      this.logger.error(
        `Failed to send verification email: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
