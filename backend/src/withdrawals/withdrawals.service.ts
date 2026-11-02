import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAddress, ZeroAddress } from 'ethers';
import { AuditService } from '../audit/audit.service.js';
import { ChallengeService } from '../auth/challenge.service.js';
import {
  AssetType,
  AuthChallengePurpose,
  BlockchainNetwork,
  Prisma,
  TransactionStatus,
  TransactionType,
  WithdrawalStatus,
} from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS, ASSET_NETWORK, btcNetworkFor, InvalidAddressError, normalizeAddress } from '../wallets/chains.js';

const D = Prisma.Decimal;

const EXPLORER: Record<BlockchainNetwork, string> = {
  [BlockchainNetwork.ETHEREUM]: 'https://etherscan.io/tx/',
  [BlockchainNetwork.BITCOIN]: 'https://mempool.space/tx/',
};

const TX_HASH: Record<BlockchainNetwork, RegExp> = {
  [BlockchainNetwork.ETHEREUM]: /^0x[0-9a-fA-F]{64}$/,
  [BlockchainNetwork.BITCOIN]: /^[0-9a-fA-F]{64}$/,
};

interface WithdrawalDraft {
  asset: AssetType;
  amount: string;
  fee: string;
  netAmount: string;
  address: string;
  network: BlockchainNetwork;
}

const userBrief = { select: { id: true, email: true } } as const;

/**
 * Client withdrawals with manual review:
 *  request → email code confirms → funds move to locked_balance (PENDING_REVIEW)
 *  → staff approve (APPROVED) → staff send from custody and record the hash (COMPLETED)
 *  or staff reject / client cancels → funds return to the balance.
 * Every balance change happens in one database transaction with conditional updates.
 */
