import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CircleAlert, CircleCheck, Clock } from 'lucide-react';
import { CoinMark } from '@/components/market/coin-mark';
import { CoinStats } from '@/components/market/coin-stats';
import { PriceChart } from '@/components/market/price-chart';
import { SourceNote } from '@/components/market/source-note';
import { CtaBand, FaqList, FeatureGrid, Section } from '@/components/site/blocks';
import { Badge } from '@/components/ui/badge';
import { AuthButton } from '@/components/site/auth-aware';
import { COIN_INFO, COIN_LIST } from '@/lib/coins';

/** Every coin/article is pre-rendered at build time, so waiting for params is instant in practice. */
export const instant = false;

export function generateStaticParams() {
  return COIN_LIST.map((c) => ({ symbol: c.symbol.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<'/markets/[symbol]'>): Promise<Metadata> {
  const { symbol } = await params;
  const coin = COIN_INFO[symbol.toUpperCase()];
  if (!coin) return {};
  return {
    title: `${coin.name} (${coin.symbol}) price, chart and profile`,
    description: `${coin.name} live price, market cap, volume and price history from 24 hours to one year. ${coin.tagline}`,
  };
}

export default async function CoinPage({ params }: PageProps<'/markets/[symbol]'>) {
  const { symbol } = await params;
  const coin = COIN_INFO[symbol.toUpperCase()];
  if (!coin) notFound();
  const others = COIN_LIST.filter((c) => c.symbol !== coin.symbol).slice(0, 6);
  const live = coin.deposits === 'live';

  return (
    <>
      <div className="relative border-b border-rule/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 55% 80% at 15% 0%, color-mix(in oklab, ${coin.color} 12%, transparent), transparent)` }} />
        <div className="relative mx-auto max-w-[1200px] px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[13px] text-mist">
            <Link href="/markets" className="hover:text-foreground">Markets</Link> <span aria-hidden="true">/</span> <span className="text-foreground">{coin.name}</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <CoinMark symbol={coin.symbol} size="lg" />
            <div>
              <h1 className="font-display text-[clamp(2.2rem,4.4vw,3.2rem)] leading-none">
                {coin.name} <span className="text-mist">{coin.symbol}</span>
              </h1>
              <p className="mt-2 text-[14px] text-mist">{coin.category}</p>
            </div>
            <Badge variant={live ? 'success' : 'pending'} className="sm:ml-auto">{live ? 'Deposits open' : 'Deposits coming soon'}</Badge>
          </div>
          <p className="mt-5 max-w-[64ch] text-[16px] leading-relaxed text-mist">{coin.tagline}</p>
          <div className="mt-8">
            <CoinStats symbol={coin.symbol} />
          </div>
        </div>
      </div>

      <Section eyebrow="Price history" title={`${coin.name} price chart`}>
        <PriceChart symbol={coin.symbol} defaultRange="30D" height={380} />
        <SourceNote className="mt-3" />
      </Section>

      <Section tone="band" eyebrow="About" title={`What is ${coin.name}?`}>
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">
            {coin.about.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <aside aria-label="Key facts" className="h-fit rounded-xl border border-rule bg-vault/60 p-5">
            <h3 className="text-[15px] font-semibold">Key facts</h3>
            <dl className="mt-3 divide-y divide-rule text-[14px]">
              {coin.facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-mist">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </Section>

      <Section eyebrow="Use cases" title={`What people use ${coin.symbol} for.`}>
        <FeatureGrid items={coin.useCases} />
      </Section>

      <Section tone="band" eyebrow="Deposits" title={live ? `Depositing ${coin.symbol}` : `${coin.symbol} deposits are on the way`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-rule bg-vault/60 p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              {live ? <CircleCheck className="size-4 text-up" /> : <Clock className="size-4 text-brass" />}
              {live ? 'Available now' : 'Not yet available'}
            </p>
            <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-mist">
              {coin.depositNotes.map((n) => <li key={n} className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />{n}</li>)}
            </ul>
            {live && (
              <div className="mt-6">
                <AuthButton href="/register" size="default" signedInLabel={`Deposit ${coin.symbol} from your dashboard`}>
                  Open account to deposit <ArrowRight />
                </AuthButton>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-rule bg-vault/60 p-6">
            <p className="text-[15px] font-semibold">Networks</p>
            <ul className="mt-4 divide-y divide-rule text-[14px]">
              {coin.networks.map((n) => (
                <li key={n.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>{n.name}</span>
                  <span className="text-mist">{[n.standard, n.note].filter(Boolean).join(' · ')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex gap-2.5 rounded-md border border-brass/30 bg-brass/5 p-3 text-[13px] leading-relaxed text-mist">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-brass" />
              Always send on the network shown on your deposit screen. Funds sent on a different network, or without a required memo or tag, may be lost.
            </p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Risks" title={`Risks of holding ${coin.symbol}.`}>
        <p className="max-w-[70ch] text-[16px] leading-[1.75] text-foreground/90">{coin.risks}</p>
        <p className="mt-4 max-w-[70ch] text-[14px] text-mist">
          Read our <Link href="/learn/understanding-volatility-and-risk" className="text-brass underline-offset-4 hover:underline">guide to volatility and risk</Link> and the full <Link href="/risk-disclosure" className="text-brass underline-offset-4 hover:underline">risk disclosure</Link>.
        </p>
      </Section>

      <Section tone="band" eyebrow="FAQ" title={`${coin.name} questions.`}>
        <FaqList items={coin.faq} />
      </Section>

      <Section eyebrow="Explore" title="Other coins.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {others.map((c) => (
            <Link key={c.symbol} href={`/markets/${c.symbol.toLowerCase()}`} className="group flex items-center gap-3 rounded-xl border border-rule bg-vault/50 p-4 hover:border-rule-strong">
              <CoinMark symbol={c.symbol} />
              <div>
                <p className="text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4">{c.name}</p>
                <p className="text-[12px] text-mist">{c.category}</p>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand title={`Follow ${coin.name} from your dashboard.`} body="Create a free account to track every coin, set your allocation and earn variable yield on the assets you hold." secondary={{ href: '/markets', label: 'All markets' }} />
    </>
  );
}
