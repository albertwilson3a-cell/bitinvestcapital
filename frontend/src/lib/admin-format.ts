import type { AuditEntry } from './admin-types';

const ACTIONS: Record<string, string> = {
  'user.view': 'Opened customer record',
  'adjustment.request': 'Requested balance adjustment',
  'adjustment.approve': 'Approved balance adjustment',
  'adjustment.reject': 'Rejected balance adjustment',
  'settings.update': 'Changed referral parameters',
  'yield_rate.update': 'Changed interest rate',
  'yield_run.trigger': 'Ran payout manually',
};

export function actionLabel(action: string): string {
  return ACTIONS[action] ?? action;
}

/** One-line human summary of an audit entry's details. */
export function auditSummary(e: AuditEntry): string {
  const d = e.details ?? {};
  switch (e.action) {
    case 'adjustment.request':
    case 'adjustment.approve':
      return `${d.direction === 'DEBIT' ? 'Debit' : 'Credit'} ${String(d.amount ?? '')} ${String(d.asset ?? '')}`.trim();
    case 'adjustment.reject':
      return d.note ? `Note: ${String(d.note)}` : 'No note';
    case 'yield_rate.update':
      return `${e.targetId}: ${String(d.apyPercent)}% APY, ${String(d.interval).toLowerCase()}${d.isActive === false ? ', paused' : ''}`;
    case 'yield_run.trigger':
      return `${String(d.interval).toLowerCase()} run: ${String(d.status).replace(/_/g, ' ')}`;
    case 'settings.update': {
      const applied = (d.applied as { name: string; from: string; to: string }[] | undefined) ?? [];
      return applied.map((a) => `${settingLabel(a.name)} ${toPercent(a.from)} → ${toPercent(a.to)}`).join('; ');
    }
    default:
      return '';
  }
}

export function settingLabel(name: string): string {
  return name === 'referralDepositRewardRate' ? 'Deposit referral bonus' : name === 'affiliateYieldRewardRate' ? 'Referral yield share' : name;
}

/** "0.0125" → "1.25%" */
export function toPercent(fraction: string | number, digits = 2): string {
  const n = Number(fraction) * 100;
  return `${Number.isFinite(n) ? Number(n.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: digits }) : '—'}%`;
}

/** "1.25" (percent) → "0.0125" (fraction) without float noise. */
export function percentToFraction(percent: string): string {
  const [whole, frac = ''] = percent.trim().split('.');
  const digits = (whole.replace(/^0+(?=\d)/, '') + frac.padEnd(4, '0').slice(0, 4)).padStart(7, '0');
  const n = BigInt(digits); // percent × 10^4 → fraction × 10^6
  const s = n.toString().padStart(7, '0');
  const out = `${s.slice(0, -6)}.${s.slice(-6)}`.replace(/\.?0+$/, '');
  return out === '' ? '0' : out.startsWith('.') ? `0${out}` : out;
}

export function relativeChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
