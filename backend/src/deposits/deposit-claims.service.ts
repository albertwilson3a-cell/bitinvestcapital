import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service.js';
import { AssetType, BlockchainNetwork, DepositClaimStatus, Prisma, TransactionStatus, TransactionType } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { LedgerService } from '../payments/ledger.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ASSET_DECIMALS, ASSET_NETWORK, btcNetworkFor, normalizeAddress } from '../wallets/chains.js';
import { readFixedAddresses, type FixedAddresses } from '../wallets/fixed-addresses.js';
import { ChainLookupService } from './chain-lookup.service.js';

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export const EXPLORER_TX: Record<BlockchainNetwork, string> = {
  [BlockchainNetwork.ETHEREUM]: 'https://etherscan.io/tx/',
  [BlockchainNetwork.BITCOIN]: 'https://mempool.space/tx/',
};

const TX_HASH: Record<BlockchainNetwork, RegExp> = {
  [BlockchainNetwork.ETHEREUM]: /^0x[0-9a-f]{64}$/,
  [BlockchainNetwork.BITCOIN]: /^[0-9a-f]{64}$/,
};

/** Open reports one client may have at a time (stops queue flooding). */
export const MAX_OPEN_CLAIMS = 10;

const userBrief = { select: { id: true, email: true } } as const;

const NETWORK_LABEL = (asset: AssetType) => (asset === AssetType.USDT ? 'Ethereum (ERC-20)' : ASSET_NETWORK[asset] === BlockchainNetwork.BITCOIN ? 'Bitcoin' : 'Ethereum');

/**
 * Deposits to shared platform addresses (DEPOSIT_ADDRESS_*):
 *   client sends funds → reports the transaction hash (PENDING_REVIEW)
 *   → staff check it on-chain and credit the confirmed amount (CREDITED)
 *   or reject it (REJECTED); the client may cancel while it is pending.
 * Crediting and the status change commit in one database transaction.
 */
