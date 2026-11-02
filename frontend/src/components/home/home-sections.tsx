'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Change } from '@/components/market/change';
import { CoinMark } from '@/components/market/coin-mark';
import { Sparkline } from '@/components/market/sparkline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketCoins } from '@/hooks/use-market';
import { useOptionalMe, usePublicRates, type PublicRates } from '@/hooks/use-public';
import { formatPrice } from '@/lib/format';

const pct = (rate: string) => `${Number((Number(rate) * 100).toFixed(2))}%`;

export function HomeHero() {
  const router = useRouter();
  const rates = usePublicRates().data;
  const me = useOptionalMe().data;
  const [email, setEmail] = useState('');
  const best = rates?.yields.reduce<PublicRates['yields'][number] | null>(
    (top, r) => (!top || Number(r.apyPercent) > Number(top.apyPercent) ? r : top),
    null,
  );

  function start(e: React.FormEvent) {
    e.preventDefault();
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : '';
    router.push(`/register${q}`);
  }

  return (
    <div className="flex flex-col justify-center">
      {best ? (
        <p className="tabular text-[clamp(3.25rem,7vw,5.25rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-brass">
          {Number(best.apyPercent).toFixed(2)}%
          <span className="ml-3 align-middle text-[clamp(0.85rem,1.4vw,1rem)] font-medium tracking-normal text-mist">a year on {best.asset}*</span>
        </p>
      ) : (
        <p className="text-[13px] font-medium tracking-[0.14em] text-brass uppercase">Bitcoin · Ethereum · Stablecoins</p>
      )}
      <h1 className="mt-5 max-w-[20ch] text-balance font-display text-[clamp(2.4rem,5vw,3.75rem)] leading-[1.02]">Put your crypto to work.</h1>
      <p className="mt-5 max-w-[48ch] text-[16px] leading-relaxed text-mist">
        Follow 14 major cryptocurrencies, deposit to your own dedicated addresses, choose how your portfolio is split and earn variable yield
        credited straight to your balance.
      </p>
      <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
        {[
          { k: '14', v: 'Coins tracked live' },
          { k: '12', v: 'Blockchains supported or planned' },
          { k: rates ? pct(rates.referral.depositRewardRate) : '—', v: 'Referral reward on deposits' },
        ].map((s) => (
          <div key={s.v} className="border-l-2 border-brass/60 pl-3">
            <p className="tabular text-[22px] leading-none font-semibold">{s.k}</p>
            <p className="mt-1.5 text-[12px] text-mist">{s.v}</p>
          </div>
        ))}
      </div>
      {me ? (
        <div className="mt-9 max-w-[460px] rounded-xl border border-brass/30 bg-vault/60 p-5">
          <p className="text-[15px] font-semibold">Welcome back</p>
          <p className="mt-1 truncate text-[13px] text-mist">Signed in as {me.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link href={me.role === 'ADMIN' ? '/admin' : '/dashboard'}>{me.role === 'ADMIN' ? 'Open admin console' : 'Go to your dashboard'} <ArrowRight /></Link>
            </Button>
            {me.role !== 'ADMIN' && (
              <Button asChild size="lg" variant="outline"><Link href="/dashboard/markets">View markets</Link></Button>
            )}
          </div>
        </div>
      ) : (
      <>
      <form onSubmit={start} className="mt-9 flex max-w-[440px] flex-col gap-2 sm:flex-row">
        <label htmlFor="hero-email" className="sr-only">Email address</label>
        <Input id="hero-email" type="email" autoComplete="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 w-full bg-vault/60 sm:flex-1" />
        <Button type="submit" size="lg">
          Open account <ArrowRight />
        </Button>
      </form>
      <p className="mt-3 text-[13px] text-mist">
        Already a client? <Link href="/login" className="text-foreground underline-offset-4 hover:underline">Log in</Link>
      </p>
      </>
      )}
      {best && <p className="pt-2 text-[11px] text-mist">*Current variable rate, paid {best.interval === 'HOURLY' ? 'hourly' : 'daily'}. Not guaranteed.</p>}
    </div>
  );
}

/** Compact live price card for the hero. */
export function HeroPrices() {
  const { data } = useMarketCoins();
  const coins = data?.coins.slice(0, 8);
  return (
    <section aria-label="Live prices" className="rounded-xl border border-rule bg-vault/70 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">Live prices</h2>
        <Link href="/markets" className="text-[12px] text-mist hover:text-foreground">All 14 coins →</Link>
      </div>
      <ul className="mt-3 divide-y divide-rule">
        {!coins
          ? Array.from({ length: 8 }, (_, i) => <li key={i} className="py-2.5"><Skeleton className="h-7 w-full" /></li>)
          : coins.map((c) => (
              <li key={c.symbol}>
                <Link href={`/markets/${c.symbol.toLowerCase()}`} className="grid grid-cols-[1fr_auto_auto_4.25rem] items-center gap-3 py-2.5 hover:text-foreground">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <CoinMark symbol={c.symbol} size="sm" />
                    <span className="truncate text-[14px] font-semibold">{c.symbol}</span>
                    <span className="hidden truncate text-[13px] text-mist sm:inline">{c.name}</span>
                  </span>
                  <Sparkline values={c.sparkline7d} width={64} height={22} className="hidden sm:block" />
                  <span className="tabular text-right text-[14px] font-medium">{formatPrice(c.priceUsd)}</span>
                  <Change value={c.change24hPercent} className="text-right text-[13px]" />
                </Link>
              </li>
            ))}
      </ul>
    </section>
  );
}

export function ReferralBanner() {
  const rates = usePublicRates().data;
  const deposit = rates ? pct(rates.referral.depositRewardRate) : null;
  const share = rates ? pct(rates.referral.affiliateYieldRate) : null;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-brass/30 bg-[linear-gradient(110deg,var(--vault-raised)_0%,var(--vault)_55%,color-mix(in_oklab,var(--brass)_14%,var(--vault))_100%)] px-6 py-10 sm:px-10">
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[12px] font-medium tracking-[0.14em] text-brass uppercase">Referral programme</p>
          <h2 className="mt-3 max-w-[30ch] text-[clamp(1.4rem,2.6vw,1.9rem)] leading-snug font-semibold tracking-[-0.01em]">
            Invite friends and earn{deposit ? ` ${deposit} of every deposit they make` : ' on every deposit they make'}, paid in USDT.
          </h2>
          <p className="mt-2 max-w-[60ch] text-[14px] text-mist">
            {share ? `Plus ${share} of the yield they earn, for as long as they hold with us.` : 'Plus a share of the yield they earn.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/referral">How it works <ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
