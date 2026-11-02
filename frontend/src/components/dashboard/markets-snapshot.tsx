'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PriceChart } from '@/components/market/price-chart';
import { Button } from '@/components/ui/button';

/** Coin chart on the portfolio page, with a link to the full markets view. */
export function MarketsSnapshot() {
  return (
    <section aria-labelledby="markets-snap" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="markets-snap" className="text-[15px] font-semibold tracking-[-0.01em]">Markets</h2>
          <p className="mt-0.5 text-[13px] text-mist">Price history for all 14 coins we cover.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/markets">All markets <ArrowRight /></Link>
        </Button>
      </div>
      <PriceChart selectable symbol="BTC" defaultRange="7D" height={280} />
    </section>
  );
}
