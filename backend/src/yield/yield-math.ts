import { Prisma, YieldInterval } from '../generated/prisma/client.js';

/** High-precision Decimal for rate maths (fractional powers). */
const D = Prisma.Decimal.clone({ precision: 40, rounding: Prisma.Decimal.ROUND_HALF_EVEN });

export const PERIODS_PER_YEAR: Record<YieldInterval, number> = {
  [YieldInterval.HOURLY]: 365 * 24,
  [YieldInterval.DAILY]: 365,
};

const INTERVAL_MS: Record<YieldInterval, number> = {
  [YieldInterval.HOURLY]: 3_600_000,
  [YieldInterval.DAILY]: 86_400_000,
};

/**
 * Per-period rate that compounds to the stated APY:
 *   r = (1 + APY)^(1/n) − 1
 * so paying r every period (and crediting it to the balance) yields exactly APY per year.
 * Returned with 24 decimal places; payouts are truncated to asset precision afterwards.
 */
export function periodRate(apyPercent: Prisma.Decimal | string | number, interval: YieldInterval): string {
  const apy = new D(apyPercent.toString()).div(100);
  if (apy.isZero()) return '0';
  return apy.plus(1).pow(new D(1).div(PERIODS_PER_YEAR[interval])).minus(1).toDecimalPlaces(24, D.ROUND_DOWN).toFixed();
}

export interface Period {
  start: Date;
  end: Date;
  key: string;
}

/** The most recent fully elapsed period (UTC) at `now`: e.g. yesterday for DAILY. */
export function latestCompletedPeriod(interval: YieldInterval, now: Date = new Date()): Period {
  const len = INTERVAL_MS[interval];
  const endMs = Math.floor(now.getTime() / len) * len;
  const start = new Date(endMs - len);
  const iso = start.toISOString();
  const key = interval === YieldInterval.DAILY ? `daily:${iso.slice(0, 10)}` : `hourly:${iso.slice(0, 13)}`;
  return { start, end: new Date(endMs), key };
}
