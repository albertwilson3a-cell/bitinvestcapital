/**
 * Public market data endpoints used by the website and the client dashboard.
 */
import { bootstrap, type Harness } from './support/harness.js';

describe('Market data API', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await bootstrap();
  });
  afterAll(async () => h?.close());

  it('lists all 14 supported coins without signing in', async () => {
    const res = await h.http().get('/api/market/coins').expect(200);
    expect(res.body.coins.map((c: { symbol: string }) => c.symbol)).toEqual([
      'BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP', 'USDC', 'TRX', 'ADA', 'TON', 'AVAX', 'POL', 'ATOM', 'ARB',
    ]);
    expect(res.headers['cache-control']).toBe('public, max-age=15');
  });

  it('serves price history per coin and range, case-insensitively', async () => {
    const res = await h.http().get('/api/market/coins/sol/chart?range=30d').expect(200);
    expect(res.body).toMatchObject({ symbol: 'SOL', range: '30D' });
    expect(res.body.points.length).toBeGreaterThan(100);
  });

  it('rejects bad input', async () => {
    await h.http().get('/api/market/coins/BTC/chart?range=5Y').expect(400);
    await h.http().get('/api/market/coins/NOPE/chart').expect(404);
    await h.http().get('/api/market/coins/%3Cscript%3E/chart').expect(400);
  });

  it('publishes the catalog', async () => {
    const res = await h.http().get('/api/market/catalog').expect(200);
    expect(res.body).toHaveLength(14);
    expect(res.body.find((c: { symbol: string }) => c.symbol === 'USDC')).toEqual({ symbol: 'USDC', name: 'USD Coin', stable: true });
  });
});
