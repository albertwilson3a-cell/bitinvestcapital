'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Asset } from '@/lib/types';

export type WithdrawalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface WithdrawalOption {
  asset: Asset;
  network: 'ETHEREUM' | 'BITCOIN';
  fee: string;
  minAmount: string;
  enabled: boolean;
  available: string;
  decimals: number;
}

export interface Withdrawal {
  id: string;
  assetType: Asset;
  network: 'ETHEREUM' | 'BITCOIN';
  address: string;
  amount: string;
  fee: string;
  netAmount: string;
  status: WithdrawalStatus;
  txHash: string | null;
  reviewNote: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WithdrawalChallenge {
  status: 'code_required';
  challengeId: string;
  expiresInSeconds: number;
  asset: Asset;
  amount: string;
  fee: string;
  netAmount: string;
  address: string;
}

const keys = { options: ['withdrawals', 'options'] as const, list: ['withdrawals', 'list'] as const };

export function useWithdrawalOptions(enabled = true) {
  return useQuery({ queryKey: keys.options, queryFn: () => api<WithdrawalOption[]>('withdrawals/options'), enabled });
}

export function useWithdrawals() {
  return useQuery({ queryKey: keys.list, queryFn: () => api<Withdrawal[]>('withdrawals'), refetchInterval: 20_000 });
}

export function useRequestWithdrawal() {
  return useMutation({
    mutationFn: (body: { asset: Asset; amount: string; address: string }) => api<WithdrawalChallenge>('withdrawals', { method: 'POST', body: JSON.stringify(body) }),
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    for (const k of [['withdrawals'], ['wallets'], ['transactions']]) void qc.invalidateQueries({ queryKey: k });
  };
}

export function useConfirmWithdrawal() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: (body: { challengeId: string; code: string }) => api<Withdrawal>('withdrawals/confirm', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}

export function useResendWithdrawalCode() {
  return useMutation({ mutationFn: (challengeId: string) => api('withdrawals/resend', { method: 'POST', body: JSON.stringify({ challengeId }) }) });
}

export function useCancelWithdrawal() {
  const done = useInvalidate();
  return useMutation({ mutationFn: (id: string) => api(`withdrawals/${id}/cancel`, { method: 'POST' }), onSuccess: done });
}
