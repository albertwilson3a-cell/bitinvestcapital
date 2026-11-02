'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Sparkline } from '@/components/market/sparkline';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketCoins, type CoinMarket } from '@/hooks/use-market';
import { COIN_INFO, COIN_LIST } from '@/lib/coins';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS = ['Popular', 'Gainers', 'Losers', 'Stablecoins', 'Coming soon'] as const;
type Tab = (typeof TABS)[number];

function pick(tab: Tab, coins: CoinMarket[]) {
  const vol = coins.filter((c) => c.symbol !== 'USDT' && c.symbol !== 'USDC');
  switch (tab) {
    case 'Popular':
      return [...coins].sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0)).slice(0, 5);
    case 'Gainers':
      return [...vol].sort((a, b) => (b.change24hPercent ?? 0) - (a.change24hPercent ?? 0)).slice(0, 5);
    case 'Losers':
      return [...vol].sort((a, b) => (a.change24hPercent ?? 0) - (b.change24hPercent ?? 0)).slice(0, 5);
    case 'Stablecoins':
      return coins.filter((c) => c.symbol === 'USDT' || c.symbol === 'USDC');
    case 'Coming soon':
      return coins.filter((c) => COIN_INFO[c.symbol]?.deposits === 'soon').slice(0, 5);
  }
}

/** Hero markets card with tabs, in the style of an exchange homepage. */
export function MarketTabsCard() {
  const { data } = useMarketCoins();
  const [tab, setTab] = useState<Tab>('Popular');
  const rows = data ? pick(tab, data.coins) : null;
  return (
    <section aria-label="Markets" className="rounded-2xl border border-rule bg-vault/80 p-5">
      <div className="flex items-center gap-4 overflow-x-auto border-b border-rule pb-3 text-[13px]" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn('relative shrink-0 pb-1 font-medium text-mist transition-colors hover:text-foreground', tab === t && 'text-foreground after:absolute after:inset-x-0 after:-bottom-[13px] after:mx-auto after:h-0.5 after:w-4 after:rounded-full after:bg-brass')}
          >
            {t}
          </button>
        ))}
        <Link href="/markets" className="ml-auto shrink-0 text-[12px] text-mist hover:text-foreground">View all →</Link>
      </div>
      <ul className="mt-2" role="tabpanel">
        {!rows
          ? Array.from({ length: 5 }, (_, i) => <li key={i} className="py-2.5"><Skeleton className="h-7 w-full" /></li>)
          : rows.map((c) => (
              <li key={c.symbol}>
                <Link href={`/markets/${c.symbol.toLowerCase()}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-md px-1 py-2.5 hover:bg-accent/40">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CoinMark symbol={c.symbol} size="sm" />
                    <span className="text-[14px] font-semibold">{c.symbol}</span>
                    <span className="truncate text-[12.5px] text-mist">{c.name}</span>
                  </span>
                  <span className="tabular text-right text-[14px] font-semibold">{formatPrice(c.priceUsd)}</span>
                  <Change value={c.change24hPercent} className="w-16 text-right text-[13px]" />
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

/** Every coin as a card with price and 7-day trend. */
export function ExploreAssets() {
  const { data } = useMarketCoins();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
      {COIN_LIST.map((info) => {
        const c = data?.coins.find((x) => x.symbol === info.symbol);
        return (
          <Link key={info.symbol} href={`/markets/${info.symbol.toLowerCase()}`} className="group rounded-xl border border-rule bg-vault/60 p-4 transition-colors hover:border-rule-strong">
            <div className="flex items-center gap-2">
              <CoinMark symbol={info.symbol} size="sm" />
              <span className="text-[13px] font-semibold">{info.symbol}</span>
            </div>
            <p className="mt-1 truncate text-[12px] text-mist">{info.name}</p>
            {c ? (
              <>
                <p className="tabular mt-3 text-[15px] font-semibold">{formatPrice(c.priceUsd)}</p>
                <Change value={c.change24hPercent} className="text-[12px]" />
                <Sparkline values={c.sparkline7d} width={120} height={28} className="mt-2 w-full" />
              </>
            ) : (
              <Skeleton className="mt-3 h-16 w-full" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