@Injectable()
export class DepositClaimsService {
  private readonly logger = new Logger(DepositClaimsService.name);
  private readonly fixed: FixedAddresses;
  private readonly btcNetwork;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly chain: ChainLookupService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.fixed = readFixedAddresses(config);
    this.btcNetwork = btcNetworkFor(config.get<string>('BTC_NETWORK') ?? 'mainnet');
  }

  /** Assets whose deposits go to one shared address and need a report. */
  sharedAddresses(): FixedAddresses {
    return { ...this.fixed };
  }

  // ── client ───────────────────────────────────────────────────────

  list(userId: string) {
    return this.prisma.depositClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, assetType: true, network: true, address: true, txHash: true, reportedAmount: true, creditedAmount: true,
        status: true, reviewNote: true, createdAt: true, reviewedAt: true,
      },
    });
  }

  async submit(userId: string, dto: { asset: AssetType; amount: string; txHash: string; fromAddress?: string; note?: string }) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, suspendedAt: true } });
    if (user.suspendedAt) throw new ForbiddenException('This account is suspended. Please contact support.');

    const address = this.fixed[dto.asset];
    if (!address) throw new BadRequestException(`${dto.asset} deposits to your personal address are detected automatically; there is nothing to report.`);
    const network = ASSET_NETWORK[dto.asset];
    const txHash = this.normalizeHash(network, dto.txHash);
    const amount = this.decimal(dto.amount, dto.asset);
    const fromAddress = dto.fromAddress ? this.normalizeFrom(network, dto.fromAddress) : null;
    if (fromAddress && fromAddress.toLowerCase() === address.toLowerCase()) {
      throw new BadRequestException('The sending address must be your own wallet, not the BitInvest Capital deposit address.');
    }

    const open = await this.prisma.depositClaim.count({ where: { userId, status: DepositClaimStatus.PENDING_REVIEW } });
    if (open >= MAX_OPEN_CLAIMS) throw new BadRequestException(`You already have ${open} deposits awaiting review. Please wait for them to be checked.`);

    const credited = await this.prisma.transaction.findFirst({
      where: { network, blockchainTxHash: txHash, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED },
      select: { id: true },
    });
    if (credited) throw new ConflictException('This transaction has already been credited.');

    let claim;
    try {
      claim = await this.prisma.depositClaim.create({
        data: { userId, assetType: dto.asset, network, address, txHash, reportedAmount: amount, fromAddress, clientNote: dto.note?.trim() || null },
      });
    } catch (err) {
      if (this.isUniqueViolation(err)) throw new ConflictException('This transaction has already been reported.');
      throw err;
    }

    void this.notify(user.email, 'We’re checking your deposit', [
      'Thanks — we’ve received your deposit report. Our team checks every deposit on the blockchain before crediting it, usually within a few hours.',
      'You’ll get another email as soon as it is added to your balance.',
    ], claim, 'deposit-received');
    return claim;
  }

  async cancel(userId: string, id: string) {
    const claim = await this.prisma.depositClaim.findUnique({ where: { id } });
    if (!claim || claim.userId !== userId) throw new NotFoundException('Deposit report not found');
    const r = await this.prisma.depositClaim.updateMany({
      where: { id, status: DepositClaimStatus.PENDING_REVIEW },
      data: { status: DepositClaimStatus.CANCELLED, reviewNote: 'Cancelled by client' },
    });
    if (!r.count) throw new ConflictException('This deposit report can no longer be cancelled');
    return this.prisma.depositClaim.findUniqueOrThrow({ where: { id } });
  }

  // ── staff ────────────────────────────────────────────────────────

  adminList(status?: DepositClaimStatus | 'ALL') {
    return this.prisma.depositClaim.findMany({
      where: status && status !== 'ALL' ? { status } : {},
      orderBy: { createdAt: status === DepositClaimStatus.PENDING_REVIEW ? 'asc' : 'desc' },
      take: 200,
      include: { user: userBrief, reviewedBy: userBrief },
    });
  }

  async adminCounts() {
    const pendingReview = await this.prisma.depositClaim.count({ where: { status: DepositClaimStatus.PENDING_REVIEW } });
    return { pendingReview };
  }

  async adminDetail(id: string) {
    const claim = await this.prisma.depositClaim.findUnique({ where: { id }, include: { user: userBrief, reviewedBy: userBrief } });
    if (!claim) throw new NotFoundException('Deposit report not found');
    const [client, earlierReports, sameHashOthers, deposits] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: claim.userId },
        select: { id: true, email: true, createdAt: true, lastLoginAt: true, suspendedAt: true, balances: { select: { assetType: true, balance: true, lockedBalance: true } } },
      }),
      this.prisma.depositClaim.groupBy({ by: ['status'], where: { userId: claim.userId, id: { not: id } }, _count: true }),
      this.prisma.depositClaim.findMany({
        where: { network: claim.network, txHash: claim.txHash, id: { not: id } },
        select: { id: true, status: true, createdAt: true, user: userBrief },
      }),
      this.prisma.transaction.aggregate({ where: { userId: claim.userId, type: TransactionType.DEPOSIT, status: TransactionStatus.COMPLETED }, _count: true }),
    ]);
    const count = (s: DepositClaimStatus) => earlierReports.find((r) => r.status === s)?._count ?? 0;
    const ageDays = (Date.now() - client.createdAt.getTime()) / 86_400_000;
    const signals = [
      sameHashOthers.length > 0 && { level: 'warn', text: `This hash was also reported by ${[...new Set(sameHashOthers.map((o) => o.user.email))].join(', ')}` },
      count(DepositClaimStatus.REJECTED) > 0 && { level: 'warn', text: `${count(DepositClaimStatus.REJECTED)} earlier report(s) from this client were rejected` },
      count(DepositClaimStatus.CREDITED) > 0 && { level: 'ok', text: `${count(DepositClaimStatus.CREDITED)} earlier report(s) from this client were credited` },
      deposits._count === 0 && { level: 'info', text: 'First deposit for this client' },
      ageDays < 1 && { level: 'info', text: 'Account opened less than a day ago' },
      client.suspendedAt && { level: 'warn', text: 'Account is currently suspended' },
      !claim.fromAddress && { level: 'info', text: 'Client did not give a sending address' },
    ].filter(Boolean);
    return {
      claim,
      explorerUrl: EXPLORER_TX[claim.network] + claim.txHash,
      client,
      sameHashOthers,
      signals,
    };
  }

  /** Live check on a public explorer: what did this transaction actually pay the platform address? */
  async adminChainCheck(id: string) {
    const claim = await this.prisma.depositClaim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Deposit report not found');
    const lookup = await this.chain.inspect(claim.network, claim.assetType, claim.txHash, claim.address);
    const fromMatches =
      claim.fromAddress && lookup.from.length ? lookup.from.some((f) => f.toLowerCase() === claim.fromAddress!.toLowerCase()) : null;
    return { ...lookup, fromMatches };
  }

  /** Credits the amount staff confirmed on-chain (may differ from what the client reported). */
  async approve(id: string, adminId: string, rawAmount: string, note: string | undefined, ip?: string) {
    const claim = await this.prisma.depositClaim.findUnique({ where: { id }, include: { user: { select: { email: true, referredByUserId: true } } } });
    if (!claim) throw new NotFoundException('Deposit report not found');
    if (claim.status !== DepositClaimStatus.PENDING_REVIEW) throw new ConflictException('Only deposits awaiting review can be credited');
    const amount = this.decimal(rawAmount, claim.assetType);

    // Price is fetched before the database transaction (no network calls inside it).
    let usdPrice: Decimal | null = null;
    if (claim.user.referredByUserId || claim.assetType === AssetType.USDT) {
      usdPrice = await this.ledger.usdPriceOrNull(claim.assetType);
      if (!usdPrice) throw new ServiceUnavailableException('Live prices are unavailable right now (needed for the referral reward). Try again in a minute.');
    }

    const result = await this.prisma.$transaction(
      async (tx) => {
        const credit = await this.ledger.creditVerifiedDeposit(tx, {
          userId: claim.userId,
          asset: claim.assetType,
          amount,
          network: claim.network,
          txHash: claim.txHash,
          address: claim.address,
          usdPrice,
          metadata: { source: 'deposit_claim', depositClaimId: id, reportedAmount: claim.reportedAmount.toFixed(), approvedBy: adminId },
        });
        // Conditional: a concurrent approve/reject/cancel makes this 0 and rolls the credit back.
        const r = await tx.depositClaim.updateMany({
          where: { id, status: DepositClaimStatus.PENDING_REVIEW },
          data: { status: DepositClaimStatus.CREDITED, creditedAmount: amount, transactionId: credit.transactionId, reviewedById: adminId, reviewedAt: new Date(), reviewNote: note ?? null },
        });
        if (!r.count) throw new ConflictException('This deposit was already handled');
        await this.audit.record(
          {
            actorId: adminId,
            action: 'deposit_claim.credit',
            targetType: 'deposit_claim',
            targetId: id,
            details: { asset: claim.assetType, reportedAmount: claim.reportedAmount.toFixed(), creditedAmount: amount.toFixed(), txHash: claim.txHash, note, transactionId: credit.transactionId },
            ip,
          },
          tx,
        );
        return credit;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 15000 },
    );

    const updated = await this.prisma.depositClaim.findUniqueOrThrow({ where: { id } });
    void this.notify(claim.user.email, 'Your deposit has been credited', [
      `Your deposit has been checked on the blockchain and ${amount.toFixed()} ${claim.assetType} has been added to your balance.`,
      ...(amount.equals(claim.reportedAmount) ? [] : [`This is the amount the transaction actually delivered (you reported ${claim.reportedAmount.toFixed()} ${claim.assetType}).`]),
    ], updated, 'deposit-credited');
    return { ...updated, referralBonus: result.referralBonus };
  }

  async reject(id: string, adminId: string, reason: string, ip?: string) {
    const claim = await this.prisma.depositClaim.findUnique({ where: { id }, include: { user: userBrief } });
    if (!claim) throw new NotFoundException('Deposit report not found');
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.depositClaim.updateMany({
        where: { id, status: DepositClaimStatus.PENDING_REVIEW },
        data: { status: DepositClaimStatus.REJECTED, reviewedById: adminId, reviewedAt: new Date(), reviewNote: reason },
      });
      if (!r.count) throw new ConflictException('Only deposits awaiting review can be rejected');
      await this.audit.record({ actorId: adminId, action: 'deposit_claim.reject', targetType: 'deposit_claim', targetId: id, details: { reason, txHash: claim.txHash }, ip }, tx);
    });
    const updated = await this.prisma.depositClaim.findUniqueOrThrow({ where: { id } });
    void this.notify(claim.user.email, 'We couldn’t confirm your deposit', [
      'We checked the transaction you reported and could not credit it to your account.',
      `Reason: ${reason}`,
      'If you believe this is a mistake, message us through live chat in your dashboard and include the transaction hash.',
    ], updated, 'deposit-rejected');
    return updated;
  }

  // ── helpers ──────────────────────────────────────────────────────

  private normalizeHash(network: BlockchainNetwork, raw: string) {
    let v = (raw ?? '').trim().toLowerCase();
    if (network === BlockchainNetwork.ETHEREUM && /^[0-9a-f]{64}$/.test(v)) v = `0x${v}`;
    if (!TX_HASH[network].test(v)) {
      throw new BadRequestException(
        network === BlockchainNetwork.ETHEREUM
          ? 'Enter the transaction hash from your wallet (0x followed by 64 characters)'
          : 'Enter the Bitcoin transaction ID from your wallet (64 characters)',
      );
    }
    return v;
  }

  private normalizeFrom(network: BlockchainNetwork, raw: string) {
    try {
      return normalizeAddress(network, raw, this.btcNetwork);
    } catch {
      throw new BadRequestException(network === BlockchainNetwork.ETHEREUM ? 'The sending address is not a valid Ethereum address' : 'The sending address is not a valid Bitcoin address');
    }
  }

  private decimal(raw: string, asset: AssetType) {
    const v = String(raw ?? '').trim();
    if (!/^\d+(\.\d+)?$/.test(v)) throw new BadRequestException('amount must be a positive number');
    const d = new D(v);
    if (d.decimalPlaces() > ASSET_DECIMALS[asset]) throw new BadRequestException(`${asset} supports at most ${ASSET_DECIMALS[asset]} decimal places`);
    if (d.lte(0)) throw new BadRequestException('amount must be greater than zero');
    return d;
  }

  private isUniqueViolation(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return true;
    const text = err instanceof Error ? err.message : String(err);
    return /23505|unique constraint|deposit_claims_active_tx_key/i.test(text);
  }

  private async notify(
    email: string,
    heading: string,
    paragraphs: string[],
    c: { assetType: AssetType; reportedAmount: Decimal; creditedAmount?: Decimal | null; txHash: string; network: BlockchainNetwork },
    tag: string,
  ) {
    const details = [
      { label: 'Asset', value: `${c.assetType} · ${NETWORK_LABEL(c.assetType)}` },
      { label: c.creditedAmount ? 'Credited' : 'Reported amount', value: `${(c.creditedAmount ?? c.reportedAmount).toFixed()} ${c.assetType}` },
      { label: 'Transaction', value: EXPLORER_TX[c.network] + c.txHash },
    ];
    await this.mail.sendDepositUpdate(email, heading, paragraphs, details, tag).catch((err: unknown) => {
      this.logger.error(`Failed to send deposit email: ${err instanceof Error ? err.message : String(err)}`);
    });
  }
}
