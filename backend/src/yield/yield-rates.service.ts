import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetType, Prisma, YieldInterval, type YieldRate } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS } from '../wallets/chains.js';
import type { UpdateYieldRateDto } from './dto/yield.dto.js';
import { periodRate } from './yield-math.js';

/** Frozen per-run view of the rate matrix (stored on the run for audit/resume). */
export interface RateSnapshotEntry {
  asset: AssetType;
  apyPercent: string;
  interval: YieldInterval;
  rate: string; // per-period rate
  decimals: number;
  rateId: string;
}

@Injectable()
export class YieldRatesService {
  private readonly maxApy: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.maxApy = config.get<number>('YIELD_MAX_APY_PERCENT') ?? 100;
  }

  get maxApyPercent(): number {
    return this.maxApy;
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
      if (!r) return { asset, configured: false as const };
      return {
        asset,
        configured: true as const,
        apyPercent: r.apyPercent,
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
    if (dto.apyPercent > this.maxApy) {
      throw new BadRequestException(`apyPercent exceeds the configured ceiling of ${this.maxApy}%`);
    }
    await this.prisma.yieldRate.create({
      data: {
        assetType: asset,
        apyPercent: new Prisma.Decimal(dto.apyPercent.toFixed(4)),
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
      include: { createdBy: { select: { id: true, email: true } } },
    });
  }

  /** Active, non-zero rates for one payout interval — the input to a run. */
  async snapshotFor(interval: YieldInterval): Promise<RateSnapshotEntry[]> {
    const current = await this.current();
    return Object.values(current)
      .filter((r): r is YieldRate => !!r && r.isActive && r.interval === interval && r.apyPercent.gt(0))
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
