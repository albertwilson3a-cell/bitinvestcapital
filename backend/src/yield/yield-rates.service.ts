import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetType,
  Prisma,
  YieldInterval,
  type YieldRate,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS } from '../wallets/chains.js';
import type { UpdateYieldRateDto } from './dto/yield.dto.js';
import {
  apyToWeeklyPercent,
  periodRate,
  weeklyToApyPercent,
} from './yield-math.js';

/**
 * Absolute ceiling (APY %) built into the code.
 * YIELD_MAX_APY_PERCENT can lower it, never raise it.
 * Stored as a string to avoid JavaScript number precision loss.
 */
export const ABSOLUTE_MAX_APY_PERCENT = '92200000000000000000';

/** Frozen per-run view of the rate matrix (stored on the run for audit/resume). */
export interface RateSnapshotEntry {
  asset: AssetType;
  apyPercent: string;
  interval: YieldInterval;
  rate: string;
  decimals: number;
  rateId: string;
}

@Injectable()
export class YieldRatesService {
  private readonly maxApy: Prisma.Decimal;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const absoluteMax = new Prisma.Decimal(ABSOLUTE_MAX_APY_PERCENT);
    const configuredValue =
      config.get<string>('YIELD_MAX_APY_PERCENT') ?? ABSOLUTE_MAX_APY_PERCENT;
    const configuredMax = new Prisma.Decimal(configuredValue);

    if (!configuredMax.isFinite() || configuredMax.isNegative()) {
      throw new Error(
        'YIELD_MAX_APY_PERCENT must be a valid non-negative number',
      );
    }

    this.maxApy = configuredMax.gt(absoluteMax) ? absoluteMax : configuredMax;
  }

  /** The APY ceiling, returned as a string to preserve precision. */
  get maxApyPercent(): string {
    return this.maxApy.toFixed();
  }

  /** The ceiling expressed per week. */
  get maxWeeklyPercent(): string {
    return new Prisma.Decimal(apyToWeeklyPercent(this.maxApy, 'down')).toFixed(6);
  }

  /** Weekly rate shown for a row: as entered, or derived from its APY. */
  static weeklyOf(r: Pick<YieldRate, 'apyPercent' | 'weeklyPercent'>): string {
    return r.weeklyPercent
      ? r.weeklyPercent.toFixed()
      : apyToWeeklyPercent(r.apyPercent);
  }

  /** Latest rate row per asset (the one in force). */
  async current(): Promise<Partial<Record<AssetType, YieldRate>>> {
    const rows = await this.prisma.yieldRate.findMany({
      distinct: ['assetType'],
      orderBy: [{ assetType: 'asc' }, { createdAt: 'desc' }],
    });

    return Object.fromEntries(rows.map((r) => [r.assetType, r]));
  }

  async matrix() {
    const current = await this.current();

    return Object.values(AssetType).map((asset) => {
      const r = current[asset];

      if (!r) {
        return { asset, configured: false as const };
      }

      return {
        asset,
        configured: true as const,
        apyPercent: r.apyPercent.toFixed(),
        weeklyPercent: YieldRatesService.weeklyOf(r),
        interval: r.interval,
        isActive: r.isActive,
        periodRate: periodRate(r.apyPercent, r.interval),
        note: r.note,
        updatedAt: r.createdAt,
        updatedBy: r.createdByUserId,
      };
    });
  }

  /** Never edits history: each change is a new row. */
  async set(asset: AssetType, dto: UpdateYieldRateDto, adminId: string) {
    const weekly = dto.weeklyPercent;

    if (weekly === undefined && dto.apyPercent === undefined) {
      throw new BadRequestException('Give weeklyPercent (or apyPercent)');
    }

    // APY input is a string so its full precision is preserved.
    const apy = new Prisma.Decimal(
      weekly !== undefined ? weeklyToApyPercent(weekly) : dto.apyPercent!,
    );

    if (apy.gt(this.maxApy)) {
      const weeklyLimit = new Prisma.Decimal(this.maxWeeklyPercent).toFixed(4);

      throw new BadRequestException(
        `${asset}: the highest rate allowed is ${weeklyLimit}% a week (${this.maxApy.toFixed()}% a year).`,
      );
    }

    await this.prisma.yieldRate.create({
      data: {
        assetType: asset,
        apyPercent: apy,
        weeklyPercent:
          weekly !== undefined ? new Prisma.Decimal(weekly.toFixed(6)) : null,
        interval: dto.interval,
        isActive: dto.isActive,
        note: dto.note,
        createdByUserId: adminId,
      },
    });

    return this.matrix();
  }

  history(limit: number, asset?: AssetType) {
    return this.prisma.yieldRate.findMany({
      where: { assetType: asset },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        createdBy: {
          select: { id: true, email: true },
        },
      },
    });
  }

  /** Active, non-zero rates for one payout interval — the input to a run. */
  async snapshotFor(interval: YieldInterval): Promise<RateSnapshotEntry[]> {
    const current = await this.current();

    return Object.values(current)
      .filter(
        (r): r is YieldRate =>
          !!r && r.isActive && r.interval === interval && r.apyPercent.gt(0),
      )
      .map((r) => ({
        asset: r.assetType,
        apyPercent: r.apyPercent.toString(),
        interval: r.interval,
        rate: periodRate(r.apyPercent, r.interval),
        decimals: ASSET_DECIMALS[r.assetType],
        rateId: r.id,
      }));
  }
}
