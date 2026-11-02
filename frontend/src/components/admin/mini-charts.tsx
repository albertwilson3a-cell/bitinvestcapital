'use client';

import { Area, AreaChart, Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { DayPoint } from '@/lib/admin-types';
import { formatUsd } from '@/lib/format';

const dayFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: DayPoint & { v: number } }[]; unit: 'usd' | 'count' }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-rule-strong bg-vault-raised px-2.5 py-1.5 text-[12px] shadow-xl">
      <div className="text-mist">{dayFmt.format(new Date(`${p.day}T00:00:00Z`))}</div>
      <div className="tabular">{unit === 'usd' ? formatUsd(p.v, { signed: true }) : `${p.v} verified`}</div>
    </div>
  );
}

/** 30 daily bars; negative values (net outflow) drawn in the down colour. */
export function DailyBars({ data, unit, color = 'var(--brass)' }: { data: DayPoint[]; unit: 'usd' | 'count'; color?: string }) {
  const rows = data.map((d) => ({ ...d, v: unit === 'usd' ? (d.usd ?? 0) : (d.count ?? 0) }));
  return (
    <div className="h-[88px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
          <XAxis dataKey="day" hide />
          <Tooltip content={<Tip unit={unit} />} cursor={{ fill: 'var(--rule)', opacity: 0.5 }} />
          <Bar dataKey="v" radius={[1.5, 1.5, 0, 0]} isAnimationActive={false} minPointSize={1}>
            {rows.map((r) => (
              <Cell key={r.day} fill={r.v < 0 ? 'var(--down)' : r.v === 0 ? 'var(--rule-strong)' : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Running total across the 30 days. */
export function CumulativeArea({ data }: { data: DayPoint[] }) {
  const rows = data.reduce<(DayPoint & { v: number })[]>((acc, d) => {
    const prev = acc.length ? acc[acc.length - 1].v : 0;
    acc.push({ ...d, v: prev + (d.usd ?? 0) });
    return acc;
  }, []);
  return (
    <div className="h-[88px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cum-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brass)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--brass)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <Tooltip content={<Tip unit="usd" />} cursor={{ stroke: 'var(--rule-strong)' }} />
          <Area type="monotone" dataKey="v" stroke="var(--brass)" strokeWidth={1.5} fill="url(#cum-fill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
