import type { Metadata } from 'next';
import { BadgeCheck, Gift, Link2, Repeat, UserPlus, Wallet } from 'lucide-react';
import { CtaBand, FaqList, FeatureGrid, PageHero, Prose, Section, Steps } from '@/components/site/blocks';
import { ReferralCalculator } from '@/components/site/calculators';
import { ReferralRates } from '@/components/site/referral-rates';

export const metadata: Metadata = {
  title: 'Referral programme: earn when friends deposit',
  description: 'Invite friends with your personal link. Earn a share of every deposit they make, paid in USDT, plus a share of the yield they earn.',
};

const REFERRAL_FAQ = [
  { q: 'Where do I find my invite link?', a: 'On your dashboard, in the “Invite friends” card. You can copy your referral code or the full link.' },
  { q: 'When are rewards paid?', a: 'The deposit reward is credited to your USDT balance as soon as your friend’s deposit is confirmed. The yield share is paid every time your friend receives a yield payout.' },
  { q: 'Is the deposit reward paid in USDT even if my friend deposits BTC?', a: 'Yes. Deposit rewards are always paid in USDT, valued at the market price at the moment the deposit is confirmed.' },
  { q: 'In which asset is the yield share paid?', a: 'In the same asset your friend earned. If they earn ETH yield, your share is paid in ETH.' },
  { q: 'Do I earn from people my friends invite?', a: 'No. Rewards are paid only for people you invited directly. There are no multi-level rewards.' },
  { q: 'Can I refer myself?', a: 'No. Accounts referred by their own owner, duplicate accounts or other abuse are excluded and rewards may be reversed.' },
  { q: 'Can the rates change?', a: 'Yes. Rates can change at any time; the rate in force when each deposit or payout happens is the one applied.' },
];

export default function ReferralPage() {
  return (
    <>
      <PageHero
        eyebrow="Referral programme"
        title="Share BitInvest Capital. Earn when your friends do."
        intro="Every account comes with a personal invite link. When someone joins with it, you earn a reward on each deposit they make, plus a share of the yield they earn for as long as they hold with us."
        aside={<ReferralRates />}
      />

      <Section eyebrow="How it works" title="Three steps to your first reward.">
        <Steps
          steps={[
            { title: 'Copy your link', body: 'Find your invite link and code in the “Invite friends” card on your dashboard.' },
            { title: 'Your friend signs up', body: 'They register with your link (or enter your code) and confirm their email.' },
            { title: 'They deposit', body: 'When their deposit is confirmed, your reward is credited to your USDT balance instantly.' },
            { title: 'They earn, you share', body: 'Each time they receive yield, you receive a share of it, automatically.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="Calculator" title="Estimate your rewards." intro="Move the sliders to see how rewards could build up over a year with today’s rates.">
        <ReferralCalculator />
      </Section>

      <Section eyebrow="Why it works" title="A programme built to be fair.">
        <FeatureGrid
          items={[
            { icon: Gift, title: 'Two kinds of reward', body: 'A one-off reward on every deposit, plus an ongoing share of your friends’ yield.' },
            { icon: Wallet, title: 'Paid straight to your balance', body: 'No claiming and no minimums. Rewards appear in your activity list as they happen.' },
            { icon: BadgeCheck, title: 'Direct referrals only', body: 'You earn from the people you invite, not from long chains of sign-ups.' },
            { icon: Link2, title: 'One link, everywhere', body: 'Share your link by message, email or social media. Your code works too.' },
            { icon: Repeat, title: 'Ongoing', body: 'Your yield share continues for as long as your friend holds and earns with us.' },
            { icon: UserPlus, title: 'Helps your friends too', body: 'They get the same platform, rates and security as everyone else.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="Programme terms" title="The rules, in plain English.">
        <Prose>
          <ol>
            <li>Rewards apply to people who register using your link or code and confirm their email address.</li>
            <li>The deposit reward is a percentage of each confirmed deposit, valued in US dollars at the time of confirmation and paid in USDT.</li>
            <li>The yield share is a percentage of each yield payout your referred friend receives, paid in the same asset.</li>
            <li>Only direct referrals qualify. Rewards are not paid on people referred by your referrals.</li>
            <li>Self-referrals, duplicate or fake accounts, and any attempt to manipulate the programme are not allowed. Rewards earned that way may be reversed and accounts may be closed.</li>
            <li>Rates are published on this page and may change at any time. The rate in force at the time of the deposit or payout applies.</li>
            <li>Do not make misleading claims when sharing your link, for example promising returns. Yields are variable and not guaranteed.</li>
          </ol>
        </Prose>
      </Section>

      <Section eyebrow="FAQ" title="Referral questions.">
        <FaqList items={REFERRAL_FAQ} />
      </Section>

      <CtaBand title="Get your invite link." body="Open an account and your personal link is waiting on your dashboard." />
    </>
  );
}
