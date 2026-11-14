'use client';

import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Panel } from '@/components/dashboard/panel';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { projectValue, useLiveInvestments } from '@/hooks/use-investments';
import { weeklyLabel } from '@/hooks/use-public';
import { formatUsd } from '@/lib/format';
import { ASSETS, type Asset } from '@/lib/types';

const HORIZONS = [
  { value: '4', label: '1 month' },
  { value: '13', label: '3 months' },
  { value: '26', label: '6 months' },
  { value: '52', label: '1 year' },
] as const;

interface Point { week: number; current: number; extra: number; principal: number }

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = p.current + p.extra;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-3 py-2 text-[12px] shadow-xl">
      <div className="text-mist">Week {p.week}</div>
      <div className="mt-1 flex justify-between gap-6"><span className="text-mist">Projected value</span><span className="tabular font-medium">{formatUsd(total)}</span></div>
      <div className="flex justify-between gap-6"><span className="text-mist">Returns</span><span className="tabular text-up">+{formatUsd(total - p.principal)}</span></div>
    </div>
  );
}

/**
 * Where the investment is heading if today's admin rates stay the same, compounding
 * weekly, with a "what if I invest more" slider. Coin prices are held at today's level.
 */
export function ProjectionPanel() {
  const { rows, totals } = useLiveInvestments(10_000);
  const [horizon, setHorizon] = useState<string>('13');
  const [extra, setExtra] = useState(0);
  const openAssets = (rows ?? []).filter((r) => r.open && r.rate);
  const [extraAsset, setExtraAsset] = useState<Asset>('USDT');
  const weeks = Number(horizon);
  const extraRow = openAssets.find((r) => r.asset === extraAsset) ?? openAssets[0];

  // Cheap (≤ 53 points): computed on each render so it follows live values.
  const data: Point[] = rows
    ? Array.from({ length: weeks + 1 }, (_, w) => {
        const current = rows.reduce((s, r) => s + (r.liveUsd !== null && r.rate?.isActive ? projectValue(r.liveUsd, Number(r.rate.weeklyPercent), w) : r.liveUsd ?? 0), 0);
        const extraValue = extraRow?.rate ? projectValue(extra, Number(extraRow.rate.weeklyPercent), w) : extra;
        return { week: w, current, extra: extraValue, principal: (totals?.invested ?? 0) + extra };
      })
    : [];

  if (!rows || !totals) return <Skeleton className="h-[420px] w-full" />;
  const end = data[data.length - 1];
  const start = (totals.invested ?? 0) + extra;
  const maxExtra = Math.max(1000, Math.ceil((totals.wallet + 1) / 500) * 500, 10_000);

  const milestone = (w: number) => {
    const p = data[Math.min(w, data.length - 1)];
    return p ? p.current + p.extra : 0;
  };

  return (
    <Panel
      id="projection"
      title="Where your investment is heading"
      description="Projected with today’s weekly rates, compounding. Rates are set by BitInvest Capital and can change; BTC and ETH values also move with their price."
      actions={<Segmented label="Projection length" value={horizon} onChange={setHorizon} options={HORIZONS.map((h) => ({ value: h.value, label: h.label }))} />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-3">
            <span className="tabular text-[22px] font-semibold">{formatUsd(end.current + end.extra)}</span>
            <span className="tabular text-[14px] text-up">+{formatUsd(end.current + end.extra - start)} in {HORIZONS.find((h) => h.value === horizon)!.label}</span>
          </div>
          <div className="h-[240px] sm:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="projA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--up)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--up)" stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="projB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brass)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--brass)" stopOpacity={0.05} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tickFormatter={(w: number) => (w === 0 ? 'Now' : `W${w}`)} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis width={72} tickFormatter={(v: number) => formatUsd(v)} tick={{ fill: 'var(--mist)', fontSize: 11 }} tickLine={false} axisLine={false} domain={[Math.max(start - (end.current + end.extra - start) * 0.3, 0), (end.current + end.extra) * 1.0005 + 0.01]} allowDataOverflow />
                <Tooltip content={<Tip />} cursor={{ stroke: 'var(--rule-strong)' }} />
                <Area type="monotone" dataKey="current" stackId="v" stroke="var(--up)" strokeWidth={2} fill="url(#projA)" baseValue="dataMin" isAnimationActive={false} />
                <Area type="monotone" dataKey="extra" stackId="v" stroke="var(--brass)" strokeWidth={2} fill="url(#projB)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 text-[12px] text-mist">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-up" /> Your investment today</span>
            {extra > 0 && <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-brass" /> If you add {formatUsd(extra)}</span>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="rounded-lg border border-rule bg-ink/50 p-4">
            <p className="text-[13px] font-medium">What if I invest more?</p>
            <p className="tabular mt-1 text-[20px] font-semibold text-brass">{formatUsd(extra)}</p>
            <Slider className="mt-3" min={0} max={maxExtra} step={50} value={[extra]} onValueChange={([v]) => setExtra(v)} aria-label="Extra amount to invest" />
            {openAssets.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ASSETS.filter((a) => openAssets.some((r) => r.asset === a)).map((a) => {
                  const r = openAssets.find((x) => x.asset === a)!;
                  return (
                    <button key={a} type="button" onClick={() => setExtraAsset(a)}
                      className={`min-h-8 rounded-md border px-2.5 text-[12px] ${extraRow?.asset === a ? 'border-brass text-foreground' : 'border-rule text-mist'}`}>
                      {a} · {weeklyLabel(r.rate!.weeklyPercent)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {[
              ['In 1 week', 1],
              ['In 1 month', 4],
              ['In 3 months', 13],
              ['In 1 year', 52],
            ].map(([label, w]) => {
              const v = w as number <= weeks ? milestone(w as number) : (() => {
                const cur = rows.reduce((s, r) => s + (r.liveUsd !== null && r.rate?.isActive ? projectValue(r.liveUsd, Number(r.rate.weeklyPercent), w as number) : r.liveUsd ?? 0), 0);
                return cur + (extraRow?.rate ? projectValue(extra, Number(extraRow.rate.weeklyPercent), w as number) : extra);
              })();
              return (
                <div key={label as string} className="rounded-lg border border-rule p-3">
                  <dt className="text-[11.5px] text-mist">{label}</dt>
                  <dd className="tabular mt-0.5 text-[15px] font-semibold">{formatUsd(v)}</dd>
                  <dd className="tabular text-[11.5px] text-up">+{formatUsd(v - start)}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>
    </Panel>
  );
}
