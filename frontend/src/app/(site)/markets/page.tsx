import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketShareChart, MarketStats, Movers, VolumeChart } from '@/components/market/market-overview';
import { MarketTable } from '@/components/market/market-table';
import { PriceChart } from '@/components/market/price-chart';
import { SourceNote } from '@/components/market/source-note';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section } from '@/components/site/blocks';
import { CoinMark } from '@/components/market/coin-mark';
import { Badge } from '@/components/ui/badge';
import { COIN_LIST, NETWORKS } from '@/lib/coins';

export const metadata: Metadata = {
  title: 'Crypto markets: live prices and charts',
  description: 'Live prices, 24-hour and 7-day changes, market capitalisation, volume and price charts for Bitcoin, Ethereum, BNB, Solana, XRP, Cardano, TRON, TON, Avalanche, Polygon, Cosmos, Arbitrum, USDT and USDC.',
};

const MARKETS_FAQ = [
  { q: 'Where do your prices come from?', a: 'Live prices, market caps and volumes come from CoinGecko, which aggregates trading data from hundreds of exchanges. Prices refresh every few seconds on this page.' },
  { q: 'What is market capitalisation?', a: 'The current price multiplied by the number of coins in circulation. It is a rough measure of a network’s overall size, not the amount of money invested in it.' },
  { q: 'What does 24h volume tell me?', a: 'The value of a coin traded across all markets in the past day. Higher volume usually means it is easier to buy or sell without moving the price much.' },
  { q: 'Can I buy every coin listed here?', a: 'You can follow every coin now. Deposits are open for BTC, ETH and USDT, and are being added network by network for the rest. Each coin page shows its current status.' },
  { q: 'Why do stablecoins show almost no movement?', a: 'USDT and USDC are designed to stay at $1. Small moves of a fraction of a cent are normal as they are traded.' },
];

export default function MarketsPage() {
  return (
    <>
      <PageHero
        eyebrow="Markets"
        title="Live crypto prices, charts and market data."
        intro="Track the 14 coins we support across 12 blockchains: prices, momentum, size and trading activity, with full price history for each one."
      />

      <div className="mx-auto max-w-[1200px] px-4 pt-10 sm:px-6">
        <MarketStats />
      </div>

      <Section eyebrow="Price chart" title="Compare any coin over any timeframe.">
        <PriceChart selectable symbol="BTC" defaultRange="30D" height={380} />
      </Section>

      <Section tone="band" eyebrow="All coins" title="Today’s market." intro="Sort by any column. Select a coin for its full profile, history and deposit details.">
        <div className="rounded-xl border border-rule bg-vault/40 p-2 sm:p-4">
          <MarketTable />
        </div>
        <SourceNote className="mt-4" />
      </Section>

      <Section eyebrow="Momentum" title="Who’s moving today.">
        <Movers />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <MarketShareChart />
          <VolumeChart />
        </div>
      </Section>

      <Section tone="band" eyebrow="Coin directory" title="Get to know each network." intro="Short profiles of every coin we support. Open a coin for its full history, key facts and how deposits work.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COIN_LIST.map((c) => (
            <Link key={c.symbol} href={`/markets/${c.symbol.toLowerCase()}`} className="group flex gap-4 rounded-xl border border-rule bg-vault/50 p-5 transition-colors hover:border-rule-strong">
              <CoinMark symbol={c.symbol} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">{c.name}</p>
                  <Badge variant={c.deposits === 'live' ? 'success' : 'neutral'} className="text-[10px]">{c.deposits === 'live' ? 'Deposits open' : 'Deposits soon'}</Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-mist">{c.category}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-mist">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Networks and tokens" title="Where each coin lives." intro="The same asset can exist on several blockchains. When you deposit, the network matters as much as the coin.">
        <div className="overflow-x-auto rounded-xl border border-rule">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead className="bg-vault/70 text-[12px] text-mist">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Network</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Coins and tokens</th>
                <th scope="col" className="px-4 py-3 text-left font-medium">Standard</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Deposits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {NETWORKS.map((n) => (
                <tr key={n.name} className="bg-vault/30">
                  <td className="px-4 py-3 font-medium">{n.name}</td>
                  <td className="px-4 py-3 text-mist">{n.coins}</td>
                  <td className="px-4 py-3 text-mist">{n.standard}</td>
                  <td className="px-4 py-3 text-right"><Badge variant={n.status === 'live' ? 'success' : 'pending'}>{n.status === 'live' ? 'Live' : 'Coming soon'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[80ch] text-[13px] text-mist">
          ERC-20 tokens live on Ethereum and BEP-20 tokens on BNB Smart Chain. We are adding a curated list of widely used tokens on both networks;
          each will be listed here before deposits open. Never send a token that is not listed on your deposit screen.
        </p>
      </Section>

      <Section tone="band" eyebrow="Reading the numbers" title="What the market data means.">
        <FeatureGrid
          items={[
            { title: 'Price', body: 'The latest traded price in US dollars, averaged across many exchanges.' },
            { title: '24h and 7d change', body: 'How much the price has moved over the last day and week. Green is up, red is down.' },
            { title: 'Market cap', body: 'Price × circulating supply. Useful for comparing the size of networks, though it is not money “invested”.' },
            { title: '24h volume', body: 'The value traded in the last day. Higher volume generally means deeper, more liquid markets.' },
            { title: '7-day sparkline', body: 'A small chart of the last week, so you can see the trend at a glance.' },
            { title: 'Price chart ranges', body: '1D shows five-minute detail; 1Y shows one point per day. High, low and open refer to the range you select.' },
          ]}
        />
      </Section>

      <Section eyebrow="FAQ" title="Questions about market data.">
        <FaqList items={MARKETS_FAQ} />
      </Section>

      <CtaBand title="Follow the market from your own dashboard." body="Your account comes with the same live charts for every coin, alongside your investment, growth charts and returns." />
    </>
  );
}
