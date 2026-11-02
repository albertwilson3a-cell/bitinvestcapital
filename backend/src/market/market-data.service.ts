import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../redis/cache.service.js';
import { COIN_BY_SYMBOL, COINS, RANGE_SPEC, type ChartRange, type CoinSpec } from './coins.js';
import { MS, simulatedPrice, simulatedSeries, simulatedVolume } from './simulated-market.js';

export class MarketDataUnavailableError extends Error {}

export type MarketSource = 'coingecko' | 'simulated';

export interface CoinMarket {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPercent: number | null;
  change7dPercent: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  /** About 42 points across the last 7 days, oldest first. */
  sparkline7d: number[];
}

export interface MarketOverview {
  source: MarketSource;
  updatedAt: string;
  coins: CoinMarket[];
}

export interface PriceChart {
  source: MarketSource;
  symbol: string;
  range: ChartRange;
  points: [number, number][];
  open: number;
  close: number;
  high: number;
  low: number;
  changePercent: number;
}

interface CgMarketRow {
  id: string;
  current_price?: number | null;
  market_cap?: number | null;
  total_volume?: number | null;
  price_change_percentage_24h?: number | null;
  price_change_percentage_7d_in_currency?: number | null;
  sparkline_in_7d?: { price?: number[] } | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const round = (v: number, dp = 4) => Number(v.toFixed(dp));

/** Keeps every n-th point so charts stay light; always keeps the last point. */
export function downsample<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = points.length / max;
  const out: T[] = [];
  for (let i = 0; i < max - 1; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

export function summarise(points: [number, number][]): Pick<PriceChart, 'open' | 'close' | 'high' | 'low' | 'changePercent'> {
  const prices = points.map((p) => p[1]);
  const open = prices[0];
  const close = prices[prices.length - 1];
  return {
    open,
    close,
    high: Math.max(...prices),
    low: Math.min(...prices),
    changePercent: open ? round(((close - open) / open) * 100) : 0,
  };
}

/**
 * Market data for every coin in the catalog: spot price, 24h/7d change, market
 * cap, volume, a 7-day sparkline and price history for charts.
 *  - coingecko: two endpoints, cached in Redis (60s for the overview, longer for history).
 *  - simulated: deterministic development model (see simulated-market.ts).
 */
/** Free CoinGecko plans allow roughly 30 requests a minute; stay under it. */
const MIN_REQUEST_GAP_MS = 2_100;
const MAX_QUEUED_REQUESTS = 40;
/** Last successful responses are kept this long as a fallback if CoinGecko is briefly unavailable. */
const LAST_GOOD_TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private queue: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private lastRequestAt = 0;
  /** In-process copy of the last good data, used if Redis is unavailable too. */
  private readonly memory = new Map<string, unknown>();
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly ttl: number;
  readonly source: MarketSource;

  constructor(
    private readonly cache: CacheService,
    config: ConfigService,
  ) {
    this.baseUrl = (config.get<string>('PRICE_API_URL') ?? 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
    this.apiKey = config.get<string>('PRICE_API_KEY') || undefined;
    this.ttl = Math.max(30, config.get<number>('PRICE_CACHE_SECONDS') ?? 60);
    this.source = config.get<MarketSource>('PRICE_PROVIDER') ?? 'coingecko';
  }

  coin(symbol: string): CoinSpec {
    const coin = COIN_BY_SYMBOL.get(symbol.toUpperCase());
    if (!coin) throw new NotFoundException(`Unknown coin ${symbol}`);
    return coin;
  }

  async overview(now = Date.now()): Promise<MarketOverview> {
    return this.source === 'simulated' ? this.simulatedOverview(now) : this.coingeckoOverview();
  }

  async chart(symbol: string, range: ChartRange, now = Date.now()): Promise<PriceChart> {
    const coin = this.coin(symbol);
    const spec = RANGE_SPEC[range];
    let points: [number, number][];
    if (this.source === 'simulated') {
      points = simulatedSeries(coin, now - spec.days * MS.DAY, now, spec.stepMs).map(([t, p]) => [t, round(p, 8)]);
    } else {
      points = await this.fresh(`market:chart:${coin.symbol}:${range}`, spec.cacheSeconds, () => this.fetchChart(coin, spec.days));
    }
    points = downsample(points, 400);
    return { source: this.source, symbol: coin.symbol, range, points, ...summarise(points) };
  }

  // ── simulated ─────────────────────────────────────────────────────────

  private simulatedOverview(now: number): MarketOverview {
    const coins = COINS.map((coin): CoinMarket => {
      const price = simulatedPrice(coin, now);
      const day = simulatedPrice(coin, now - MS.DAY);
      const week = simulatedPrice(coin, now - 7 * MS.DAY);
      const sparkline = simulatedSeries(coin, now - 7 * MS.DAY, now, 4 * MS.HOUR).map(([, p]) => round(p, 8));
      return {
        symbol: coin.symbol,
        name: coin.name,
        priceUsd: round(price, 8),
        change24hPercent: round(((price - day) / day) * 100),
        change7dPercent: round(((price - week) / week) * 100),
        marketCapUsd: Math.round(price * coin.sim.supply),
        volume24hUsd: Math.round(simulatedVolume(coin, now)),
        sparkline7d: sparkline,
      };
    });
    return { source: 'simulated', updatedAt: new Date(now).toISOString(), coins };
  }

  // ── coingecko ─────────────────────────────────────────────────────────

  private coingeckoOverview(): Promise<MarketOverview> {
    return this.fresh('market:overview:coingecko', this.ttl, () => this.fetchOverview());
  }

  /**
   * Cached value if fresh; otherwise fetch, store as fresh and as "last good".
   * If the fetch fails, serve the last good value rather than an error.
   */
  private async fresh<T>(key: string, ttl: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await this.cache.get<T>(key).catch(() => null);
    if (cached) return cached;
    try {
      const value = await fetcher();
      this.memory.set(key, value);
      await Promise.all([this.cache.set(key, value, ttl), this.cache.set(`${key}:last-good`, value, LAST_GOOD_TTL_SECONDS)]).catch(() => undefined);
      return value;
    } catch (err) {
      const fallback = (await this.cache.get<T>(`${key}:last-good`).catch(() => null)) ?? (this.memory.get(key) as T | undefined);
      if (fallback) {
        this.logger.warn(`Serving last good data for ${key} (CoinGecko unavailable)`);
        return fallback;
      }
      throw err;
    }
  }

  private async fetchOverview(): Promise<MarketOverview> {
    const ids = COINS.map((c) => c.coingeckoId).join(',');
    const rows = await this.get<CgMarketRow[]>(
      `/coins/markets?vs_currency=usd&ids=${ids}&sparkline=true&price_change_percentage=24h,7d&per_page=250`,
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    const coins = COINS.flatMap((coin): CoinMarket[] => {
      const row = byId.get(coin.coingeckoId);
      const price = num(row?.current_price);
      if (!row || price === null) return [];
      return [
        {
          symbol: coin.symbol,
          name: coin.name,
          priceUsd: price,
          change24hPercent: num(row.price_change_percentage_24h),
          change7dPercent: num(row.price_change_percentage_7d_in_currency),
          marketCapUsd: num(row.market_cap),
          volume24hUsd: num(row.total_volume),
          sparkline7d: downsample((row.sparkline_in_7d?.price ?? []).filter((p) => Number.isFinite(p)), 42),
        },
      ];
    });
    if (!coins.length) throw new MarketDataUnavailableError('Market data is unavailable');
    return { source: 'coingecko', updatedAt: new Date().toISOString(), coins };
  }

  private async fetchChart(coin: CoinSpec, days: number): Promise<[number, number][]> {
    const body = await this.get<{ prices?: [number, number][] }>(
      `/coins/${coin.coingeckoId}/market_chart?vs_currency=usd&days=${days}`,
    );
    const points = (body.prices ?? []).filter(
      (p): p is [number, number] => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]),
    );
    if (points.length < 2) throw new MarketDataUnavailableError(`Price history for ${coin.symbol} is unavailable`);
    return points;
  }

  /** All CoinGecko calls go through one queue, spaced to respect the rate limit. */
  private get<T>(path: string): Promise<T> {
    if (this.queued >= MAX_QUEUED_REQUESTS) return Promise.reject(new MarketDataUnavailableError('Market data is busy, try again shortly'));
    this.queued++;
    const run = this.queue.then(async () => {
      const wait = this.lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequestAt = Date.now();
      return this.request<T>(path);
    });
    this.queue = run.catch(() => undefined).finally(() => this.queued--);
    return run;
  }

  private async request<T>(path: string): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        headers: { accept: 'application/json', ...(this.apiKey ? { 'x-cg-demo-api-key': this.apiKey } : {}) },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      this.logger.error(`Market data request failed (${path.split('?')[0]}): ${err instanceof Error ? err.message : String(err)}`);
      throw new MarketDataUnavailableError('Market data is unavailable');
    }
  }
}
