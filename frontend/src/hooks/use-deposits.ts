'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Asset } from '@/lib/types';

export type DepositClaimStatus = 'PENDING_REVIEW' | 'CREDITED' | 'REJECTED' | 'CANCELLED';
type Network = 'ETHEREUM' | 'BITCOIN';
interface Brief { id: string; email: string }

export interface DepositClaim {
  id: string;
  assetType: Asset;
  network: Network;
  address: string;
  txHash: string;
  reportedAmount: string;
  creditedAmount: string | null;
  status: DepositClaimStatus;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export interface AdminDepositClaim extends DepositClaim {
  userId: string;
  fromAddress: string | null;
  clientNote: string | null;
  user: Brief;
  reviewedBy: Brief | null;
}

export interface AdminDepositDetail {
  claim: AdminDepositClaim;
  explorerUrl: string;
  client: { id: string; email: string; createdAt: string; lastLoginAt: string | null; suspendedAt: string | null; balances: { assetType: Asset; balance: string; lockedBalance: string }[] };
  sameHashOthers: { id: string; status: DepositClaimStatus; createdAt: string; user: Brief }[];
  signals: { level: 'warn' | 'info' | 'ok'; text: string }[];
}

export interface ChainCheck {
  status: 'found' | 'not_found' | 'unavailable';
  paysAddress: boolean;
  amountToAddress: string | null;
  confirmations: number;
  confirmed: boolean;
  from: string[];
  failed: boolean;
  message: string | null;
  fromMatches: boolean | null;
  checkedAt: string;
}

// ── client ─────────────────────────────────────────────────────────

export function useDepositClaims() {
  return useQuery({ queryKey: ['deposit-claims'], queryFn: () => api<DepositClaim[]>('deposits/claims'), refetchInterval: 30_000 });
}

function useClientInvalidate() {
  const qc = useQueryClient();
  return () => {
    for (const k of [['deposit-claims'], ['wallets'], ['transactions']]) void qc.invalidateQueries({ queryKey: k });
  };
}

export function useReportDeposit() {
  const done = useClientInvalidate();
  return useMutation({
    mutationFn: (body: { asset: Asset; amount: string; txHash: string; fromAddress?: string; note?: string }) =>
      api<DepositClaim>('deposits/claims', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: done,
  });
}

export function useCancelDepositClaim() {
  const done = useClientInvalidate();
  return useMutation({ mutationFn: (id: string) => api(`deposits/claims/${id}/cancel`, { method: 'POST' }), onSuccess: done });
}

// ── admin ──────────────────────────────────────────────────────────

export function useAdminDeposits(status: string) {
  return useQuery({ queryKey: ['admin', 'deposits', status], queryFn: () => api<AdminDepositClaim[]>(`admin/deposits?status=${status}`), refetchInterval: 15_000 });
}

export function useDepositCounts() {
  return useQuery({ queryKey: ['admin', 'deposits', 'counts'], queryFn: () => api<{ pendingReview: number }>('admin/deposits/counts'), refetchInterval: 20_000 });
}

export function useSharedAddresses() {
  return useQuery({ queryKey: ['admin', 'deposits', 'addresses'], queryFn: () => api<Partial<Record<Asset, string>>>('admin/deposits/addresses'), staleTime: 300_000 });
}

export function useAdminDeposit(id: string | null) {
  return useQuery({ queryKey: ['admin', 'deposit', id], queryFn: () => api<AdminDepositDetail>(`admin/deposits/${id}`), enabled: !!id });
}

/** Looks the transaction up on a public explorer (on demand: it calls an outside service). */
export function useChainCheck(id: string) {
  return useQuery({ queryKey: ['admin', 'deposit', id, 'chain'], queryFn: () => api<ChainCheck>(`admin/deposits/${id}/chain`), enabled: false, retry: false });
}

export function useDepositAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'approve' | 'reject'; body: object }) =>
      api(`admin/deposits/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
