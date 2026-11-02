/**
 * Brand and public configuration. NEXT_PUBLIC_* values are inlined at build
 * time; each is validated here so a bad value fails the build instead of
 * shipping broken links. Defaults are the production values.
 */

function url(name: string, value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim() || fallback;
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
    return v.replace(/\/+$/, '');
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL (got "${v}")`);
  }
}

function email(name: string, value: string | undefined, fallback: string): string {
  const v = (value ?? '').trim() || fallback;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`${name} must be an email address (got "${v}")`);
  return v;
}

export const APP_NAME = (process.env.NEXT_PUBLIC_APP_NAME ?? '').trim() || 'BitInvest Capital';
export const SITE_URL = url('NEXT_PUBLIC_SITE_URL', process.env.NEXT_PUBLIC_SITE_URL, 'https://bitinvestcapital.com');
export const SITE_HOST = new URL(SITE_URL).host;
export const SUPPORT_EMAIL = email('NEXT_PUBLIC_SUPPORT_EMAIL', process.env.NEXT_PUBLIC_SUPPORT_EMAIL, 'support@bitinvestcapital.com');

export const EXPLORERS = {
  ETHEREUM: url('NEXT_PUBLIC_ETH_EXPLORER_TX', process.env.NEXT_PUBLIC_ETH_EXPLORER_TX, 'https://etherscan.io/tx') + '/',
  BITCOIN: url('NEXT_PUBLIC_BTC_EXPLORER_TX', process.env.NEXT_PUBLIC_BTC_EXPLORER_TX, 'https://mempool.space/tx') + '/',
} as const;
