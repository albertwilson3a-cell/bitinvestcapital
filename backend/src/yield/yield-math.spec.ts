import { Prisma, YieldInterval } from '../generated/prisma/client.js';
import { latestCompletedPeriod, periodRate } from './yield-math.js';

describe('yield maths', () => {
  it('derives a per-period rate that compounds back to the APY', () => {
    const D = Prisma.Decimal.clone({ precision: 40 });
    const daily = periodRate(5, YieldInterval.DAILY);
    expect(daily.startsWith('0.00013368061711344')).toBe(true);
    expect(new D(daily).plus(1).pow(365).minus(1).toDecimalPlaces(12).toString()).toBe('0.05');
    const hourly = periodRate('12.5', YieldInterval.HOURLY);
    expect(new D(hourly).plus(1).pow(8760).minus(1).toDecimalPlaces(12).toString()).toBe('0.125');
    expect(periodRate(0, YieldInterval.DAILY)).toBe('0');
  });

  it('picks the latest completed UTC period', () => {
    const now = new Date('2026-10-31T00:00:07.000Z');
    expect(latestCompletedPeriod(YieldInterval.DAILY, now)).toEqual({
      start: new Date('2026-10-30T00:00:00.000Z'),
      end: new Date('2026-10-31T00:00:00.000Z'),
      key: 'daily:2026-10-30',
    });
    expect(latestCompletedPeriod(YieldInterval.HOURLY, new Date('2026-10-31T09:59:59.999Z')).key).toBe('hourly:2026-10-31T08');
  });
});
