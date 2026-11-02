'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Asset } from '@/lib/types';
import type { WithdrawalStatus } from '@/hooks/use-withdrawals';

interface Brief { id: string; email: string }

export interface AdminWithdrawal {
  id: string;
  userId: string;
  assetType: Asset;
  network: 'ETHEREUM' | 'BITCOIN';
  address: string;
  amount: string;
  fee: string;
  netAmount: string;
  status: WithdrawalStatus;
  reviewNote: string | null;
  txHash: string | null;
  createdAt: string;
  reviewedAt: string | null;
  completedAt: string | null;
  user: Brief;
  reviewedBy: Brief | null;
  completedBy: Brief | null;
}

export interface AdminWithdrawalDetail {
  withdrawal: AdminWithdrawal;
  explorerUrl: string | null;
  addressExplorerUrl: string;
  client: {
    id: string;
    email: string;
    createdAt: string;
    lastLoginAt: string | null;
    suspendedAt: string | null;
    balances: { assetType: Asset; balance: string; lockedBalance: string }[];
    totalDeposits: string;
    depositCount: number;
  };
  recentWithdrawals: { id: string; assetType: Asset; amount: string; status: WithdrawalStatus; createdAt: string }[];
  signals: { level: 'warn' | 'info' | 'ok'; text: string }[];
}

export interface WithdrawalSettingRow {
  asset: Asset;
  network: string;
  fee: string;
  minAmount: string;
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: Brief | null;
}

export function useAdminWithdrawals(status: string) {
  return useQuery({ queryKey: ['admin', 'withdrawals', status], queryFn: () => api<AdminWithdrawal[]>(`admin/withdrawals?status=${status}`), refetchInterval: 15_000 });
}

export function useWithdrawalCounts() {
  return useQuery({ queryKey: ['admin', 'withdrawals', 'counts'], queryFn: () => api<{ pendingReview: number; approved: number }>('admin/withdrawals/counts'), refetchInterval: 20_000 });
}

export function useAdminWithdrawal(id: string | null) {
  return useQuery({ queryKey: ['admin', 'withdrawal', id], queryFn: () => api<AdminWithdrawalDetail>(`admin/withdrawals/${id}`), enabled: !!id });
}

export function useWithdrawalSettings() {
  return useQuery({ queryKey: ['admin', 'withdrawal-settings'], queryFn: () => api<WithdrawalSettingRow[]>('admin/withdrawals/settings') });
}

function useDone() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['admin'] });
}

export function useWithdrawalAction() {
  const done = useDone();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'approve' | 'complete' | 'reject'; body: object }) =>
      api(`admin/withdrawals/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}

export function useSaveWithdrawalSetting() {
  const done = useDone();
  return useMutation({
    mutationFn: ({ asset, ...body }: { asset: Asset; fee: string; minAmount: string; enabled: boolean }) =>
      api(`admin/withdrawals/settings/${asset}`, { method: 'PUT', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}
