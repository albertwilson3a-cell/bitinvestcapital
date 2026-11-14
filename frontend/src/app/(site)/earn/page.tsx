import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarClock, Coins, Layers, PieChart, RefreshCw, Scale, ShieldAlert, TrendingDown } from 'lucide-react';
import { CtaBand, FaqList, FeatureGrid, PageHero, Section, Steps } from '@/components/site/blocks';
import { RatesTable, YieldCalculator } from '@/components/site/calculators';
import { formatUsd } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Earn: variable yield on BTC, ETH and USDT',
  description: 'Current yield rates, a compounding calculator, and a clear explanation of how payouts are calculated, when they are paid and what the risks are.',
};

const EXAMPLE_APY = 9.5;
const EXAMPLE = [1, 7, 30, 90, 180, 365].map((days) => {
  const balance = 10_000 * Math.pow(1 + EXAMPLE_APY / 100, days / 365);
  return { days, earned: balance - 10_000, balance };
});

const EARN_FAQ = [
  { q: 'How do I start earning?', a: 'Deposit to your BitInvest wallet, then press Invest on your dashboard and choose an amount (minimum $50). Earning starts with the next full payout period.' },
  { q: 'When is yield paid?', a: 'Daily assets are paid at 00:00 UTC for the previous day. Hourly assets are paid on the hour for the previous hour. Each payout appears in your activity list.' },
  { q: 'Why didn’t my deposit earn yield straight away?', a: 'Yield is paid on the balance you held for the whole period. A deposit that arrives part-way through a period starts earning from the next one, which keeps the calculation fair for everyone.' },
  { q: 'Is my yield paid in dollars?', a: 'No. Yield is paid in the asset itself: BTC yield in BTC, ETH in ETH and USDT in USDT. The dollar value of BTC and ETH yield therefore moves with their prices.' },
  { q: 'Can rates change?', a: 'Yes. All rates are variable. They can be raised, lowered or paused, and the rate in force at the time of each payout is the one applied.' },
  { q: 'Does yield compound?', a: 'Yes. Each payout is added to your balance, so the next one is calculated on the larger amount.' },
  { q: 'Can I stop earning?', a: 'Yes. Use “Move to wallet” at any time to take part or all of your investment back to your wallet. Funds in the wallet don’t earn and can be withdrawn.' },
  { q: 'Is there a minimum amount?', a: 'No minimum. Very small balances may earn less than the smallest unit of the asset in a single period, in which case that period’s payout is zero.' },
];

export default function EarnPage() {
  return (
    <>
      <PageHero
        eyebrow="Earn"
        title="Variable yield on the crypto you already hold."
        intro="Switch on earning for an asset and yield is credited to your balance automatically, every day or every hour, and compounds as it goes. Rates are published openly, change with market conditions and are never guaranteed."
      />

      <Section eyebrow="Current rates" title="What we’re paying right now." intro="Only rates that are active are shown. When a rate changes, this table updates immediately.">
        <RatesTable />
      </Section>

      <Section tone="band" eyebrow="Calculator" title="See how a balance could grow." intro="Enter an amount and a time period. The chart uses today’s rate and the same compounding formula as our payout engine.">
        <YieldCalculator />
      </Section>

      <Section eyebrow="How it works" title="Four steps from deposit to payout.">
        <Steps
          steps={[
            { title: 'Deposit', body: 'Send BTC, ETH or USDT to the deposit address in your dashboard and report the transaction. It is credited once our team confirms it on the blockchain.' },
            { title: 'Invest', body: 'Choose how much to invest, from $50. The rest stays in your BitInvest wallet.' },
            { title: 'Hold for a full period', body: 'Yield is calculated on the balance you held for the whole day (or hour), measured in UTC.' },
            { title: 'Get paid and compound', body: 'The payout is added to your balance and the next period earns on the larger amount.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="Worked example" title={`$10,000 of USDT at ${EXAMPLE_APY}% a year.`} intro="An example of how daily compounding adds up, if the rate stayed the same for the whole period. Real rates change.">
        <div className="overflow-x-auto rounded-xl border border-rule">
          <table className="w-full min-w-[520px] text-[14px]">
            <thead className="bg-vault/70 text-[12px] text-mist">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">Held for</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Yield earned</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {EXAMPLE.map((r) => (
                <tr key={r.days} className="bg-vault/30">
                  <td className="px-4 py-3">{r.days === 1 ? '1 day' : r.days === 365 ? '1 year' : `${r.days} days`}</td>
                  <td className="tabular px-4 py-3 text-right text-up">{formatUsd(r.earned)}</td>
                  <td className="tabular px-4 py-3 text-right">{formatUsd(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-[80ch] text-[13px] text-mist">
          The daily rate is (1 + {EXAMPLE_APY}%)<sup>1/365</sup> − 1 ≈ 0.0249%. Over 365 daily payouts that compounds to exactly {EXAMPLE_APY}%.
        </p>
      </Section>

      <Section eyebrow="Your investment" title="You decide how much earns.">
        <FeatureGrid
          items={[
            { icon: PieChart, title: 'Choose your split', body: 'Set how your portfolio is divided between assets with simple sliders. The total always comes to exactly 100%.' },
            { icon: Layers, title: 'Switch assets on or off', body: 'Only assets you include earn yield. Leave an asset out and it is simply held.' },
            { icon: RefreshCw, title: 'Change any time', body: 'Invest more or move funds back to your wallet whenever you like. There are no lock-ups.' },
          ]}
        />
      </Section>

      <Section tone="band" eyebrow="Payout schedule" title="Daily and hourly payouts.">
        <FeatureGrid
          columns={2}
          items={[
            { icon: CalendarClock, title: 'Daily assets', body: 'Paid at 00:00 UTC for the previous day. Your balance must have been in place from the start of that day.' },
            { icon: Coins, title: 'Hourly assets', body: 'Paid on the hour for the previous hour. Smaller, more frequent payouts that compound slightly faster.' },
          ]}
        />
      </Section>

      <Section eyebrow="Honest returns" title="Why our rates are variable, and modest.">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4 text-[16px] leading-[1.75] text-foreground/90">
            <p>
              Real yield comes from real activity: borrowers paying interest, networks paying for security and markets paying for liquidity. Those
              sources typically produce single-digit to low double-digit returns per year, and they move with demand.
            </p>
            <p>
              That is why we publish annual rates, change them when conditions change, and never promise a fixed return. A platform that guarantees
              high weekly or daily percentages cannot be paying them from real yield.
              Read more in <Link href="/learn/how-crypto-yield-works" className="text-brass underline-offset-4 hover:underline">How crypto yield works</Link>.
            </p>
          </div>
          <FeatureGrid
            columns={2}
            items={[
              { icon: TrendingDown, title: 'Price risk', body: 'BTC and ETH yield is paid in those coins, so its dollar value rises and falls with their prices.' },
              { icon: Scale, title: 'Rate changes', body: 'Rates can be lowered or paused at any time.' },
              { icon: ShieldAlert, title: 'Platform risk', body: 'Your assets are held by us on your behalf. Read the risk disclosure before depositing.' },
            ]}
          />
        </div>
      </Section>

      <Section tone="band" eyebrow="FAQ" title="Questions about earning.">
        <FaqList items={EARN_FAQ} />
      </Section>

      <CtaBand title="Start earning on your crypto." body="Open an account, make a deposit and invest from $50. It takes a few minutes." secondary={{ href: '/risk-disclosure', label: 'Read the risk disclosure' }} />
    </>
  );
}
