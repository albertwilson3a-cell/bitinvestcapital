import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { AuthChallengePurpose, Prisma, type AuthChallenge } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const CODE_MAX_ATTEMPTS = 5;
export const CODE_MAX_SENDS = 5;
export const CODE_RESEND_COOLDOWN_SECONDS = 30;
const GENERIC_INVALID = 'That code is incorrect or has expired. Request a new code and try again.';

/**
 * Six-digit codes sent by email to confirm a sign-in or a withdrawal.
 * Only an HMAC of the code is stored; each challenge allows a few attempts,
 * expires quickly and works once.
 */
@Injectable()
export class ChallengeService {
  private readonly secret: string;
  readonly ttlMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_SECRET');
    this.ttlMinutes = config.get<number>('LOGIN_CODE_TTL_MINUTES') ?? 10;
  }

  private hash(id: string, code: string) {
    return createHmac('sha256', this.secret).update(`${id}:${code}`).digest('hex');
  }

  private newCode() {
    return String(randomInt(0, 1_000_000)).padStart(6, '0');
  }

  async create(userId: string, purpose: AuthChallengePurpose, payload?: Prisma.InputJsonValue) {
    const id = randomUUID();
    const code = this.newCode();
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);
    await this.prisma.authChallenge.create({
      data: { id, userId, purpose, codeHash: this.hash(id, code), expiresAt, payload },
    });
    return { id, code, expiresAt };
  }

  /** Issues a fresh code for an open challenge (rate limited). */
  async resend(id: string, purpose: AuthChallengePurpose) {
    const c = await this.prisma.authChallenge.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
    if (!c || c.purpose !== purpose || c.consumedAt || c.expiresAt < new Date()) {
      throw new BadRequestException('This request has expired. Start again.');
    }
    if (c.sendCount >= CODE_MAX_SENDS) throw new HttpException('Too many codes requested. Start again.', HttpStatus.TOO_MANY_REQUESTS);
    if (Date.now() - c.lastSentAt.getTime() < CODE_RESEND_COOLDOWN_SECONDS * 1000) {
      throw new HttpException(`Please wait ${CODE_RESEND_COOLDOWN_SECONDS} seconds before requesting another code.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    const code = this.newCode();
    const expiresAt = new Date(Date.now() + this.ttlMinutes * 60_000);
    await this.prisma.authChallenge.update({
      where: { id },
      data: { codeHash: this.hash(id, code), attempts: 0, sendCount: { increment: 1 }, lastSentAt: new Date(), expiresAt },
    });
    return { challenge: c, email: c.user.email, code, expiresAt };
  }

  /**
   * Checks a code and consumes the challenge on success. Wrong codes count
   * against the attempt limit; the limit is enforced atomically.
   */
  async verify(id: string, purpose: AuthChallengePurpose, code: string, userId?: string): Promise<AuthChallenge> {
    const c = await this.prisma.authChallenge.findUnique({ where: { id } });
    if (!c || c.purpose !== purpose || (userId && c.userId !== userId) || c.consumedAt || c.expiresAt < new Date()) {
      throw new BadRequestException(GENERIC_INVALID);
    }
    // Count the attempt first, so parallel guesses can't exceed the limit.
    const counted = await this.prisma.authChallenge.updateMany({
      where: { id, consumedAt: null, attempts: { lt: CODE_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (!counted.count) throw new BadRequestException('Too many incorrect attempts. Request a new code.');

    const expected = Buffer.from(c.codeHash, 'hex');
    const actual = Buffer.from(this.hash(id, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new BadRequestException(GENERIC_INVALID);
    }
    const consumed = await this.prisma.authChallenge.updateMany({ where: { id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (!consumed.count) throw new BadRequestException(GENERIC_INVALID);
    return c;
  }

  /** Invalidates every open challenge for a user (e.g. after a password change). */
  async revokeAll(userId: string) {
    await this.prisma.authChallenge.updateMany({ where: { userId, consumedAt: null }, data: { consumedAt: new Date() } });
  }
}

export function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  const shown = local.length <= 2 ? local[0] : `${local[0]}${local.at(-1)}`;
  return `${shown[0]}${'•'.repeat(Math.max(2, local.length - 2))}${local.length > 2 ? shown[1] : ''}@${domain}`;
}
