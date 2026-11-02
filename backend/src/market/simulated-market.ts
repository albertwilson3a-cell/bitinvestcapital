/**
 * Development-only price model. Price is a pure function of (coin, time), so
 * the current price, the 24h change and every chart agree with each other and
 * survive restarts. Built from smooth noise at several time scales; refused in
 * production by env validation.
 */
import type { CoinSpec } from './coins.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** [period, amplitude in log-price] — short wiggles to multi-month trends. */
const LAYERS: [number, number][] = [
  [20 * 60_000, 0.0025],
  [3 * HOUR, 0.006],
  [DAY, 0.014],
  [5 * DAY, 0.035],
  [21 * DAY, 0.07],
  [90 * DAY, 0.13],
];

function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Deterministic value in [-1, 1] for an integer lattice point. */
function lattice(seed: number, i: number): number {
  let x = (seed ^ Math.imul(i | 0, 0x27d4eb2d)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return ((x >>> 0) / 0xffffffff) * 2 - 1;
}

function smoothNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return lattice(seed, i) * (1 - s) + lattice(seed, i + 1) * s;
}

export function simulatedPrice(coin: CoinSpec, t: number): number {
  if (coin.stable) {
    const wobble = smoothNoise(hashSeed(coin.symbol), t / (2 * HOUR)) * 0.0006;
    return 1 + wobble;
  }
  const seed = hashSeed(coin.symbol);
  let log = 0;
  LAYERS.forEach(([period, amp], k) => {
    log += amp * coin.sim.vol * smoothNoise(seed + k * 7919, t / period);
  });
  return coin.sim.price * Math.exp(log);
}

export function simulatedSeries(coin: CoinSpec, from: number, to: number, stepMs: number): [number, number][] {
  const start = Math.ceil(from / stepMs) * stepMs;
  const out: [number, number][] = [];
  for (let t = start; t <= to; t += stepMs) out.push([t, simulatedPrice(coin, t)]);
  if (!out.length || out[out.length - 1][0] !== to) out.push([to, simulatedPrice(coin, to)]);
  return out;
}

export function simulatedVolume(coin: CoinSpec, t: number): number {
  const mcap = simulatedPrice(coin, t) * coin.sim.supply;
  const swing = 1 + 0.35 * smoothNoise(hashSeed(coin.symbol) + 101, t / (6 * HOUR));
  return mcap * coin.sim.volumeShare * swing;
}

export const MS = { HOUR, DAY };
