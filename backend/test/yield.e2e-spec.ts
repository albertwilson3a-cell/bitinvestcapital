import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { loginWithCode } from './support/login.js';
import type { App } from 'supertest/types.js';
import type { PrismaService as PrismaServiceType } from '../src/prisma/prisma.service.js';

// Requires Postgres + Redis cluster and applied migrations (see README).

const RUN = Date.now().toString(36);
const DOMAIN = `yield-${RUN}.test`;
const PASSWORD = 'Str0ngPassw0rd';
const BULK = 25; // > 2 × batch size, so the run spans several chunks

describe('Portfolio allocations, admin yields & payout engine (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServiceType;
  let savedSettings: { key: string; value: string }[] = [];
  let D: typeof import('../src/generated/prisma/client.js').Prisma.Decimal;
  let periodRate: typeof import('../src/yield/yield-math.js').periodRate;
  let latestCompletedPeriod: typeof import('../src/yield/yield-math.js').latestCompletedPeriod;

  const users: Record<string, { id: string; jwt: string; referralCode: string }> = {};
  const rateIds: string[] = [];
  const http = () => request(app.getHttpServer());
  const auth = (name: string) => ({ Authorization: `Bearer ${users[name].jwt}` });

  async function makeUser(name: string, referralCode?: string) {
    const email = `${name}@${DOMAIN}`;
    await http().post('/api/auth/register').send({ email, password: PASSWORD, referralCode }).expect(201);
    await prisma.user.update({ where: { email }, data: { isVerified: true, verificationToken: null } });
    const login = await loginWithCode(app, email, PASSWORD);
    users[name] = { id: login.body.user.id, jwt: login.body.accessToken, referralCode: login.body.user.referralCode };
  }

  const setBalance = (name: string, asset: 'USDT' | 'ETH' | 'BTC', amount: string) =>
    prisma.balance.update({ where: { userId_assetType: { userId: users[name].id, assetType: asset } }, data: { balance: amount } });

  const balanceOf = async (userId: string, asset: 'USDT' | 'ETH' | 'BTC') =>
    prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId, assetType: asset } } });

  async function purgeRuns(keys: string[]) {
    const runs = await prisma.yieldRun.findMany({ where: { periodKey: { in: keys } }, select: { id: true } });
    const ids = runs.map((r) => r.id);
    if (!ids.length) return;
    await prisma.transaction.deleteMany({ where: { sourceTransaction: { yieldRunId: { in: ids } } } });
    await prisma.transaction.deleteMany({ where: { yieldRunId: { in: ids } } });
    await prisma.yieldRun.deleteMany({ where: { id: { in: ids } } });
  }

  let periodKeys: string[] = [];

  beforeAll(async () => {
    Object.assign(process.env, {
      BCRYPT_ROUNDS: '4',
      MAIL_PROVIDER: 'log',
      YIELD_SCHEDULER_ENABLED: 'false',
      YIELD_BATCH_SIZE: '10',
      AFFILIATE_YIELD_REWARD_RATE: '0.05',
      YIELD_MAX_APY_PERCENT: '25',
      REDIS_NAT_MAP: process.env.REDIS_NAT_MAP ?? '',
    });
    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const { MAIL_TRANSPORT } = await import('../src/mail/mail.types.js');
    ({ periodRate, latestCompletedPeriod } = await import('../src/yield/yield-math.js'));
    D = (await import('../src/generated/prisma/client.js')).Prisma.Decimal;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MAIL_TRANSPORT)
      .useValue({ name: 'noop', send: async () => ({ provider: 'noop' }) })
      .compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    // Admin-set referral rates live in the database; run against the env defaults
    // and restore whatever was configured afterwards.
    savedSettings = await prisma.platformSetting.findMany();
    await prisma.platformSetting.deleteMany({});

    periodKeys = [latestCompletedPeriod('DAILY').key, latestCompletedPeriod('HOURLY').key];
    await purgeRuns(periodKeys); // leftovers from an earlier test run in the same hour

    await makeUser('admin');
    await prisma.user.update({ where: { id: users.admin.id }, data: { role: 'ADMIN' } });
    await makeUser('ref');
    await makeUser('alice', users.ref.referralCode);
    await makeUser('bob');
    await makeUser('carol', users.ref.referralCode);
    await makeUser('dave', users.alice.referralCode); // second level: ref must NOT earn from dave
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.platformSetting.deleteMany({});
      for (const s of savedSettings) await prisma.platformSetting.create({ data: { key: s.key, value: s.value } });
      await purgeRuns(periodKeys);
      await prisma.yieldRate.deleteMany({ where: { id: { in: rateIds } } });
      const ids = (await prisma.user.findMany({ where: { email: { endsWith: `@${DOMAIN}` } }, select: { id: true } })).map((u) => u.id);
      await prisma.adminAuditLog.deleteMany({ where: { actorId: { in: ids } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: ids }, sourceTransactionId: { not: null } } });
      await prisma.transaction.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` }, referredByUserId: { not: null } } });
      await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    }
    await app?.close();
  });

  // ───────────────────────── allocations ─────────────────────────

  describe('PUT /api/portfolio/allocations', () => {
    it('accepts allocations that total exactly 100%', async () => {
      const res = await http()
        .put('/api/portfolio/allocations')
        .set(auth('alice'))
        .send({ allocations: [{ asset: 'BTC', percentage: 30 }, { asset: 'usdt', percentage: 70 }] })
        .expect(200);
      expect([...res.body.earningAssets].sort((a: string, b: string) => a.localeCompare(b))).toEqual(['BTC', 'USDT']);
      expect(res.body.allocations.map((a: { percentage: string }) => a.percentage).sort()).toEqual(['30', '70']);
    });

    it.each([
      ['sum below 100', [{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 59 }], 'allocation percentages must sum to exactly 100 (received 99)'],
      ['sum above 100', [{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 60.01 }], 'allocation percentages must sum to exactly 100 (received 100.01)'],
      ['duplicate asset', [{ asset: 'ETH', percentage: 50 }, { asset: 'eth', percentage: 50 }], 'each asset may appear only once in an allocation'],
      ['3 decimals', [{ asset: 'ETH', percentage: 99.999 }, { asset: 'BTC', percentage: 0.001 }], 'percentage must be a number with at most 2 decimal places'],
      ['unknown asset', [{ asset: 'SOL', percentage: 100 }], 'asset must be one of: USDT, ETH, BTC'],
    ])('rejects %s', async (_, allocations, message) => {
      const res = await http().put('/api/portfolio/allocations').set(auth('bob')).send({ allocations }).expect(400);
      expect(res.body.message.join(' | ')).toContain(message);
    });

    it('replaces the previous allocation; omitted assets stop earning', async () => {
      await http().put('/api/portfolio/allocations').set(auth('bob')).send({ allocations: [{ asset: 'ETH', percentage: 50 }, { asset: 'BTC', percentage: 50 }] }).expect(200);
      const res = await http().put('/api/portfolio/allocations').set(auth('bob')).send({ allocations: [{ asset: 'ETH', percentage: 100 }] }).expect(200);
      expect(res.body.earningAssets).toEqual(['ETH']);
      const btc = await prisma.dynamicAllocation.findUniqueOrThrow({ where: { userId_assetType: { userId: users.bob.id, assetType: 'BTC' } } });
      expect(btc.activeStatus).toBe(false);
      await http().put('/api/portfolio/allocations').set(auth('dave')).send({ allocations: [{ asset: 'USDT', percentage: 100 }] }).expect(200);
    });

    it('requires authentication', async () => {
      await http().put('/api/portfolio/allocations').send({ allocations: [] }).expect(401);
    });
  });

  // ───────────────────────── admin panel ─────────────────────────

  describe('/api/admin/yields', () => {
    const put = (asset: string, body: object, who = 'admin') => http().put(`/api/admin/yields/${asset}`).set(auth(who)).send(body);

    it('is admin-only', async () => {
      await http().get('/api/admin/yields').set(auth('alice')).expect(403);
      await put('USDT', { apyPercent: 5, interval: 'DAILY' }, 'alice').expect(403);
      await http().get('/api/admin/yields').expect(401);
    });

    it('validates rate changes', async () => {
      expect((await put('USDT', { apyPercent: 30, interval: 'DAILY' }).expect(400)).body.message).toMatch(/ceiling of 25%/);
      await put('USDT', { apyPercent: -1, interval: 'DAILY' }).expect(400);
      await put('USDT', { apyPercent: 5, interval: 'WEEKLY' }).expect(400);
      await put('USDT', { apyPercent: 5.12345, interval: 'DAILY' }).expect(400);
      await put('DOGE', { apyPercent: 5, interval: 'DAILY' }).expect(400);
    });

    it('sets the rate matrix as versioned history', async () => {
      await put('USDT', { apyPercent: 4, interval: 'daily', note: 'initial' }).expect(200);
      await put('USDT', { apyPercent: 5, interval: 'DAILY', note: 'raised after lending desk review' }).expect(200);
      await put('BTC', { apyPercent: 3.5, interval: 'DAILY' }).expect(200);
      const res = await put('ETH', { apyPercent: 4, interval: 'HOURLY' }).expect(200);

      const byAsset = Object.fromEntries(res.body.map((r: { asset: string }) => [r.asset, r]));
      expect(byAsset.USDT).toMatchObject({ apyPercent: '5', interval: 'DAILY', isActive: true, updatedBy: users.admin.id });
      expect(byAsset.ETH).toMatchObject({ apyPercent: '4', interval: 'HOURLY' });
      expect(byAsset.USDT.periodRate).toBe(periodRate(5, 'DAILY'));

      const hist = await http().get('/api/admin/yields/history?asset=USDT&limit=5').set(auth('admin')).expect(200);
      expect(hist.body.slice(0, 2).map((h: { apyPercent: string }) => h.apyPercent)).toEqual(['5', '4']);
      expect(hist.body[0].createdBy.email).toBe(`admin@${DOMAIN}`);
      rateIds.push(...(await prisma.yieldRate.findMany({ where: { createdByUserId: users.admin.id } })).map((r) => r.id));
    });
  });

  // ───────────────────────── payout engine ─────────────────────────

  describe('yield payout engine', () => {
    const bulkIds: string[] = [];

    beforeAll(async () => {
      // Holdings held through the whole period.
      await setBalance('alice', 'USDT', '11000');
      await setBalance('alice', 'BTC', '0.5');
      await setBalance('alice', 'ETH', '1'); // ETH not allocated → earns nothing
      await setBalance('bob', 'ETH', '3');
      await setBalance('carol', 'USDT', '5000'); // no allocation → earns nothing
      await setBalance('dave', 'USDT', '2000');
      // 1,000 of alice's USDT arrived after the period started → excluded from principal.
      await prisma.transaction.create({
        data: { userId: users.alice.id, type: 'DEPOSIT', assetType: 'USDT', amount: '1000', status: 'COMPLETED', confirmedAt: new Date() },
      });

      // Bulk holders referred by `ref`, spread over several 10-row chunks.
      const ref = await prisma.user.findUniqueOrThrow({ where: { id: users.ref.id } });
      for (let i = 0; i < BULK; i++) {
        const u = await prisma.user.create({
          data: {
            email: `bulk${i}@${DOMAIN}`, passwordHash: 'x', isVerified: true, referralCode: `B${RUN}${i}`.slice(0, 32).toUpperCase(),
            referredByUserId: ref.id,
            balances: { create: { assetType: 'USDT', balance: `${100 + i}.5` } },
            dynamicAllocations: { create: { assetType: 'USDT', allocationPercentage: '100' } },
          },
        });
        bulkIds.push(u.id);
      }
    });

    it('pays the DAILY run exactly once, even when triggered concurrently', async () => {
      const before = {
        refUsdt: (await balanceOf(users.ref.id, 'USDT')).balance,
        refBtc: (await balanceOf(users.ref.id, 'BTC')).balance,
      };
      const results = await Promise.all(
        Array.from({ length: 5 }, () => http().post('/api/admin/yields/runs').set(auth('admin')).send({ interval: 'DAILY' })),
      );
      const statuses = results.map((r) => r.body.status);
      expect(statuses.filter((s) => s === 'completed')).toHaveLength(1);
      expect(statuses.every((s) => ['completed', 'in_progress', 'already_completed'].includes(s))).toBe(true);

      const run = await prisma.yieldRun.findUniqueOrThrow({ where: { periodKey: latestCompletedPeriod('DAILY').key } });
      expect(run.status).toBe('COMPLETED');
      expect(run.holdingsScanned).toBeGreaterThanOrEqual(3 + BULK);

      const rUsdt = periodRate(5, 'DAILY');
      const rBtc = periodRate('3.5', 'DAILY');
      const trunc = (v: InstanceType<typeof D>, dp: number) => v.toDecimalPlaces(dp, D.ROUND_DOWN);

      // alice: principal 10,000 USDT (fresh 1,000 excluded) and 0.5 BTC.
      const aliceUsdtYield = trunc(new D(10000).mul(rUsdt), 6);
      const aliceBtcYield = trunc(new D('0.5').mul(rBtc), 8);
      const daveYield = trunc(new D(2000).mul(rUsdt), 6);
      expect(aliceUsdtYield.toString()).toBe('1.336806');

      const payouts = await prisma.transaction.findMany({ where: { yieldRunId: run.id, userId: { in: [users.alice.id, users.dave.id, users.bob.id, users.carol.id] } } });
      const find = (u: string, a: string) => payouts.find((p) => p.userId === users[u].id && p.assetType === a);
      expect(find('alice', 'USDT')!.amount.toString()).toBe(aliceUsdtYield.toString());
      expect(find('alice', 'BTC')!.amount.toString()).toBe(aliceBtcYield.toString());
      expect(find('dave', 'USDT')!.amount.toString()).toBe(daveYield.toString());
      expect(find('alice', 'ETH')).toBeUndefined(); // not allocated
      expect(find('bob', 'ETH')).toBeUndefined(); // ETH pays HOURLY
      expect(find('carol', 'USDT')).toBeUndefined(); // no allocation
      expect((find('alice', 'USDT')!.metadata as { principal: string }).principal).toBe('10000.000000000000000000');

      // Balances: alice = 11000 + own yield + 5% of dave's yield; yield tracked separately.
      const daveAffiliate = trunc(daveYield.mul('0.05'), 6);
      const aliceUsdt = await balanceOf(users.alice.id, 'USDT');
      expect(aliceUsdt.balance.toString()).toBe(new D(11000).plus(aliceUsdtYield).plus(daveAffiliate).toString());
      expect(aliceUsdt.flexibleYieldEarned.toString()).toBe(aliceUsdtYield.toString());

      // Affiliate rewards: direct referrer only, same asset, linked to the source payout.
      const affiliates = await prisma.transaction.findMany({
        where: { type: 'AFFILIATE_YIELD_REWARD', sourceTransaction: { yieldRunId: run.id } },
        include: { sourceTransaction: true },
      });
      const fromAlice = affiliates.filter((a) => a.sourceTransaction!.userId === users.alice.id);
      const byAssetKey = (a: string[], b: string[]) => a[1].localeCompare(b[1]);
      expect(fromAlice.map((a) => [a.userId, a.assetType, a.amount.toString()]).sort(byAssetKey)).toEqual([
        [users.ref.id, 'BTC', trunc(aliceBtcYield.mul('0.05'), 8).toString()],
        [users.ref.id, 'USDT', trunc(aliceUsdtYield.mul('0.05'), 6).toString()],
      ]);
      const fromDave = affiliates.filter((a) => a.sourceTransaction!.userId === users.dave.id);
      expect(fromDave.map((a) => a.userId)).toEqual([users.alice.id]); // not ref (second level)

      // Referrer collects from alice + 25 bulk referees, many inside the same chunk.
      const refUsdtRewards = affiliates.filter((a) => a.userId === users.ref.id && a.assetType === 'USDT');
      expect(refUsdtRewards).toHaveLength(1 + BULK);
      const refUsdtSum = refUsdtRewards.reduce((s, a) => s.plus(a.amount), new D(0));
      expect((await balanceOf(users.ref.id, 'USDT')).balance.toString()).toBe(before.refUsdt.plus(refUsdtSum).toString());
      expect((await balanceOf(users.ref.id, 'BTC')).balance.toString()).toBe(
        before.refBtc.plus(trunc(aliceBtcYield.mul('0.05'), 8)).toString(),
      );

      // Every bulk holder paid once at the exact rate.
      const bulkPayouts = await prisma.transaction.findMany({ where: { yieldRunId: run.id, userId: { in: bulkIds } } });
      expect(bulkPayouts).toHaveLength(BULK);
      for (const p of bulkPayouts) {
        const i = bulkIds.indexOf(p.userId);
        expect(p.amount.toString()).toBe(trunc(new D(`${100 + i}.5`).mul(rUsdt), 6).toString());
      }
    });

    it('does not pay the same period twice', async () => {
      const before = (await balanceOf(users.alice.id, 'USDT')).balance.toString();
      const res = await http().post('/api/admin/yields/runs').set(auth('admin')).send({ interval: 'DAILY' }).expect(200);
      expect(res.body.status).toBe('already_completed');
      expect((await balanceOf(users.alice.id, 'USDT')).balance.toString()).toBe(before);
    });

    it('pays HOURLY assets on the hourly run', async () => {
      const res = await http().post('/api/admin/yields/runs').set(auth('admin')).send({ interval: 'hourly' }).expect(200);
      expect(res.body.status).toBe('completed');
      const expected = new D(3).mul(periodRate(4, 'HOURLY')).toDecimalPlaces(18, D.ROUND_DOWN);
      const bob = await balanceOf(users.bob.id, 'ETH');
      expect(bob.balance.toString()).toBe(new D(3).plus(expected).toString());
      expect(bob.flexibleYieldEarned.toString()).toBe(expected.toString());
      expect(await prisma.transaction.count({ where: { type: 'AFFILIATE_YIELD_REWARD', sourceTransaction: { userId: users.bob.id } } })).toBe(0);
    });

    it('resumes a crashed run without double-paying', async () => {
      const key = latestCompletedPeriod('HOURLY').key;
      await prisma.yieldRun.update({ where: { periodKey: key }, data: { status: 'FAILED', error: 'simulated crash' } });
      const before = (await balanceOf(users.bob.id, 'ETH')).balance.toString();
      const res = await http().post('/api/admin/yields/runs').set(auth('admin')).send({ interval: 'HOURLY' }).expect(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.run.error).toBeNull();
      expect((await balanceOf(users.bob.id, 'ETH')).balance.toString()).toBe(before);
      const run = await prisma.yieldRun.findUniqueOrThrow({ where: { periodKey: key } });
      expect(await prisma.transaction.count({ where: { yieldRunId: run.id, userId: users.bob.id } })).toBe(1);
    });

    it('lists runs with totals for operators', async () => {
      const res = await http().get('/api/admin/yields/runs?limit=5').set(auth('admin')).expect(200);
      const daily = res.body.find((r: { periodKey: string }) => r.periodKey === latestCompletedPeriod('DAILY').key);
      expect(daily).toMatchObject({ status: 'COMPLETED', interval: 'DAILY' });
      expect(daily.totals.USDT.affiliateCount).toBeGreaterThanOrEqual(2 + BULK);
      expect(daily.rateSnapshot.map((r: { asset: string }) => r.asset).sort((a: string, b: string) => a.localeCompare(b))).toEqual(['BTC', 'USDT']);
    });

    it('rejects invalid run triggers', async () => {
      await http().post('/api/admin/yields/runs').set(auth('admin')).send({ interval: 'WEEKLY' }).expect(400);
      await http().post('/api/admin/yields/runs').set(auth('alice')).send({ interval: 'DAILY' }).expect(403);
    });
  });
});
