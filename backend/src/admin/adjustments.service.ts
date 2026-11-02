import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdjustmentDirection,
  AdjustmentStatus,
  Prisma,
  TransactionStatus,
  TransactionType,
  type AssetType,
} from '../generated/prisma/client.js';
import { AuditService } from '../audit/audit.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS } from '../wallets/chains.js';
import type { CreateAdjustmentDto } from './dto/admin.dto.js';

const include = {
  user: { select: { id: true, email: true } },
  requestedBy: { select: { id: true, email: true } },
  decidedBy: { select: { id: true, email: true } },
} satisfies Prisma.BalanceAdjustmentInclude;

/**
 * Manual balance corrections under maker–checker control:
 *  - one admin requests (with a written reason), a different admin approves;
 *  - nobody can adjust their own account or approve their own request
 *    (also enforced by CHECK constraints in the database);
 *  - approval posts a normal ledger transaction the customer sees in their activity;
 *  - debits can never take a balance below zero.
 */
@Injectable()
export class AdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async request(targetUserId: string, dto: CreateAdjustmentDto, adminId: string, ip?: string) {
    if (targetUserId === adminId) throw new ForbiddenException('You cannot adjust your own account');
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lte(0)) throw new BadRequestException('amount must be greater than zero');
    if (amount.decimalPlaces() > ASSET_DECIMALS[dto.asset]) {
      throw new BadRequestException(`${dto.asset} supports at most ${ASSET_DECIMALS[dto.asset]} decimal places`);
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!target) throw new NotFoundException('User not found');

    if (dto.direction === AdjustmentDirection.DEBIT) {
      const bal = await this.balance(targetUserId, dto.asset);
      if (bal.lt(amount)) throw new BadRequestException(`Debit exceeds the available ${dto.asset} balance (${bal.toFixed()})`);
    }

    return this.prisma.$transaction(async (tx) => {
      const adj = await tx.balanceAdjustment.create({
        data: {
          userId: targetUserId,
          assetType: dto.asset,
          direction: dto.direction,
          amount,
          reason: dto.reason,
          reference: dto.reference,
          requestedById: adminId,
        },
        include,
      });
      await this.audit.record(
        {
          actorId: adminId,
          action: 'adjustment.request',
          targetType: 'user',
          targetId: targetUserId,
          details: { adjustmentId: adj.id, asset: dto.asset, direction: dto.direction, amount: amount.toFixed(), reason: dto.reason },
          ip,
        },
        tx,
      );
      return adj;
    });
  }

  list(status: AdjustmentStatus | undefined, limit: number) {
    return this.prisma.balanceAdjustment.findMany({
      where: { status },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      include,
    });
  }

  async approve(id: string, adminId: string, note: string | undefined, ip?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const adj = await tx.balanceAdjustment.findUnique({ where: { id } });
        if (!adj) throw new NotFoundException('Adjustment not found');
        if (adj.status !== AdjustmentStatus.PENDING_APPROVAL) throw new ConflictException(`Adjustment is already ${adj.status.toLowerCase()}`);
        if (adj.requestedById === adminId) throw new ForbiddenException('A different admin must approve this adjustment');
        if (adj.userId === adminId) throw new ForbiddenException('You cannot approve an adjustment to your own account');

        // Lock the balance row so a concurrent withdrawal or debit can't interleave.
        const [locked] = await tx.$queryRaw<{ balance: string }[]>`
          SELECT balance::text FROM "balances"
          WHERE user_id = ${adj.userId}::uuid AND asset_type = ${adj.assetType}::text::"asset_type"
          FOR UPDATE`;
        const current = new Prisma.Decimal(locked?.balance ?? 0);
        const isDebit = adj.direction === AdjustmentDirection.DEBIT;
        if (isDebit && current.lt(adj.amount)) {
          throw new BadRequestException(`Debit exceeds the current ${adj.assetType} balance (${current.toFixed()})`);
        }

        // Claim the request first (conditional) so two approvers can't both apply it.
        const claimed = await tx.balanceAdjustment.updateMany({
          where: { id, status: AdjustmentStatus.PENDING_APPROVAL },
          data: { status: AdjustmentStatus.APPLIED, decidedById: adminId, decidedAt: new Date(), decisionNote: note },
        });
        if (claimed.count !== 1) throw new ConflictException('Adjustment was decided by someone else');

        const ledger = await tx.transaction.create({
          data: {
            userId: adj.userId,
            type: isDebit ? TransactionType.ADJUSTMENT_DEBIT : TransactionType.ADJUSTMENT_CREDIT,
            assetType: adj.assetType,
            amount: adj.amount,
            status: TransactionStatus.COMPLETED,
            confirmedAt: new Date(),
            metadata: { adjustmentId: adj.id, reason: adj.reason, reference: adj.reference },
          },
        });
        await tx.balance.upsert({
          where: { userId_assetType: { userId: adj.userId, assetType: adj.assetType } },
          create: { userId: adj.userId, assetType: adj.assetType, balance: adj.amount },
          update: { balance: isDebit ? { decrement: adj.amount } : { increment: adj.amount } },
        });
        const applied = await tx.balanceAdjustment.update({ where: { id }, data: { transactionId: ledger.id }, include });
        await this.audit.record(
          {
            actorId: adminId,
            action: 'adjustment.approve',
            targetType: 'user',
            targetId: adj.userId,
            details: { adjustmentId: id, transactionId: ledger.id, asset: adj.assetType, direction: adj.direction, amount: adj.amount.toFixed() },
            ip,
          },
          tx,
        );
        return applied;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async reject(id: string, adminId: string, note: string | undefined, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.balanceAdjustment.updateMany({
        where: { id, status: AdjustmentStatus.PENDING_APPROVAL },
        data: { status: AdjustmentStatus.REJECTED, decidedById: adminId, decidedAt: new Date(), decisionNote: note },
      });
      if (count !== 1) {
        const exists = await tx.balanceAdjustment.findUnique({ where: { id }, select: { status: true } });
        if (!exists) throw new NotFoundException('Adjustment not found');
        throw new ConflictException(`Adjustment is already ${exists.status.toLowerCase()}`);
      }
      const adj = await tx.balanceAdjustment.findUniqueOrThrow({ where: { id }, include });
      await this.audit.record(
        { actorId: adminId, action: 'adjustment.reject', targetType: 'user', targetId: adj.userId, details: { adjustmentId: id, note }, ip },
        tx,
      );
      return adj;
    });
  }

  private async balance(userId: string, asset: AssetType): Promise<Prisma.Decimal> {
    const b = await this.prisma.balance.findUnique({ where: { userId_assetType: { userId, assetType: asset } } });
    return b?.balance ?? new Prisma.Decimal(0);
  }
}
