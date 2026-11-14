import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ListUsersQueryDto } from './dto/admin.dto.js';

const balanceSelect = { assetType: true, balance: true, lockedBalance: true, investedBalance: true, flexibleYieldEarned: true } as const;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      role: q.role,
      isVerified: q.verified === undefined ? undefined : q.verified === 'true',
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' } },
              { referralCode: { equals: q.q.toUpperCase() } },
              ...(/^[0-9a-f-]{36}$/i.test(q.q) ? [{ id: q.q }] : []),
            ],
          }
        : {}),
    };
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      q.sort === 'created_asc'
        ? [{ createdAt: 'asc' }, { id: 'asc' }]
        : q.sort === 'last_login_desc'
          ? [{ lastLoginAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }]
          : [{ createdAt: 'desc' }, { id: 'desc' }];

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        take: q.limit + 1,
        ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          email: true,
          role: true,
          isVerified: true,
          referralCode: true,
          createdAt: true,
          lastLoginAt: true,
          suspendedAt: true,
          referredBy: { select: { id: true, email: true } },
          balances: { select: balanceSelect },
          _count: { select: { referredUsers: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const hasMore = rows.length > q.limit;
    const items = (hasMore ? rows.slice(0, q.limit) : rows).map(({ _count, ...u }) => ({ ...u, referralCount: _count.referredUsers }));
    return { items, total, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  async detail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        verifiedAt: true,
        verificationTokenExpiresAt: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        suspendedAt: true,
        suspensionReason: true,
        referredBy: { select: { id: true, email: true, referralCode: true } },
        referralReceived: { select: { registrationStatus: true, totalCommissionEarned: true, createdAt: true } },
        balances: { select: balanceSelect, orderBy: { assetType: 'asc' } },
        depositAddresses: { select: { assetType: true, network: true, address: true, derivationPath: true, createdAt: true } },
        dynamicAllocations: { where: { activeStatus: true }, select: { assetType: true, allocationPercentage: true, updatedAt: true } },
        _count: { select: { referredUsers: true, transactions: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const [transactions, adjustments, commission] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId: id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
        select: {
          id: true, type: true, assetType: true, amount: true, status: true, network: true,
          blockchainTxHash: true, confirmations: true, confirmedAt: true, createdAt: true,
        },
      }),
      this.prisma.balanceAdjustment.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: { requestedBy: { select: { email: true } }, decidedBy: { select: { email: true } } },
      }),
      this.prisma.transaction.groupBy({
        by: ['assetType'],
        where: { userId: id, type: { in: ['REFERRAL_BONUS', 'AFFILIATE_YIELD_REWARD'] }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const { _count, ...profile } = user;
    return {
      ...profile,
      referralCount: _count.referredUsers,
      transactionCount: _count.transactions,
      referralEarnings: commission.map((c) => ({ asset: c.assetType, amount: c._sum.amount ?? new Prisma.Decimal(0) })),
      recentTransactions: transactions,
      adjustments,
    };
  }

  /** Blocks sign-in, ends active sessions and stops new withdrawals. */
  async setSuspended(id: string, adminId: string, suspend: boolean, reason?: string) {
    if (id === adminId) throw new BadRequestException('You cannot suspend your own account');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id },
      data: suspend ? { suspendedAt: new Date(), suspensionReason: reason ?? null } : { suspendedAt: null, suspensionReason: null },
    });
    return { id, suspended: suspend };
  }
}
