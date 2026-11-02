'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const CHART_RANGES = ['1D', '7D', '30D', '90D', '1Y'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];

export interface CoinMarket {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPercent: number | null;
  change7dPercent: number | null;
  marketCapUsd: number | null;
  volume24hUsd: number | null;
  sparkline7d: number[];
}

export interface MarketOverview {
  source: 'coingecko' | 'simulated';
  updatedAt: string;
  coins: CoinMarket[];
}

export interface PriceChart {
  source: 'coingecko' | 'simulated';
  symbol: string;
  range: ChartRange;
  points: [number, number][];
  open: number;
  close: number;
  high: number;
  low: number;
  changePercent: number;
}

/** Live prices, changes, market caps and sparklines for every supported coin. */
export function useMarketCoins() {
  return useQuery({
    queryKey: ['market', 'coins'],
    queryFn: () => api<MarketOverview>('market/coins', { auth: false }),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useCoinChart(symbol: string, range: ChartRange) {
  return useQuery({
    queryKey: ['market', 'chart', symbol, range],
    queryFn: () => api<PriceChart>(`market/coins/${encodeURIComponent(symbol)}/chart?range=${range}`, { auth: false }),
    refetchInterval: range === '1D' ? 60_000 : 300_000,
    placeholderData: keepPreviousData,
  });
}
