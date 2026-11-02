import type { Metadata } from 'next';
import { DashboardMarkets } from '@/components/dashboard/dashboard-markets';
import { SiteFooter } from '@/components/site-footer';
import { TopBar } from '@/components/dashboard/top-bar';

export const metadata: Metadata = { title: 'Markets', robots: { index: false, follow: false } };

export default function DashboardMarketsPage() {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:px-8">
        <DashboardMarkets />
      </main>
      <SiteFooter />
    </div>
  );
}
