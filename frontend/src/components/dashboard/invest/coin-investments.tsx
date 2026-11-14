'use client';

import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';
import { Hourglass, TrendingUp, Wallet } from 'lucide-react';
import { DepositDialog } from '@/components/dashboard/deposit-dialog';
import { MoveDialog } from '@/components/dashboard/invest/move-dialog';
import { WithdrawDialog } from '@/components/dashboard/withdraw-dialog';
import { CoinMark } from '@/components/market/coin-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallets } from '@/hooks/use-dashboard';
import { useInvestmentHistories, useLiveInvestments, type LiveRow } from '@/hooks/use-investments';
import { weeklyLabel } from '@/hooks/use-public';
import { formatAmount, formatUsd } from '@/lib/format';
import { ASSET_META, type Asset } from '@/lib/types';

const SHOW: Record<Asset, number> = { BTC: 8, ETH: 6, USDT: 2 };

function Spark({ points, color }: { points: { t: number; v: number }[]; color: string }) {
  if (points.length < 2) return <div className="h-14" />;
  const id = `spark-${color.replace(/\W/g, '')}`;
  return (
    <div className="h-14" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Area type="stepAfter" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CoinCard({ r, spark }: { r: LiveRow; spark: { t: number; v: number }[] }) {
  const wallets = useWallets();
  const wallet = wallets.data?.find((w) => w.asset === r.asset);
  const meta = ASSET_META[r.asset];
  const waiting = Number(r.invested) - Number(r.earningPrincipal);
  const hasInvested = Number(r.invested) > 0;

  return (
    <article className="flex min-w-0 flex-col rounded-lg border border-rule bg-vault/55 p-4 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <CoinMark symbol={r.asset} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{meta.name}</p>
            <p className="text-[12px] text-mist">{r.price !== null ? formatUsd(r.price) : '—'}</p>
          </div>
        </div>
        {r.open && r.rate ? (
          <Badge variant="success" className="shrink-0">{weeklyLabel(r.rate.weeklyPercent)} / week</Badge>
        ) : (
          <Badge variant="neutral" className="shrink-0">Not open</Badge>
        )}
      </header>

      <div className="mt-4">
        <p className="flex items-center gap-1.5 text-[12px] text-mist"><TrendingUp className="size-3.5" /> Invested</p>
        <p className="tabular mt-0.5 text-[22px] leading-tight font-semibold">{r.liveUsd !== null ? formatUsd(r.liveUsd) : '—'}</p>
        <p className="tabular text-[12px] text-mist">{r.liveInvested.toFixed(r.asset === 'USDT' ? 6 : 8)} {r.asset}</p>
      </div>
      <Spark points={spark} color={meta.color} />

      <dl className="mt-2 grid grid-cols-2 gap-3 text-[12.5px]">
        <div>
          <dt className="flex items-center gap-1 text-mist"><Wallet className="size-3" /> Wallet</dt>
          <dd className="tabular mt-0.5">{formatAmount(r.wallet, SHOW[r.asset])} {r.asset}</dd>
        </div>
        <div>
          <dt className="text-mist">Returns earned</dt>
          <dd className="tabular mt-0.5 text-up">+{(Number(r.earned) + r.accrued).toFixed(r.asset === 'USDT' ? 4 : 8)}</dd>
        </div>
      </dl>
      {waiting > 0 && (
        <p className="mt-3 flex items-start gap-1.5 rounded-md bg-brass/10 px-2.5 py-2 text-[12px]">
          <Hourglass className="mt-0.5 size-3.5 shrink-0 text-brass" />
          {formatAmount(waiting, SHOW[r.asset])} {r.asset} starts earning when the next payout period begins.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MoveDialog mode="invest" asset={r.asset} trigger={<Button size="sm" disabled={!r.open || Number(r.wallet) <= 0}>Invest</Button>} />
        <MoveDialog mode="redeem" asset={r.asset} trigger={<Button size="sm" variant="outline" disabled={!hasInvested}>To wallet</Button>} />
        {wallet ? <DepositDialog wallet={wallet} trigger={<Button size="sm" variant="ghost" aria-label={`Deposit ${r.asset}`}>Deposit</Button>} /> : <Button size="sm" variant="ghost" disabled>Deposit</Button>}
        <WithdrawDialog asset={r.asset} trigger={<Button size="sm" variant="ghost" disabled={Number(r.wallet) <= 0}>Withdraw</Button>} />
      </div>
    </article>
  );
}

/** One card per coin: investment, wallet, rate, returns and every action in one place. */
export function CoinInvestments() {
  const { rows } = useLiveInvestments(1000);
  const assets = useMemo(() => (rows ?? []).filter((r) => r.investedSince).map((r) => r.asset), [rows]);
  const histories = useInvestmentHistories(assets);

  const sparks = useMemo(() => {
    const out: Partial<Record<Asset, { t: number; v: number }[]>> = {};
    assets.forEach((a, i) => {
      const pts = histories[i]?.data?.points ?? [];
      out[a] = pts.map((p) => ({ t: new Date(p.at).getTime(), v: Number(p.invested) }));
    });
    return out;
  }, [assets, histories]);

  return (
    <section id="coins" aria-labelledby="coins-title" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="coins-title" className="text-[17px] font-semibold tracking-[-0.01em]">Your coins</h2>
          <p className="text-[13px] text-mist">Deposit to your wallet, invest what you choose, move it back any time.</p>
        </div>
      </div>
      {!rows ? (
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-80" /><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {[...rows].sort((a, b) => (b.liveUsd ?? 0) + (b.walletUsd ?? 0) - ((a.liveUsd ?? 0) + (a.walletUsd ?? 0))).map((r) => (
            <CoinCard key={r.asset} r={r} spark={sparks[r.asset] ?? []} />
          ))}
        </div>
      )}
    </section>
  );
}
