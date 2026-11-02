import { describe, expect, it } from 'vitest';
import { FULL, fromServer, setWeight, toPayload, toggle, total, type Included, type Weights } from '../allocation';

const all: Included = { BTC: true, ETH: true, USDT: true };

describe('allocation rebalancing', () => {
  it('keeps the total at exactly 100% while rebalancing others proportionally', () => {
    const w: Weights = { BTC: 4000, ETH: 4000, USDT: 2000 };
    const next = setWeight(w, all, 'BTC', 7000);
    expect(next).toEqual({ BTC: 7000, ETH: 2000, USDT: 1000 });
    expect(total(next, all)).toBe(FULL);
  });

  it('handles awkward splits without drift (1/3s) across many random moves', () => {
    let w: Weights = { BTC: 3334, ETH: 3333, USDT: 3333 };
    for (let i = 0; i < 2000; i++) {
      const asset = (['BTC', 'ETH', 'USDT'] as const)[i % 3];
      w = setWeight(w, all, asset, Math.floor(Math.random() * 10001));
      expect(total(w, all)).toBe(FULL);
      expect(Object.values(w).every((v) => v >= 0 && Number.isInteger(v))).toBe(true);
    }
  });

  it('splits evenly when the other assets are at zero', () => {
    expect(setWeight({ BTC: 10000, ETH: 0, USDT: 0 }, all, 'BTC', 4000)).toEqual({ BTC: 4000, ETH: 3000, USDT: 3000 });
  });

  it('pins a lone included asset at 100%', () => {
    const only: Included = { BTC: false, ETH: true, USDT: false };
    expect(setWeight({ BTC: 0, ETH: 10000, USDT: 0 }, only, 'ETH', 3000).ETH).toBe(FULL);
  });

  it('toggling off hands the share to the rest; toggling on takes an equal share', () => {
    const off = toggle({ BTC: 5000, ETH: 3000, USDT: 2000 }, all, 'BTC', false);
    expect(off.included.BTC).toBe(false);
    expect(off.weights).toEqual({ BTC: 0, ETH: 6000, USDT: 4000 });
    const on = toggle(off.weights, off.included, 'BTC', true);
    expect(on.weights.BTC).toBe(3333);
    expect(total(on.weights, on.included)).toBe(FULL);
  });

  it('never lets the last asset be switched off', () => {
    const only: Included = { BTC: true, ETH: false, USDT: false };
    expect(toggle({ BTC: 10000, ETH: 0, USDT: 0 }, only, 'BTC', false).included.BTC).toBe(true);
  });

  it('round-trips with the API format (2-decimal percentages, excluded assets omitted)', () => {
    const s = fromServer([{ asset: 'BTC', percentage: '33.33' }, { asset: 'USDT', percentage: '66.67' }]);
    expect(s.included).toEqual({ BTC: true, ETH: false, USDT: true });
    expect(toPayload(s.weights, s.included)).toEqual([{ asset: 'BTC', percentage: 33.33 }, { asset: 'USDT', percentage: 66.67 }]);
  });
});
