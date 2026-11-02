import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const SETTING_KEYS = {
  referralDepositRewardRate: 'referral.deposit_reward_rate',
  affiliateYieldRewardRate: 'referral.affiliate_yield_rate',
} as const;
export type SettingName = keyof typeof SETTING_KEYS;

interface SettingSpec {
  /** Fallback when no admin has set a value yet. */
  envKey: string;
  envDefault: string;
  max: string;
  description: string;
}

const SPECS: Record<SettingName, SettingSpec> = {
  referralDepositRewardRate: {
    envKey: 'REFERRAL_REWARD_RATE',
    envDefault: '0.01',
    max: '0.1',
    description: 'Share of each confirmed deposit paid to the depositor’s referrer, in USDT.',
  },
  affiliateYieldRewardRate: {
    envKey: 'AFFILIATE_YIELD_REWARD_RATE',
    envDefault: '0.05',
    max: '0.5',
    description: 'Share of each yield payout paid to the earner’s direct referrer, in the same asset.',
  },
};

export interface SettingView {
  name: SettingName;
  key: string;
  value: string;
  source: 'admin' | 'default';
  max: string;
  description: string;
  updatedAt: Date | null;
}

/**
 * Admin-editable platform parameters. Values live in the database so a change
 * takes effect on the next deposit or payout run without a redeploy; every
 * change is recorded in platform_setting_changes.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getDecimal(name: SettingName, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<Prisma.Decimal> {
    const row = await client.platformSetting.findUnique({ where: { key: SETTING_KEYS[name] } });
    return new Prisma.Decimal(row?.value ?? this.fallback(name));
  }

  async list(): Promise<SettingView[]> {
    const rows = await this.prisma.platformSetting.findMany({ where: { key: { in: Object.values(SETTING_KEYS) } } });
    return (Object.keys(SPECS) as SettingName[]).map((name) => {
      const row = rows.find((r) => r.key === SETTING_KEYS[name]);
      return {
        name,
        key: SETTING_KEYS[name],
        value: row?.value ?? this.fallback(name),
        source: row ? 'admin' : 'default',
        max: SPECS[name].max,
        description: SPECS[name].description,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  history(limit: number) {
    return this.prisma.platformSettingChange.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { changedBy: { select: { id: true, email: true } } },
    });
  }

  /** Applies several changes atomically; unchanged values are skipped. Returns what changed. */
  async update(changes: Partial<Record<SettingName, string>>, adminId: string, note?: string) {
    const entries = Object.entries(changes).filter(([, v]) => v !== undefined) as [SettingName, string][];
    for (const [name, value] of entries) {
      const d = new Prisma.Decimal(value);
      if (d.isNegative() || d.gt(SPECS[name].max)) {
        throw new BadRequestException(`${name} must be between 0 and ${SPECS[name].max}`);
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const applied: { name: SettingName; from: string; to: string }[] = [];
      for (const [name, value] of entries) {
        const key = SETTING_KEYS[name];
        const normalised = new Prisma.Decimal(value).toFixed();
        const current = await tx.platformSetting.findUnique({ where: { key } });
        const from = current?.value ?? this.fallback(name);
        if (new Prisma.Decimal(from).equals(normalised)) continue;
        await tx.platformSetting.upsert({ where: { key }, create: { key, value: normalised }, update: { value: normalised } });
        await tx.platformSettingChange.create({
          data: { key, oldValue: current?.value ?? null, newValue: normalised, note, changedById: adminId },
        });
        applied.push({ name, from, to: normalised });
      }
      return applied;
    });
  }

  private fallback(name: SettingName): string {
    return this.config.get<string>(SPECS[name].envKey) ?? SPECS[name].envDefault;
  }
}
