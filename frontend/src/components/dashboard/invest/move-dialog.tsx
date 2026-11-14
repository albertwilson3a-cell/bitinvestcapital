'use client';

import { useState } from 'react';
import { ArrowDown, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { projectValue, useInvest, useInvestments, useRedeem, type InvestmentAsset } from '@/hooks/use-investments';
import { weeklyLabel } from '@/hooks/use-public';
import { usePrices } from '@/hooks/use-dashboard';
import { ApiError } from '@/lib/api';
import { formatAmount, formatUsd } from '@/lib/format';
import { ASSETS, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

type Mode = 'invest' | 'redeem';
const DECIMALS: Record<Asset, number> = { BTC: 8, ETH: 18, USDT: 6 };
const SHOW: Record<Asset, number> = { BTC: 8, ETH: 6, USDT: 2 };

/** Rounds down to the coin's precision so "Max" never asks for more than is there. */
function floorTo(value: number, asset: Asset) {
  const dp = Math.min(DECIMALS[asset], 8);
  const f = 10 ** dp;
  return (Math.floor(value * f) / f).toFixed(dp).replace(/\.?0+$/, '');
}

function Body({ mode, initialAsset, onDone }: { mode: Mode; initialAsset: Asset; onDone: (msg: string) => void }) {
  const summary = useInvestments();
  const prices = usePrices();
  const invest = useInvest();
  const redeem = useRedeem();
  const [asset, setAsset] = useState<Asset>(initialAsset);
  const [amount, setAmount] = useState('');
  const row = summary.data?.assets.find((a) => a.asset === asset);
  const minUsd = Number(summary.data?.minInvestmentUsd ?? 50);
  const price = Number(prices.data?.quotes.find((q) => q.asset === asset)?.usd ?? row?.usdPrice ?? 0) || null;
  const source = row ? Number(mode === 'invest' ? row.wallet : row.invested) : 0;
  const n = Number(amount || 0);
  const usd = price ? n * price : null;
  const weekly = row?.rate ? Number(row.rate.weeklyPercent) : 0;
  const mutation = mode === 'invest' ? invest : redeem;

  let problem: string | null = null;
  if (row && mode === 'invest' && !row.open) problem = `${asset} investments are not open right now.`;
  else if (amount && !/^\d+(\.\d+)?$/.test(amount)) problem = 'Enter a number.';
  else if (n > source) problem = mode === 'invest' ? `Only ${formatAmount(source, SHOW[asset])} ${asset} in your wallet.` : `Only ${formatAmount(source, SHOW[asset])} ${asset} invested.`;
  else if (mode === 'invest' && n > 0 && usd !== null && usd < minUsd) problem = `Minimum investment is ${formatUsd(minUsd)} (${row?.minAmount ?? '—'} ${asset}).`;

  const chips =
    mode === 'invest'
      ? [
          // The minimum chip uses the server's rounded-up amount so it always qualifies.
          ...(row?.minAmount && Number(row.minAmount) <= source ? [{ label: `Min $${minUsd}`, value: row.minAmount }] : []),
          ...(price ? [100, 500].filter((v) => v > minUsd && v / price <= source).map((v) => ({ label: `$${v}`, value: floorTo(v / price, asset) })) : []),
          { label: '50%', value: floorTo(source / 2, asset) },
          { label: 'Max', value: floorTo(source, asset) },
        ]
      : [
          { label: '25%', value: floorTo(source / 4, asset) },
          { label: '50%', value: floorTo(source / 2, asset) },
          { label: 'All', value: 'ALL' },
        ];
  const all = amount === 'ALL';
  const ready = all ? source > 0 : n > 0 && !problem;
  const errors = mutation.error instanceof ApiError ? mutation.error.messages : mutation.error ? ['Something went wrong. Please try again.'] : [];

  function submit() {
    if (!ready) return;
    if (mode === 'invest') {
      invest.mutate(
        { asset, amount },
        { onSuccess: (r) => onDone(`${formatAmount(r.amount, SHOW[asset])} ${asset} is now invested. It starts earning from the next payout period.`) },
      );
    } else {
      redeem.mutate(all ? { asset, all: true } : { asset, amount }, {
        onSuccess: (r) => onDone(`${formatAmount(r.amount, SHOW[asset])} ${asset} moved to your BitInvest wallet. You can withdraw it from there.`),
      });
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Segmented label="Coin" value={asset} onChange={(v) => { setAsset(v); setAmount(''); mutation.reset(); }} options={ASSETS.map((a) => ({ value: a, label: a }))} />

      {/* From → to */}
      <div className="rounded-lg border border-rule bg-ink/60">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] text-mist">
            {mode === 'invest' ? <Wallet className="size-4" /> : <TrendingUp className="size-4" />}
            From {mode === 'invest' ? 'BitInvest wallet' : 'Investment'}
          </span>
          <span className="tabular text-[13px]">{formatAmount(source, SHOW[asset])} {asset}</span>
        </div>
        <div className="relative border-t border-rule">
          <span className="absolute -top-3 left-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full border border-rule bg-vault text-mist"><ArrowDown className="size-3.5" /></span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] text-mist">
            {mode === 'invest' ? <TrendingUp className="size-4" /> : <Wallet className="size-4" />}
            To {mode === 'invest' ? 'Investment' : 'BitInvest wallet'}
          </span>
          <span className="tabular text-[13px]">{formatAmount(Number(mode === 'invest' ? row?.invested ?? 0 : row?.wallet ?? 0), SHOW[asset])} {asset}</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="move-amount">Amount ({asset})</Label>
        <Input
          id="move-amount"
          inputMode="decimal"
          autoComplete="off"
          value={all ? `All (${formatAmount(source, SHOW[asset])})` : amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          onFocus={() => all && setAmount('')}
          placeholder={mode === 'invest' && row?.minAmount ? `Min ${row.minAmount}` : '0.00'}
          className="h-12 text-[18px] tabular"
        />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button key={c.label} type="button" onClick={() => setAmount(c.value)} disabled={source <= 0}
              className={cn('min-h-8 rounded-md border border-rule px-3 text-[12.5px] text-mist hover:border-brass hover:text-foreground disabled:opacity-40', amount === c.value && 'border-brass text-foreground')}>
              {c.label}
            </button>
          ))}
        </div>
        <p className={cn('text-[12.5px]', problem ? 'text-down' : 'text-mist')}>
          {problem ?? (usd !== null && n > 0 ? `≈ ${formatUsd(usd)}` : mode === 'invest' ? `Minimum ${formatUsd(minUsd)}` : 'Moves to your wallet instantly')}
        </p>
      </div>

      {mode === 'invest' && n > 0 && !problem && weekly > 0 && usd !== null && (
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-up/25 bg-up/5 p-3 text-center">
          {[
            ['1 week', 1],
            ['3 months', 13],
            ['1 year', 52],
          ].map(([label, w]) => (
            <div key={label as string}>
              <p className="text-[11px] text-mist">{label}</p>
              <p className="tabular text-[14px] font-semibold text-up">+{formatUsd(projectValue(usd, weekly, w as number) - usd)}</p>
            </div>
          ))}
          <p className="col-span-3 text-[11px] text-mist">At today’s {weeklyLabel(weekly)} a week, compounding. Rates are variable{asset !== 'USDT' ? ` and ${asset}’s dollar value moves with its price` : ''}.</p>
        </div>
      )}
      {mode === 'redeem' && <p className="text-[12.5px] text-mist">Funds in your wallet stop earning. To send crypto out, move it to your wallet first, then use Withdraw.</p>}

      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-down/40 bg-down/5 p-3 text-[13px] text-down">{errors.map((m) => <p key={m}>{m}</p>)}</div>
      )}
      <Button type="submit" size="lg" disabled={!ready || mutation.isPending}>
        {mutation.isPending ? 'Moving…' : mode === 'invest' ? `Invest${n > 0 ? ` ${formatAmount(n, SHOW[asset])} ${asset}` : ''}` : `Move${all ? ' all' : n > 0 ? ` ${formatAmount(n, SHOW[asset])} ${asset}` : ''} to wallet`}
      </Button>
    </form>
  );
}

/** Invest (wallet → investment) or move back (investment → wallet). */
export function MoveDialog({ mode, asset = 'USDT', trigger }: { mode: Mode; asset?: Asset; trigger: React.ReactNode; row?: InvestmentAsset }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDone(null); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'invest' ? 'Invest' : 'Move to wallet'}</DialogTitle>
          <DialogDescription>
            {mode === 'invest'
              ? 'Choose how much to invest. The rest stays in your BitInvest wallet.'
              : 'Take funds out of your investment and back into your BitInvest wallet.'}
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-up" />
            <p className="max-w-sm text-[14px]">{done}</p>
            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <Body mode={mode} initialAsset={asset} onDone={setDone} />
        )}
      </DialogContent>
    </Dialog>
  );
}
