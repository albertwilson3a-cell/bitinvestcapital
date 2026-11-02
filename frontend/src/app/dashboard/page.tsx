import type { Metadata } from 'next';
import { ActivityPanel } from '@/components/dashboard/activity-panel';
import { AllocationPanel } from '@/components/dashboard/allocation-panel';
import { DistributionPanel } from '@/components/dashboard/distribution-panel';
import { InvitePanel } from '@/components/dashboard/invite-panel';
import { MarketsSnapshot } from '@/components/dashboard/markets-snapshot';
import { NetWorth } from '@/components/dashboard/net-worth';
import { ReturnsPanel } from '@/components/dashboard/returns-panel';
import { SiteFooter } from '@/components/site-footer';
import { TopBar } from '@/components/dashboard/top-bar';
import { WithdrawalsPanel } from '@/components/dashboard/withdrawals-panel';
import { YieldPanel } from '@/components/dashboard/yield-panel';

export const metadata: Metadata = { title: 'Portfolio', robots: { index: false, follow: false } };

export default function DashboardPage() {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8">
        <NetWorth />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <DistributionPanel />
          <YieldPanel />
        </div>
        <ReturnsPanel />
        <AllocationPanel />
        <WithdrawalsPanel />
        <InvitePanel />
        <MarketsSnapshot />
        <ActivityPanel />
      </main>
      <SiteFooter />
    </div>
  );
}
