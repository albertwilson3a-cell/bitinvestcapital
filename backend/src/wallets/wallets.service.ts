import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssetType, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_NETWORK } from './chains.js';
import { DepositAddressService } from './deposit-address.service.js';
import type { ListTransactionsQueryDto } from './dto/wallets.dto.js';

const transactionSelect = {
  id: true,
  type: true,
  assetType: true,
  amount: true,
  status: true,
  network: true,
  blockchainTxHash: true,
  outputIndex: true,
  address: true,
  confirmations: true,
  blockNumber: true,
  sourceTransactionId: true,
  confirmedAt: true,
  createdAt: true,
  metadata: true,
} satisfies Prisma.TransactionSelect;

@Injectable()
export class WalletsService {
  private readonly minConfirmations: Record<AssetType, number>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly addresses: DepositAddressService,
    config: ConfigService,
  ) {
    this.minConfirmations = {
      [AssetType.BTC]: config.get<number>('MIN_CONFIRMATIONS_BTC') ?? 3,
      [AssetType.ETH]: config.get<number>('MIN_CONFIRMATIONS_ETH') ?? 12,
      [AssetType.USDT]: config.get<number>('MIN_CONFIRMATIONS_USDT') ?? 12,
    };
  }

  async getWallets(userId: string) {
    const [balances, addresses] = await Promise.all([
      this.prisma.balance.findMany({ where: { userId } }),
      this.addresses.allForClient(userId),
    ]);
    return Object.values(AssetType).map((asset) => {
      const b = balances.find((x) => x.assetType === asset);
      const a = addresses.find((x) => x.assetType === asset)!;
      return {
        asset,
        network: ASSET_NETWORK[asset],
        balance: b?.balance ?? new Prisma.Decimal(0),
        lockedBalance: b?.lockedBalance ?? new Prisma.Decimal(0),
        investedBalance: b?.investedBalance ?? new Prisma.Decimal(0),
        flexibleYieldEarned: b?.flexibleYieldEarned ?? new Prisma.Decimal(0),
        depositAddress: a.address,
        depositMode: a.shared ? ('shared' as const) : ('dedicated' as const),
        requiredConfirmations: this.minConfirmations[asset],
      };
    });
  }

  async getDepositAddress(userId: string, asset: AssetType) {
    const a = await this.addresses.forClient(userId, asset);
    return {
      asset,
      network: a.network,
      address: a.address,
      depositMode: a.shared ? ('shared' as const) : ('dedicated' as const),
      requiredConfirmations: this.minConfirmations[asset],
      ...(asset === AssetType.USDT ? { tokenStandard: 'ERC-20' } : {}),
    };
  }

  async listTransactions(userId: string, q: ListTransactionsQueryDto) {
    const rows = await this.prisma.transaction.findMany({
      where: { userId, assetType: q.asset, type: q.type },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: q.limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
      select: transactionSelect,
    });
    const hasMore = rows.length > q.limit;
    const page = hasMore ? rows.slice(0, q.limit) : rows;
    return {
      items: page.map(({ metadata, ...t }) => ({
        ...t,
        blockNumber: t.blockNumber?.toString() ?? null,
        // Customers see why an admin adjustment was made.
        note: t.type === 'ADJUSTMENT_CREDIT' || t.type === 'ADJUSTMENT_DEBIT' ? ((metadata as { reason?: string } | null)?.reason ?? null) : null,
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
