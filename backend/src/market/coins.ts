/**
 * Coins the platform tracks for market data. Deposits, balances and yield are
 * governed separately by the AssetType enum; a coin listed here is shown on
 * the website and dashboard charts even before deposits for it are enabled.
 */
export interface CoinSpec {
  symbol: string;
  name: string;
  coingeckoId: string;
  /** Simulated feed only: anchor price, circulating supply and volatility. */
  sim: { price: number; supply: number; vol: number; volumeShare: number };
  stable?: boolean;
}

export const COINS: readonly CoinSpec[] = [
  { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin', sim: { price: 78_000, supply: 19_950_000, vol: 1, volumeShare: 0.025 } },
  { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum', sim: { price: 2_270, supply: 120_700_000, vol: 1.25, volumeShare: 0.06 } },
  { symbol: 'USDT', name: 'Tether USD', coingeckoId: 'tether', stable: true, sim: { price: 1, supply: 180_000_000_000, vol: 0, volumeShare: 0.35 } },
  { symbol: 'BNB', name: 'BNB', coingeckoId: 'binancecoin', sim: { price: 714, supply: 140_000_000, vol: 1.1, volumeShare: 0.02 } },
  { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana', sim: { price: 150, supply: 540_000_000, vol: 1.6, volumeShare: 0.05 } },
  { symbol: 'XRP', name: 'XRP', coingeckoId: 'ripple', sim: { price: 2.1, supply: 59_000_000_000, vol: 1.5, volumeShare: 0.03 } },
  { symbol: 'USDC', name: 'USD Coin', coingeckoId: 'usd-coin', stable: true, sim: { price: 1, supply: 75_000_000_000, vol: 0, volumeShare: 0.12 } },
  { symbol: 'TRX', name: 'TRON', coingeckoId: 'tron', sim: { price: 0.28, supply: 94_700_000_000, vol: 0.9, volumeShare: 0.025 } },
  { symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano', sim: { price: 0.55, supply: 36_000_000_000, vol: 1.6, volumeShare: 0.03 } },
  { symbol: 'TON', name: 'Toncoin', coingeckoId: 'the-open-network', sim: { price: 3, supply: 2_500_000_000, vol: 1.5, volumeShare: 0.03 } },
  { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2', sim: { price: 22, supply: 420_000_000, vol: 1.7, volumeShare: 0.04 } },
  { symbol: 'POL', name: 'Polygon', coingeckoId: 'polygon-ecosystem-token', sim: { price: 0.25, supply: 10_500_000_000, vol: 1.8, volumeShare: 0.04 } },
  { symbol: 'ATOM', name: 'Cosmos', coingeckoId: 'cosmos', sim: { price: 4.5, supply: 470_000_000, vol: 1.6, volumeShare: 0.05 } },
  { symbol: 'ARB', name: 'Arbitrum', coingeckoId: 'arbitrum', sim: { price: 0.35, supply: 5_000_000_000, vol: 1.9, volumeShare: 0.06 } },
] as const;

export const COIN_BY_SYMBOL: ReadonlyMap<string, CoinSpec> = new Map(COINS.map((c) => [c.symbol, c]));

export const CHART_RANGES = ['1D', '7D', '30D', '90D', '1Y'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

/** Window length, point spacing and cache lifetime per range. */
export const RANGE_SPEC: Record<ChartRange, { days: number; stepMs: number; cacheSeconds: number }> = {
  '1D': { days: 1, stepMs: 5 * 60_000, cacheSeconds: 300 },
  '7D': { days: 7, stepMs: 60 * 60_000, cacheSeconds: 1_800 },
  '30D': { days: 30, stepMs: 4 * 60 * 60_000, cacheSeconds: 2 * 3_600 },
  '90D': { days: 90, stepMs: 12 * 60 * 60_000, cacheSeconds: 6 * 3_600 },
  '1Y': { days: 365, stepMs: 24 * 60 * 60_000, cacheSeconds: 12 * 3_600 },
};
