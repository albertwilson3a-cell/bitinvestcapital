/**
 * Suite 2: Allocation math.
 * PUT /api/portfolio/allocations must accept exactly 100% and reject anything else
 * with 400 Bad Request, leaving the stored allocation untouched.
 */
import { bootstrap, registerVerified, type Harness } from './support/harness.js';

type Item = { asset: string; percentage: unknown };

describe('Suite 2: Allocation math', () => {
  let h: Harness;
  let user: Awaited<ReturnType<typeof registerVerified>>;

  const put = (allocations: unknown) => h.http().put('/api/portfolio/allocations').set(user.auth).send({ allocations });
  const stored = async () =>
    (await h.prisma.dynamicAllocation.findMany({ where: { userId: user.id, activeStatus: true }, orderBy: { assetType: 'asc' } }))
      .map((a) => `${a.assetType}:${a.allocationPercentage.toFixed(2)}`)
      .sort();

  beforeAll(async () => {
    h = await bootstrap();
    user = await registerVerified(h, 'alloc');
  });
  afterAll(async () => h?.close());

  describe('valid allocations (sum = 100%) are accepted', () => {
    it.each<[string, Item[], string[]]>([
      ['40 / 60', [{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 60 }], ['BTC:40.00', 'ETH:60.00']],
      ['a single asset at 100', [{ asset: 'USDT', percentage: 100 }], ['USDT:100.00']],
      ['thirds with cents (33.33 + 33.33 + 33.34)', [{ asset: 'BTC', percentage: 33.33 }, { asset: 'ETH', percentage: 33.33 }, { asset: 'USDT', percentage: 33.34 }], ['BTC:33.33', 'ETH:33.33', 'USDT:33.34']],
      ['float-unfriendly cents (0.1 + 0.2 + 99.7)', [{ asset: 'BTC', percentage: 0.1 }, { asset: 'ETH', percentage: 0.2 }, { asset: 'USDT', percentage: 99.7 }], ['BTC:0.10', 'ETH:0.20', 'USDT:99.70']],
      ['lower-case asset codes', [{ asset: 'btc', percentage: 50 }, { asset: 'usdt', percentage: 50 }], ['BTC:50.00', 'USDT:50.00']],
    ])('%s → 200 and persisted', async (_, allocations, expected) => {
      const res = await put(allocations).expect(200);
      expect(res.body.earningAssets.sort()).toEqual(expected.map((e) => e.split(':')[0]).sort());
      expect(await stored()).toEqual(expected.sort());
    });

    it('replaces the previous allocation: omitted assets are deactivated', async () => {
      await put([{ asset: 'BTC', percentage: 50 }, { asset: 'ETH', percentage: 50 }]).expect(200);
      await put([{ asset: 'ETH', percentage: 100 }]).expect(200);
      expect(await stored()).toEqual(['ETH:100.00']);
      const btc = await h.prisma.dynamicAllocation.findUniqueOrThrow({ where: { userId_assetType: { userId: user.id, assetType: 'BTC' } } });
      expect(btc.activeStatus).toBe(false);
    });

    it('accepts 30 random 2-decimal partitions of exactly 100%', async () => {
      for (let i = 0; i < 30; i++) {
        const cut1 = 1 + Math.floor(Math.random() * 9998); // basis points
        const cut2 = cut1 + 1 + Math.floor(Math.random() * (9999 - cut1));
        const parts = [cut1, cut2 - cut1, 10_000 - cut2].map((bp) => bp / 100);
        const allocations = ['BTC', 'ETH', 'USDT'].map((asset, k) => ({ asset, percentage: parts[k] }));
        const res = await put(allocations);
        expect(res.status, `rejected ${JSON.stringify(parts)}`).toBe(200);
      }
    });
  });

  describe('invalid allocations are rejected with 400 and change nothing', () => {
    beforeAll(async () => {
      await put([{ asset: 'BTC', percentage: 25 }, { asset: 'USDT', percentage: 75 }]).expect(200);
    });

    it.each<[string, unknown, RegExp]>([
      ['105% (over-allocated)', [{ asset: 'BTC', percentage: 55 }, { asset: 'ETH', percentage: 50 }], /sum to exactly 100 \(received 105\)/],
      ['90% (under-allocated)', [{ asset: 'BTC', percentage: 40 }, { asset: 'ETH', percentage: 50 }], /sum to exactly 100 \(received 90\)/],
      ['99.99%', [{ asset: 'BTC', percentage: 49.99 }, { asset: 'ETH', percentage: 50 }], /received 99\.99/],
      ['100.01%', [{ asset: 'BTC', percentage: 50.01 }, { asset: 'ETH', percentage: 50 }], /received 100\.01/],
      ['a duplicated asset', [{ asset: 'BTC', percentage: 50 }, { asset: 'btc', percentage: 50 }], /only once/],
      ['a zero share', [{ asset: 'BTC', percentage: 0 }, { asset: 'ETH', percentage: 100 }], /greater than 0/],
      ['a negative share', [{ asset: 'BTC', percentage: -10 }, { asset: 'ETH', percentage: 110 }], /greater than 0|cannot exceed 100/],
      ['three decimals', [{ asset: 'BTC', percentage: 33.333 }, { asset: 'ETH', percentage: 66.667 }], /at most 2 decimal places/],
      ['a string percentage', [{ asset: 'BTC', percentage: '100' }], /at most 2 decimal places/],
      ['an unknown asset', [{ asset: 'DOGE', percentage: 100 }], /asset must be one of/],
      ['an empty array', [], /at least one asset/],
      ['a non-array', { BTC: 100 }, /must be an array/],
    ])('%s', async (_, allocations, message) => {
      const before = await stored();
      const res = await put(allocations).expect(400);
      expect(res.body.error).toBe('Bad Request');
      expect((res.body.message as string[]).join(' | ')).toMatch(message);
      expect(await stored()).toEqual(before);
    });

    it('rejects 30 random allocations that miss 100% by 0.01 to 15 points', async () => {
      const before = await stored();
      for (let i = 0; i < 30; i++) {
        const off = (1 + Math.floor(Math.random() * 1500)) * (Math.random() < 0.5 ? -1 : 1); // ±0.01%..±15%
        const a = 3000 + Math.floor(Math.random() * 3000);
        const b = 10_000 - a + off;
        const res = await put([{ asset: 'BTC', percentage: a / 100 }, { asset: 'ETH', percentage: b / 100 }]);
        expect(res.status, `accepted ${a / 100} + ${b / 100}`).toBe(400);
      }
      expect(await stored()).toEqual(before);
    });

    it('rejects unknown body fields and requires authentication', async () => {
      await h.http().put('/api/portfolio/allocations').set(user.auth).send({ allocations: [{ asset: 'BTC', percentage: 100 }], boost: true }).expect(400);
      await h.http().put('/api/portfolio/allocations').send({ allocations: [{ asset: 'BTC', percentage: 100 }] }).expect(401);
    });
  });
});
