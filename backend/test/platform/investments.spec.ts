/**
 * Wallet vs investment: clients choose how much of each coin to invest (minimum $50),
 * only invested funds earn, payouts compound in the investment, and withdrawals come
 * from the wallet only. Real Nest app and PostgreSQL; prices fixed (BTC $60,000).
 */
import { Prisma, YieldInterval } from '../../src/generated/prisma/client.js';
import { YieldEngineService } from '../../src/yield/yield-engine.service.js';
import { periodRate } from '../../src/yield/yield-math.js';
import { bootstrap, registerVerified, type Harness } from './support/harness.js';

const D = Prisma.Decimal;
type Client = Awaited<ReturnType<typeof registerVerified>>;

describe('Investments: wallet ⇄ investment', () => {
  let h: Harness;
  let ana: Client;
  let ben: Client;
  let admin: Client;

  const row = (userId: string, asset: 'USDT' | 'BTC' | 'ETH') =>
    h.prisma.balance.findUniqueOrThrow({ where: { userId_assetType: { userId, assetType: asset } } });
  const fund = (userId: string, asset: 'USDT' | 'BTC' | 'ETH', amount: string) =>
    h.prisma.balance.upsert({
      where: { userId_assetType: { userId, assetType: asset } },
      create: { userId, assetType: asset, balance: amount },
      update: { balance: amount, investedBalance: 0 },
    });
  const invest = (who: Client, asset: string, amount: string) => h.http().post('/api/investments/invest').set(who.auth).send({ asset, amount });
  const redeem = (who: Client, body: object) => h.http().post('/api/investments/redeem').set(who.auth).send(body);
  const setRate = (asset: 'USDT' | 'BTC' | 'ETH', weekly: string, isActive = true) =>
    h.prisma.yieldRate.create({ data: { assetType: asset, apyPercent: new D(weekly).div(100).plus(1).pow(new D(365).div(7)).minus(1).times(100).toDecimalPlaces(4), weeklyPercent: weekly, interval: YieldInterval.DAILY, isActive } });

  beforeAll(async () => {
    h = await bootstrap();
    ana = await registerVerified(h, 'inv-ana');
    ben = await registerVerified(h, 'inv-ben');
    admin = await registerVerified(h, 'inv-admin');
    await h.prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    await setRate('USDT', '0.18');
    await setRate('BTC', '0.05');
    await fund(ana.id, 'USDT', '1000');
  });
  afterAll(async () => h?.close());

  it('shows wallet, investment, the admin rate and the minimum in each coin', async () => {
    const res = await h.http().get('/api/investments').set(ana.auth).expect(200);
    expect(res.body.minInvestmentUsd).toBe('50');
    const usdt = res.body.assets.find((a: { asset: string }) => a.asset === 'USDT');
    expect(usdt).toMatchObject({ wallet: '1000', invested: '0', open: true, minAmount: '50', usdPrice: '1' });
    expect(usdt.rate).toMatchObject({ weeklyPercent: '0.18', interval: 'DAILY', isActive: true });
    expect(new Date(usdt.nextPayoutAt).getTime()).toBeGreaterThan(Date.now());
    const btc = res.body.assets.find((a: { asset: string }) => a.asset === 'BTC');
    expect(btc.minAmount).toBe('0.00083334'); // $50 at $60,000, rounded up
  });

  it('enforces the $50 minimum and the wallet balance', async () => {
    const low = await invest(ana, 'USDT', '49.99').expect(400);
    expect(low.body.message).toMatch(/minimum investment is \$50/);
    await fund(ben.id, 'BTC', '0.01');
    await invest(ben, 'BTC', '0.0008').expect(400); // $48
    const tooMuch = await invest(ana, 'USDT', '1000.01').expect(400);
    expect(tooMuch.body.message).toMatch(/don’t have 1000.01 USDT/);
    expect(await row(ana.id, 'USDT')).toMatchObject({ balance: new D(1000), investedBalance: new D(0) });
  });

  it('moves the chosen amount into the investment and records it in the ledger', async () => {
    const res = await invest(ana, 'usdt', '300').expect(200);
    expect(res.body).toMatchObject({ asset: 'USDT', amount: '300', wallet: '700', invested: '300' });
    // Invested mid-period: it starts earning from the next payout period.
    const sum = await h.http().get('/api/investments').set(ana.auth).expect(200);
    expect(sum.body.assets.find((a: { asset: string }) => a.asset === 'USDT')).toMatchObject({ invested: '300', earningPrincipal: '0' });
    const t = await h.prisma.transaction.findUniqueOrThrow({ where: { id: res.body.transactionId } });
    expect(t).toMatchObject({ type: 'INVEST', status: 'COMPLETED', userId: ana.id });
    expect(t.metadata).toMatchObject({ usdValue: '300.00', weeklyPercent: '0.18' });

    const btc = await invest(ben, 'BTC', '0.005').expect(200);
    expect(btc.body).toMatchObject({ wallet: '0.005', invested: '0.005' });
  });

  it('never overdraws the wallet when two investments race', async () => {
    await fund(ben.id, 'USDT', '100');
    const results = await Promise.all([invest(ben, 'USDT', '60'), invest(ben, 'USDT', '60')]);
    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 400]);
    expect(await row(ben.id, 'USDT')).toMatchObject({ balance: new D(40), investedBalance: new D(60) });
  });

  it('withdrawals use the wallet only; invested funds must be moved back first', async () => {
    const r = await h.http().post('/api/withdrawals').set(ben.auth).send({ asset: 'USDT', amount: '50', address: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' }).expect(400);
    expect(JSON.stringify(r.body.message)).toMatch(/balance|insufficient|available/i);
  });

  it('pays only invested funds, compounding the payout into the investment', async () => {
    const engine = h.app.get(YieldEngineService);
    const res = await engine.runLatest(YieldInterval.DAILY, 'scheduler', new Date('2032-06-02T00:00:05Z'));
    expect(res.status).toBe('completed');
    const usdtRate = await h.prisma.yieldRate.findFirstOrThrow({ where: { assetType: 'USDT' }, orderBy: { createdAt: 'desc' } });
    const expected = new D(300).mul(periodRate(usdtRate.apyPercent, YieldInterval.DAILY)).toDecimalPlaces(6, D.ROUND_DOWN);
    const a = await row(ana.id, 'USDT');
    expect(a.balance.toString()).toBe('700'); // the wallet earns nothing
    expect(a.investedBalance.toString()).toBe(new D(300).plus(expected).toString());
    // Seven daily payouts at this rate compound to the weekly 0.18%.
    expect(Math.pow(1 + Number(periodRate(usdtRate.apyPercent, YieldInterval.DAILY)), 7) - 1).toBeCloseTo(0.0018, 6);

    const hist = await h.http().get('/api/investments/USDT/history').set(ana.auth).expect(200);
    expect(hist.body.points.map((p: { type: string }) => p.type)).toEqual(['INVEST', 'YIELD_PAYOUT']);
    expect(hist.body.points.at(-1).invested).toBe(a.investedBalance.toFixed());
  });

  it('moves part or all of the investment back to the wallet', async () => {
    await redeem(ana, { asset: 'USDT', amount: '1000' }).expect(400);
    await redeem(ana, { asset: 'USDT' }).expect(400);
    const part = await redeem(ana, { asset: 'USDT', amount: '100' }).expect(200);
    expect(part.body).toMatchObject({ wallet: '800' });
    const all = await redeem(ana, { asset: 'USDT', all: true }).expect(200);
    const a = await row(ana.id, 'USDT');
    expect(a.investedBalance.toString()).toBe('0');
    expect(a.balance.toString()).toBe(new D(800).plus(all.body.amount).toString());
    expect(new D(all.body.amount).gt(200)).toBe(true); // includes the payout
    await redeem(ana, { asset: 'USDT', all: true }).expect(400);
    const sum = await h.prisma.transaction.aggregate({ where: { userId: ana.id, type: 'REDEEM' }, _sum: { amount: true } });
    expect(sum._sum.amount!.toString()).toBe(new D(100).plus(all.body.amount).toString());
  });

  it('refuses new investments while a coin’s rate is paused', async () => {
    await setRate('USDT', '0.18', false);
    const r = await invest(ana, 'USDT', '100').expect(400);
    expect(r.body.message).toMatch(/not open/);
    await setRate('USDT', '0.18', true);
  });

  it('applies a new minimum set by an admin', async () => {
    await h.http().put('/api/admin/settings').set(admin.auth).send({ minInvestmentUsd: '100', note: 'Raise minimum for test' }).expect(200);
    const r = await invest(ana, 'USDT', '60').expect(400);
    expect(r.body.message).toMatch(/minimum investment is \$100/);
    await h.http().put('/api/admin/settings').set(admin.auth).send({ minInvestmentUsd: '50', note: 'Back to default' }).expect(200);
    await invest(ana, 'USDT', '60').expect(200);
  });

  it('blocks suspended accounts', async () => {
    await h.prisma.user.update({ where: { id: ben.id }, data: { suspendedAt: new Date() } });
    await invest(ben, 'USDT', '40').expect(401);
  });
});
