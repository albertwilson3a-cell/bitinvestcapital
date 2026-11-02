'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePublicRates } from '@/hooks/use-public';

const pct = (rate: string) => `${Number((Number(rate) * 100).toFixed(2))}%`;

export function ReferralRates() {
  const r = usePublicRates().data?.referral;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        { value: r && pct(r.depositRewardRate), label: 'of every deposit your friends make', note: 'Paid in USDT when the deposit confirms' },
        { value: r && pct(r.affiliateYieldRate), label: 'of the yield your friends earn', note: 'Paid in the same asset, every payout' },
      ].map((s) => (
        <div key={s.label} className="rounded-xl border border-brass/30 bg-vault/70 p-6">
          {s.value ? <p className="tabular text-[44px] leading-none font-semibold tracking-[-0.03em] text-brass">{s.value}</p> : <Skeleton className="h-11 w-24" />}
          <p className="mt-3 text-[15px] font-medium">{s.label}</p>
          <p className="mt-1 text-[12px] text-mist">{s.note}</p>
        </div>
      ))}
    </div>
  );
}
