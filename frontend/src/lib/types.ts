export const ASSETS = ['BTC', 'ETH', 'USDT'] as const;
export type Asset = (typeof ASSETS)[number];

export interface Wallet {
  asset: Asset;
  network: 'ETHEREUM' | 'BITCOIN';
  balance: string;
  lockedBalance: string;
  flexibleYieldEarned: string;
  depositAddress: string;
  requiredConfirmations: number;
}

export interface Quote {
  asset: Asset;
  usd: string;
  change24hPercent: number | null;
}

export interface PriceSnapshot {
  source: 'coingecko' | 'simulated';
  updatedAt: string;
  quotes: Quote[];
}

export interface AllocationsResponse {
  allocations: { asset: Asset; percentage: string; updatedAt: string }[];
  earningAssets: Asset[];
}

export type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'YIELD_PAYOUT'
  | 'REFERRAL_BONUS'
  | 'AFFILIATE_YIELD_REWARD'
  | 'ADJUSTMENT_CREDIT'
  | 'ADJUSTMENT_DEBIT';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  assetType: Asset;
  amount: string;
  status: TransactionStatus;
  network: 'ETHEREUM' | 'BITCOIN' | null;
  blockchainTxHash: string | null;
  outputIndex: number | null;
  address: string | null;
  confirmations: number | null;
  blockNumber: string | null;
  sourceTransactionId: string | null;
  confirmedAt: string | null;
  createdAt: string;
  /** Reason given for an admin adjustment, shown to the customer. */
  note?: string | null;
}

export interface TransactionPage {
  items: LedgerTransaction[];
  nextCursor: string | null;
}

export interface Me {
  id: string;
  email: string;
  role: 'CLIENT' | 'ADMIN';
  isVerified: boolean;
  referralCode: string;
}

export const ASSET_META: Record<Asset, { name: string; color: string; decimals: number; network: string }> = {
  BTC: { name: 'Bitcoin', color: 'var(--asset-btc)', decimals: 8, network: 'Bitcoin network' },
  ETH: { name: 'Ether', color: 'var(--asset-eth)', decimals: 6, network: 'Ethereum network' },
  USDT: { name: 'Tether USD', color: 'var(--asset-usdt)', decimals: 2, network: 'Ethereum (ERC-20)' },
};
