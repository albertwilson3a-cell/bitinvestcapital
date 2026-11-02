import { Controller, Get, Header } from '@nestjs/common';
import { AssetType } from '../generated/prisma/client.js';
import { Public } from '../auth/decorators.js';
import { SettingsService } from '../settings/settings.service.js';
import { YieldRatesService } from './yield-rates.service.js';

/**
 * Public, read-only view of what the platform currently pays, for the
 * marketing site. Only rates that are active are shown, so the homepage can
 * never advertise a rate the engine is not paying.
 */
@Public()
@Controller('market')
export class PublicRatesController {
  constructor(
    private readonly rates: YieldRatesService,
    private readonly settings: SettingsService,
  ) {}

  @Get('rates')
  @Header('cache-control', 'public, max-age=60')
  async rates_() {
    const current = await this.rates.current();
    const yields = Object.values(AssetType).flatMap((asset) => {
      const r = current[asset];
      return r?.isActive && r.apyPercent.gt(0)
        ? [{ asset, apyPercent: r.apyPercent.toString(), interval: r.interval }]
        : [];
    });
    const [depositRewardRate, affiliateYieldRate] = await Promise.all([
      this.settings.getDecimal('referralDepositRewardRate'),
      this.settings.getDecimal('affiliateYieldRewardRate'),
    ]);
    return {
      yields,
      referral: {
        depositRewardRate: depositRewardRate.toString(),
        affiliateYieldRate: affiliateYieldRate.toString(),
      },
    };
  }
}
