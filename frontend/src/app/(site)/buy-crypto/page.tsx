import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftRight, Building2, CreditCard, Smartphone, Users, Wallet } from 'lucide-react';
import { CoinMark } from '@/components/market/coin-mark';
import { MarketTable } from '@/components/market/market-table';
import { SourceNote } from '@/components/market/source-note';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section, Steps } from '@/components/site/blocks';
import { Badge } from '@/components/ui/badge';
import { COIN_LIST } from '@/lib/coins';

export const metadata: Metadata = {
  title: 'Buy crypto and fund your account',
  description: 'How to buy Bitcoin, Ethereum, USDT and other coins and send them to your BitInvest Capital account, step by step.',
};

const BUY_FAQ = [
  { q: 'Can I buy crypto directly on BitInvest Capital?', a: 'Not with a card or bank transfer yet. You buy crypto from an exchange, broker or peer-to-peer marketplace, then send it to your dedicated BitInvest Capital deposit address.' },
  { q: 'Which coin should I send?', a: 'Any coin with “Deposits open”: currently BTC, ETH and USDT (ERC-20). Many people send USDT if they want a stable dollar balance.' },
  { q: 'What is the minimum deposit?', a: 'There is no minimum on our side. Very small deposits may not be worth the network fee charged by the sending wallet.' },
  { q: 'How long does it take?', a: 'Buying takes minutes on most exchanges. Deposits are credited after 3 confirmations on Bitcoin (about 30 minutes) or 12 on Ethereum (a few minutes).' },
  { q: 'Do I need my own wallet?', a: 'No. You can send straight from the exchange where you bought, as long as you choose the network shown on your deposit screen.' },
];

export default function BuyCryptoPage() {
  return (
    <>
      <PageHero
        eyebrow="Buy crypto"
        title="Buy crypto anywhere, then put it to work here."
        intro="Buy Bitcoin, Ether or USDT from any exchange, broker or peer-to-peer marketplace you trust, and send it to your own BitInvest Capital deposit address. Here’s exactly how."
      />
      <Section eyebrow="Step by step" title="From buying to earning in four steps.">
        <Steps
          steps={[
            { title: 'Open your account', body: 'Sign up with your email and confirm it. Your deposit addresses are ready as soon as you log in.' },
            { title: 'Buy crypto', body: 'Buy BTC, ETH or USDT from an exchange or marketplace in your country, paying with your local currency.' },
            { title: 'Send it to us', body: 'Copy your deposit address from your dashboard and withdraw to it, choosing the network shown on the deposit screen.' },
            { title: 'Switch on earning', body: 'Once credited, include the asset in your allocation to start earning variable yield.' },
          ]}
        />
      </Section>
      <Section tone="band" eyebrow="Ways to buy" title="Choose the way that suits you.">
        <FeatureGrid
          items={[
            { icon: Building2, title: 'Crypto exchanges', body: 'Large exchanges let you buy with a bank transfer or card and withdraw to any address. Compare fees and check that the exchange is allowed to operate where you live.' },
            { icon: Users, title: 'Peer-to-peer marketplaces', body: 'Buy directly from other people using mobile money or bank transfer, with the marketplace holding the crypto in escrow until you pay. Only trade with well-rated sellers.' },
            { icon: Smartphone, title: 'Broker apps', body: 'Some investment apps let you buy crypto and withdraw it. Check that withdrawals to external addresses are supported before buying.' },
            { icon: CreditCard, title: 'Card purchases', body: 'Quick but usually the most expensive option, with card fees and a wider price spread.' },
            { icon: Wallet, title: 'From your own wallet', body: 'Already hold crypto? Send it from your wallet to your deposit address on the matching network.' },
            { icon: ArrowLeftRight, title: 'Swap first if needed', body: 'Holding a coin we don’t accept yet? Swap it for BTC, ETH or USDT on an exchange before sending.' },
          ]}
        />
      </Section>
      <Section eyebrow="Accepted today" title="What you can deposit.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COIN_LIST.map((c) => (
            <Link key={c.symbol} href={`/buy/${c.symbol.toLowerCase()}`} className="group flex items-center justify-between gap-3 rounded-xl border border-rule bg-vault/50 p-4 hover:border-rule-strong">
              <span className="flex items-center gap-3">
                <CoinMark symbol={c.symbol} />
                <span>
                  <span className="block text-[14px] font-semibold group-hover:underline group-hover:underline-offset-4">How to buy {c.name}</span>
                  <span className="block text-[12px] text-mist">{c.networks[0]?.name}</span>
                </span>
              </span>
              <Badge variant={c.deposits === 'live' ? 'success' : 'neutral'}>{c.deposits === 'live' ? 'Deposits open' : 'Soon'}</Badge>
            </Link>
          ))}
        </div>
      </Section>
      <Section tone="band" eyebrow="Before you buy" title="Check today’s prices.">
        <div className="rounded-xl border border-rule bg-vault/40 p-2 sm:p-4">
          <MarketTable limit={8} hrefBase="/buy" />
        </div>
        <SourceNote className="mt-3" />
      </Section>
      <Section eyebrow="Costs" title="What buying crypto really costs.">
        <FeatureGrid
          columns={3}
          items={[
            { title: 'Trading fee', body: 'A percentage the exchange charges when you buy. Often lower if you pay by bank transfer than by card.' },
            { title: 'Spread', body: 'The gap between buying and selling prices. Instant-buy buttons often hide a wider spread than the exchange’s trading screen.' },
            { title: 'Withdrawal and network fee', body: 'Charged when you send crypto out of the exchange. It depends on the network, so sending USDT on the right network matters.' },
          ]}
        />
      </Section>
      <Section tone="band" eyebrow="Stay safe" title="Five checks before you buy.">
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {['Use a reputable, licensed platform where you live.', 'Turn on two-step verification on the exchange account.', 'Never buy because someone promised you guaranteed returns.', 'Send a small test amount before a large one.', 'Double-check the address and network every time.'].map((t, i) => (
            <li key={t} className="rounded-xl border border-rule bg-vault/50 p-5 text-[14px] leading-relaxed">
              <span className="tabular block font-display text-[28px] leading-none text-brass">{i + 1}</span>
              <span className="mt-3 block text-mist">{t}</span>
            </li>
          ))}
        </ol>
      </Section>
      <Section eyebrow="FAQ" title="Buying crypto: common questions.">
        <FaqList items={BUY_FAQ} />
      </Section>
      <CtaBand title="Get your deposit addresses." body="Open a free account to see your personal BTC, ETH and USDT deposit addresses." />
    </>
  );
}
