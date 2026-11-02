import type { Metadata } from 'next';
import Link from 'next/link';
import { HistoryGrid } from '@/components/market/history-grid';
import { PriceChart } from '@/components/market/price-chart';
import { SourceNote } from '@/components/market/source-note';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section } from '@/components/site/blocks';

export const metadata: Metadata = {
  title: 'Historical crypto market data',
  description: 'One-year, 90-day and 30-day price history and performance for Bitcoin, Ethereum and 12 other major cryptocurrencies.',
};

export default function HistoryPage() {
  return (
    <>
      <PageHero eyebrow="Markets" title="Historical market data." intro="See how every coin we cover has performed over the past month, quarter and year, side by side. Open any chart for the full history and profile." />
      <Section eyebrow="All coins" title="Performance at a glance.">
        <HistoryGrid />
        <SourceNote className="mt-4" />
      </Section>
      <Section tone="band" eyebrow="Deep dive" title="Explore any coin in detail.">
        <PriceChart selectable symbol="ETH" defaultRange="1Y" height={360} />
      </Section>
      <Section eyebrow="Using the data" title="How to read historical performance.">
        <FeatureGrid
          items={[
            { title: 'Compare like with like', body: 'Use the same period for every coin. A coin that looks strong over 30 days may be down over a year.' },
            { title: 'Mind the range', body: 'High and low show how far a coin moved within the period. A wide range means high volatility.' },
            { title: 'Stablecoins as a baseline', body: 'USDT and USDC should stay close to 0%. They show what “no price movement” looks like.' },
            { title: 'Past is not future', body: 'Historical returns don’t predict future returns. Use them to understand risk, not to forecast prices.' },
            { title: 'Look at size too', body: 'Big moves are more common in smaller coins. Check market cap on each coin’s page.' },
            { title: 'Learn more', body: <>Read <Link href="/learn/how-to-read-crypto-charts" className="text-brass">how to read crypto charts</Link>.</> },
          ]}
        />
      </Section>
      <Section tone="band" eyebrow="FAQ" title="Questions about market data.">
        <FaqList
          items={[
            { q: 'Where does the historical data come from?', a: 'From CoinGecko, which aggregates trades from hundreds of exchanges. Points are every five minutes for 1D, hourly for 7D, every few hours for 30D and 90D, and daily for 1Y.' },
            { q: 'Can I download the data?', a: 'Not yet. Hover over any chart to see the exact price at each point.' },
            { q: 'Why don’t the numbers match my exchange exactly?', a: 'Each exchange has its own trades. Our figures are averages across many markets, so small differences are normal.' },
          ]}
        />
      </Section>
      <CtaBand title="Track every market from your portfolio." body="Clients get the same charts inside their dashboard, alongside their balances and returns." />
    </>
  );
}
