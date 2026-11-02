'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Panel } from '@/components/dashboard/panel';
import { MarketShareChart, MarketStats, Movers, VolumeChart } from '@/components/market/market-overview';
import { MarketTable } from '@/components/market/market-table';
import { PriceChart } from '@/components/market/price-chart';
import { SourceNote } from '@/components/market/source-note';
import { COIN_INFO } from '@/lib/coins';

/** Signed-in markets view: pick a coin in the table to chart it. */
export function DashboardMarkets() {
  const [symbol, setSymbol] = useState('BTC');
  const info = COIN_INFO[symbol];
  return (
    <>
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Markets</h1>
        <p className="mt-1 text-[14px] text-mist">Live prices and charts for every coin we cover. Select a row to chart it.</p>
      </div>
      <MarketStats />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <PriceChart key={symbol} symbol={symbol} selectable onSymbolChange={setSymbol} defaultRange="30D" height={360} />
        <Panel title={`About ${info?.name ?? symbol}`} description={info?.category}>
          <p className="text-[14px] leading-relaxed text-mist">{info?.about[0]}</p>
          <dl className="mt-4 divide-y divide-rule text-[13px]">
            {info?.facts.slice(0, 4).map((f) => (
              <div key={f.label} className="flex justify-between gap-4 py-2">
                <dt className="text-mist">{f.label}</dt>
                <dd className="text-right">{f.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px]">
            {info?.deposits === 'live' ? (
              <span className="text-up">Deposits open. Use the Deposit button on your portfolio page.</span>
            ) : (
              <span className="text-brass">Deposits coming soon.</span>
            )}{' '}
            <Link href={`/markets/${symbol.toLowerCase()}`} className="text-mist underline-offset-4 hover:text-foreground hover:underline">Full profile</Link>
          </p>
        </Panel>
      </div>
      <Panel title="All coins" description="Sort by any column.">
        <MarketTable onSelect={setSymbol} selected={symbol} hrefBase={null} />
        <SourceNote className="mt-3" />
      </Panel>
      <Movers hrefBase="/markets" />
      <div className="grid gap-5 lg:grid-cols-2">
        <MarketShareChart />
        <VolumeChart />
      </div>
    </>
  );
}
