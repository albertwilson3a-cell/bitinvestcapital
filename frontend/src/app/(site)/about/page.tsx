import type { Metadata } from 'next';
import Link from 'next/link';
import { Compass, Eye, HandCoins, Lock, MessageSquareText, Scale } from 'lucide-react';
import { CoinMark } from '@/components/market/coin-mark';
import { CtaBand, FeatureGrid, PageHero, Section } from '@/components/site/blocks';
import { APP_NAME, SUPPORT_EMAIL } from '@/lib/brand';
import { COIN_LIST } from '@/lib/coins';

export const metadata: Metadata = {
  title: 'About us',
  description: `${APP_NAME} helps people hold, allocate and earn variable yield on digital assets, with transparent rates and security designed in from the first deposit.`,
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Making digital assets simpler to hold, and safer to grow."
        intro={`${APP_NAME} is a platform for holding Bitcoin, Ethereum and stablecoins, investing any amount from $50 and earning a variable return, with every rate, payout and fee shown openly.`}
      />

      <Section eyebrow="Why we exist" title="Crypto should be understandable.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">
            <p>
              For many people, the hardest part of crypto is not deciding to buy it: it is everything that comes after. Which network to use, how to
              keep it safe, what a reasonable return looks like, and how to tell a real opportunity from a scheme that will collapse.
            </p>
            <p>
              We built {APP_NAME} to make those things clear. You get simple, reviewed deposits, a portfolio you control with simple sliders, live
              market data for the coins that matter, and yield that is published openly and paid automatically.
            </p>
          </div>
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">
            <p>
              Just as important is what we don’t do. We don’t promise fixed or guaranteed returns, because real yield changes with the market. We
              don’t pay rewards for building chains of recruits. And we don’t give investment advice: we give you the information to decide for
              yourself.
            </p>
            <p>
              If something about how we work isn’t clear, we want to hear about it at <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brass underline-offset-4 hover:underline">{SUPPORT_EMAIL}</a>.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="band" eyebrow="Our principles" title="How we make decisions.">
        <FeatureGrid
          items={[
            { icon: Eye, title: 'Transparent by default', body: 'Rates, reward percentages and payout rules are published on our website, and every payout appears in your activity list.' },
            { icon: Scale, title: 'Honest returns', body: 'We publish variable annual rates that reflect real market yield, and we never guarantee returns.' },
            { icon: Lock, title: 'Security first', body: 'Watch-only deposit keys, verified deposits, two-person approval and a permanent audit trail.' },
            { icon: Compass, title: 'Clarity over jargon', body: 'Plain-English explanations on every page, and a learning centre for going deeper.' },
            { icon: HandCoins, title: 'You stay in control', body: 'Choose how much to invest, move funds back to your wallet any time, and see exactly what you hold.' },
            { icon: MessageSquareText, title: 'Real support', body: 'Questions are answered by people who understand both crypto and our platform.' },
          ]}
        />
      </Section>

      <Section eyebrow="What we offer" title="One account for the whole journey.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { href: '/markets', title: 'Markets', body: 'Live prices, charts and profiles for 14 major coins.' },
            { href: '/earn', title: 'Earn', body: 'Variable yield on BTC, ETH and USDT, paid daily or hourly.' },
            { href: '/referral', title: 'Referral programme', body: 'Rewards when friends you invite deposit and earn.' },
          ].map((p) => (
            <Link key={p.href} href={p.href} className="group rounded-xl border border-rule bg-vault/50 p-6 hover:border-rule-strong">
              <h3 className="text-[17px] font-semibold group-hover:underline group-hover:underline-offset-4">{p.title}</h3>
              <p className="mt-2 text-[14px] text-mist">{p.body}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section tone="band" eyebrow="Supported assets" title="The coins we cover.">
        <div className="flex flex-wrap gap-3">
          {COIN_LIST.map((c) => (
            <Link key={c.symbol} href={`/markets/${c.symbol.toLowerCase()}`} className="flex items-center gap-2.5 rounded-full border border-rule bg-vault/50 py-1.5 pr-4 pl-1.5 text-[14px] hover:border-rule-strong">
              <CoinMark symbol={c.symbol} size="sm" className="rounded-full" />
              {c.name}
            </Link>
          ))}
        </div>
      </Section>

      <CtaBand title="Join us." body="Open an account in a minute and explore everything before you deposit." secondary={{ href: '/security', label: 'How we keep you safe' }} />
    </>
  );
}
