const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export function formatUsd(value: number, opts: { compact?: boolean; signed?: boolean } = {}): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const text = opts.compact && abs >= 100_000 ? usdCompact.format(abs) : usd.format(abs);
  if (value < 0 && text !== usd.format(0)) return `\u2212${text}`; // true minus sign, matching percentages
  return opts.signed && value > 0 ? `+${text}` : text;
}

/** Splits $12,345.67 into whole and cents so the cents can be set smaller. */
export function splitUsd(value: number): { whole: string; cents: string } {
  const text = usd.format(Number.isFinite(value) ? value : 0);
  const i = text.lastIndexOf('.');
  return { whole: text.slice(0, i), cents: text.slice(i) };
}

export function formatAmount(value: string | number, maxDecimals: number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '—';
  const decimals = n !== 0 && Math.abs(n) < 1 ? Math.max(maxDecimals, 2) : Math.min(maxDecimals, Math.abs(n) >= 1000 ? 2 : 4);
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals }).format(n);
}

export function formatPercent(value: number | null | undefined, opts: { signed?: boolean; digits?: number } = {}): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const digits = opts.digits ?? 2;
  const floor = 10 ** -digits;
  // Tiny non-zero moves read as "<0.01%" rather than a misleading signed zero.
  if (value !== 0 && Math.abs(value) < floor) return `<${floor.toFixed(digits)}%`;
  const text = `${Math.abs(value).toFixed(digits)}%`;
  if (!opts.signed) return text;
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : text;
}

export function shortHash(hash: string, head = 6, tail = 4): string {
  return hash.length <= head + tail + 1 ? hash : `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function timeAgo(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return 'just now';
  if (abs < 3600) return relative.format(Math.round(diff / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(diff / 3600), 'hour');
  if (abs < 7 * 86_400) return relative.format(Math.round(diff / 86_400), 'day');
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Prices from $0.0001 to $100,000 with sensible precision for each magnitude. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 1 ? 2 : abs >= 0.01 ? 4 : 6;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });

/** $1.52T, $845.1B, $12.3M */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return compactUsd.format(value);
}
