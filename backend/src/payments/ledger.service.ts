import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssetType,
  BlockchainNetwork,
  Prisma,
  ReferralRegistrationStatus,
  TransactionStatus,
  TransactionType,
  WebhookEventStatus,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS, ASSET_NETWORK, InvalidAddressError, normalizeAddress } from '../wallets/chains.js';
import { HdDerivationService } from '../wallets/hd-derivation.service.js';
import type { DepositEventDto } from './dto/webhook-event.dto.js';
import { PriceService, PriceUnavailableError } from './price.service.js';
import { SettingsService } from '../settings/settings.service.js';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/** Thrown for conditions where the provider should retry later (HTTP 503). */
export class RetryableLedgerError extends Error {}

export type DepositOutcome =
  | {
      status: 'credited';
      transactionId: string;
      userId: string;
      asset: AssetType;
      amount: string;
      referralBonus: { transactionId: string; referrerId: string; amountUsdt: string } | null;
    }
  | { status: 'pending'; transactionId: string; confirmations: number; requiredConfirmations: number }
  | { status: 'already_credited'; transactionId: string }
  | { status: 'duplicate_event' }
  | { status: 'ignored'; reason: string };

const NETWORK_FROM_PAYLOAD: Record<'ethereum' | 'bitcoin', BlockchainNetwork> = {
  ethereum: BlockchainNetwork.ETHEREUM,
  bitcoin: BlockchainNetwork.BITCOIN,
};

const USDT_DECIMALS = ASSET_DECIMALS[AssetType.USDT];

interface PreparedDeposit {
  network: BlockchainNetwork;
  asset: AssetType;
  txHash: string;
  outputIndex: number;
  toAddress: string;
  amount: Decimal;
  confirmations: number;
  blockNumber: bigint;
  confirmed: boolean;
  requiredConfirmations: number;
}

