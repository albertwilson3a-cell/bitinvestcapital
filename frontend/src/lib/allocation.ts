import { ASSETS, type Asset } from './types';

/** Weights are integer basis points (100.00% = 10_000) so the total is always exact. */
export type Weights = Record<Asset, number>;
export type Included = Record<Asset, boolean>;

export const FULL = 10_000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Distributes `total` across `assets` in proportion to `basis` (equal split if basis is all zero). */
function distribute(total: number, assets: Asset[], basis: Weights): Partial<Weights> {
  if (assets.length === 0) return {};
  const sum = assets.reduce((s, a) => s + basis[a], 0);
  const raw = assets.map((a) => (sum > 0 ? (total * basis[a]) / sum : total / assets.length));
  const out = raw.map(Math.floor);
  // Hand out the rounding remainder to the largest fractional parts.
  let remainder = total - out.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((x, y) => y.frac - x.frac);
  for (let k = 0; remainder > 0; k = (k + 1) % order.length, remainder--) out[order[k].i] += 1;
  return Object.fromEntries(assets.map((a, i) => [a, out[i]]));
}

/**
 * Sets one asset's weight and rebalances the other included assets proportionally,
 * so the included weights always sum to exactly 100%.
 */
export function setWeight(weights: Weights, included: Included, asset: Asset, value: number): Weights {
  const others = ASSETS.filter((a) => a !== asset && included[a]);
  if (others.length === 0) return { ...zero(), [asset]: FULL };
  const v = clamp(Math.round(value), 0, FULL);
  return { ...zero(), [asset]: v, ...distribute(FULL - v, others, weights) } as Weights;
}

/** Turns an asset on (taking an equal share) or off (its share flows to the rest). */
export function toggle(weights: Weights, included: Included, asset: Asset, on: boolean): { weights: Weights; included: Included } {
  const nextIncluded = { ...included, [asset]: on };
  const active = ASSETS.filter((a) => nextIncluded[a]);
  if (active.length === 0) return { weights, included }; // at least one asset must stay in
  if (!on) {
    return { weights: { ...zero(), ...distribute(FULL, active, weights) } as Weights, included: nextIncluded };
  }
  const share = Math.round(FULL / active.length);
  const rest = active.filter((a) => a !== asset);
  return {
    weights: { ...zero(), [asset]: share, ...distribute(FULL - share, rest, weights) } as Weights,
    included: nextIncluded,
  };
}

export function zero(): Weights {
  return { BTC: 0, ETH: 0, USDT: 0 };
}

export function total(weights: Weights, included: Included): number {
  return ASSETS.reduce((s, a) => s + (included[a] ? weights[a] : 0), 0);
}

export function toPayload(weights: Weights, included: Included) {
  return ASSETS.filter((a) => included[a] && weights[a] > 0).map((a) => ({ asset: a, percentage: weights[a] / 100 }));
}

export function fromServer(rows: { asset: Asset; percentage: string }[]): { weights: Weights; included: Included } {
  const weights = zero();
  const included: Included = { BTC: false, ETH: false, USDT: false };
  for (const r of rows) {
    weights[r.asset] = Math.round(Number(r.percentage) * 100);
    included[r.asset] = true;
  }
  return { weights, included };
}
