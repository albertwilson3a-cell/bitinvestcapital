'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, RotateCcw, TriangleAlert } from 'lucide-react';
import { DepositDialog } from '@/components/dashboard/deposit-dialog';
import { WithdrawDialog } from '@/components/dashboard/withdraw-dialog';
import { Panel } from '@/components/dashboard/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAllocations, usePortfolio, useSaveAllocations, type Holding } from '@/hooks/use-dashboard';
import { useTick } from '@/hooks/use-tick';
import { FULL, fromServer, setWeight, toPayload, toggle, total, zero, type Included, type Weights } from '@/lib/allocation';
import { ApiError } from '@/lib/api';
import { formatAmount, formatPercent, formatUsd } from '@/lib/format';
import { ASSET_META, ASSETS, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const STEP = 25; // 0.25%

function PercentInput({ value, disabled, onCommit, label }: { value: number; disabled: boolean; onCommit: (bp: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value / 100).toFixed(2);

  function commit() {
    if (draft === null) return;
    const n = Number(draft);
    if (Number.isFinite(n)) onCommit(Math.round(Math.min(100, Math.max(0, n)) * 100));
    setDraft(null);
  }

  return (
    <div className="relative w-[84px] shrink-0">
      <input
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={shown}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        className="h-8 w-full rounded-md border border-input bg-ink/60 pr-6 pl-2 text-right text-[14px] tabular outline-none hover:border-mist/40 focus-visible:border-brass focus-visible:ring-2 focus-visible:ring-brass/25 disabled:opacity-40"
      />
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[13px] text-mist">%</span>
    </div>
  );
}

function PriceCell({ holding }: { holding: Holding }) {
  const tick = useTick(holding.price);
  return (
    <div>
      <div
        key={tick.n}
        className={cn('text-[14px] tabular', tick.dir === 'up' && 'animate-flash-up', tick.dir === 'down' && 'animate-flash-down')}
      >
        {holding.price === null ? '—' : formatUsd(holding.price)}
      </div>
      <div
        className={cn(
          'text-[12px] tabular',
          holding.asset === 'USDT' || holding.change24h === null ? 'text-mist' : holding.change24h >= 0 ? 'text-up' : 'text-down',
        )}
      >
        {holding.asset === 'USDT' ? 'Pegged' : `${formatPercent(holding.change24h, { signed: true })} 24h`}
      </div>
    </div>
  );
}

function AssetRow({
  holding,
  weight,
  on,
  onWeight,
  onToggle,
  lastOn,
}: {
  holding: Holding;
  weight: number;
  on: boolean;
  onWeight: (bp: number) => void;
  onToggle: (on: boolean) => void;
  lastOn: boolean;
}) {
  const meta = ASSET_META[holding.asset];
  const current = holding.share * 100;
  return (
    <li className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 py-5 first:pt-1 last:pb-1 lg:grid-cols-[minmax(150px,1.1fr)_minmax(110px,0.8fr)_minmax(130px,0.9fr)_minmax(280px,2.2fr)_auto] lg:items-center lg:gap-x-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-md border text-[11px] font-semibold"
          style={{ borderColor: `color-mix(in oklab, ${meta.color} 45%, transparent)`, color: meta.color, background: `color-mix(in oklab, ${meta.color} 9%, transparent)` }}
          aria-hidden="true"
        >
          {holding.asset}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium">{meta.name}</div>
          <div className="truncate text-[12px] text-mist">{meta.network}</div>
        </div>
      </div>

      <PriceCell holding={holding} />

      <div className="text-right lg:text-left">
        <div className="text-[14px] tabular">
          {formatAmount(holding.amount, meta.decimals)} <span className="text-mist">{holding.asset}</span>
        </div>
        <div className="text-[12px] text-mist tabular">{holding.usd === null ? '—' : formatUsd(holding.usd)}</div>
      </div>

      <div className="col-span-2 flex items-center gap-4 lg:col-span-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Switch checked={on} onCheckedChange={onToggle} disabled={on && lastOn} aria-label={`Earn yield on ${meta.name}`} />
            </span>
          </TooltipTrigger>
          <TooltipContent>{on ? (lastOn ? 'At least one asset must stay in your allocation' : 'Earning yield. Switch off to stop.') : 'Not earning. Switch on to include.'}</TooltipContent>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <Slider
            value={[on ? weight : 0]}
            max={FULL}
            step={STEP}
            disabled={!on || lastOn}
            onValueChange={([v]) => onWeight(v)}
            rangeColor={meta.color}
            aria-label={`${meta.name} target allocation`}
          />
          {/* Where holdings actually sit today, against the target above. */}
          <div className="relative mt-1 h-[3px]" aria-hidden="true">
            <div className="absolute top-0 h-full rounded-full bg-mist/45" style={{ width: `${current}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-mist tabular">Holding {current.toFixed(1)}% today</div>
        </div>
        <PercentInput value={on ? weight : 0} disabled={!on || lastOn} onCommit={onWeight} label={`${meta.name} target percentage`} />
      </div>

      <div className="col-start-2 row-start-1 flex justify-end lg:col-start-auto lg:row-start-auto">
        <div className="flex gap-1.5">
          <DepositDialog wallet={holding.wallet} />
          <WithdrawDialog asset={holding.asset} />
        </div>
      </div>
    </li>
  );
}

export function AllocationPanel({ className }: { className?: string }) {
  const { data } = usePortfolio();
  const allocations = useAllocations();
  const save = useSaveAllocations();

  const saved = useMemo(() => (allocations.data ? fromServer(allocations.data.allocations) : null), [allocations.data]);
  const hasSaved = !!saved && ASSETS.some((a) => saved.included[a]);
  // What the sliders start from: the saved allocation, or an even split if none exists yet.
  const baseline = useMemo<{ weights: Weights; included: Included } | null>(() => {
    if (!saved) return null;
    return hasSaved ? saved : { weights: { BTC: 3334, ETH: 3333, USDT: 3333 }, included: { BTC: true, ETH: true, USDT: true } };
  }, [saved, hasSaved]);
  // Unsaved edits live in a draft layered over the baseline; null means "showing what's saved".
  const [draft, setDraft] = useState<{ weights: Weights; included: Included } | null>(null);
  const current = draft ?? baseline;
  const weights = current?.weights ?? zero();
  const included = current?.included ?? { BTC: false, ETH: false, USDT: false };

  const sum = total(weights, included);
  const activeCount = ASSETS.filter((a) => included[a]).length;
  const dirty =
    !!saved && (!hasSaved || ASSETS.some((a) => saved.included[a] !== included[a] || (included[a] && saved.weights[a] !== weights[a])));

  function reset() {
    setDraft(null);
  }

  async function submit() {
    try {
      await save.mutateAsync(toPayload(weights, included));
      setDraft(null);
      toast.success('Allocation saved', { description: 'Your next payout uses these settings.' });
    } catch (err) {
      toast.error('Allocation not saved', { description: err instanceof ApiError ? err.messages.join(' ') : 'Try again.' });
    }
  }

  return (
    <Panel
      id="allocation"
      title="Assets and allocation"
      description="Set your target mix. Assets switched on earn yield; the bar under each slider shows where your holdings sit today."
      className={className}
    >
      {!data || !current ? (
        <div className="flex flex-col gap-4 pt-2">
          {ASSETS.map((a) => (
            <Skeleton key={a} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-rule/70">
            {data.rows.map((h) => (
              <AssetRow
                key={h.asset}
                holding={h}
                weight={weights[h.asset]}
                on={included[h.asset]}
                lastOn={included[h.asset] && activeCount === 1}
                onWeight={(bp) => setDraft({ weights: setWeight(weights, included, h.asset as Asset, bp), included })}
                onToggle={(on) => setDraft(toggle(weights, included, h.asset as Asset, on))}
              />
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-4 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn('flex items-center gap-2 text-[13px] tabular', sum === FULL ? 'text-mist' : 'text-down')} role="status">
              {sum === FULL ? <Check className="size-4 text-up" /> : <TriangleAlert className="size-4" />}
              {(sum / 100).toFixed(2)}% allocated across {activeCount} {activeCount === 1 ? 'asset' : 'assets'}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset} disabled={!dirty || save.isPending}>
                <RotateCcw /> Reset
              </Button>
              <Button onClick={submit} disabled={!dirty || sum !== FULL || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save allocation'}
              </Button>
            </div>
          </div>
        </>
      )}
    </Panel>
  );
}
