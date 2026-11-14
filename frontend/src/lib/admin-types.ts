import type { Asset, LedgerTransaction } from './types';

export type ByAsset = Record<Asset, string>;

export interface DayPoint {
  day: string;
  usd: number | null;
  count?: number;
}

export interface AdminMetrics {
  generatedAt: string;
  priceSource: 'coingecko' | 'simulated' | null;
  tvl: { byAsset: ByAsset; usd: number | null; netFlow30dUsd: number | null };
  netDeposits: {
    allTime: { deposits: ByAsset; withdrawals: ByAsset; net: ByAsset; netUsd: number | null };
    last30dUsd: number | null;
    previous30dUsd: number | null;
    pending: number;
    series: DayPoint[];
  };
  affiliatePayouts: {
    allTime: { byAsset: ByAsset; usd: number | null; count: number };
    last30dUsd: number | null;
    previous30dUsd: number | null;
    breakdown: { depositBonusCount: number; yieldShareCount: number };
    series: DayPoint[];
  };
  accounts: {
    total: number;
    verified: number;
    unverified: number;
    verifiedLast30d: number;
    verifiedPrevious30d: number;
    admins: number;
    series: DayPoint[];
  };
}

export interface BalanceRow {
  assetType: Asset;
  balance: string;
  lockedBalance: string;
  flexibleYieldEarned: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: 'CLIENT' | 'ADMIN';
  isVerified: boolean;
  referralCode: string;
  createdAt: string;
  lastLoginAt: string | null;
  referredBy: { id: string; email: string } | null;
  balances: BalanceRow[];
  referralCount: number;
}

export interface AdminUserPage {
  items: AdminUserRow[];
  total: number;
  nextCursor: string | null;
}

export type AdjustmentStatus = 'PENDING_APPROVAL' | 'APPLIED' | 'REJECTED';

export interface Adjustment {
  id: string;
  userId: string;
  assetType: Asset;
  direction: 'CREDIT' | 'DEBIT';
  amount: string;
  reason: string;
  reference: string | null;
  status: AdjustmentStatus;
  decisionNote: string | null;
  createdAt: string;
  decidedAt: string | null;
  transactionId: string | null;
  user: { id: string; email: string };
  requestedBy: { id: string; email: string };
  decidedBy: { id: string; email: string } | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  role: 'CLIENT' | 'ADMIN';
  isVerified: boolean;
  verifiedAt: string | null;
  verificationTokenExpiresAt: string | null;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  referredBy: { id: string; email: string; referralCode: string } | null;
  referralReceived: { registrationStatus: string; totalCommissionEarned: string; createdAt: string } | null;
  balances: BalanceRow[];
  depositAddresses: { assetType: Asset; network: string; address: string; derivationPath: string; createdAt: string }[];
  dynamicAllocations: { assetType: Asset; allocationPercentage: string; updatedAt: string }[];
  referralCount: number;
  transactionCount: number;
  referralEarnings: { asset: Asset; amount: string }[];
  recentTransactions: Omit<LedgerTransaction, 'outputIndex' | 'address' | 'blockNumber' | 'sourceTransactionId' | 'note'>[];
  adjustments: (Omit<Adjustment, 'user' | 'requestedBy' | 'decidedBy'> & { requestedBy: { email: string }; decidedBy: { email: string } | null })[];
}

export interface SettingView {
  name: 'referralDepositRewardRate' | 'affiliateYieldRewardRate';
  key: string;
  value: string;
  source: 'admin' | 'default';
  max: string;
  description: string;
  updatedAt: string | null;
}

export interface SettingsResponse {
  settings: SettingView[];
  history: { id: string; key: string; oldValue: string | null; newValue: string; note: string | null; createdAt: string; changedBy: { email: string } }[];
}

export interface YieldRateRow {
  asset: Asset;
  configured: boolean;
  apyPercent?: string;
  weeklyPercent?: string;
  interval?: 'HOURLY' | 'DAILY';
  isActive?: boolean;
  periodRate?: string;
  note?: string | null;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface YieldOverview {
  rates: YieldRateRow[];
  affiliateYieldRewardRate: string;
  maxApyPercent: string;
  maxWeeklyPercent: string;
  schedule: { daily: string; hourly: string };
}

export interface YieldRateHistory {
  id: string;
  assetType: Asset;
  apyPercent: string;
  interval: 'HOURLY' | 'DAILY';
  isActive: boolean;
  note: string | null;
  createdAt: string;
  createdBy: { id: string; email: string } | null;
}

export interface YieldRun {
  id: string;
  interval: 'HOURLY' | 'DAILY';
  periodKey: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  trigger: string;
  holdingsScanned: number;
  payoutsCreated: number;
  affiliateRewards: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface AuditEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; email: string };
}
