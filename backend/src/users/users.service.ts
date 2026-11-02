import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { generateReferralCode } from '../common/crypto/tokens.js';
import {
  AssetType,
  Prisma,
  ReferralRegistrationStatus,
  type User,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_REFERRAL_CODE_ATTEMPTS = 5;

export interface CreateAccountInput {
  email: string;
  passwordHash: string;
  referrerId?: string;
  verificationTokenHash: string;
  verificationTokenExpiresAt: Date;
}

export type ConsumeTokenResult =
  | { status: 'verified'; user: User }
  | { status: 'invalid' }
  | { status: 'expired' };

/** Fields safe to return to clients. */
export const publicUserSelect = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  referralCode: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function toPublicUser(user: User): PublicUser {
  const { id, email, role, isVerified, referralCode, createdAt } = user;
  return { id, email, role, isVerified, referralCode, createdAt };
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByReferralCode(referralCode: string): Promise<Pick<User, 'id'> | null> {
    return this.prisma.user.findUnique({ where: { referralCode }, select: { id: true } });
  }

  /**
   * Creates the user, a zero balance row for every supported asset, and —
   * when referred — the referral ledger row, all in one transaction.
   * Retries with a fresh referral code on the (rare) code collision.
   */
  async createAccount(input: CreateAccountInput): Promise<User> {
    const wallets = Object.values(AssetType).map((assetType) => ({
      assetType,
      balance: new Prisma.Decimal(0),
      lockedBalance: new Prisma.Decimal(0),
      flexibleYieldEarned: new Prisma.Decimal(0),
    }));

    for (let attempt = 1; attempt <= MAX_REFERRAL_CODE_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              email: input.email,
              passwordHash: input.passwordHash,
              referralCode: generateReferralCode(),
              verificationToken: input.verificationTokenHash,
              verificationTokenExpiresAt: input.verificationTokenExpiresAt,
              referredByUserId: input.referrerId ?? null,
              balances: { createMany: { data: wallets } },
            },
          });
          if (input.referrerId) {
            await tx.referral.create({
              data: { referrerId: input.referrerId, refereeId: user.id },
            });
          }
          return user;
        });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        if (await this.findByEmail(input.email)) {
          throw new ConflictException('An account with this email already exists');
        }
        this.logger.warn(`Referral code collision, retrying (attempt ${attempt})`);
      }
    }
    throw new InternalServerErrorException('Could not allocate a referral code');
  }

  async setVerificationToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationToken: tokenHash, verificationTokenExpiresAt: expiresAt },
    });
  }

  /**
   * Single-use consumption: the conditional update only succeeds for the
   * request that still sees the token, so concurrent clicks cannot both win.
   */
  async consumeVerificationToken(tokenHash: string, now: Date = new Date()): Promise<ConsumeTokenResult> {
    const user = await this.prisma.user.findUnique({ where: { verificationToken: tokenHash } });
    if (!user || user.isVerified) return { status: 'invalid' };
    if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt <= now) {
      return { status: 'expired' };
    }

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: user.id, verificationToken: tokenHash, isVerified: false },
        data: {
          isVerified: true,
          verifiedAt: now,
          verificationToken: null,
          verificationTokenExpiresAt: null,
        },
      });
      if (count === 0) return { status: 'invalid' } as const;

      await tx.referral.updateMany({
        where: { refereeId: user.id, registrationStatus: ReferralRegistrationStatus.PENDING },
        data: { registrationStatus: ReferralRegistrationStatus.VERIFIED },
      });

      const verified = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      return { status: 'verified', user: verified } as const;
    });
  }

  async recordLogin(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...publicUserSelect,
        verifiedAt: true,
        lastLoginAt: true,
        balances: {
          select: { assetType: true, balance: true, lockedBalance: true, flexibleYieldEarned: true },
          orderBy: { assetType: 'asc' },
        },
      },
    });
  }
}
