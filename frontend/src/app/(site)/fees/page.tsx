import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section } from '@/components/site/blocks';
import { Badge } from '@/components/ui/badge';
import { ArrowDownToLine, Coins, Gift, MessageCircle, Percent, UserPlus } from 'lucide-react';

export const metadata: Metadata = { title: 'Fees', description: 'What BitInvest Capital charges, and what it doesn’t: accounts, deposits, earning, referrals and network fees explained.' };

const ROWS: { item: string; fee: string; note: string; free: boolean }[] = [
  { item: 'Opening an account', fee: 'Free', note: 'No sign-up or monthly account fees.', free: true },
  { item: 'Receiving deposits', fee: 'Free', note: 'We don’t charge to receive BTC, ETH or USDT. The sending network charges its own fee.', free: true },
  { item: 'Earn (yield)', fee: 'No management fee', note: 'The rate shown on the Earn page is the rate credited to you.', free: true },
  { item: 'Investing and moving funds back to your wallet', fee: 'Free', note: 'As often as you like. Minimum investment $50.', free: true },
  { item: 'Referral programme', fee: 'Free', note: 'Rewards are paid to you; nothing is deducted from your friends.', free: true },
  { item: 'Live chat and email support', fee: 'Free', note: 'For all clients.', free: true },
  { item: 'Withdrawals', fee: 'Network fee only', note: 'A small fee per asset covers the blockchain network fee. It is shown before you confirm, and every withdrawal is reviewed by our team before release.', free: false },
];

const FEES_FAQ = [
  { q: 'Why did I receive less than I sent?', a: 'The wallet or exchange you sent from deducts the network fee (and sometimes its own withdrawal fee) before the transfer. We credit exactly the amount that arrives on the blockchain.' },
  { q: 'Do you take a cut of my yield?', a: 'No separate fee is deducted from payouts. The published rate is the rate credited to your balance.' },
  { q: 'How much are network fees?', a: 'They change constantly with demand. Bitcoin and Ethereum fees can range from cents to several dollars at busy times; networks such as TRON, Polygon and Arbitrum are usually much cheaper. Your sending wallet shows the fee before you confirm.' },
  { q: 'How do withdrawals work?', a: 'From your dashboard, choose the asset, amount and address, then confirm with the code we email you. The amount is reserved from your balance and our team reviews the request, sends the funds and emails you the transaction link. You can cancel while it is awaiting review.' },
  { q: 'Will fees change?', a: 'If we introduce or change a fee, we will update this page and post an announcement before it takes effect.' },
];

export default function FeesPage() {
  return (
    <>
      <PageHero eyebrow="Fees" title="Simple, transparent fees." intro="Most of what we do is free. Where a cost exists, such as blockchain network fees, we explain who charges it and why." />
      <Section eyebrow="Fee schedule" title="What it costs to use BitInvest Capital.">
        <div className="overflow-x-auto rounded-xl border border-rule">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead className="bg-vault/70 text-[12px] text-mist">
              <tr><th className="px-4 py-3 text-left font-medium">Service</th><th className="px-4 py-3 text-left font-medium">Our fee</th><th className="px-4 py-3 text-left font-medium">Details</th></tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {ROWS.map((r) => (
                <tr key={r.item} className="bg-vault/30">
                  <td className="px-4 py-3.5 font-medium">{r.item}</td>
                  <td className="px-4 py-3.5"><Badge variant={r.free ? 'success' : 'pending'}>{r.fee}</Badge></td>
                  <td className="px-4 py-3.5 text-mist">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section tone="band" eyebrow="Network fees" title="Fees you pay to the blockchain, not to us.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">
            <p>Every blockchain transaction pays a fee to the network’s miners or validators. It depends on how busy the network is and how much data the transaction uses, not on the amount you send.</p>
            <p>When you deposit, the wallet or exchange you send from charges this fee. When you send tokens on Ethereum, such as USDT, the fee is paid in ETH. Read more in <Link href="/learn/networks-and-fees" className="text-brass underline-offset-4 hover:underline">Networks, fees and confirmations</Link>.</p>
          </div>
          <div className="overflow-hidden rounded-xl border border-rule">
            <table className="w-full text-[14px]">
              <thead className="bg-vault/70 text-[12px] text-mist"><tr><th className="px-4 py-3 text-left font-medium">Network</th><th className="px-4 py-3 text-left font-medium">Fee paid in</th><th className="px-4 py-3 text-left font-medium">Typical cost</th></tr></thead>
              <tbody className="divide-y divide-rule">
                {[['Bitcoin', 'BTC', 'Varies widely with demand'], ['Ethereum', 'ETH', 'Varies; higher at busy times'], ['BNB Smart Chain', 'BNB', 'Usually cents'], ['TRON', 'TRX / energy', 'Usually low'], ['Solana', 'SOL', 'Fractions of a cent'], ['Polygon, Arbitrum', 'POL / ETH', 'Usually cents or less']].map(([n, t, c]) => (
                  <tr key={n} className="bg-vault/30"><td className="px-4 py-3">{n}</td><td className="px-4 py-3 text-mist">{t}</td><td className="px-4 py-3 text-mist">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
      <Section eyebrow="Included" title="Everything that comes with your account, at no charge.">
        <FeatureGrid
          items={[
            { icon: UserPlus, title: 'Free account', body: 'Register in a minute, with no minimum balance.' },
            { icon: ArrowDownToLine, title: 'Free deposits', body: 'No fee from us on BTC, ETH or USDT deposits.' },
            { icon: Percent, title: 'Earn with no fee', body: 'The published rate is what you receive.' },
            { icon: Coins, title: 'Live market data', body: 'Prices and charts for 14 coins.' },
            { icon: Gift, title: 'Referral rewards', body: 'Earn when friends deposit and earn.' },
            { icon: MessageCircle, title: 'Support', body: 'Live chat in your portal and email support.' },
          ]}
        />
      </Section>
      <Section tone="band" eyebrow="FAQ" title="Questions about fees.">
        <FaqList items={FEES_FAQ} />
      </Section>
      <CtaBand title="Start for free." body="Open an account with no fees to sign up, deposit or earn." />
    </>
  );
}
