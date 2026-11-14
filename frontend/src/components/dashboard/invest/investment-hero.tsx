'use client';

import { ArrowDownToLine, ArrowUpFromLine, Clock, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { MoveDialog } from '@/components/dashboard/invest/move-dialog';
import { WithdrawDialog } from '@/components/dashboard/withdraw-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLiveInvestments } from '@/hooks/use-investments';
import { weeklyLabel } from '@/hooks/use-public';
import { formatPercent, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';

/** $1,234.56 with the next four decimals in small type, so the live growth is visible. */
function LiveMoney({ value, className }: { value: number; className?: string }) {
  const fixed = Math.max(value, 0).toFixed(6);
  const [whole, frac] = fixed.split('.');
  const dollars = new Intl.NumberFormat('en-US').format(Number(whole));
  return (
    <span className={cn('tabular inline-flex items-baseline', className)} aria-label={formatUsd(value)}>
      <span>${dollars}</span>
      <span>.{frac.slice(0, 2)}</span>
      <span className="ml-0.5 text-[0.38em] font-medium text-up/90">{frac.slice(2)}</span>
    </span>
  );
}

function countdown(ms: number) {
  if (ms <= 0) return 'any moment';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s` : `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function InvestmentHero() {
  const { rows, totals, now, minUsd } = useLiveInvestments(1000);

  if (!rows || !totals) {
    return <Skeleton className="h-[260px] w-full rounded-xl" />;
  }

  const best = rows.filter((r) => r.open && r.rate).sort((a, b) => Number(b.rate!.weeklyPercent) - Number(a.rate!.weeklyPercent))[0];
  const gainPct = totals.contributed > 0 ? (totals.gain / totals.contributed) * 100 : 0;
  const firstWalletAsset = rows.find((r) => Number(r.wallet) > 0)?.asset ?? 'USDT';
  const firstInvestedAsset = rows.find((r) => Number(r.invested) > 0)?.asset ?? 'USDT';

  return (
    <section aria-labelledby="inv-title" className="relative overflow-hidden rounded-xl border border-rule bg-vault/70">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-[380px] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--up)_18%,transparent),transparent_65%)]" />
      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 id="inv-title" className="text-[13px] font-medium tracking-[0.08em] text-mist uppercase">Investment value</h1>
            {totals.hasInvestment && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-up/10 px-2 py-0.5 text-[11px] font-semibold text-up">
                <span className="relative flex size-1.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-70" /><span className="relative inline-flex size-1.5 rounded-full bg-up" /></span>
                Live
              </span>
            )}
          </div>
          <p className="mt-2 text-[clamp(2.4rem,9vw,3.75rem)] leading-none font-semibold tracking-[-0.03em]">
            <LiveMoney value={totals.invested} />
          </p>

          {totals.hasInvestment ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <div>
                <dt className="text-[12px] text-mist">Total returns</dt>
                <dd className={cn('tabular mt-0.5 text-[16px] font-semibold', totals.gain >= 0 ? 'text-up' : 'text-down')}>
                  {formatUsd(totals.gain, { signed: true })} <span className="text-[12px] font-normal">({formatPercent(gainPct, { signed: true })})</span>
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-mist">Earning now</dt>
                <dd className="tabular mt-0.5 text-[16px] font-semibold">≈ {formatUsd(totals.perDay)} <span className="text-[12px] font-normal text-mist">/ day</span></dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="flex items-center gap-1 text-[12px] text-mist"><Clock className="size-3" /> Next payout</dt>
                <dd className="tabular mt-0.5 text-[16px] font-semibold">{totals.nextPayoutAt && now ? `in ${countdown(totals.nextPayoutAt - now)}` : '—'}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 max-w-md text-[14px] text-mist">
              {totals.wallet > 0
                ? `You have ${formatUsd(totals.wallet)} in your BitInvest wallet. Invest from ${formatUsd(minUsd)} to start earning${best ? ` up to ${weeklyLabel(best.rate!.weeklyPercent)} a week` : ''}.`
                : `Deposit crypto, then choose how much to invest, from ${formatUsd(minUsd)}. Your investment grows every payout period and you can follow it live here.`}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <MoveDialog mode="invest" asset={firstWalletAsset} trigger={<Button size="lg"><TrendingUp /> Invest</Button>} />
            {totals.hasInvestment && (
              <MoveDialog mode="redeem" asset={firstInvestedAsset} trigger={<Button size="lg" variant="outline"><Wallet /> Move to wallet</Button>} />
            )}
            <Button size="lg" variant="ghost" asChild>
              <a href="#coins"><ArrowDownToLine /> Deposit</a>
            </Button>
            <WithdrawDialog trigger={<Button size="lg" variant="ghost"><ArrowUpFromLine /> Withdraw</Button>} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="rounded-lg border border-rule bg-ink/50 p-4">
            <p className="flex items-center gap-2 text-[12px] text-mist"><Wallet className="size-3.5" /> BitInvest wallet</p>
            <p className="tabular mt-1 text-[22px] font-semibold">{formatUsd(totals.wallet)}</p>
            <p className="mt-1 text-[12px] text-mist">Available to invest or withdraw. Doesn’t earn.</p>
          </div>
          <div className="rounded-lg border border-rule bg-ink/50 p-4">
            <p className="text-[12px] text-mist">Total balance</p>
            <p className="tabular mt-1 text-[22px] font-semibold">{formatUsd(totals.invested + totals.wallet)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-up transition-[width] duration-700" style={{ width: `${totals.invested + totals.wallet > 0 ? (totals.invested / (totals.invested + totals.wallet)) * 100 : 0}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-mist">
              {totals.invested + totals.wallet > 0 ? `${Math.round((totals.invested / (totals.invested + totals.wallet)) * 100)}% invested` : 'Nothing deposited yet'}
            </p>
          </div>
          {best && (
            <p className="flex items-start gap-2 rounded-lg border border-brass/30 bg-brass/5 p-3 text-[12.5px]">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-brass" />
              <span>
                Current rates:{' '}
                {rows.filter((r) => r.open && r.rate).map((r, i) => (
                  <span key={r.asset}>{i > 0 && ' · '}<strong className="font-semibold">{r.asset}</strong> {weeklyLabel(r.rate!.weeklyPercent)}/wk</span>
                ))}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
