import { expect, it } from 'vitest';
import { formatPercent, formatUsd } from '../format';
it('formats signs consistently', () => {
  expect(formatUsd(-1.81, { signed: true })).toBe('−$1.81');
  expect(formatUsd(12.8, { signed: true })).toBe('+$12.80');
  expect(formatUsd(-0.001)).toBe('$0.00');
  expect(formatPercent(-0.0026, { signed: true })).toBe('<0.01%');
  expect(formatPercent(-1.234, { signed: true })).toBe('−1.23%');
  expect(formatPercent(0, { signed: true })).toBe('0.00%');
});
