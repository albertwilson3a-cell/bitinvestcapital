import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CircleAlert, CircleCheck, Clock } from 'lucide-react';
import { CoinMark } from '@/components/market/coin-mark';
import { CoinStats } from '@/components/market/coin-stats';
import { PriceChart } from '@/components/market/price-chart';
import { CtaBand, FaqList, FeatureGrid, Section, Steps } from '@/components/site/blocks';
import { Badge } from '@/components/ui/badge';
import { AuthButton } from '@/components/site/auth-aware';
import { Button } from '@/components/ui/button';
import { COIN_INFO, COIN_LIST } from '@/lib/coins';

/** Every coin is pre-rendered at build time. */
export const instant = false;

export function generateStaticParams() {
  return COIN_LIST.map((c) => ({ coin: c.symbol.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<'/buy/[coin]'>): Promise<Metadata> {
  const { coin } = await params;
  const c = COIN_INFO[coin.toUpperCase()];
  return c ? { title: `How to buy ${c.name} (${c.symbol})`, description: `A step-by-step guide to buying ${c.name} safely, choosing the right network and depositing it.` } : {};
}

export default async function BuyCoinPage({ params }: PageProps<'/buy/[coin]'>) {
  const { coin } = await params;
  const c = COIN_INFO[coin.toUpperCase()];
  if (!c) notFound();
  const live = c.deposits === 'live';
  const net = c.networks[0];
  const others = COIN_LIST.filter((x) => x.symbol !== c.symbol).slice(0, 8);

  const steps = live
    ? [
        { title: 'Open your account', body: 'Sign up and confirm your email. Your deposit addresses are ready when you log in.' },
        { title: `Buy ${c.symbol}`, body: `Buy ${c.name} on an exchange, broker or peer-to-peer marketplace that operates in your country.` },
        { title: 'Copy your address', body: `In your dashboard press Deposit, choose ${c.symbol} and copy your personal ${net?.name} address.` },
        { title: 'Withdraw to it', body: `On the exchange, withdraw ${c.symbol} using the ${net?.name} network${net?.standard ? ` (${net.standard})` : ''} and paste your address.` },
      ]
    : [
        { title: `Buy ${c.symbol}`, body: `Buy ${c.name} on an exchange, broker or peer-to-peer marketplace that operates in your country.` },
        { title: 'Keep it safe for now', body: `Hold it on the exchange or in a wallet you control. ${c.symbol} deposits to BitInvest Capital aren’t open yet.` },
        { title: 'Follow the market', body: `Track ${c.name}’s price here and in your dashboard’s Markets tab.` },
        { title: 'Deposit when we open', body: 'We announce every new network before deposits open, together with the exact network and any memo or tag required.' },
      ];

  return (
    <>
      <div className="relative border-b border-rule/70">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 55% 80% at 15% 0%, color-mix(in oklab, ${c.color} 12%, transparent), transparent)` }} />
        <div className="relative mx-auto max-w-[1200px] px-4 pt-12 pb-10 sm:px-6 lg:pt-16">
          <nav aria-label="Breadcrumb" className="text-[13px] text-mist">
            <Link href="/buy-crypto" className="hover:text-foreground">Buy crypto</Link> <span aria-hidden="true">/</span> <span className="text-foreground">{c.name}</span>
          </nav>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <CoinMark symbol={c.symbol} size="lg" />
            <h1 className="font-display text-[clamp(2.2rem,4.4vw,3.2rem)] leading-none">How to buy {c.name}</h1>
            <Badge variant={live ? 'success' : 'pending'} className="sm:ml-auto">{live ? 'Deposits open' : 'Deposits coming soon'}</Badge>
          </div>
          <p className="mt-5 max-w-[64ch] text-[16px] leading-relaxed text-mist">
            {c.tagline} This guide walks you through buying {c.symbol} safely{live ? ' and depositing it to your BitInvest Capital account' : ''}.
          </p>
          <div className="mt-8"><CoinStats symbol={c.symbol} /></div>
        </div>
      </div>

      <Section eyebrow="Step by step" title={`Buying ${c.symbol} in four steps.`}>
        <Steps steps={steps} />
        <div className="mt-8 flex flex-wrap gap-3">
          <AuthButton href="/register" signedInLabel={live ? `Deposit ${c.symbol} from your dashboard` : undefined}>Sign Up <ArrowRight /></AuthButton>
          <Button asChild size="lg" variant="outline"><Link href={`/markets/${c.symbol.toLowerCase()}`}>{c.name} price and profile</Link></Button>
        </div>
      </Section>

      <Section tone="band" eyebrow="Price" title={`${c.name} price today.`}>
        <PriceChart symbol={c.symbol} defaultRange="90D" height={340} />
      </Section>

      <Section eyebrow="Network" title={`Sending ${c.symbol} on the right network.`}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-rule bg-vault/60 p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold">{live ? <CircleCheck className="size-4 text-up" /> : <Clock className="size-4 text-brass" />}{live ? 'What to choose when you withdraw' : 'Status'}</p>
            <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-mist">
              {c.depositNotes.map((n) => <li key={n} className="flex gap-2.5"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />{n}</li>)}
            </ul>
          </div>
          <div className="rounded-xl border border-rule bg-vault/60 p-6">
            <p className="text-[15px] font-semibold">Networks for {c.symbol}</p>
            <ul className="mt-4 divide-y divide-rule text-[14px]">
              {c.networks.map((n) => (
                <li key={n.name} className="flex flex-wrap items-center justify-between gap-2 py-2.5"><span>{n.name}</span><span className="text-mist">{[n.standard, n.note].filter(Boolean).join(' · ')}</span></li>
              ))}
            </ul>
            <p className="mt-5 flex gap-2.5 rounded-md border border-brass/30 bg-brass/5 p-3 text-[13px] leading-relaxed text-mist">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-brass" />
              Funds sent on the wrong network, or without a required memo or tag, may be lost. Always follow your deposit screen.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="band" eyebrow="Where to buy" title={`Ways to buy ${c.symbol}.`}>
        <FeatureGrid
          items={[
            { title: 'Centralised exchanges', body: `Most large exchanges list ${c.symbol}. Buy with a bank transfer or card, then withdraw to an external address.` },
            { title: 'Peer-to-peer marketplaces', body: 'Pay another person with mobile money or bank transfer while the marketplace holds the crypto in escrow.' },
            { title: 'Swap from another coin', body: `If you already hold crypto, swap it for ${c.symbol} on an exchange before sending.` },
          ]}
        />
      </Section>

      <Section eyebrow={`About ${c.symbol}`} title={`Why people buy ${c.name}.`}>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">{c.about.slice(0, 2).map((p) => <p key={p}>{p}</p>)}</div>
          <FeatureGrid columns={2} items={c.useCases.slice(0, 2)} />
        </div>
      </Section>

      <Section tone="band" eyebrow="Risks" title="Know the risks before you buy.">
        <p className="max-w-[70ch] text-[16px] leading-[1.75] text-foreground/90">{c.risks}</p>
        <p className="mt-4 text-[14px] text-mist">Read our <Link href="/risk-disclosure" className="text-brass underline-offset-4 hover:underline">risk warning</Link> and <Link href="/learn/understanding-volatility-and-risk" className="text-brass underline-offset-4 hover:underline">guide to managing risk</Link>.</p>
      </Section>

      <Section eyebrow="FAQ" title={`Buying ${c.name}: questions.`}>
        <FaqList
          items={[
            ...c.faq,
            { q: `How much ${c.symbol} can I buy?`, a: `You don’t need to buy a whole coin. Most platforms let you buy a small fraction of ${c.symbol}, so you can start with any amount you are comfortable losing.` },
            { q: 'Is it safe to buy from a peer-to-peer marketplace?', a: 'It can be, if the marketplace holds the crypto in escrow and you only trade with sellers who have strong ratings. Never release payment outside the platform.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="More guides" title="How to buy other coins.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {others.map((o) => (
            <Link key={o.symbol} href={`/buy/${o.symbol.toLowerCase()}`} className="group flex items-center gap-3 rounded-xl border border-rule bg-vault/50 p-4 hover:border-rule-strong">
              <CoinMark symbol={o.symbol} size="sm" />
              <span className="text-[14px] group-hover:underline group-hover:underline-offset-4">How to buy {o.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand title={live ? `Start earning on your ${c.symbol}.` : `Follow ${c.name} from your dashboard.`} body={live ? `Open an account, deposit ${c.symbol} and switch on earning.` : 'Open an account to follow every market and be ready when deposits open.'} />
    </>
  );
}
