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
    await rates.set(
      'USDT',
      { apyPercent: '9.5', interval: YieldInterval.DAILY, isActive: true },
      adminId,
    );
    await rates.set(
      'BTC',
      { apyPercent: '3', interval: YieldInterval.HOURLY, isActive: false },
      adminId,
    ); // paused
    await rates.set(
      'ETH',
      { apyPercent: '0', interval: YieldInterval.DAILY, isActive: true },
      adminId,
    ); // pays nothing

    const res = await h.http().get('/api/market/rates').expect(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.yields).toEqual([
      {
        asset: 'USDT',
        apyPercent: '9.5',
        weeklyPercent: '0.174201',
        interval: 'DAILY',
      },
    ]);
  });

  it('reflects admin changes to rates and referral settings', async () => {
    await rates.set(
      'BTC',
      { apyPercent: '3', interval: YieldInterval.HOURLY, isActive: true },
      adminId,
    );
    const settings = h.app.get(SettingsService);
    const before = await settings.list();
    try {
      await settings.update(
        { referralDepositRewardRate: '0.02' },
        adminId,
        'public feed test',
      );
      const res = await h.http().get('/api/market/rates').expect(200);
      expect(res.body.yields).toContainEqual(
        expect.objectContaining({
          asset: 'BTC',
          apyPercent: '3',
          interval: 'HOURLY',
        }),
      );
      expect(res.body.referral).toEqual({
        depositRewardRate: '0.02',
        affiliateYieldRate: '0.05',
      });
    } finally {
      const original = before.find(
        (s) => s.name === 'referralDepositRewardRate',
      )!.value;
      await settings.update(
        { referralDepositRewardRate: original },
        adminId,
        'restore',
      );
    }
  });

  describe('weekly rates set by an admin', () => {
    let admin: Awaited<
      ReturnType<typeof import('./support/harness.js').registerVerified>
    >;

    beforeAll(async () => {
      const { registerVerified } = await import('./support/harness.js');
      admin = await registerVerified(h, 'rates-weekly');
      await h.prisma.user.update({
        where: { id: admin.id },
        data: { role: 'ADMIN' },
      });
    });

    it('stores the weekly figure as entered and derives the APY used for payouts', async () => {
      const res = await h
        .http()
        .put('/api/admin/yields/USDT')
        .set(admin.auth)
        .send({ weeklyPercent: 0.2, interval: 'DAILY', isActive: true })
        .expect(200);
      const usdt = res.body.find((r: { asset: string }) => r.asset === 'USDT');
      // (1.002)^(365/7) - 1 = 10.9802%
      expect(usdt).toMatchObject({
        weeklyPercent: '0.2',
        apyPercent: '10.9802',
        interval: 'DAILY',
        isActive: true,
      });
      // Seven daily payouts compound back to the weekly rate.
      expect(Math.pow(1 + Number(usdt.periodRate), 7) - 1).toBeCloseTo(
        0.002,
        7,
      );

      const pub = await h.http().get('/api/market/rates').expect(200);
      expect(pub.body.yields).toContainEqual({
        asset: 'USDT',
        apyPercent: '10.9802',
        weeklyPercent: '0.2',
        interval: 'DAILY',
      });

      const audit = await h.prisma.adminAuditLog.findFirstOrThrow({
        where: { action: 'yield_rate.update', actorId: admin.id },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit.details).toMatchObject({ weeklyPercent: 0.2 });
    });

    it('has a slot for every active coin and reports the weekly ceiling', async () => {
      const res = await h
        .http()
        .get('/api/admin/yields')
        .set(admin.auth)
        .expect(200);
      expect(
        res.body.rates.map((r: { asset: string }) => r.asset).sort(),
      ).toEqual(['BTC', 'ETH', 'USDT']);
      expect(res.body.maxApyPercent).toBe('92200000000000000000');
      expect(res.body.maxWeeklyPercent).toBe('121.069630');
    });

    it('refuses weekly rates above the ceiling', async () => {
      const before = await h.prisma.yieldRate.count();

      for (const weeklyPercent of [121.1, 122]) {
        const r = await h
          .http()
          .put('/api/admin/yields/USDT')
          .set(admin.auth)
          .send({ weeklyPercent, interval: 'DAILY', isActive: true })
          .expect(400);

        expect(JSON.stringify(r.body.message)).toMatch(
          /highest rate allowed is 121.0696% a week/,
        );
      }
      await h
        .http()
        .put('/api/admin/yields/BTC')
        .set(admin.auth)
        .send({ interval: 'DAILY' })
        .expect(400);
      expect(await h.prisma.yieldRate.count()).toBe(before);
      await h
        .http()
        .put('/api/admin/yields/ETH')
        .set(admin.auth)
        .send({ weeklyPercent: 121.06, interval: 'DAILY', isActive: true })
        .expect(200);
    });

    it('preserves the absolute APY ceiling exactly as a string in the public feed', async () => {
      const maximumApy = '92200000000000000000';

      const update = await h
        .http()
        .put('/api/admin/yields/USDT')
        .set(admin.auth)
        .send({
          apyPercent: maximumApy,
          interval: 'DAILY',
          isActive: true,
        })
        .expect(200);

      const updatedRate = update.body.find(
        (r: { asset: string }) => r.asset === 'USDT',
      );

      expect(updatedRate.apyPercent).toBe(maximumApy);
      expect(typeof updatedRate.apyPercent).toBe('string');

      const publicResponse = await h
        .http()
        .get('/api/market/rates')
        .expect(200);

      const publicRate = publicResponse.body.yields.find(
        (r: { asset: string }) => r.asset === 'USDT',
      );

      expect(publicRate.apyPercent).toBe(maximumApy);
      expect(typeof publicRate.apyPercent).toBe('string');
      expect(publicRate.apyPercent).not.toMatch(/[eE][+-]?\d+/);
    });
    it('keeps the code ceiling even if the settings file asks for more', () => {
      const svc = new YieldRatesService(
        h.prisma as never,
        { get: () => '92200000000000000001' } as never,
      );

      expect(svc.maxApyPercent).toBe('92200000000000000000');

      const lower = new YieldRatesService(
        h.prisma as never,
        { get: () => '20' } as never,
      );

      expect(lower.maxApyPercent).toBe('20');
    });
  });
});
