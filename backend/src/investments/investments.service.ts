import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AssetType, Prisma, TransactionStatus, TransactionType, YieldInterval } from '../generated/prisma/client.js';
import { PriceService } from '../payments/price.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { ASSET_DECIMALS } from '../wallets/chains.js';
import { apyToWeeklyPercent, latestCompletedPeriod, periodRate } from '../yield/yield-math.js';

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;
const ZERO = new D(0);
const INTERVAL_MS: Record<YieldInterval, number> = { [YieldInterval.HOURLY]: 3_600_000, [YieldInterval.DAILY]: 86_400_000 };
const HISTORY_LIMIT = 5000;

/**
 * Each client holds every coin in two places:
 *   wallet     (balances.balance)          – where deposits land; the only source of withdrawals
 *   investment (balances.invested_balance) – earns the asset's weekly rate; payouts compound here
 * Clients move funds between the two. Every move is a ledger transaction (INVEST / REDEEM),
 * and the balance update is conditional, so a move can never overdraw either side.
 */
@Injectable()
export class InvestmentsService {
  private readonly logger = new Logger(InvestmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PriceService,
    private readonly settings: SettingsService,
  ) {}

  async summary(userId: string, now = new Date()) {
    const [balances, rates, minUsd, flows, payouts] = await Promise.all([
      this.prisma.balance.findMany({ where: { userId } }),
      this.prisma.yieldRate.findMany({ distinct: ['assetType'], orderBy: [{ assetType: 'asc' }, { createdAt: 'desc' }] }),
      this.settings.getDecimal('minInvestmentUsd'),
      this.prisma.transaction.groupBy({
        by: ['assetType', 'type'],
        where: { userId, status: TransactionStatus.COMPLETED, type: { in: [TransactionType.INVEST, TransactionType.REDEEM] } },
        _sum: { amount: true },
        _min: { confirmedAt: true },
      }),
      this.prisma.transaction.findMany({
        where: { userId, type: TransactionType.YIELD_PAYOUT, status: TransactionStatus.COMPLETED },
        orderBy: { confirmedAt: 'desc' },
        distinct: ['assetType'],
        select: { assetType: true, amount: true, confirmedAt: true },
      }),
    ]);

    const assets = await Promise.all(
      Object.values(AssetType).map(async (asset) => {
        const b = balances.find((x) => x.assetType === asset);
        const r = rates.find((x) => x.assetType === asset);
        // Money invested during the running period only earns from the next one (same rule as the payout engine).
        const periodStart = r ? latestCompletedPeriod(r.interval, now).end : null;
        const fresh = periodStart
          ? await this.prisma.transaction.aggregate({
              where: { userId, assetType: asset, type: TransactionType.INVEST, status: TransactionStatus.COMPLETED, confirmedAt: { gt: periodStart } },
              _sum: { amount: true },
            })
          : null;
        const investedNow = b?.investedBalance ?? ZERO;
        const earningPrincipal = D.max(investedNow.minus(fresh?._sum.amount ?? ZERO), ZERO);
        const price = await this.priceOrNull(asset);
        const invested = flows.find((f) => f.assetType === asset && f.type === TransactionType.INVEST);
        const redeemed = flows.find((f) => f.assetType === asset && f.type === TransactionType.REDEEM);
        const last = payouts.find((p) => p.assetType === asset);
        const active = !!r && r.isActive && r.apyPercent.gt(0);
        const periodMs = r ? INTERVAL_MS[r.interval] : null;
        return {
          asset,
          wallet: b?.balance ?? ZERO,
          invested: investedNow,
          earningPrincipal,
          locked: b?.lockedBalance ?? ZERO,
          earned: b?.flexibleYieldEarned ?? ZERO,
          netContributed: (invested?._sum.amount ?? ZERO).minus(redeemed?._sum.amount ?? ZERO),
          investedSince: invested?._min.confirmedAt ?? null,
          usdPrice: price?.toFixed() ?? null,
          minAmount: price ? this.minAmount(minUsd, price, asset).toFixed() : null,
          open: active,
          rate: r
            ? {
                weeklyPercent: r.weeklyPercent?.toFixed() ?? apyToWeeklyPercent(r.apyPercent),
                apyPercent: r.apyPercent.toFixed(),
                interval: r.interval,
                periodRate: periodRate(r.apyPercent, r.interval),
                isActive: r.isActive,
                updatedAt: r.createdAt,
              }
            : null,
          lastPayout: last ? { amount: last.amount, at: last.confirmedAt } : null,
          // Payout for the period running now is paid when it ends.
          currentPeriodStart: periodStart,
          nextPayoutAt: periodStart && periodMs ? new Date(periodStart.getTime() + periodMs) : null,
        };
      }),
    );
    return { minInvestmentUsd: minUsd.toFixed(), serverTime: now.toISOString(), assets };
  }

  /** Invested amount over time, rebuilt from the ledger (invest, redeem, payouts). */
  async history(userId: string, asset: AssetType) {
    const rows = await this.prisma.transaction.findMany({
      where: {
        userId,
        assetType: asset,
        status: TransactionStatus.COMPLETED,
        type: { in: [TransactionType.INVEST, TransactionType.REDEEM, TransactionType.YIELD_PAYOUT] },
      },
      orderBy: [{ confirmedAt: 'asc' }, { createdAt: 'asc' }],
      take: HISTORY_LIMIT,
      select: { id: true, type: true, amount: true, confirmedAt: true, createdAt: true },
    });
    let running = ZERO;
    const points = rows.map((t) => {
      running = t.type === TransactionType.REDEEM ? running.minus(t.amount) : running.plus(t.amount);
      return { id: t.id, type: t.type, amount: t.amount.toFixed(), at: (t.confirmedAt ?? t.createdAt).toISOString(), invested: running.toFixed() };
    });
    return { asset, points };
  }

