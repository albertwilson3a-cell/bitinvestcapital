'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import {
  ASSETS,
  type AllocationsResponse,
  type Asset,
  type LedgerTransaction,
  type Me,
  type PriceSnapshot,
  type TransactionPage,
  type TransactionType,
  type Wallet,
} from '@/lib/types';

export const keys = {
  me: ['me'] as const,
  prices: ['prices'] as const,
  wallets: ['wallets'] as const,
  allocations: ['allocations'] as const,
  transactions: (f: TxFilter) => ['transactions', f] as const,
  yieldHistory: ['yield-history'] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>('auth/me'), staleTime: 60_000 });
}

export function usePrices() {
  return useQuery({
    queryKey: keys.prices,
    queryFn: () => api<PriceSnapshot>('market/prices', { auth: false }),
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
  });
}

export function useWallets() {
  return useQuery({ queryKey: keys.wallets, queryFn: () => api<Wallet[]>('wallets'), refetchInterval: 15_000 });
}

export function useAllocations() {
  return useQuery({ queryKey: keys.allocations, queryFn: () => api<AllocationsResponse>('portfolio/allocations') });
}

export function useSaveAllocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (allocations: { asset: Asset; percentage: number }[]) =>
      api<AllocationsResponse>('portfolio/allocations', { method: 'PUT', body: JSON.stringify({ allocations }) }),
    onSuccess: (data) => qc.setQueryData(keys.allocations, data),
  });
}

export interface TxFilter {
  type?: TransactionType;
  asset?: Asset;
}

export function useTransactions(filter: TxFilter) {
  return useInfiniteQuery({
    queryKey: keys.transactions(filter),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const q = new URLSearchParams({ limit: '15' });
      if (filter.type) q.set('type', filter.type);
      if (filter.asset) q.set('asset', filter.asset);
      if (pageParam) q.set('cursor', pageParam);
      return api<TransactionPage>(`wallets/transactions?${q}`);
    },
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 15_000,
  });
}

/** Yield and affiliate credits for the accrual chart (latest 100 of each). */
export function useYieldHistory() {
  return useQuery({
    queryKey: keys.yieldHistory,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [own, affiliate] = await Promise.all([
        api<TransactionPage>('wallets/transactions?type=YIELD_PAYOUT&limit=100'),
        api<TransactionPage>('wallets/transactions?type=AFFILIATE_YIELD_REWARD&limit=100'),
      ]);
      return { own: own.items, affiliate: affiliate.items };
    },
  });
}

export interface Holding {
  asset: Asset;
  amount: number;
  locked: number;
  price: number | null;
  change24h: number | null;
  usd: number | null;
  share: number; // of total USD, 0..1
  yieldEarned: number;
  yieldUsd: number | null;
  wallet: Wallet;
}

/** Joins balances with live prices into the figures the dashboard shows. */
export function usePortfolio() {
  const wallets = useWallets();
  const prices = usePrices();

  const data = useMemo(() => {
    if (!wallets.data) return null;
    const quote = (a: Asset) => prices.data?.quotes.find((q) => q.asset === a);
    const rows = ASSETS.map((asset) => {
      const wallet = wallets.data.find((w) => w.asset === asset)!;
      const amount = Number(wallet.balance) + Number(wallet.lockedBalance);
      const q = quote(asset);
      const price = q ? Number(q.usd) : null;
      const yieldEarned = Number(wallet.flexibleYieldEarned);
      return {
        asset,
        amount,
        locked: Number(wallet.lockedBalance),
        price,
        change24h: q?.change24hPercent ?? null,
        usd: price === null ? null : amount * price,
        share: 0,
        yieldEarned,
        yieldUsd: price === null ? null : yieldEarned * price,
        wallet,
      } satisfies Holding;
    });
    const priced = rows.every((r) => r.usd !== null);
    const totalUsd = priced ? rows.reduce((s, r) => s + (r.usd ?? 0), 0) : null;
    for (const r of rows) r.share = totalUsd && r.usd !== null ? r.usd / totalUsd : 0;
    // USD change over 24h implied by each asset's percentage move.
    const change24hUsd = priced
      ? rows.reduce((s, r) => {
          if (r.usd === null || r.change24h === null) return s;
          return s + r.usd - r.usd / (1 + r.change24h / 100);
        }, 0)
      : null;
    const yieldUsd = priced ? rows.reduce((s, r) => s + (r.yieldUsd ?? 0), 0) : null;
    return { rows, totalUsd, change24hUsd, yieldUsd };
  }, [wallets.data, prices.data]);

  return { data, wallets, prices, isLoading: wallets.isLoading, error: wallets.error };
}

export type { LedgerTransaction };
