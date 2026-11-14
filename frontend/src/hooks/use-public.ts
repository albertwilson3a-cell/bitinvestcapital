'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Asset, Me } from '@/lib/types';

export interface PublicRates {
  yields: { asset: Asset; apyPercent: string; weeklyPercent: string; interval: 'DAILY' | 'HOURLY' }[];
  referral: { depositRewardRate: string; affiliateYieldRate: string };
}

/** What the platform is paying right now (active rates only). No sign-in needed. */
export function usePublicRates() {
  return useQuery({
    queryKey: ['public-rates'],
    queryFn: () => api<PublicRates>('market/rates', { auth: false }),
    // Rates are edited by staff; keep every open page within ~20 s of a change.
    staleTime: 10_000,
    refetchInterval: 20_000,
  });
}

/** Signed-in user, or null for visitors. Never redirects to the login page. */
export function useOptionalMe() {
  return useQuery({
    queryKey: ['me', 'optional'],
    queryFn: async (): Promise<Me | null> => {
      const res = await fetch('/api/session/status', { cache: 'no-store' }).catch(() => null);
      const body = (await res?.json().catch(() => null)) as { user: Me | null } | null;
      return body?.user ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** "0.1742%" style weekly rate: up to 4 decimals, trailing zeros dropped. */
export const weeklyLabel = (weeklyPercent: string | number) => `${Number(Number(weeklyPercent).toFixed(4))}%`;
