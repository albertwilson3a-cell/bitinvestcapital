import type { Metadata } from 'next';
import { ActivityPanel } from '@/components/dashboard/activity-panel';
import { DepositsPanel } from '@/components/dashboard/deposits-panel';
import { DistributionPanel } from '@/components/dashboard/distribution-panel';
import { CoinInvestments } from '@/components/dashboard/invest/coin-investments';
import { GrowthChart } from '@/components/dashboard/invest/growth-chart';
import { InvestmentHero } from '@/components/dashboard/invest/investment-hero';
import { ProjectionPanel } from '@/components/dashboard/invest/projection-panel';
import { ReturnsChart } from '@/components/dashboard/invest/returns-chart';
import { InvitePanel } from '@/components/dashboard/invite-panel';
import { MarketsSnapshot } from '@/components/dashboard/markets-snapshot';
import { SiteFooter } from '@/components/site-footer';
import { TopBar } from '@/components/dashboard/top-bar';
import { WithdrawalsPanel } from '@/components/dashboard/withdrawals-panel';

export const metadata: Metadata = { title: 'My investment', robots: { index: false, follow: false } };

/** The client portal is built around the investment: live value, growth, coins, projection. */
export default function DashboardPage() {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-6 pb-16 sm:gap-10 sm:px-6 sm:pt-10 lg:px-8">
        <InvestmentHero />
        <GrowthChart />
        <CoinInvestments />
        <ProjectionPanel />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
          <ReturnsChart />
          <DistributionPanel />
        </div>
        <DepositsPanel />
        <WithdrawalsPanel />
        <ActivityPanel />
        <InvitePanel />
        <MarketsSnapshot />
      </main>
      <SiteFooter />
    </div>
  );
}