  async invest(userId: string, asset: AssetType, rawAmount: string) {
    await this.assertActive(userId);
    const amount = this.decimal(rawAmount, asset);
    const rate = await this.prisma.yieldRate.findFirst({ where: { assetType: asset }, orderBy: { createdAt: 'desc' } });
    if (!rate || !rate.isActive || rate.apyPercent.lte(0)) throw new BadRequestException(`${asset} investments are not open right now.`);

    const price = await this.priceOrNull(asset);
    if (!price) throw new ServiceUnavailableException('Live prices are unavailable right now. Please try again in a minute.');
    const minUsd = await this.settings.getDecimal('minInvestmentUsd');
    const usd = amount.times(price);
    if (usd.lt(minUsd)) {
      throw new BadRequestException(
        `The minimum investment is $${minUsd.toFixed()} (about ${this.minAmount(minUsd, price, asset).toFixed()} ${asset}).`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const moved = await tx.balance.updateMany({
        where: { userId, assetType: asset, balance: { gte: amount } },
        data: { balance: { decrement: amount }, investedBalance: { increment: amount } },
      });
      if (!moved.count) throw new BadRequestException(`You don’t have ${amount.toFixed()} ${asset} in your BitInvest wallet.`);
      const t = await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.INVEST,
          assetType: asset,
          amount,
          status: TransactionStatus.COMPLETED,
          confirmedAt: new Date(),
          metadata: { usdPrice: price.toFixed(), usdValue: usd.toFixed(2), weeklyPercent: rate.weeklyPercent?.toFixed() ?? apyToWeeklyPercent(rate.apyPercent) },
        },
      });
      const b = await tx.balance.findUniqueOrThrow({ where: { userId_assetType: { userId, assetType: asset } } });
      return { transactionId: t.id, asset, amount: amount.toFixed(), wallet: b.balance.toFixed(), invested: b.investedBalance.toFixed() };
    });
  }

  /** Moves funds from the investment back to the wallet. `all` takes everything, including the latest payout. */
  async redeem(userId: string, asset: AssetType, rawAmount: string | undefined, all: boolean) {
    await this.assertActive(userId);
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await this.prisma.balance.findUnique({ where: { userId_assetType: { userId, assetType: asset } } });
      const available = row?.investedBalance ?? ZERO;
      const amount = all ? available : this.decimal(rawAmount ?? '', asset);
      if (amount.lte(0)) throw new BadRequestException(`You have no ${asset} invested.`);
      if (amount.gt(available)) throw new BadRequestException(`You have ${available.toFixed()} ${asset} invested.`);
      const result = await this.prisma.$transaction(async (tx) => {
        // "All" must match exactly what we read, so a payout landing meanwhile isn't left behind.
        const moved = await tx.balance.updateMany({
          where: { userId, assetType: asset, investedBalance: all ? { equals: amount } : { gte: amount } },
          data: { investedBalance: { decrement: amount }, balance: { increment: amount } },
        });
        if (!moved.count) return null;
        const t = await tx.transaction.create({
          data: { userId, type: TransactionType.REDEEM, assetType: asset, amount, status: TransactionStatus.COMPLETED, confirmedAt: new Date(), metadata: { all } },
        });
        const b = await tx.balance.findUniqueOrThrow({ where: { userId_assetType: { userId, assetType: asset } } });
        return { transactionId: t.id, asset, amount: amount.toFixed(), wallet: b.balance.toFixed(), invested: b.investedBalance.toFixed() };
      });
      if (result) return result;
    }
    throw new ConflictException('Your investment changed while moving funds. Please try again.');
  }

  // ── helpers ──────────────────────────────────────────────────────

  private async assertActive(userId: string) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { suspendedAt: true } });
    if (u.suspendedAt) throw new ForbiddenException('This account is suspended. Please contact support.');
  }

  private async priceOrNull(asset: AssetType): Promise<Decimal | null> {
    if (asset === AssetType.USDT) return new D(1);
    try {
      return await this.prices.getUsdPrice(asset);
    } catch (err) {
      this.logger.warn(`No ${asset} price: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Smallest amount of the asset worth the minimum, rounded up to a sensible precision. */
  private minAmount(minUsd: Decimal, price: Decimal, asset: AssetType) {
    const dp = Math.min(ASSET_DECIMALS[asset], 8);
    return minUsd.div(price).toDecimalPlaces(dp, D.ROUND_UP);
  }

  private decimal(raw: string, asset: AssetType) {
    const v = String(raw ?? '').trim();
    if (!/^\d+(\.\d+)?$/.test(v)) throw new BadRequestException('amount must be a positive number');
    const d = new D(v);
    if (d.decimalPlaces() > ASSET_DECIMALS[asset]) throw new BadRequestException(`${asset} supports at most ${ASSET_DECIMALS[asset]} decimal places`);
    if (d.lte(0)) throw new BadRequestException('amount must be greater than zero');
    return d;
  }
}
