'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Sparkline } from '@/components/market/sparkline';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTick } from '@/hooks/use-tick';
import { useMarketCoins, type CoinMarket } from '@/hooks/use-market';
import { COIN_INFO } from '@/lib/coins';
import { formatCompact, formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

type SortKey = 'marketCapUsd' | 'priceUsd' | 'change24hPercent' | 'change7dPercent' | 'volume24hUsd';

function Price({ value }: { value: number }) {
  const tick = useTick(value);
  return (
    <span key={tick.n} className={cn('tabular', tick.dir === 'up' && 'animate-flash-up', tick.dir === 'down' && 'animate-flash-down')}>
      {formatPrice(value)}
    </span>
  );
}

function SortHead({ label, k, sort, setSort, className }: { label: string; k: SortKey; sort: { key: SortKey; desc: boolean }; setSort: (s: { key: SortKey; desc: boolean }) => void; className?: string }) {
  const active = sort.key === k;
  return (
    <th scope="col" className={cn('px-3 py-2.5 text-right font-medium', className)} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
      <button
        type="button"
        onClick={() => setSort({ key: k, desc: active ? !sort.desc : true })}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
      >
        {label}
        {active && (sort.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </th>
  );
}

/**
 * Every supported coin with live price, 24h/7d change, market cap, volume and a
 * 7-day sparkline. Rows link to the coin's page (or call onSelect).
 */
export function MarketTable({
  limit,
  hrefBase = '/markets',
  onSelect,
  selected,
  showDeposits = true,
  className,
}: {
  limit?: number;
  hrefBase?: string | null;
  onSelect?: (symbol: string) => void;
  selected?: string;
  showDeposits?: boolean;
  className?: string;
}) {
  const { data, isLoading, isError } = useMarketCoins();
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'marketCapUsd', desc: true });

  const rows = useMemo(() => {
    const list = [...(data?.coins ?? [])].sort((a, b) => {
      const av = a[sort.key] ?? -Infinity;
      const bv = b[sort.key] ?? -Infinity;
      return sort.desc ? bv - av : av - bv;
    });
    return limit ? list.slice(0, limit) : list;
  }, [data, sort, limit]);

  const rank = useMemo(() => {
    const byCap = [...(data?.coins ?? [])].sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
    return new Map(byCap.map((c, i) => [c.symbol, i + 1]));
  }, [data]);

  if (isError) return <p className="py-10 text-center text-[13px] text-mist">Market data is temporarily unavailable.</p>;

  return (
    <div className={cn('-mx-4 overflow-x-auto sm:mx-0', className)}>
      <table className="w-full min-w-[720px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-rule text-[12px] text-mist">
            <th scope="col" className="w-10 px-3 py-2.5 text-left font-medium">#</th>
            <th scope="col" className="px-3 py-2.5 text-left font-medium">Coin</th>
            <SortHead label="Price" k="priceUsd" sort={sort} setSort={setSort} />
            <SortHead label="24h" k="change24hPercent" sort={sort} setSort={setSort} />
            <SortHead label="7d" k="change7dPercent" sort={sort} setSort={setSort} />
            <SortHead label="Market cap" k="marketCapUsd" sort={sort} setSort={setSort} className="hidden md:table-cell" />
            <SortHead label="Volume (24h)" k="volume24hUsd" sort={sort} setSort={setSort} className="hidden lg:table-cell" />
            <th scope="col" className="px-3 py-2.5 text-right font-medium">Last 7 days</th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: limit ?? 8 }, (_, i) => (
                <tr key={i} className="border-b border-rule/60">
                  <td colSpan={8} className="px-3 py-3">
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))
            : rows.map((c) => <Row key={c.symbol} c={c} rank={rank.get(c.symbol) ?? 0} hrefBase={hrefBase} onSelect={onSelect} selected={selected === c.symbol} showDeposits={showDeposits} />)}
        </tbody>
      </table>
    </div>
  );
}

function Row({ c, rank, hrefBase, onSelect, selected, showDeposits }: { c: CoinMarket; rank: number; hrefBase: string | null | undefined; onSelect?: (s: string) => void; selected: boolean; showDeposits: boolean }) {
  const info = COIN_INFO[c.symbol];
  const name = (
    <span className="flex items-center gap-2.5">
      <CoinMark symbol={c.symbol} />
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{c.name}</span>
        <span className="block text-[12px] text-mist">{c.symbol}</span>
      </span>
      {showDeposits && info?.deposits === 'live' && (
        <Badge variant="success" className="ml-1 hidden text-[10px] sm:inline-flex">
          Deposits open
        </Badge>
      )}
    </span>
  );
  return (
    <tr
      className={cn('border-b border-rule/60 transition-colors hover:bg-accent/40', onSelect && 'cursor-pointer', selected && 'bg-accent/60')}
      onClick={onSelect ? () => onSelect(c.symbol) : undefined}
    >
      <td className="tabular px-3 py-3 text-mist">{rank}</td>
      <td className="px-3 py-3">
        {hrefBase && !onSelect ? (
          <Link href={`${hrefBase}/${c.symbol.toLowerCase()}`} className="rounded-sm hover:underline hover:underline-offset-4">
            {name}
          </Link>
        ) : onSelect ? (
          <button type="button" className="text-left" aria-pressed={selected} onClick={(e) => { e.stopPropagation(); onSelect(c.symbol); }}>
            {name}
          </button>
        ) : (
          name
        )}
      </td>
      <td className="px-3 py-3 text-right font-medium"><Price value={c.priceUsd} /></td>
      <td className="px-3 py-3 text-right"><Change value={c.change24hPercent} /></td>
      <td className="px-3 py-3 text-right"><Change value={c.change7dPercent} /></td>
      <td className="tabular hidden px-3 py-3 text-right md:table-cell">{formatCompact(c.marketCapUsd)}</td>
      <td className="tabular hidden px-3 py-3 text-right text-mist lg:table-cell">{formatCompact(c.volume24hUsd)}</td>
      <td className="px-3 py-2 text-right"><Sparkline values={c.sparkline7d} className="ml-auto" /></td>
    </tr>
  );
}
