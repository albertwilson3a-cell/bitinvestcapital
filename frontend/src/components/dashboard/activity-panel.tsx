'use client';

import { useMemo, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ExternalLink, Gift, Loader2, Scale, Sprout, Users } from 'lucide-react';
import { AssetDot, Panel } from '@/components/dashboard/panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrices, useTransactions, useWallets, type TxFilter } from '@/hooks/use-dashboard';
import { EXPLORERS } from '@/lib/brand';
import { formatAmount, formatDateTime, formatUsd, shortHash, timeAgo } from '@/lib/format';
import { ASSET_META, ASSETS, type Asset, type LedgerTransaction, type TransactionStatus, type TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_META: Record<TransactionType, { label: string; icon: typeof Sprout; credit: boolean }> = {
  DEPOSIT: { label: 'Deposit', icon: ArrowDownToLine, credit: true },
  WITHDRAWAL: { label: 'Withdrawal', icon: ArrowUpFromLine, credit: false },
  YIELD_PAYOUT: { label: 'Yield payout', icon: Sprout, credit: true },
  REFERRAL_BONUS: { label: 'Referral bonus', icon: Gift, credit: true },
  AFFILIATE_YIELD_REWARD: { label: 'Referral yield share', icon: Users, credit: true },
  ADJUSTMENT_CREDIT: { label: 'Account adjustment', icon: Scale, credit: true },
  ADJUSTMENT_DEBIT: { label: 'Account adjustment', icon: Scale, credit: false },
};

const STATUS_BADGE: Record<TransactionStatus, { label: string; variant: 'success' | 'pending' | 'danger' | 'neutral' }> = {
  COMPLETED: { label: 'Completed', variant: 'success' },
  PENDING: { label: 'Confirming', variant: 'pending' },
  PROCESSING: { label: 'Processing', variant: 'pending' },
  FAILED: { label: 'Failed', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

const TABS: { value: string; label: string; type?: TransactionType }[] = [
  { value: 'all', label: 'All' },
  { value: 'deposits', label: 'Deposits', type: 'DEPOSIT' },
  { value: 'yield', label: 'Yield', type: 'YIELD_PAYOUT' },
  { value: 'bonus', label: 'Referral bonus', type: 'REFERRAL_BONUS' },
  { value: 'share', label: 'Referral yield', type: 'AFFILIATE_YIELD_REWARD' },
];

function explorerUrl(t: LedgerTransaction): string | null {
  if (!t.blockchainTxHash || !t.network) return null;
  const hash = t.network === 'BITCOIN' ? t.blockchainTxHash.replace(/^0x/, '') : t.blockchainTxHash;
  return `${EXPLORERS[t.network]}${hash}`;
}

function TxHash({ t }: { t: LedgerTransaction }) {
  const url = explorerUrl(t);
  if (!url || !t.blockchainTxHash) return <span className="text-mist">Internal</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-sm font-mono text-[12px] text-mist underline-offset-4 hover:text-foreground hover:underline"
    >
      {shortHash(t.blockchainTxHash)}
      <ExternalLink className="size-3" />
      <span className="sr-only">View on block explorer</span>
    </a>
  );
}

function Detail({ t, required }: { t: LedgerTransaction; required: number | undefined }) {
  if (t.type === 'DEPOSIT' && t.status === 'PENDING') {
    return (
      <span className="tabular text-brass">
        {t.confirmations ?? 0}
        {required ? ` of ${required}` : ''} confirmations
      </span>
    );
  }
  if (t.blockNumber) return <span className="tabular text-mist">Block {Number(t.blockNumber).toLocaleString('en-US')}</span>;
  if (t.type === 'YIELD_PAYOUT') return <span className="text-mist">Interest credited</span>;
  if (t.type === 'AFFILIATE_YIELD_REWARD') return <span className="text-mist">Share of a referral’s yield</span>;
  if (t.type === 'REFERRAL_BONUS') return <span className="text-mist">Referral deposit reward</span>;
  if ((t.type === 'ADJUSTMENT_CREDIT' || t.type === 'ADJUSTMENT_DEBIT') && t.note) {
    return <span className="block max-w-[260px] truncate text-mist" title={t.note}>{t.note}</span>;
  }
  return <span className="text-mist">—</span>;
}

function Amount({ t, price }: { t: LedgerTransaction; price: number | null }) {
  const credit = TYPE_META[t.type].credit;
  const n = Number(t.amount);
  return (
    <div className="text-right">
      <div className={cn('text-[14px] tabular', t.status === 'COMPLETED' && credit ? 'text-foreground' : 'text-mist')}>
        {credit ? '+' : '−'}
        {formatAmount(n, ASSET_META[t.assetType].decimals + 2)} {t.assetType}
      </div>
      {price !== null && <div className="text-[12px] text-mist tabular">{formatUsd(n * price)}</div>}
    </div>
  );
}

function ProcessingQueue({ pending, required }: { pending: LedgerTransaction[]; required: Partial<Record<Asset, number>> }) {
  if (pending.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-rule/70 px-3 py-2.5 text-[13px] text-mist">
        <span className="size-1.5 rounded-full bg-up" aria-hidden="true" /> No deposits waiting for confirmations.
      </p>
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2" aria-label="Deposits confirming">
      {pending.map((t) => {
        const need = required[t.assetType];
        const have = need ? Math.min(t.confirmations ?? 0, need) : (t.confirmations ?? 0);
        return (
          <li key={t.id} className="rounded-md border border-brass/25 bg-brass/[0.04] p-3">
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-brass" />
                {formatAmount(t.amount, ASSET_META[t.assetType].decimals + 2)} {t.assetType}
              </span>
              <span className="tabular text-mist">{need ? `${have}/${need}` : `${have} confirmations`}</span>
            </div>
            {need ? <Progress value={(have / need) * 100} className="mt-2.5" aria-label={`${have} of ${need} confirmations`} /> : <div className="mt-2.5 h-1" />}
            <div className="mt-2 flex items-center justify-between text-[12px]">
              <TxHash t={t} />
              <span className="text-mist">{timeAgo(t.createdAt)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityPanel({ className }: { className?: string }) {
  const [tab, setTab] = useState('all');
  const [asset, setAsset] = useState<Asset | undefined>();
  const filter: TxFilter = { type: TABS.find((t) => t.value === tab)?.type, asset };
  const txs = useTransactions(filter);
  const pendingQuery = useTransactions({ type: 'DEPOSIT' });
  const wallets = useWallets();
  const prices = usePrices();

  const rows = useMemo(() => txs.data?.pages.flatMap((p) => p.items) ?? [], [txs.data]);
  const pending = useMemo(
    () => (pendingQuery.data?.pages.flatMap((p) => p.items) ?? []).filter((t) => t.status === 'PENDING'),
    [pendingQuery.data],
  );
  const required = useMemo(() => {
    const r: Partial<Record<Asset, number>> = {};
    for (const w of wallets.data ?? []) r[w.asset] = w.requiredConfirmations;
    return r;
  }, [wallets.data]);
  const price = (a: Asset) => {
    const q = prices.data?.quotes.find((x) => x.asset === a);
    return q ? Number(q.usd) : null;
  };

  return (
    <Panel id="activity" title="Activity" description="Every credit to your account, from network confirmation to settlement." className={className} bodyClassName="px-0 sm:px-0">
      <div className="px-5 sm:px-6">
        <h3 className="mb-2 text-[13px] font-medium text-mist">Processing</h3>
        {pendingQuery.isLoading ? <Skeleton className="h-12 w-full" /> : <ProcessingQueue pending={pending} required={required} />}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="flex flex-col gap-3 px-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            <TabsList className="w-max min-w-full">
              {TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Filter by asset">
            {[undefined, ...ASSETS].map((a) => (
              <Button
                key={a ?? 'all'}
                variant="ghost"
                size="sm"
                aria-pressed={asset === a}
                onClick={() => setAsset(a)}
                className={cn('h-7 px-2.5', asset === a && 'bg-accent text-foreground')}
              >
                {a && <AssetDot color={ASSET_META[a].color} />}
                {a ?? 'All assets'}
              </Button>
            ))}
          </div>
        </div>
      </Tabs>

      <div className="mt-2">
        {txs.isLoading ? (
          <div className="flex flex-col gap-2 px-5 pt-3 sm:px-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-mist sm:px-6">
            Nothing here yet. Deposits appear as soon as the network sees them.
          </p>
        ) : (
          <>
            {/* Desktop and tablet: a full ledger table. */}
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Type</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Detail</TableHead>
                  <TableHead className="hidden lg:table-cell">Transaction</TableHead>
                  <TableHead className="pr-6 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const Icon = TYPE_META[t.type].icon;
                  const st = STATUS_BADGE[t.status];
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="pl-6">
                        <span className="flex items-center gap-2.5">
                          <Icon className="size-4 text-mist" />
                          {TYPE_META[t.type].label}
                        </span>
                        {/* Tablet: detail and hash fold under the type instead of taking columns. */}
                        <span className="mt-1 flex items-center gap-3 pl-[26px] text-[12px] lg:hidden">
                          <Detail t={t} required={required[t.assetType]} />
                          {t.blockchainTxHash && <TxHash t={t} />}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <AssetDot color={ASSET_META[t.assetType].color} />
                          {t.assetType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Amount t={t} price={price(t.assetType)} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="hidden text-[13px] lg:table-cell">
                        <Detail t={t} required={required[t.assetType]} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <TxHash t={t} />
                      </TableCell>
                      <TableCell className="pr-6 text-right text-[13px] text-mist">
                        <Tooltip>
                          <TooltipTrigger className="cursor-default">{timeAgo(t.confirmedAt ?? t.createdAt)}</TooltipTrigger>
                          <TooltipContent>{formatDateTime(t.confirmedAt ?? t.createdAt)}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Mobile: the same ledger as stacked rows. */}
            <ul className="divide-y divide-rule/70 border-t border-rule md:hidden">
              {rows.map((t) => {
                const Icon = TYPE_META[t.type].icon;
                const st = STATUS_BADGE[t.status];
                return (
                  <li key={t.id} className="flex flex-col gap-2 px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex items-center gap-2.5 text-[14px]">
                        <Icon className="size-4 text-mist" />
                        {TYPE_META[t.type].label}
                      </span>
                      <Amount t={t} price={price(t.assetType)} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
                      <span className="flex items-center gap-2">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        <Detail t={t} required={required[t.assetType]} />
                      </span>
                      <span className="flex items-center gap-3">
                        <TxHash t={t} />
                        <span className="text-mist">{timeAgo(t.confirmedAt ?? t.createdAt)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {txs.hasNextPage && (
              <div className="flex justify-center border-t border-rule px-5 pt-4">
                <Button variant="ghost" size="sm" onClick={() => txs.fetchNextPage()} disabled={txs.isFetchingNextPage}>
                  {txs.isFetchingNextPage ? 'Loading…' : 'Load older activity'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
