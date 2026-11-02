'use client';

import { useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/use-dashboard';
import { usePublicRates } from '@/hooks/use-public';

const pct = (rate: string) => `${Number((Number(rate) * 100).toFixed(2))}%`;

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. insecure context); the value stays selectable.
    }
  }
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[12px] text-mist">{label}</p>
      <div className="flex items-center gap-2 rounded-md border border-rule-strong bg-ink/60 py-1 pr-1 pl-3">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px] select-all">{value}</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}>
          {copied ? <Check className="text-up" /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}

/** The client's own referral code and invite link, with the rates currently paid. */
export function InvitePanel() {
  const me = useMe();
  const rates = usePublicRates();
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const r = rates.data?.referral;

  return (
    <Panel
      id="invite"
      title="Invite friends"
      description={
        r
          ? `Earn ${pct(r.depositRewardRate)} of every deposit they make, paid in USDT, plus ${pct(r.affiliateYieldRate)} of the yield they earn.`
          : 'Earn a reward on every deposit your friends make, plus a share of their yield.'
      }
      actions={<Gift className="size-4 text-brass" />}
    >
      {me.data ? (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <CopyField label="Referral code" value={me.data.referralCode} />
          <CopyField label="Invite link" value={`${origin}/register?ref=${me.data.referralCode}`} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <Skeleton className="h-[62px]" />
          <Skeleton className="h-[62px]" />
        </div>
      )}
    </Panel>
  );
}
