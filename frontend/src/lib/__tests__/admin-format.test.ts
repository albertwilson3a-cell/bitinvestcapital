import { describe, expect, it } from 'vitest';
import { percentToFraction, relativeChange, toPercent } from '../admin-format';

describe('rate conversions', () => {
  it.each([
    ['1', '0.01'], ['1.25', '0.0125'], ['5', '0.05'], ['0.5', '0.005'], ['12.3456', '0.123456'], ['0', '0'], ['10', '0.1'], ['50', '0.5'],
  ])('%s%% → %s', (pct, frac) => expect(percentToFraction(pct)).toBe(frac));

  it('formats fractions as percentages', () => {
    expect(toPercent('0.0125')).toBe('1.25%');
    expect(toPercent('0.05')).toBe('5%');
  });

  it('computes period-over-period change', () => {
    expect(relativeChange(150, 100)).toBe(50);
    expect(relativeChange(50, -100)).toBe(150);
    expect(relativeChange(10, 0)).toBeNull();
    expect(relativeChange(null, 5)).toBeNull();
  });
});
