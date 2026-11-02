import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CacheService } from '../redis/cache.service.js';
import { COINS, COIN_BY_SYMBOL } from './coins.js';
import { downsample, MarketDataService, MarketDataUnavailableError, summarise } from './market-data.service.js';
import { simulatedPrice } from './simulated-market.js';

/** In-memory stand-in for Redis (the real one is covered by the e2e suites). */
function memoryCache(): CacheService {
  const store = new Map<string, unknown>();
  return {
    get: async (k: string) => (store.has(k) ? store.get(k) : null),
    set: async (k: string, v: unknown) => void store.set(k, v),
    wrap: async (k: string, _ttl: number, f: () => Promise<unknown>) => {
      if (!store.has(k)) store.set(k, await f());
      return store.get(k);
    },
  } as unknown as CacheService;
}

const service = (provider: 'simulated' | 'coingecko') =>
  new MarketDataService(memoryCache(), new ConfigService({ PRICE_PROVIDER: provider, PRICE_API_URL: 'https://cg.test/api/v3' }));

const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);

describe('simulated market model', () => {
  it('is deterministic and keeps stablecoins within a tenth of a cent of $1', () => {
    const btc = COIN_BY_SYMBOL.get('BTC')!;
    expect(simulatedPrice(btc, NOW)).toBe(simulatedPrice(btc, NOW));
    for (const t of [NOW, NOW - 3e8, NOW - 9e9]) {
      expect(Math.abs(simulatedPrice(COIN_BY_SYMBOL.get('USDT')!, t) - 1)).toBeLessThan(0.001);
    }
  });

  it('stays within a plausible band of each anchor price over a year', () => {
    for (const coin of COINS.filter((c) => !c.stable)) {
      for (let d = 0; d < 365; d += 5) {
        const ratio = simulatedPrice(coin, NOW - d * 86_400_000) / coin.sim.price;
        expect(ratio).toBeGreaterThan(0.35);
        expect(ratio).toBeLessThan(2.8);
      }
    }
  });
});

describe('MarketDataService (simulated)', () => {
  it('lists every catalog coin with consistent figures', async () => {
    const o = await service('simulated').overview(NOW);
    expect(o.source).toBe('simulated');
    expect(o.coins.map((c) => c.symbol)).toEqual(COINS.map((c) => c.symbol));
    for (const c of o.coins) {
      expect(c.priceUsd).toBeGreaterThan(0);
      expect(c.sparkline7d.length).toBeGreaterThan(40);
      expect(c.sparkline7d.at(-1)).toBeCloseTo(c.priceUsd, 6);
      expect(c.marketCapUsd).toBeGreaterThan(0);
    }
  });

  it('builds charts whose last point is the current price, for every range', async () => {
    const svc = service('simulated');
    const spot = (await svc.overview(NOW)).coins.find((c) => c.symbol === 'ETH')!.priceUsd;
    for (const range of ['1D', '7D', '30D', '90D', '1Y'] as const) {
      const chart = await svc.chart('eth', range, NOW);
      expect(chart.symbol).toBe('ETH');
      expect(chart.points.length).toBeGreaterThan(20);
      expect(chart.points.length).toBeLessThanOrEqual(400);
      expect(chart.close).toBeCloseTo(spot, 6);
      expect(chart.high).toBeGreaterThanOrEqual(chart.low);
      expect(chart.points[0][0]).toBeLessThan(chart.points.at(-1)![0]);
    }
  });

  it('rejects unknown coins', async () => {
    await expect(service('simulated').chart('DOGE', '7D', NOW)).rejects.toThrow(/Unknown coin/);
  });
});

describe('MarketDataService (coingecko)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps the markets endpoint and caches the result', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            id: 'bitcoin',
            current_price: 77_500.5,
            market_cap: 1.5e12,
            total_volume: 3e10,
            price_change_percentage_24h: -1.25,
            price_change_percentage_7d_in_currency: 4.5,
            sparkline_in_7d: { price: Array.from({ length: 168 }, (_, i) => 70_000 + i) },
          },
          { id: 'solana', current_price: null },
        ]),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const svc = service('coingecko');
    const o = await svc.overview();
    expect(o.coins).toEqual([
      expect.objectContaining({ symbol: 'BTC', priceUsd: 77_500.5, change24hPercent: -1.25, change7dPercent: 4.5, marketCapUsd: 1.5e12 }),
    ]);
    expect(o.coins[0].sparkline7d).toHaveLength(42);
    await svc.overview();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain('/coins/markets?vs_currency=usd&ids=bitcoin,ethereum');
  });

  it('reports the provider being down as unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429 })));
    await expect(service('coingecko').overview()).rejects.toBeInstanceOf(MarketDataUnavailableError);
    await expect(service('coingecko').chart('BTC', '30D')).rejects.toBeInstanceOf(MarketDataUnavailableError);
  });

  it('serves the last good data when CoinGecko fails after a success', async () => {
    const store = new Map<string, unknown>();
    const cache = {
      get: async (k: string) => (store.has(k) ? store.get(k) : null),
      set: async (k: string, v: unknown) => void store.set(k, v),
    } as unknown as CacheService;
    const svc = new MarketDataService(cache, new ConfigService({ PRICE_PROVIDER: 'coingecko', PRICE_API_URL: 'https://cg.test/api/v3' }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ id: 'bitcoin', current_price: 80_000, sparkline_in_7d: { price: [1, 2] } }]), { status: 200 })));
    expect((await svc.overview()).coins[0].priceUsd).toBe(80_000);
    store.delete('market:overview:coingecko'); // the fresh copy expires
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429 })));
    expect((await svc.overview()).coins[0].priceUsd).toBe(80_000);
  });

  it('downsamples long histories but keeps the latest point', async () => {
    const prices = Array.from({ length: 2000 }, (_, i): [number, number] => [i, 100 + i]);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ prices }), { status: 200 })));
    const chart = await service('coingecko').chart('BTC', '1Y');
    expect(chart.points).toHaveLength(400);
    expect(chart.points.at(-1)).toEqual([1999, 2099]);
    expect(chart).toMatchObject({ open: 100, close: 2099, high: 2099, low: 100 });
  });
});

describe('helpers', () => {
  it('downsample and summarise', () => {
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(summarise([[0, 50], [1, 40], [2, 75]])).toEqual({ open: 50, close: 75, high: 75, low: 40, changePercent: 50 });
  });
});
