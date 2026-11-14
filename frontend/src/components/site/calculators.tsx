'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CoinMark } from '@/components/market/coin-mark';
import { AuthSwitch } from '@/components/site/auth-aware';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { useMarketCoins } from '@/hooks/use-market';
import { usePublicRates, weeklyLabel } from '@/hooks/use-public';
import { COIN_INFO } from '@/lib/coins';
import { formatPercent, formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';


/** Same formula as the payout engine: per-period rate = (1 + APY)^(1/n) − 1. */
export const growth = (apyPercent: number, years: number) => Math.pow(1 + apyPercent / 100, years);

const monthLabel = (m: number) => (m === 0 ? 'Today' : m % 12 === 0 ? `${m / 12}y` : `${m}m`);

function Money({ label, value, tone }: { label: string; value: string; tone?: 'brass' | 'up' }) {
  return (
    <div>
      <p className="text-[12px] text-mist">{label}</p>
      <p className={cn('tabular mt-1 text-[22px] leading-none font-semibold tracking-[-0.02em]', tone === 'brass' && 'text-brass', tone === 'up' && 'text-up')}>{value}</p>
    </div>
  );
}

function GrowthTip({ active, payload }: { active?: boolean; payload?: { payload: { m: number; balance: number; principal: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">{p.m === 0 ? 'Today' : `After ${p.m} month${p.m === 1 ? '' : 's'}`}</div>
      <div className="mt-1 flex justify-between gap-6"><span className="text-mist">Balance</span><span className="tabular">{formatUsd(p.balance)}</span></div>
      <div className="flex justify-between gap-6"><span className="text-mist">Yield earned</span><span className="tabular text-up">{formatUsd(p.balance - p.principal)}</span></div>
    </div>
  );
}

/** Live rates table: only rates the engine is paying right now. */
export function RatesTable({ className }: { className?: string }) {
  const { data, isLoading } = usePublicRates();
  if (isLoading) return <Skeleton className={cn('h-40 w-full', className)} />;
  if (!data?.yields.length) return <p className={cn('text-[13px] text-mist', className)}>Rates will be published here soon.</p>;
  return (
    <div className={cn('overflow-hidden rounded-xl border border-rule', className)}>
      <table className="w-full text-[14px]">
        <thead className="bg-vault/70 text-[12px] text-mist">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">Asset</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Rate per week</th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium sm:table-cell">Paid</th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium md:table-cell">$1,000 for 1 year</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {data.yields.map((r) => (
            <tr key={r.asset} className="bg-vault/30">
              <td className="px-4 py-3.5">
                <span className="flex items-center gap-3">
                  <CoinMark symbol={r.asset} />
                  <span>
                    <span className="block font-semibold">{COIN_INFO[r.asset]?.name ?? r.asset}</span>
                    <span className="block text-[12px] text-mist">{r.asset}</span>
                  </span>
                </span>
              </td>
              <td className="tabular px-4 py-3.5 text-right">
                <span className="block text-[16px] font-semibold text-up">{weeklyLabel(r.weeklyPercent)} <span className="text-[12px] font-normal text-mist">/ week</span></span>
                <span className="block text-[12px] text-mist">{r.apyPercent}% a year</span>
              </td>
              <td className="hidden px-4 py-3.5 text-right text-mist sm:table-cell">{r.interval === 'HOURLY' ? 'Every hour' : 'Every day'}</td>
              <td className="tabular hidden px-4 py-3.5 text-right md:table-cell">≈ {formatUsd(1000 * (Number(r.apyPercent) / 100))} earned</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Projects a deposit forward at today's published rate with the engine's
 * compounding. Clearly labelled as an illustration: rates are variable.
 */
export function YieldCalculator({ className, initialAsset }: { className?: string; initialAsset?: string }) {
  const rates = usePublicRates();
  const coins = useMarketCoins();
  const yields = rates.data?.yields ?? [];
  const [asset, setAsset] = useState<string>(initialAsset ?? '');
  const [amount, setAmount] = useState('5000');
  const [months, setMonths] = useState(12);

  const rate = yields.find((r) => r.asset === asset) ?? yields[0];
  const usd = Math.max(0, Math.min(10_000_000, Number(amount.replace(/[^\d.]/g, '')) || 0));
  const apy = rate ? Number(rate.apyPercent) : 0;

  const points = useMemo(
    () => Array.from({ length: months + 1 }, (_, m) => ({ m, principal: usd, balance: usd * growth(apy, m / 12) })),
    [usd, apy, months],
  );
  const end = points[points.length - 1];
  const spot = coins.data?.coins.find((c) => c.symbol === rate?.asset)?.priceUsd;

  if (rates.isLoading) return <Skeleton className={cn('h-[420px] w-full', className)} />;
  if (!rate) {
    return (
      <div className={cn('rounded-xl border border-rule bg-vault/60 p-6 text-[14px] text-mist', className)}>
        The calculator will be available once yield rates are published.
      </div>
    );
  }

  return (
    <div className={cn('grid gap-6 rounded-xl border border-rule bg-vault/60 p-5 sm:p-6 lg:grid-cols-[320px_1fr]', className)}>
      <div className="space-y-6">
        <div>
          <Label className="mb-2 block text-[12px] text-mist">Asset</Label>
          <Segmented
            label="Asset"
            value={rate.asset}
            onChange={setAsset}
            options={yields.map((r) => ({ value: r.asset, label: r.asset }))}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="calc-amount" className="mb-2 block text-[12px] text-mist">Amount (USD value)</Label>
          <Input id="calc-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular h-11 text-[16px]" />
          {spot && rate.asset !== 'USDT' && (
            <p className="mt-1.5 text-[12px] text-mist">
              ≈ {(usd / spot).toLocaleString('en-US', { maximumFractionDigits: 6 })} {rate.asset} at today’s price
            </p>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-[12px] text-mist">Time held</Label>
            <span className="tabular text-[13px]">{months} months</span>
          </div>
          <Slider min={1} max={60} step={1} value={[months]} onValueChange={(v) => setMonths(v[0])} aria-label="Months held" />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-rule pt-5">
          <Money label="Yield earned" value={formatUsd(end.balance - usd)} tone="up" />
          <Money label="Balance at the end" value={formatUsd(end.balance)} />
        </div>
        <p className="text-[12px] leading-relaxed text-mist">
          At today’s rate of {weeklyLabel(rate.weeklyPercent)} a week ({rate.apyPercent}% a year), paid {rate.interval === 'HOURLY' ? 'hourly' : 'daily'} and compounded. Figures are in
          {rate.asset === 'USDT' ? ' US dollars' : ` ${rate.asset} terms, shown at today’s USD value`}. Rates are variable and not guaranteed
          {rate.asset !== 'USDT' ? `; the dollar value also moves with the price of ${rate.asset}` : ''}.
        </p>
      </div>

      <div className="min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="calc-bal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis dataKey="m" tickFormatter={monthLabel} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis width={64} domain={[(min: number) => min * 0.98, 'auto']} tickFormatter={(v: number) => formatUsd(v, { compact: true }).replace('.00', '')} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<GrowthTip />} cursor={{ stroke: 'var(--rule-strong)' }} />
            <Area type="monotone" dataKey="principal" stroke="var(--mist)" strokeDasharray="4 4" strokeWidth={1.25} fill="none" isAnimationActive={false} name="Amount deposited" />
            <Area type="monotone" dataKey="balance" stroke="var(--brass)" strokeWidth={2} fill="url(#calc-bal)" isAnimationActive={false} name="Balance with yield" />
            <Legend verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12, color: 'var(--mist)' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RefTip({ active, payload }: { active?: boolean; payload?: { payload: { m: number; deposit: number; yieldShare: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">Month {p.m}</div>
      <div className="mt-1 flex justify-between gap-6"><span className="text-mist">Deposit rewards</span><span className="tabular">{formatUsd(p.deposit)}</span></div>
      <div className="flex justify-between gap-6"><span className="text-mist">Yield share</span><span className="tabular">{formatUsd(p.yieldShare)}</span></div>
    </div>
  );
}

/**
 * Referral rewards for a hypothetical group of friends, using the live reward
 * rates. Assumes friends join evenly over the first months and earn USDT yield.
 */
export function ReferralCalculator({ className }: { className?: string }) {
  const rates = usePublicRates();
  const [friends, setFriends] = useState(5);
  const [deposit, setDeposit] = useState(1000);
  const [spread, setSpread] = useState<'now' | 'year'>('year');

  const r = rates.data?.referral;
  const usdt = rates.data?.yields.find((y) => y.asset === 'USDT') ?? rates.data?.yields[0];
  const depositRate = r ? Number(r.depositRewardRate) : 0;
  const shareRate = r ? Number(r.affiliateYieldRate) : 0;
  const apy = usdt ? Number(usdt.apyPercent) : 0;

  const data = useMemo(() => {
    const monthlyYield = growth(apy, 1 / 12) - 1;
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const newcomers = spread === 'now' ? (m === 1 ? friends : 0) : friends / 12;
      const joined = spread === 'now' ? friends : (friends / 12) * m;
      return {
        m,
        deposit: newcomers * deposit * depositRate,
        yieldShare: joined * deposit * monthlyYield * shareRate,
      };
    });
  }, [friends, deposit, spread, apy, depositRate, shareRate]);

  const totals = data.reduce((s, d) => ({ deposit: s.deposit + d.deposit, yieldShare: s.yieldShare + d.yieldShare }), { deposit: 0, yieldShare: 0 });

  if (rates.isLoading) return <Skeleton className={cn('h-[420px] w-full', className)} />;
  if (!r) return null;

  return (
    <div className={cn('grid gap-6 rounded-xl border border-rule bg-vault/60 p-5 sm:p-6 lg:grid-cols-[320px_1fr]', className)}>
      <div className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-[12px] text-mist">Friends who join</Label>
            <span className="tabular text-[13px]">{friends}</span>
          </div>
          <Slider min={1} max={50} step={1} value={[friends]} onValueChange={(v) => setFriends(v[0])} aria-label="Friends who join" />
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Label className="text-[12px] text-mist">Average deposit each</Label>
            <span className="tabular text-[13px]">{formatUsd(deposit)}</span>
          </div>
          <Slider min={100} max={20000} step={100} value={[deposit]} onValueChange={(v) => setDeposit(v[0])} aria-label="Average deposit" />
        </div>
        <div>
          <Label className="mb-2 block text-[12px] text-mist">When they join</Label>
          <Segmented label="When friends join" value={spread} onChange={setSpread} options={[{ value: 'now', label: 'All this month' }, { value: 'year', label: 'Spread over a year' }]} className="w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-rule pt-5">
          <Money label="Deposit rewards" value={formatUsd(totals.deposit)} tone="brass" />
          <Money label="Yield share (12 months)" value={formatUsd(totals.yieldShare)} tone="up" />
        </div>
        <p className="text-[12px] leading-relaxed text-mist">
          Uses today’s rates: {formatPercent(depositRate * 100)} of each deposit and {formatPercent(shareRate * 100)} of the yield your friends earn
          {usdt ? `, assuming they hold USDT at ${usdt.apyPercent}% a year` : ''}. An illustration only; rates can change.
        </p>
      </div>
      <div className="min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--rule)" strokeDasharray="2 4" />
            <XAxis dataKey="m" tickFormatter={(m: number) => `M${m}`} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis width={56} tickFormatter={(v: number) => formatUsd(v, { compact: true }).replace('.00', '')} tick={{ fill: 'var(--mist)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<RefTip />} cursor={{ fill: 'var(--accent)' }} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, color: 'var(--mist)' }} />
            <Bar dataKey="deposit" stackId="a" fill="var(--brass)" name="Deposit rewards" isAnimationActive={false} />
            <Bar dataKey="yieldShare" stackId="a" fill="var(--up)" name="Yield share" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[12px] text-mist lg:col-span-2">
        <AuthSwitch
          signedIn={<>Your invite link is ready in the <Link href="/dashboard#invite" className="text-brass underline-offset-4 hover:underline">Invite friends card on your dashboard</Link>.</>}
          signedOut={<>Ready to invite people? <Link href="/register" className="text-brass underline-offset-4 hover:underline">Open an account</Link> and your invite link appears on your dashboard.</>}
        />
      </p>
    </div>
  );
}
