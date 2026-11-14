import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, CircleHelp, Coins, FileCheck2, Gift, KeyRound, LineChart, MessageCircle, ScrollText, ShoppingCart, UsersRound } from 'lucide-react';
import { AnnouncementsCard } from '@/components/home/announcements-card';
import { ExploreAssets, MarketTabsCard } from '@/components/home/home-cards';
import { HomeHero, ReferralBanner } from '@/components/home/home-sections';
import { PortfolioPreview } from '@/components/home/portfolio-preview';
import { MarketShareChart, MarketStats, Movers } from '@/components/market/market-overview';
import { MarketTable } from '@/components/market/market-table';
import { PriceChart } from '@/components/market/price-chart';
import { SourceNote } from '@/components/market/source-note';
import { CtaBand, FaqList, FeatureGrid, Section, Steps } from '@/components/site/blocks';
import { RatesTable, YieldCalculator } from '@/components/site/calculators';
import { Badge } from '@/components/ui/badge';
import { AuthButton } from '@/components/site/auth-aware';
import { Button } from '@/components/ui/button';
import { ARTICLES } from '@/content/learn';
import { APP_NAME } from '@/lib/brand';
import { NETWORKS } from '@/lib/coins';

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} | Earn yield on Bitcoin, Ethereum and stablecoins` },
  description: `Track 14 major cryptocurrencies, deposit BTC, ETH or USDT, invest from $50 and follow your returns live with ${APP_NAME}.`,
};

const HOME_FAQ = [
  { q: 'Is BitInvest Capital safe to use?', a: <>We designed the platform so that no single mistake or person can move client money: our servers hold only watch-only deposit keys, every deposit notice is cryptographically verified, balances can never go negative, and manual changes need two administrators and are permanently logged. No platform is risk-free, so please also read our <Link href="/risk-disclosure" className="text-brass">risk warning</Link>.</> },
  { q: 'How do I open an account?', a: <>Click Sign Up, enter your email and a password, and confirm your email using the link we send. Your dashboard and deposit addresses are ready as soon as you log in. <Link href="/register" className="text-brass">Sign up now</Link>.</> },
  { q: 'What can I do with BitInvest Capital?', a: 'Open an account, deposit BTC, ETH or USDT, choose how much to invest (from $50), watch your investment grow live, and follow live prices and charts for 14 major coins. More networks are being added.' },
  { q: 'Is the yield guaranteed?', a: 'No. Every rate is variable and can be changed or paused. Yield on BTC and ETH is paid in those coins, so its dollar value also moves with their prices.' },
  { q: 'How often is yield paid?', a: 'Each asset is paid either daily at 00:00 UTC or hourly on the hour, as shown in the rates table. Payouts compound automatically.' },
  { q: 'Which coins can I deposit today?', a: 'Bitcoin (BTC), Ether (ETH) and Tether (USDT on Ethereum). BNB, Solana, XRP, TRON, Cardano, TON, Avalanche, Polygon, Cosmos, Arbitrum and selected ERC-20 and BEP-20 tokens are on the way.' },
  { q: 'How do you keep deposits safe?', a: 'Our servers only hold watch-only keys, every deposit notice is cryptographically verified, and manual balance changes need two administrators. See the Security page for details.' },
  { q: 'Are there deposit fees?', a: <>We do not charge a fee to receive deposits. The network you send from charges its own transaction fee, which goes to that network, not to us. See our <Link href="/fees" className="text-brass">fees page</Link>.</> },
  { q: 'How do I buy crypto to deposit?', a: <>Buy BTC, ETH or USDT on an exchange or peer-to-peer marketplace, then send it to your deposit address on the network shown. Our <Link href="/buy-crypto" className="text-brass">buy crypto guide</Link> walks you through it.</> },
  { q: 'How do I contact support?', a: <>Log in and use the Live chat button in your dashboard, or email us. See the <Link href="/support" className="text-brass">support centre</Link>.</> },
  { q: 'How does the referral programme work?', a: <>Share your personal link. When friends deposit, you receive a share of each deposit in USDT, plus a share of the yield they earn. Details on the <Link href="/referral" className="text-brass">referral page</Link>.</> },
];

export default function HomePage() {
  return (
    <>
      <div className="relative">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_60%_60%_at_20%_0%,color-mix(in_oklab,var(--brass)_10%,transparent),transparent)]" />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 px-4 pt-12 pb-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20">
          <HomeHero />
          <div className="flex flex-col gap-4">
            <MarketTabsCard />
            <AnnouncementsCard />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <MarketStats />
      </div>

      <Section eyebrow="Your portfolio" title="Everything you own, in one clear dashboard.">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="max-w-[56ch] text-[16px] leading-relaxed text-mist">
              See your net worth, how it is split, what each asset is earning and every transaction, updated in real time. Your dashboard also
              includes charts for every coin we cover, a projection of your returns, your referral link and live chat with our team.
            </p>
            <ul className="mt-6 space-y-3 text-[15px]">
              {['Your investment value, updating live', 'Invest any amount from $50, move it back any time', 'Growth and projection charts at current weekly rates', 'Charts for all 14 coins in the Markets tab', 'Your personal invite link and referral rewards', 'Live chat with support, right inside the portal'].map((t) => (
                <li key={t} className="flex items-start gap-3"><Check className="mt-0.5 size-4 shrink-0 text-up" /> {t}</li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <AuthButton href="/register">Sign Up <ArrowRight /></AuthButton>
              <AuthButton href="/login" variant="outline" hideWhenSignedIn>Log In</AuthButton>
            </div>
          </div>
          <PortfolioPreview />
        </div>
      </Section>

      <Section tone="band" eyebrow="Explore assets" title="Fourteen coins, twelve blockchains." intro="Tap any coin for its live chart, key facts, how deposits work and answers to common questions.">
        <ExploreAssets />
      </Section>

      <Section
        eyebrow="Markets"
        title="Live prices for the coins that matter most."
        intro="Prices, daily and weekly moves, market capitalisation and trading volume for every coin we support, refreshed automatically. Select a coin to see its full history and profile."
      >
        <div className="rounded-xl border border-rule bg-vault/40 p-2 sm:p-4">
          <MarketTable limit={8} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <SourceNote />
          <Button asChild variant="outline">
            <Link href="/markets">View all markets <ArrowRight /></Link>
          </Button>
        </div>
      </Section>

      <Section
        tone="band"
        eyebrow="Charts"
        title="Every coin, every timeframe."
        intro="Switch between coins and look back from the last 24 hours to a full year. The same charts are available inside your dashboard once you sign up."
      >
        <PriceChart selectable symbol="BTC" defaultRange="90D" height={360} />
        <Movers className="mt-6" />
        <MarketShareChart className="mt-4" />
      </Section>

      <Section
        eyebrow="Earn"
        title="Variable yield, paid automatically."
        intro={
          <>
            Switch on earning for the assets you hold and yield is credited to your balance every day or every hour, compounding as it goes. These are
            the rates being paid right now. <Link href="/earn" className="text-brass underline-offset-4 hover:underline">How yield works →</Link>
          </>
        }
      >
        <RatesTable />
        <h3 className="mt-12 text-[18px] font-semibold">What could your balance earn?</h3>
        <p className="mt-1 mb-5 max-w-[70ch] text-[14px] text-mist">Pick an asset, enter an amount and see how it grows at today’s rate. Rates are variable, so treat this as an illustration, not a promise.</p>
        <YieldCalculator />
      </Section>

      <Section tone="band" eyebrow="Products" title="One account, everything you need.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Coins, href: '/earn', title: 'Earn', body: 'Variable yield on BTC, ETH and USDT, paid daily and compounded automatically.' },
            { icon: LineChart, href: '/markets', title: 'Markets', body: 'Live prices, charts from 24 hours to a year, and profiles for 14 coins.' },
            { icon: ShoppingCart, href: '/buy-crypto', title: 'Buy crypto', body: 'Step-by-step guides to buying each coin and sending it to your account.' },
            { icon: Gift, href: '/referral', title: 'Referral programme', body: 'Earn a share of your friends’ deposits in USDT, plus a share of their yield.' },
            { icon: BookOpen, href: '/learn', title: 'Learning centre', body: 'Ten in-depth guides and a glossary of more than 40 crypto terms.' },
            { icon: MessageCircle, href: '/support', title: 'Support', body: 'Live chat inside your portal, email support and a full help centre.' },
          ].map((p) => (
            <Link key={p.href} href={p.href} className="group rounded-2xl border border-rule bg-vault/60 p-6 transition-colors hover:border-brass/40">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brass/10 text-brass"><p.icon className="size-5" /></span>
              <h3 className="mt-5 text-[18px] font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-mist">{p.body}</p>
              <p className="mt-4 text-[13px] text-brass group-hover:underline group-hover:underline-offset-4">Learn more →</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="How it works"
        title="From sign-up to your first payout in four steps."
      >
        <Steps
          steps={[
            { title: 'Open your account', body: 'Register with your email and confirm it from the link we send you. It takes about a minute.' },
            { title: 'Deposit', body: 'Copy the BTC, ETH or USDT deposit address from your dashboard, send from any wallet or exchange, then report the transaction. We check it on the blockchain and credit your balance.' },
            { title: 'Allocate', body: 'Choose which assets earn yield and set the split of your portfolio with simple sliders. Change it whenever you like.' },
            { title: 'Earn and track', body: 'Payouts arrive automatically. Follow your returns and every transaction on your dashboard, with charts for all 14 coins.' },
          ]}
        />
      </Section>

      <Section
        eyebrow="Networks"
        title="Twelve blockchains, one account."
        intro="Bitcoin and Ethereum are live today. The rest are being connected one by one, so you can hold everything in one place. Every coin already has live prices and charts."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {NETWORKS.map((n) => (
            <div key={n.name} className="flex items-start justify-between gap-4 rounded-xl border border-rule bg-vault/40 p-4">
              <div>
                <p className="text-[15px] font-semibold">{n.name}</p>
                <p className="mt-0.5 text-[13px] text-mist">{n.coins}</p>
                <p className="mt-2 text-[12px] text-mist/80">{n.standard}</p>
              </div>
              <Badge variant={n.status === 'live' ? 'success' : 'pending'}>{n.status === 'live' ? 'Live' : 'Coming soon'}</Badge>
            </div>
          ))}
        </div>
      </Section>

      <Section
        tone="band"
        eyebrow="Security"
        title="Built so that one mistake, or one person, can’t move your money."
        intro={<>Security is designed into how money enters and moves through the platform. <Link href="/security" className="text-brass underline-offset-4 hover:underline">Read how we protect accounts →</Link></>}
      >
        <FeatureGrid
          columns={4}
          items={[
            { icon: KeyRound, title: 'Watch-only deposit keys', body: 'Our servers can create deposit addresses but hold no keys that can move funds.' },
            { icon: FileCheck2, title: 'Verified deposits', body: 'Every deposit notice is cryptographically signed and checked before any balance changes.' },
            { icon: UsersRound, title: 'Two-person approval', body: 'Manual balance changes need a second administrator to approve them.' },
            { icon: ScrollText, title: 'Permanent audit trail', body: 'Administrative actions are written to a log that cannot be edited afterwards.' },
          ]}
        />
      </Section>

      <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <ReferralBanner />
      </div>

      <Section
        tone="band"
        eyebrow="Learn"
        title="Understand what you own."
        intro="Clear, practical guides for beginners and experienced holders alike."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {ARTICLES.slice(0, 6).map((a) => (
            <Link key={a.slug} href={`/learn/${a.slug}`} className="group rounded-xl border border-rule bg-vault/50 p-6 transition-colors hover:border-rule-strong">
              <p className="flex items-center gap-2 text-[12px] text-brass"><BookOpen className="size-3.5" /> {a.category} · {a.minutes} min read</p>
              <h3 className="mt-3 text-[17px] leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">{a.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-mist">{a.summary}</p>
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/learn">Visit the learning centre <ArrowRight /></Link>
        </Button>
      </Section>

      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <h2 className="text-center font-display text-[clamp(2.2rem,4.5vw,3.4rem)] leading-tight">Frequently Asked Questions</h2>
        <FaqList items={HOME_FAQ} className="mt-12" />
        <Button asChild variant="outline" className="mt-6">
          <Link href="/faq"><CircleHelp /> See all questions <ArrowRight /></Link>
        </Button>
      </section>

      <CtaBand
        title="Open your account in a minute."
        body="Register with your email, confirm it, and you can follow every market, make your first deposit and invest from $50."
        secondary={{ href: '/markets', label: 'Explore markets' }}
      />
    </>
  );
}
