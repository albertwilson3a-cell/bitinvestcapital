/**
 * Public rates feed for the homepage: shows only what the engine is actually
 * paying, needs no login, and follows admin changes immediately.
 */
import { randomBytes } from 'node:crypto';
import { YieldInterval } from '../../src/generated/prisma/client.js';
import { SettingsService } from '../../src/settings/settings.service.js';
import { YieldRatesService } from '../../src/yield/yield-rates.service.js';
import { bootstrap, type Harness } from './support/harness.js';

describe('Public rates feed (GET /api/market/rates)', () => {
  let h: Harness;
  let rates: YieldRatesService;
  let adminId: string;

  beforeAll(async () => {
    h = await bootstrap();
    rates = h.app.get(YieldRatesService);
    adminId = (
      await h.prisma.user.create({
        data: {
          email: `rates.${randomBytes(3).toString('hex')}@bitinvestcapital.com`,
          passwordHash: 'x',
          isVerified: true,
          role: 'ADMIN',
          referralCode: randomBytes(5).toString('hex').toUpperCase(),
        },
      })
    ).id;
  });
  afterAll(async () => h?.close());

  it('is public and lists only active, non-zero rates', async () => {
    await rates.set('USDT', { apyPercent: 9.5, interval: YieldInterval.DAILY, isActive: true }, adminId);
    await rates.set('BTC', { apyPercent: 3, interval: YieldInterval.HOURLY, isActive: false }, adminId); // paused
    await rates.set('ETH', { apyPercent: 0, interval: YieldInterval.DAILY, isActive: true }, adminId); // pays nothing

    const res = await h.http().get('/api/market/rates').expect(200);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(res.body.yields).toEqual([{ asset: 'USDT', apyPercent: '9.5', interval: 'DAILY' }]);
  });

  it('reflects admin changes to rates and referral settings', async () => {
    await rates.set('BTC', { apyPercent: 3, interval: YieldInterval.HOURLY, isActive: true }, adminId);
    const settings = h.app.get(SettingsService);
    const before = await settings.list();
    try {
      await settings.update({ referralDepositRewardRate: '0.02' }, adminId, 'public feed test');
      const res = await h.http().get('/api/market/rates').expect(200);
      expect(res.body.yields).toContainEqual({ asset: 'BTC', apyPercent: '3', interval: 'HOURLY' });
      expect(res.body.referral).toEqual({ depositRewardRate: '0.02', affiliateYieldRate: '0.05' });
    } finally {
      const original = before.find((s) => s.name === 'referralDepositRewardRate')!.value;
      await settings.update({ referralDepositRewardRate: original }, adminId, 'restore');
    }
  });
});