@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);
  private readonly btcNetwork;

  constructor(
    private readonly prisma: PrismaService,
    private readonly challenges: ChallengeService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.btcNetwork = btcNetworkFor(config.get<string>('BTC_NETWORK') ?? 'mainnet');
  }

  // ── settings ─────────────────────────────────────────────────────

  async settings() {
    const rows = await this.prisma.withdrawalSetting.findMany({ include: { updatedBy: userBrief } });
    return Object.values(AssetType).map((asset) => {
      const r = rows.find((x) => x.assetType === asset);
      return {
        asset,
        network: ASSET_NETWORK[asset],
        fee: (r?.fee ?? new D(0)).toFixed(),
        minAmount: (r?.minAmount ?? new D(0)).toFixed(),
        enabled: r?.enabled ?? true,
        updatedAt: r?.updatedAt ?? null,
        updatedBy: r?.updatedBy ?? null,
      };
    });
  }

  async updateSetting(asset: AssetType, dto: { fee: string; minAmount: string; enabled: boolean }, adminId: string, ip?: string) {
    const fee = this.decimal(dto.fee, asset, 'fee', true);
    const minAmount = this.decimal(dto.minAmount, asset, 'minAmount', true);
    const before = await this.prisma.withdrawalSetting.findUnique({ where: { assetType: asset } });
    const row = await this.prisma.withdrawalSetting.upsert({
      where: { assetType: asset },
      create: { assetType: asset, fee, minAmount, enabled: dto.enabled, updatedById: adminId },
      update: { fee, minAmount, enabled: dto.enabled, updatedById: adminId },
    });
    await this.audit.record({
      actorId: adminId,
      action: 'withdrawal_setting.update',
      targetType: 'withdrawal_setting',
      targetId: asset,
      details: {
        from: before ? { fee: before.fee.toFixed(), minAmount: before.minAmount.toFixed(), enabled: before.enabled } : null,
        to: { fee: row.fee.toFixed(), minAmount: row.minAmount.toFixed(), enabled: row.enabled },
      },
      ip,
    });
    return (await this.settings()).find((s) => s.asset === asset);
  }

  // ── client ───────────────────────────────────────────────────────

  async options(userId: string) {
    const [settings, balances] = await Promise.all([this.settings(), this.prisma.balance.findMany({ where: { userId } })]);
    return settings.map((s) => ({
      ...s,
      available: (balances.find((b) => b.assetType === s.asset)?.balance ?? new D(0)).toFixed(),
      decimals: ASSET_DECIMALS[s.asset],
    }));
  }

  list(userId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, assetType: true, network: true, address: true, amount: true, fee: true, netAmount: true, status: true, txHash: true, reviewNote: true, createdAt: true, completedAt: true },
    });
  }

  /** Validates everything and emails a confirmation code. No funds move yet. */
  async request(userId: string, asset: AssetType, rawAmount: string, rawAddress: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.suspendedAt) throw new ForbiddenException('This account is suspended. Please contact support.');
    const draft = await this.draft(userId, asset, rawAmount, rawAddress);
    const { id, code } = await this.challenges.create(userId, AuthChallengePurpose.WITHDRAWAL, draft as unknown as Prisma.InputJsonValue);
    await this.mail.sendWithdrawalCode(user.email, code, this.challenges.ttlMinutes, this.summary(draft)).catch((err: unknown) => {
      this.logger.error(`Failed to send withdrawal code: ${err instanceof Error ? err.message : String(err)}`);
    });
    return { status: 'code_required' as const, challengeId: id, expiresInSeconds: this.challenges.ttlMinutes * 60, ...draft };
  }

  async resendCode(userId: string, challengeId: string) {
    const r = await this.challenges.resend(challengeId, AuthChallengePurpose.WITHDRAWAL);
    if (r.challenge.userId !== userId) throw new BadRequestException('This request has expired. Start again.');
    const draft = r.challenge.payload as unknown as WithdrawalDraft;
    await this.mail.sendWithdrawalCode(r.email, r.code, this.challenges.ttlMinutes, this.summary(draft)).catch(() => undefined);
    return { message: 'A new code has been sent.' };
  }

  /** The emailed code confirms the request: funds are locked and it joins the review queue. */
  async confirm(userId: string, challengeId: string, code: string) {
    const challenge = await this.challenges.verify(challengeId, AuthChallengePurpose.WITHDRAWAL, code, userId);
    const d = challenge.payload as unknown as WithdrawalDraft;
    // Re-check rules at confirmation time (settings or balance may have changed).
    await this.draft(userId, d.asset, d.amount, d.address);

    const created = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.balance.updateMany({
        where: { userId, assetType: d.asset, balance: { gte: d.amount } },
        data: { balance: { decrement: d.amount }, lockedBalance: { increment: d.amount } },
      });
      if (!locked.count) throw new BadRequestException('Insufficient available balance');
      const txRow = await tx.transaction.create({
        data: { userId, type: TransactionType.WITHDRAWAL, assetType: d.asset, amount: d.amount, status: TransactionStatus.PENDING, network: d.network, address: d.address, metadata: { fee: d.fee, netAmount: d.netAmount } },
      });
      return tx.withdrawalRequest.create({
        data: { userId, assetType: d.asset, network: d.network, address: d.address, amount: d.amount, fee: d.fee, netAmount: d.netAmount, transactionId: txRow.id },
      });
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    void this.notify(user.email, 'Withdrawal request received', [
      'We’ve received your withdrawal request. Our team reviews every withdrawal before releasing funds; you’ll get another email when it is sent.',
      'The amount is reserved from your available balance while it is reviewed.',
    ], d, 'withdrawal-received');
    return created;
  }

  async cancel(userId: string, id: string) {
    const w = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!w || w.userId !== userId) throw new NotFoundException('Withdrawal not found');
    return this.release(id, WithdrawalStatus.CANCELLED, [WithdrawalStatus.PENDING_REVIEW], { reviewNote: 'Cancelled by client' });
  }

  // ── staff ────────────────────────────────────────────────────────

  async adminList(status?: WithdrawalStatus | 'ALL') {
    return this.prisma.withdrawalRequest.findMany({
      where: status && status !== 'ALL' ? { status } : {},
      orderBy: { createdAt: status === WithdrawalStatus.PENDING_REVIEW || status === WithdrawalStatus.APPROVED ? 'asc' : 'desc' },
      take: 200,
      include: { user: userBrief, reviewedBy: userBrief, completedBy: userBrief },
    });
  }

  async adminCounts() {
    const rows = await this.prisma.withdrawalRequest.groupBy({ by: ['status'], _count: true });
    const get = (s: WithdrawalStatus) => rows.find((r) => r.status === s)?._count ?? 0;
    return { pendingReview: get(WithdrawalStatus.PENDING_REVIEW), approved: get(WithdrawalStatus.APPROVED) };
  }

  /** Everything a reviewer needs to decide: the request, the client and risk signals. */
  async adminDetail(id: string) {
    const w = await this.prisma.withdrawalRequest.findUnique({
      where: { id },
      include: { reviewedBy: userBrief, completedBy: userBrief, transaction: { select: { id: true, status: true } } },
    });
    if (!w) throw new NotFoundException('Withdrawal not found');
    const [user, deposits, previousToAddress, recent] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: w.userId },
        select: { id: true, email: true, createdAt: true, lastLoginAt: true, suspendedAt: true, passwordChangedAt: true, balances: { select: { assetType: true, balance: true, lockedBalance: true } } },
      }),
      this.prisma.transaction.aggregate({ where: { userId: w.userId, assetType: w.assetType, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED }, _sum: { amount: true }, _count: true }),
      this.prisma.withdrawalRequest.count({ where: { address: w.address, status: WithdrawalStatus.COMPLETED, id: { not: w.id } } }),
      this.prisma.withdrawalRequest.findMany({ where: { userId: w.userId, id: { not: w.id } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, assetType: true, amount: true, status: true, createdAt: true } }),
    ]);
    const ageDays = (Date.now() - user.createdAt.getTime()) / 86_400_000;
    const signals = [
      ageDays < 7 && { level: 'warn', text: `Account opened ${ageDays < 1 ? 'less than a day' : `${Math.floor(ageDays)} days`} ago` },
      user.passwordChangedAt && Date.now() - user.passwordChangedAt.getTime() < 2 * 86_400_000 && { level: 'warn', text: 'Password was changed in the last 48 hours' },
      !previousToAddress && { level: 'info', text: 'First withdrawal to this address' },
      previousToAddress > 0 && { level: 'ok', text: `${previousToAddress} previous completed withdrawal(s) to this address` },
      deposits._sum.amount && w.amount.gt(deposits._sum.amount) && { level: 'warn', text: `Amount exceeds total ${w.assetType} deposits (${deposits._sum.amount.toFixed()})` },
      user.suspendedAt && { level: 'warn', text: 'Account is currently suspended' },
    ].filter(Boolean);
    return {
      withdrawal: w,
      explorerUrl: w.txHash ? EXPLORER[w.network] + w.txHash : null,
      addressExplorerUrl: w.network === BlockchainNetwork.ETHEREUM ? `https://etherscan.io/address/${w.address}` : `https://mempool.space/address/${w.address}`,
      client: { ...user, totalDeposits: (deposits._sum.amount ?? new D(0)).toFixed(), depositCount: deposits._count },
      recentWithdrawals: recent,
      signals,
    };
  }

  async approve(id: string, adminId: string, note: string | undefined, ip?: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const r = await tx.withdrawalRequest.updateMany({
        where: { id, status: WithdrawalStatus.PENDING_REVIEW },
        data: { status: WithdrawalStatus.APPROVED, reviewedById: adminId, reviewedAt: new Date(), reviewNote: note ?? null },
      });
      if (!r.count) throw new ConflictException('Only withdrawals awaiting review can be approved');
      const w = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id } });
      await tx.transaction.update({ where: { id: w.transactionId }, data: { status: TransactionStatus.PROCESSING } });
      await this.audit.record({ actorId: adminId, action: 'withdrawal.approve', targetType: 'withdrawal', targetId: id, details: { note }, ip }, tx);
      return w;
    });
    return updated;
  }

  /** Records the on-chain transaction after staff have sent the funds from custody. */
  async complete(id: string, adminId: string, rawHash: string, ip?: string) {
    const w = await this.prisma.withdrawalRequest.findUnique({ where: { id }, include: { user: userBrief } });
    if (!w) throw new NotFoundException('Withdrawal not found');
    const txHash = rawHash.trim();
    if (!TX_HASH[w.network].test(txHash)) {
      throw new BadRequestException(w.network === BlockchainNetwork.ETHEREUM ? 'Enter the Ethereum transaction hash (0x followed by 64 hex characters)' : 'Enter the Bitcoin transaction ID (64 hex characters)');
    }
    const hash = txHash.toLowerCase();
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.withdrawalRequest.updateMany({
        where: { id, status: WithdrawalStatus.APPROVED },
        data: { status: WithdrawalStatus.COMPLETED, txHash: hash, completedById: adminId, completedAt: now },
      });
      if (!r.count) throw new ConflictException('Only approved withdrawals can be marked as sent');
      const debited = await tx.balance.updateMany({
        where: { userId: w.userId, assetType: w.assetType, lockedBalance: { gte: w.amount } },
        data: { lockedBalance: { decrement: w.amount } },
      });
      if (!debited.count) throw new ConflictException('Locked balance does not cover this withdrawal');
      await tx.transaction.update({ where: { id: w.transactionId }, data: { status: TransactionStatus.COMPLETED, blockchainTxHash: hash, confirmedAt: now } });
      await this.audit.record({ actorId: adminId, action: 'withdrawal.complete', targetType: 'withdrawal', targetId: id, details: { txHash: hash }, ip }, tx);
    });
    void this.notify(w.user.email, 'Your withdrawal has been sent', [
      'Good news: your withdrawal has been reviewed and sent to the address below. It may take a little while to confirm on the blockchain.',
    ], { asset: w.assetType, amount: w.amount.toFixed(), fee: w.fee.toFixed(), netAmount: w.netAmount.toFixed(), address: w.address, network: w.network }, 'withdrawal-sent', [{ label: 'Transaction', value: EXPLORER[w.network] + hash }]);
    return this.prisma.withdrawalRequest.findUniqueOrThrow({ where: { id } });
  }

  async reject(id: string, adminId: string, reason: string, ip?: string) {
    const w = await this.release(id, WithdrawalStatus.REJECTED, [WithdrawalStatus.PENDING_REVIEW, WithdrawalStatus.APPROVED], { reviewNote: reason, reviewedById: adminId, reviewedAt: new Date() }, async (tx) => {
      await this.audit.record({ actorId: adminId, action: 'withdrawal.reject', targetType: 'withdrawal', targetId: id, details: { reason }, ip }, tx);
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: w.userId }, select: { email: true } });
    void this.notify(user.email, 'Your withdrawal was not processed', [
      'Your withdrawal request was reviewed and not processed. The full amount has been returned to your available balance.',
      `Reason: ${reason}`,
      'If you have questions, reply through live chat in your dashboard.',
    ], { asset: w.assetType, amount: w.amount.toFixed(), fee: w.fee.toFixed(), netAmount: w.netAmount.toFixed(), address: w.address, network: w.network }, 'withdrawal-rejected');
    return w;
  }

  // ── helpers ──────────────────────────────────────────────────────

  /** Returns locked funds to the balance and closes the request (reject or cancel). */
  private async release(
    id: string,
    status: WithdrawalStatus,
    from: WithdrawalStatus[],
    data: Prisma.WithdrawalRequestUncheckedUpdateManyInput,
    extra?: (tx: Prisma.TransactionClient) => Promise<void>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const r = await tx.withdrawalRequest.updateMany({ where: { id, status: { in: from } }, data: { ...data, status } });
      if (!r.count) throw new ConflictException('This withdrawal can no longer be changed');
      const w = await tx.withdrawalRequest.findUniqueOrThrow({ where: { id } });
      const back = await tx.balance.updateMany({
        where: { userId: w.userId, assetType: w.assetType, lockedBalance: { gte: w.amount } },
        data: { lockedBalance: { decrement: w.amount }, balance: { increment: w.amount } },
      });
      if (!back.count) throw new ConflictException('Locked balance does not cover this withdrawal');
      await tx.transaction.update({ where: { id: w.transactionId }, data: { status: status === WithdrawalStatus.CANCELLED ? TransactionStatus.CANCELLED : TransactionStatus.FAILED } });
      await extra?.(tx);
      return w;
    });
  }

  private async draft(userId: string, asset: AssetType, rawAmount: string, rawAddress: string): Promise<WithdrawalDraft> {
    const setting = (await this.settings()).find((s) => s.asset === asset)!;
    if (!setting.enabled) throw new BadRequestException(`${asset} withdrawals are temporarily unavailable`);
    const network = ASSET_NETWORK[asset];
    const address = this.address(network, rawAddress);
    if (await this.prisma.depositAddress.findUnique({ where: { address } })) {
      throw new BadRequestException('That is a BitInvest Capital deposit address. Withdraw to an external wallet instead.');
    }
    const amount = this.decimal(rawAmount, asset, 'amount', false);
    const fee = new D(setting.fee);
    if (amount.lt(setting.minAmount)) throw new BadRequestException(`The minimum ${asset} withdrawal is ${setting.minAmount}`);
    if (amount.lte(fee)) throw new BadRequestException(`Amount must be more than the ${fee.toFixed()} ${asset} network fee`);
    const balance = await this.prisma.balance.findUnique({ where: { userId_assetType: { userId, assetType: asset } } });
    if (!balance || balance.balance.lt(amount)) throw new BadRequestException('Insufficient available balance');
    return { asset, amount: amount.toFixed(), fee: fee.toFixed(), netAmount: amount.minus(fee).toFixed(), address, network };
  }

  private address(network: BlockchainNetwork, raw: string) {
    const value = (raw ?? '').trim();
    try {
      if (network === BlockchainNetwork.ETHEREUM) {
        // Mixed case means the sender used an EIP-55 checksum: it must be correct.
        if (/[a-f]/.test(value.slice(2)) && /[A-F]/.test(value.slice(2))) getAddress(value);
        const normalised = normalizeAddress(network, value, this.btcNetwork);
        if (normalised === ZeroAddress) throw new InvalidAddressError('zero address');
        return normalised;
      }
      return normalizeAddress(network, value, this.btcNetwork);
    } catch {
      throw new BadRequestException(network === BlockchainNetwork.ETHEREUM ? 'Enter a valid Ethereum address (0x…)' : 'Enter a valid Bitcoin address');
    }
  }

  private decimal(raw: string, asset: AssetType, field: string, allowZero: boolean) {
    if (!/^\d+(\.\d+)?$/.test(String(raw ?? '').trim())) throw new BadRequestException(`${field} must be a positive number`);
    const d = new D(String(raw).trim());
    if (d.decimalPlaces() > ASSET_DECIMALS[asset]) throw new BadRequestException(`${asset} supports at most ${ASSET_DECIMALS[asset]} decimal places`);
    if (!allowZero && d.lte(0)) throw new BadRequestException(`${field} must be greater than zero`);
    return d;
  }

  private summary(d: { asset: AssetType; amount: string; fee: string; netAmount: string; address: string; network: BlockchainNetwork }) {
    return [
      { label: 'Amount', value: `${d.amount} ${d.asset}` },
      { label: 'Network fee', value: `${d.fee} ${d.asset}` },
      { label: 'You receive', value: `${d.netAmount} ${d.asset}` },
      { label: 'To address', value: d.address },
      { label: 'Network', value: d.network === BlockchainNetwork.ETHEREUM ? (d.asset === AssetType.USDT ? 'Ethereum (ERC-20)' : 'Ethereum') : 'Bitcoin' },
    ];
  }

  private async notify(email: string, heading: string, paragraphs: string[], d: Parameters<WithdrawalsService['summary']>[0], tag: string, extra: { label: string; value: string }[] = []) {
    await this.mail.sendWithdrawalUpdate(email, heading, paragraphs, [...this.summary(d), ...extra], tag).catch((err: unknown) => {
      this.logger.error(`Failed to send withdrawal email: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