@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);
  private readonly minConfirmations: Record<AssetType, number>;
  private readonly usdtContract: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly prices: PriceService,
    private readonly hd: HdDerivationService,
    private readonly settings: SettingsService,
    config: ConfigService,
  ) {
    this.minConfirmations = {
      [AssetType.BTC]: config.get<number>('MIN_CONFIRMATIONS_BTC') ?? 3,
      [AssetType.ETH]: config.get<number>('MIN_CONFIRMATIONS_ETH') ?? 12,
      [AssetType.USDT]: config.get<number>('MIN_CONFIRMATIONS_USDT') ?? 12,
    };
    this.usdtContract = (config.get<string>('USDT_CONTRACT_ADDRESS') ?? '').toLowerCase();
  }

  /** Records a non-deposit event so it's acknowledged once and never reprocessed. */
  async acknowledgeUnhandled(eventId: string, type: string, payloadHash: string): Promise<DepositOutcome> {
    const inserted = await this.insertEvent(this.prisma, eventId, type, payloadHash, 'ignored', 'unhandled_event_type');
    return inserted ? { status: 'ignored', reason: 'unhandled_event_type' } : { status: 'duplicate_event' };
  }

  async processDepositEvent(event: DepositEventDto, payloadHash: string): Promise<DepositOutcome> {
    const prepared = this.prepare(event);
    if ('reason' in prepared) {
      const inserted = await this.insertEvent(this.prisma, event.id, event.type, payloadHash, 'ignored', prepared.reason);
      if (inserted) this.logger.warn(`Ignored webhook ${event.id}: ${prepared.reason}`);
      return inserted ? { status: 'ignored', reason: prepared.reason } : { status: 'duplicate_event' };
    }

    // Network I/O happens before the transaction so no row locks are held during it.
    const usdPrice = prepared.confirmed ? await this.prefetchUsdPrice(prepared) : null;

    // One retry covers the race where two different events create the same
    // on-chain output simultaneously: the loser's unique violation rolls back,
    // and on retry it sees the committed row and reports already_credited.
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.applyInTransaction(event, payloadHash, prepared, usdPrice);
      } catch (err) {
        const retryable =
          err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2002' || err.code === 'P2034');
        if (!retryable || attempt >= 3) throw err;
        this.logger.warn(`Ledger write conflict for ${event.id} (${err.code}); retrying`);
      }
    }
  }

  // ─────────────────────────── internals ───────────────────────────

  private prepare(event: DepositEventDto): PreparedDeposit | { reason: string } {
    const d = event.data;
    const network = NETWORK_FROM_PAYLOAD[d.network];
    const asset = d.asset;

    if (ASSET_NETWORK[asset] !== network) return { reason: 'asset_network_mismatch' };

    const isEvm = network === BlockchainNetwork.ETHEREUM;
    if (isEvm !== d.txHash.startsWith('0x')) return { reason: 'malformed_tx_hash' };
    if (d.blockHash && isEvm !== d.blockHash.startsWith('0x')) return { reason: 'malformed_block_hash' };

    // Token spoofing guard: only the configured USDT contract counts as USDT.
    if (asset === AssetType.USDT) {
      if (!d.contractAddress || d.contractAddress.toLowerCase() !== this.usdtContract) {
        return { reason: 'untrusted_token_contract' };
      }
    } else if (d.contractAddress) {
      return { reason: 'unexpected_token_contract' };
    }

    const amount = new Decimal(d.amount);
    if (amount.lte(0) || amount.decimalPlaces() > ASSET_DECIMALS[asset]) return { reason: 'invalid_amount' };

    let toAddress: string;
    try {
      toAddress = normalizeAddress(network, d.toAddress, this.hd.bitcoinNetwork);
    } catch (err) {
      if (err instanceof InvalidAddressError) return { reason: 'invalid_destination_address' };
      throw err;
    }

    const required = this.minConfirmations[asset];
    return {
      network,
      asset,
      txHash: d.txHash.toLowerCase(),
      outputIndex: d.outputIndex,
      toAddress,
      amount,
      confirmations: d.confirmations,
      blockNumber: BigInt(d.blockNumber),
      confirmed: event.type === 'deposit.confirmed' && d.confirmations >= required,
      requiredConfirmations: required,
    };
  }

  private async prefetchUsdPrice(p: PreparedDeposit): Promise<Decimal | null> {
    if (p.asset === AssetType.USDT) return new Decimal(1);
    const owner = await this.prisma.depositAddress.findUnique({
      where: { address: p.toAddress },
      select: { user: { select: { referredByUserId: true } } },
    });
    if (!owner?.user.referredByUserId) return null;
    try {
      return await this.prices.getUsdPrice(p.asset);
    } catch (err) {
      if (err instanceof PriceUnavailableError) throw new RetryableLedgerError(err.message);
      throw err;
    }
  }

  private async applyInTransaction(
    event: DepositEventDto,
    payloadHash: string,
    p: PreparedDeposit,
    usdPrice: Decimal | null,
  ): Promise<DepositOutcome> {
    return this.prisma.$transaction(
      async (tx) => {
        // 1. Replay guard: the event id is claimed inside the same transaction, so
        //    the claim only persists if the ledger write also commits.
        const claimed = await this.insertEvent(tx, event.id, event.type, payloadHash, 'processed', null);
        if (!claimed) return { status: 'duplicate_event' } as const;

        const finish = async (outcome: DepositOutcome, reason: string | null, ignored = false) => {
          if (reason || ignored) {
            await tx.webhookEvent.update({
              where: { id: event.id },
              data: { status: ignored ? WebhookEventStatus.IGNORED : WebhookEventStatus.PROCESSED, reason },
            });
          }
          return outcome;
        };
        const ignore = (reason: string) => {
          this.logger.warn(`Ignored webhook ${event.id}: ${reason}`);
          return finish({ status: 'ignored', reason }, reason, true);
        };

        // 2. Match the destination address to its owner.
        const target = await tx.depositAddress.findUnique({ where: { address: p.toAddress } });
        if (!target) return ignore('unknown_deposit_address');
        if (target.network !== p.network) return ignore('address_network_mismatch');
        const userId = target.userId;

        // 3. Idempotency on the on-chain output itself.
        const key = { network: p.network, blockchainTxHash: p.txHash, outputIndex: p.outputIndex };
        const existing = await tx.transaction.findUnique({ where: { network_blockchainTxHash_outputIndex: key } });
        if (existing) {
          // A later event may not rewrite what an earlier one recorded.
          if (
            existing.type !== TransactionType.DEPOSIT ||
            existing.userId !== userId ||
            existing.assetType !== p.asset ||
            !existing.amount.equals(p.amount)
          ) {
            return ignore('conflicts_with_recorded_transfer');
          }
          if (existing.status === TransactionStatus.COMPLETED) {
            return finish({ status: 'already_credited', transactionId: existing.id }, 'already_credited');
          }
        }

        const metadata = {
          eventId: event.id,
          fromAddress: event.data.fromAddress ?? null,
          blockHash: event.data.blockHash ?? null,
          ...(p.asset === AssetType.USDT ? { contractAddress: this.usdtContract } : {}),
        };

        // 4a. Not final yet: record/update as pending, no balance change.
        if (!p.confirmed) {
          const row = existing
            ? await tx.transaction.update({
                where: { id: existing.id },
                data: {
                  confirmations: Math.max(existing.confirmations ?? 0, p.confirmations),
                  blockNumber: p.blockNumber,
                },
              })
            : await tx.transaction.create({
                data: {
                  userId,
                  type: TransactionType.DEPOSIT,
                  assetType: p.asset,
                  amount: p.amount,
                  status: TransactionStatus.PENDING,
                  ...key,
                  address: p.toAddress,
                  confirmations: p.confirmations,
                  blockNumber: p.blockNumber,
                  metadata,
                },
              });
          return finish(
            {
              status: 'pending',
              transactionId: row.id,
              confirmations: row.confirmations ?? p.confirmations,
              requiredConfirmations: p.requiredConfirmations,
            },
            'awaiting_confirmations',
          );
        }

        // 4b. Final: move to COMPLETED exactly once.
        const now = new Date();
        let depositId: string;
        if (existing) {
          // Conditional update: a concurrent confirmation that already completed
          // this row makes count 0 here (READ COMMITTED re-checks after the lock).
          const { count } = await tx.transaction.updateMany({
            where: { id: existing.id, status: TransactionStatus.PENDING },
            data: {
              status: TransactionStatus.COMPLETED,
              confirmations: p.confirmations,
              blockNumber: p.blockNumber,
              confirmedAt: now,
            },
          });
          if (count !== 1) {
            return finish({ status: 'already_credited', transactionId: existing.id }, 'already_credited');
          }
          depositId = existing.id;
        } else {
          const created = await tx.transaction.create({
            data: {
              userId,
              type: TransactionType.DEPOSIT,
              assetType: p.asset,
              amount: p.amount,
              status: TransactionStatus.COMPLETED,
              ...key,
              address: p.toAddress,
              confirmations: p.confirmations,
              blockNumber: p.blockNumber,
              confirmedAt: now,
              metadata,
            },
          });
          depositId = created.id;
        }

        // 5. Credit the depositor. UPDATE … SET balance = balance + x takes a row
        //    lock and computes from the committed value, so concurrent credits serialise.
        await tx.balance.upsert({
          where: { userId_assetType: { userId, assetType: p.asset } },
          create: { userId, assetType: p.asset, balance: p.amount },
          update: { balance: { increment: p.amount } },
        });

        // 6. Referral reward: 1% of the deposit's USD value, paid in USDT.
        const referralBonus = await this.applyReferralReward(tx, {
          userId,
          depositId,
          asset: p.asset,
          amount: p.amount,
          usdPrice,
          now,
        });

        this.logger.log(
          `Credited ${p.amount.toString()} ${p.asset} to ${userId} (tx ${depositId})` +
            (referralBonus ? `; referral bonus ${referralBonus.amountUsdt} USDT to ${referralBonus.referrerId}` : ''),
        );
        return finish(
          {
            status: 'credited',
            transactionId: depositId,
            userId,
            asset: p.asset,
            amount: p.amount.toString(),
            referralBonus,
          },
          null,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 15000 },
    );
  }

  /**
   * Credits a deposit that staff verified by hand (shared-address deposits).
   * Runs inside the caller's transaction so the credit commits or rolls back
   * together with the caller's own state change. The USD price is fetched
   * beforehand by the caller (no network calls inside a transaction).
   */
  async creditVerifiedDeposit(
    tx: Prisma.TransactionClient,
    args: {
      userId: string;
      asset: AssetType;
      amount: Decimal;
      network: BlockchainNetwork;
      txHash: string;
      address: string;
      usdPrice: Decimal | null;
      metadata: Record<string, unknown>;
    },
  ) {
    const already = await tx.transaction.findFirst({
      where: { network: args.network, blockchainTxHash: args.txHash, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED },
      select: { id: true },
    });
    if (already) throw new ConflictException('This transaction has already been credited');

    const now = new Date();
    const deposit = await tx.transaction.create({
      data: {
        userId: args.userId,
        type: TransactionType.DEPOSIT,
        assetType: args.asset,
        amount: args.amount,
        status: TransactionStatus.COMPLETED,
        network: args.network,
        blockchainTxHash: args.txHash,
        address: args.address,
        confirmedAt: now,
        metadata: { ...args.metadata, ...(args.asset === AssetType.USDT ? { contractAddress: this.usdtContract } : {}) } as Prisma.InputJsonValue,
      },
    });
    await tx.balance.upsert({
      where: { userId_assetType: { userId: args.userId, assetType: args.asset } },
      create: { userId: args.userId, assetType: args.asset, balance: args.amount },
      update: { balance: { increment: args.amount } },
    });
    const referralBonus = await this.applyReferralReward(tx, {
      userId: args.userId,
      depositId: deposit.id,
      asset: args.asset,
      amount: args.amount,
      usdPrice: args.usdPrice,
      now,
    });
    this.logger.log(`Credited verified deposit ${args.amount.toString()} ${args.asset} to ${args.userId} (tx ${deposit.id})`);
    return { transactionId: deposit.id, referralBonus };
  }

  /** USD price for crediting outside the webhook path; null when unavailable. */
  async usdPriceOrNull(asset: AssetType): Promise<Decimal | null> {
    if (asset === AssetType.USDT) return new Decimal(1);
    try {
      return await this.prices.getUsdPrice(asset);
    } catch {
      return null;
    }
  }

  get usdtContractAddress(): string {
    return this.usdtContract;
  }

  private async applyReferralReward(
    tx: Prisma.TransactionClient,
    args: { userId: string; depositId: string; asset: AssetType; amount: Decimal; usdPrice: Decimal | null; now: Date },
  ) {
    const depositor = await tx.user.findUniqueOrThrow({
      where: { id: args.userId },
      select: { referredByUserId: true },
    });
    const referrerId = depositor.referredByUserId;
    if (!referrerId) return null;

    const referral = await tx.referral.findUnique({ where: { refereeId: args.userId } });
    if (referral?.registrationStatus === ReferralRegistrationStatus.REJECTED) return null;

    if (!args.usdPrice) {
      // Referrer was attached after the price prefetch; let the provider retry.
      throw new RetryableLedgerError('USD price required for referral reward was not prefetched');
    }

    // Read inside the transaction: an admin change applies from the next deposit on.
    const rewardRate = await this.settings.getDecimal('referralDepositRewardRate', tx);
    const reward = args.amount
      .mul(args.usdPrice)
      .mul(rewardRate)
      .toDecimalPlaces(USDT_DECIMALS, Decimal.ROUND_DOWN);
    if (reward.lte(0)) return null;

    const bonus = await tx.transaction.create({
      data: {
        userId: referrerId,
        type: TransactionType.REFERRAL_BONUS,
        assetType: AssetType.USDT,
        amount: reward,
        status: TransactionStatus.COMPLETED,
        // Unique: at most one bonus per deposit, even under retries.
        sourceTransactionId: args.depositId,
        confirmedAt: args.now,
        metadata: {
          refereeId: args.userId,
          sourceAsset: args.asset,
          sourceAmount: args.amount.toString(),
          usdPrice: args.usdPrice.toString(),
          rewardRate: rewardRate.toString(),
        },
      },
    });

    await tx.balance.upsert({
      where: { userId_assetType: { userId: referrerId, assetType: AssetType.USDT } },
      create: { userId: referrerId, assetType: AssetType.USDT, balance: reward },
      update: { balance: { increment: reward } },
    });

    if (referral) {
      await tx.referral.update({
        where: { id: referral.id },
        data: {
          totalCommissionEarned: { increment: reward },
          registrationStatus: ReferralRegistrationStatus.QUALIFIED,
        },
      });
    }

    return { transactionId: bonus.id, referrerId, amountUsdt: reward.toString() };
  }

  private async insertEvent(
    client: Prisma.TransactionClient | PrismaService,
    id: string,
    type: string,
    payloadHash: string,
    status: 'processed' | 'ignored',
    reason: string | null,
  ): Promise<boolean> {
    const rows = await client.$queryRaw<{ id: string }[]>`
      INSERT INTO "webhook_events" ("id", "type", "status", "reason", "payload_hash")
      VALUES (${id}, ${type}, ${status}::text::"webhook_event_status", ${reason}, ${payloadHash})
      ON CONFLICT ("id") DO NOTHING
      RETURNING "id"`;
    return rows.length === 1;
  }
}
