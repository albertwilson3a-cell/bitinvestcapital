import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CoinMark } from '@/components/market/coin-mark';
import { PriceChart } from '@/components/market/price-chart';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section, Steps } from '@/components/site/blocks';
import { YieldCalculator } from '@/components/site/calculators';
import { AssetExample, AssetRate } from '@/components/site/earn-asset';
import { COIN_INFO } from '@/lib/coins';

export const instant = false;

const ASSETS: Record<string, { example: number; unit: string; why: string[]; risk: string; faq: { q: string; a: string }[] }> = {
  usdt: {
    example: 10_000,
    unit: 'USD',
    why: [
      'USDT is designed to stay at $1, so the yield you earn is easy to understand in dollar terms. That makes it the most popular choice for people who want their balance to grow without the price swings of bitcoin or ether.',
      'Demand to borrow dollar stablecoins is usually strong across crypto markets, which is why stablecoin rates are typically higher than rates on BTC or ETH.',
    ],
    risk: 'USDT depends on its issuer keeping sufficient reserves. It has briefly traded below $1 during market stress, and issuers can freeze tokens at specific addresses.',
    faq: [
      { q: 'Is my USDT yield paid in dollars?', a: 'It is paid in USDT, which we value at $1 on your balance.' },
      { q: 'Which network should I use to deposit USDT?', a: 'Ethereum (ERC-20). TRON and BNB Smart Chain are coming soon.' },
    ],
  },
  btc: {
    example: 0.5,
    unit: 'BTC',
    why: [
      'Many bitcoin holders plan to hold for years. Earning lets that bitcoin grow in quantity while you hold it, with yield paid in BTC.',
      'Rates on bitcoin are usually lower than on stablecoins, because demand to borrow bitcoin is lower.',
    ],
    risk: 'Your yield is paid in BTC, so its dollar value rises and falls with the bitcoin price. A small yield does not protect you from a large price fall.',
    faq: [
      { q: 'Is BTC yield paid in bitcoin?', a: 'Yes. Payouts are in BTC, rounded down to the nearest satoshi.' },
      { q: 'Does earning lock my bitcoin?', a: 'No. You can switch BTC off in your allocation at any time; it stops earning from the next period.' },
    ],
  },
  eth: {
    example: 5,
    unit: 'ETH',
    why: [
      'Ether is the fuel of the largest smart-contract ecosystem. Earning on ETH grows the amount of ether you hold, with yield paid in ETH.',
      'You don’t need to run a validator or manage staking yourself: switch ETH on in your allocation and payouts arrive automatically.',
    ],
    risk: 'Your yield is paid in ETH, so its dollar value moves with the ether price, which can be very volatile.',
    faq: [
      { q: 'Is this the same as staking ETH myself?', a: 'No. On BitInvest Capital, yield is paid by our platform at the published rate. You don’t run a validator, and your ETH isn’t locked.' },
      { q: 'Is ETH yield paid in ether?', a: 'Yes, in ETH, credited to your balance.' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(ASSETS).map((asset) => ({ asset }));
}

export async function generateMetadata({ params }: PageProps<'/earn/[asset]'>): Promise<Metadata> {
  const { asset } = await params;
  const c = COIN_INFO[asset.toUpperCase()];
  return c && ASSETS[asset] ? { title: `${c.symbol} Earn: variable yield on ${c.name}`, description: `Current ${c.symbol} rate, a compounding calculator, examples and FAQs for earning on ${c.name}.` } : {};
}

export default async function EarnAssetPage({ params }: PageProps<'/earn/[asset]'>) {
  const { asset } = await params;
  const cfg = ASSETS[asset];
  const c = COIN_INFO[asset.toUpperCase()];
  if (!cfg || !c) notFound();

  return (
    <>
      <PageHero
        eyebrow={`${c.symbol} Earn`}
        title={<span className="flex items-center gap-4"><CoinMark symbol={c.symbol} size="lg" /> Earn on {c.name}.</span>}
        intro={`Switch on ${c.symbol} in your allocation and yield is credited to your balance automatically, compounding as it goes.`}
        aside={<AssetRate asset={c.symbol} />}
      />
      <Section eyebrow="Calculator" title={`See how ${c.symbol} could grow.`}>
        <YieldCalculator initialAsset={c.symbol} />
      </Section>
      <Section tone="band" eyebrow="Example" title={`${cfg.unit === 'USD' ? '$10,000' : `${cfg.example} ${cfg.unit}`} held over time.`}>
        <AssetExample asset={c.symbol} amount={cfg.example} unit={cfg.unit} />
      </Section>
      <Section eyebrow="Why earn" title={`Why people earn on ${c.symbol}.`}>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">{cfg.why.map((p) => <p key={p}>{p}</p>)}</div>
          <FeatureGrid
            columns={2}
            items={[
              { title: 'No lock-up', body: 'Switch earning on or off whenever you like.' },
              { title: 'Automatic compounding', body: 'Each payout earns in the next period.' },
              { title: 'Full history', body: 'Every payout appears in your activity list.' },
              { title: 'No management fee', body: 'The published rate is what you receive.' },
            ]}
          />
        </div>
      </Section>
      <Section tone="band" eyebrow="How to start" title="Start earning in four steps.">
        <Steps
          steps={[
            { title: 'Open an account', body: 'Sign up and confirm your email.' },
            { title: `Deposit ${c.symbol}`, body: <>Follow <Link href={`/buy/${asset}`} className="text-brass">how to buy {c.name}</Link> and send to your dedicated address.</> },
            { title: 'Switch it on', body: `Include ${c.symbol} in your allocation and save.` },
            { title: 'Get paid', body: 'Payouts arrive automatically from the next full period.' },
          ]}
        />
      </Section>
      <Section eyebrow="Market" title={`${c.name} price.`}>
        <PriceChart symbol={c.symbol} defaultRange="1Y" height={320} />
      </Section>
      <Section tone="band" eyebrow="Risks" title="Before you start.">
        <p className="max-w-[70ch] text-[16px] leading-[1.75] text-foreground/90">{cfg.risk} Rates are variable and may be changed or paused at any time.</p>
      </Section>
      <Section eyebrow="FAQ" title={`${c.symbol} Earn questions.`}>
        <FaqList
          items={[
            ...cfg.faq,
            { q: 'When does a new deposit start earning?', a: 'From the next full payout period after it is credited. For daily rates, that means from the next 00:00 UTC.' },
            { q: 'Can the rate change?', a: 'Yes. All rates are variable. The live rate is always shown at the top of this page.' },
          ]}
        />
      </Section>
      <CtaBand title={`Start earning on ${c.symbol}.`} body="Open an account, deposit and switch on earning in a few minutes." secondary={{ href: '/earn', label: 'All rates' }} />
    </>
  );
}
