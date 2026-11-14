'use client';

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Adjustment,
  AdjustmentStatus,
  AdminMetrics,
  AdminUserDetail,
  AdminUserPage,
  AuditEntry,
  SettingsResponse,
  YieldOverview,
  YieldRateHistory,
  YieldRun,
} from '@/lib/admin-types';
import type { Asset } from '@/lib/types';

export const adminKeys = {
  metrics: ['admin', 'metrics'] as const,
  users: (p: UserQuery) => ['admin', 'users', p] as const,
  user: (id: string) => ['admin', 'user', id] as const,
  adjustments: (s?: AdjustmentStatus) => ['admin', 'adjustments', s ?? 'all'] as const,
  settings: ['admin', 'settings'] as const,
  yields: ['admin', 'yields'] as const,
  yieldHistory: ['admin', 'yield-history'] as const,
  runs: ['admin', 'runs'] as const,
  audit: ['admin', 'audit'] as const,
};

export interface UserQuery {
  q?: string;
  role?: 'CLIENT' | 'ADMIN';
  verified?: 'true' | 'false';
  sort: 'created_desc' | 'created_asc' | 'last_login_desc';
  cursor?: string;
  limit: number;
}

export function useAdminMetrics() {
  return useQuery({ queryKey: adminKeys.metrics, queryFn: () => api<AdminMetrics>('admin/metrics'), refetchInterval: 30_000 });
}

export function useAdminUsers(p: UserQuery) {
  return useQuery({
    queryKey: adminKeys.users(p),
    queryFn: () => {
      const q = new URLSearchParams({ limit: String(p.limit), sort: p.sort });
      if (p.q) q.set('q', p.q);
      if (p.role) q.set('role', p.role);
      if (p.verified) q.set('verified', p.verified);
      if (p.cursor) q.set('cursor', p.cursor);
      return api<AdminUserPage>(`admin/users?${q}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function useAdminUser(id: string | null) {
  return useQuery({
    queryKey: adminKeys.user(id ?? ''),
    queryFn: () => api<AdminUserDetail>(`admin/users/${id}`),
    enabled: !!id,
  });
}

export function useAdjustments(status?: AdjustmentStatus) {
  return useQuery({
    queryKey: adminKeys.adjustments(status),
    queryFn: () => api<Adjustment[]>(`admin/adjustments${status ? `?status=${status}` : ''}`),
    refetchInterval: 20_000,
  });
}

function useInvalidateAdmin() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['admin'] });
}

export function useRequestAdjustment() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ userId, ...body }: { userId: string; asset: Asset; direction: 'CREDIT' | 'DEBIT'; amount: string; reason: string; reference?: string }) =>
      api<Adjustment>(`admin/users/${userId}/adjustments`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useDecideAdjustment() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: 'approve' | 'reject'; note?: string }) =>
      api<Adjustment>(`admin/adjustments/${id}/${decision}`, { method: 'POST', body: JSON.stringify({ note: note || undefined }) }),
    onSuccess: invalidate,
  });
}

export function useSettings() {
  return useQuery({ queryKey: adminKeys.settings, queryFn: () => api<SettingsResponse>('admin/settings') });
}

export function useUpdateSettings() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (body: { referralDepositRewardRate?: string; affiliateYieldRewardRate?: string; note: string }) =>
      api<SettingsResponse & { applied: { name: string; from: string; to: string }[] }>('admin/settings', { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: invalidate,
  });
}

export function useYieldOverview() {
  return useQuery({ queryKey: adminKeys.yields, queryFn: () => api<YieldOverview>('admin/yields') });
}

export function useYieldRateHistory() {
  return useQuery({ queryKey: adminKeys.yieldHistory, queryFn: () => api<YieldRateHistory[]>('admin/yields/history?limit=20') });
}

export function useSetYieldRate() {
  const invalidate = useInvalidateAdmin();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ asset, ...body }: { asset: Asset; weeklyPercent: number; interval: 'HOURLY' | 'DAILY'; isActive: boolean; note?: string }) =>
      api<YieldOverview['rates']>(`admin/yields/${asset}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      // The public site and client portal pick up the new rate straight away in this browser.
      void qc.invalidateQueries({ queryKey: ['public-rates'] });
    },
  });
}

export function useYieldRuns() {
  return useQuery({ queryKey: adminKeys.runs, queryFn: () => api<YieldRun[]>('admin/yields/runs?limit=8'), refetchInterval: 30_000 });
}

export function useTriggerRun() {
  const invalidate = useInvalidateAdmin();
  return useMutation({
    mutationFn: (interval: 'HOURLY' | 'DAILY') =>
      api<{ status: string; reason?: string; run?: YieldRun }>('admin/yields/runs', { method: 'POST', body: JSON.stringify({ interval }) }),
    onSuccess: invalidate,
  });
}

export function useAudit(limit = 30) {
  return useInfiniteQuery({
    queryKey: [...adminKeys.audit, limit],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<{ items: AuditEntry[]; nextCursor: string | null }>(`admin/audit?limit=${limit}${pageParam ? `&cursor=${pageParam}` : ''}`),
    getNextPageParam: (last) => last.nextCursor,
    refetchInterval: 30_000,
  });
}
