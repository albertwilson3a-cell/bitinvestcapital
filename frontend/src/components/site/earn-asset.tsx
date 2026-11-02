'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { usePublicRates } from '@/hooks/use-public';
import { formatUsd } from '@/lib/format';
import { growth } from '@/components/site/calculators';

/** Live rate banner for one asset. */
export function AssetRate({ asset }: { asset: string }) {
  const { data, isLoading } = usePublicRates();
  const r = data?.yields.find((y) => y.asset === asset);
  if (isLoading) return <Skeleton className="h-28 w-full max-w-md" />;
  return (
    <div className="rounded-2xl border border-brass/30 bg-vault/70 p-6">
      {r ? (
        <>
          <p className="text-[13px] text-mist">Current rate</p>
          <p className="tabular mt-1 text-[52px] leading-none font-semibold tracking-[-0.03em] text-brass">{Number(r.apyPercent).toFixed(2)}%</p>
          <p className="mt-2 text-[14px] text-mist">a year (APY), paid {r.interval === 'HOURLY' ? 'every hour' : 'every day at 00:00 UTC'}. Variable, not guaranteed.</p>
        </>
      ) : (
        <p className="text-[15px] text-mist">Earning on {asset} is currently paused. Check back for updates.</p>
      )}
    </div>
  );
}

/** Example growth table at the live rate. */
export function AssetExample({ asset, amount, unit }: { asset: string; amount: number; unit: string }) {
  const { data } = usePublicRates();
  const r = data?.yields.find((y) => y.asset === asset);
  if (!r) return <Skeleton className="h-64 w-full" />;
  const apy = Number(r.apyPercent);
  const rows = [7, 30, 90, 180, 365, 730].map((d) => ({ d, bal: amount * growth(apy, d / 365) }));
  const fmt = (v: number) => (unit === 'USD' ? formatUsd(v) : `${v.toLocaleString('en-US', { maximumFractionDigits: 6 })} ${unit}`);
  return (
    <div className="overflow-x-auto rounded-xl border border-rule">
      <table className="w-full min-w-[480px] text-[14px]">
        <thead className="bg-vault/70 text-[12px] text-mist"><tr><th className="px-4 py-3 text-left font-medium">Held for</th><th className="px-4 py-3 text-right font-medium">Yield earned</th><th className="px-4 py-3 text-right font-medium">Balance</th></tr></thead>
        <tbody className="divide-y divide-rule">
          {rows.map((x) => (
            <tr key={x.d} className="bg-vault/30">
              <td className="px-4 py-3">{x.d === 365 ? '1 year' : x.d === 730 ? '2 years' : `${x.d} days`}</td>
              <td className="tabular px-4 py-3 text-right text-up">+{fmt(x.bal - amount)}</td>
              <td className="tabular px-4 py-3 text-right">{fmt(x.bal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-rule px-4 py-3 text-[12px] text-mist">At today’s rate of {apy.toFixed(2)}% a year, if it stayed the same. Rates are variable.</p>
    </div>
  );
}
