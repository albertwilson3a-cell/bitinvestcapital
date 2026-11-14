'use client';

import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';
import { usePrices } from '@/hooks/use-dashboard';
import { api } from '@/lib/api';
import type { Asset } from '@/lib/types';

export interface InvestmentRate {
  weeklyPercent: string;
  apyPercent: string;
  interval: 'DAILY' | 'HOURLY';
  periodRate: string;
  isActive: boolean;
  updatedAt: string;
}

export interface InvestmentAsset {
  asset: Asset;
  wallet: string;
  invested: string;
  /** Part of the investment earning in the running period (new money joins next period). */
  earningPrincipal: string;
  locked: string;
  earned: string;
  netContributed: string;
  investedSince: string | null;
  usdPrice: string | null;
  minAmount: string | null;
  open: boolean;
  rate: InvestmentRate | null;
  lastPayout: { amount: string; at: string } | null;
  currentPeriodStart: string | null;
  nextPayoutAt: string | null;
}

export interface InvestmentSummary {
  minInvestmentUsd: string;
  serverTime: string;
  assets: InvestmentAsset[];
}

export interface HistoryPoint {
  id: string;
  type: 'INVEST' | 'REDEEM' | 'YIELD_PAYOUT';
  amount: string;
  at: string;
  invested: string;
}

export const investmentKeys = {
  summary: ['investments'] as const,
  history: (a: Asset) => ['investments', 'history', a] as const,
};

/** Wallet/investment per coin. Refreshes often so admin rate changes show within seconds. */
export function useInvestments() {
  return useQuery({ queryKey: investmentKeys.summary, queryFn: () => api<InvestmentSummary>('investments'), refetchInterval: 15_000 });
}

export function useInvestmentHistories(assets: Asset[]) {
  return useQueries({
    queries: assets.map((a) => ({
      queryKey: investmentKeys.history(a),
      queryFn: () => api<{ asset: Asset; points: HistoryPoint[] }>(`investments/${a}/history`),
      refetchInterval: 60_000,
    })),
  });
}

function useAfterMove() {
  const qc = useQueryClient();
  return () => {
    for (const k of [['investments'], ['wallets'], ['transactions'], ['withdrawal-options'], ['withdrawals']]) void qc.invalidateQueries({ queryKey: k });
  };
}

export function useInvest() {
  const done = useAfterMove();
  return useMutation({
    mutationFn: (body: { asset: Asset; amount: string }) =>
      api<{ asset: Asset; amount: string; wallet: string; invested: string }>('investments/invest', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}

export function useRedeem() {
  const done = useAfterMove();
  return useMutation({
    mutationFn: (body: { asset: Asset; amount?: string; all?: boolean }) =>
      api<{ asset: Asset; amount: string; wallet: string; invested: string }>('investments/redeem', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}

// ── live maths ─────────────────────────────────────────────────────

const PERIOD_MS = { DAILY: 86_400_000, HOURLY: 3_600_000 } as const;

/**
 * Interest building up in the current payout period, at the admin's rate:
 * invested × ((1 + periodRate)^(elapsed / period) − 1). It is credited when the period ends.
 */
export function accruedSoFar(a: InvestmentAsset, now: number): number {
  const invested = Number(a.earningPrincipal);
  if (!a.rate || !a.rate.isActive || invested <= 0 || !a.currentPeriodStart) return 0;
  const len = PERIOD_MS[a.rate.interval];
  const elapsed = Math.min(Math.max(now - new Date(a.currentPeriodStart).getTime(), 0), len);
  return invested * (Math.pow(1 + Number(a.rate.periodRate), elapsed / len) - 1);
}

/** Interest per day at the current rate (compounding over the day). */
export function perDay(a: InvestmentAsset): number {
  if (!a.rate || !a.rate.isActive) return 0;
  return Number(a.invested) * (Math.pow(1 + Number(a.rate.weeklyPercent) / 100, 1 / 7) - 1);
}

/** Value after `weeks` at a weekly rate, compounding. */
export function projectValue(start: number, weeklyPercent: number, weeks: number): number {
  return start * Math.pow(1 + weeklyPercent / 100, weeks);
}

/**
 * A clock that ticks every `ms`. Returns 0 while the page is pre-rendered on the
 * server (no "current time" exists there) and the real time once in the browser.
 */
export function useNow(ms = 1000): number {
  return useSyncExternalStore(
    (onTick) => {
      const id = window.setInterval(() => {
        if (document.visibilityState === 'visible') onTick();
      }, ms);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / ms) * ms,
    () => 0,
  );
}

export interface LiveRow extends InvestmentAsset {
  price: number | null;
  change24h: number | null;
  /** Invested + interest built up this period, in coins. */
  liveInvested: number;
  accrued: number;
  liveUsd: number | null;
  walletUsd: number | null;
  contributedUsd: number | null;
  earnedUsd: number | null;
  perDayUsd: number | null;
}

/** Joins the investment summary with live prices and the ticking clock. */
export function useLiveInvestments(tickMs = 1000) {
  const summary = useInvestments();
  const prices = usePrices();
  const now = useNow(tickMs);

  const rows = useMemo<LiveRow[] | null>(() => {
    if (!summary.data) return null;
    return summary.data.assets.map((a) => {
      const q = prices.data?.quotes.find((x) => x.asset === a.asset);
      const price = q ? Number(q.usd) : a.usdPrice ? Number(a.usdPrice) : null;
      const accrued = accruedSoFar(a, now);
      const liveInvested = Number(a.invested) + accrued;
      const usd = (v: number) => (price === null ? null : v * price);
      return {
        ...a,
        price,
        change24h: q?.change24hPercent ?? null,
        liveInvested,
        accrued,
        liveUsd: usd(liveInvested),
        walletUsd: usd(Number(a.wallet) + Number(a.locked)),
        contributedUsd: usd(Number(a.netContributed)),
        earnedUsd: usd(Number(a.earned) + accrued),
        perDayUsd: usd(perDay(a)),
      };
    });
  }, [summary.data, prices.data, now]);

  const totals = useMemo(() => {
    if (!rows) return null;
    const sum = (f: (r: LiveRow) => number | null) => rows.reduce((s, r) => s + (f(r) ?? 0), 0);
    const invested = sum((r) => r.liveUsd);
    const contributed = sum((r) => r.contributedUsd);
    return {
      invested,
      wallet: sum((r) => r.walletUsd),
      contributed,
      earned: sum((r) => r.earnedUsd),
      perDay: sum((r) => r.perDayUsd),
      accruedUsd: sum((r) => (r.price === null ? null : r.accrued * r.price)),
      gain: invested - contributed,
      hasInvestment: rows.some((r) => Number(r.invested) > 0),
      nextPayoutAt: rows
        .filter((r) => Number(r.invested) > 0 && r.nextPayoutAt)
        .map((r) => new Date(r.currentPeriodStart!).getTime() + PERIOD_MS[r.rate!.interval])
        .sort((x, y) => x - y)[0] ?? null,
    };
  }, [rows]);

  return { rows, totals, now, summary, minUsd: summary.data ? Number(summary.data.minInvestmentUsd) : 50 };
}
