'use client';

import { ExternalLink } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useWallets } from '@/hooks/use-dashboard';
import { useCancelDepositClaim, useDepositClaims, type DepositClaimStatus } from '@/hooks/use-deposits';
import { EXPLORERS } from '@/lib/brand';
import { shortHash } from '@/lib/format';

const STATUS: Record<DepositClaimStatus, { label: string; variant: 'pending' | 'success' | 'danger' | 'neutral' }> = {
  PENDING_REVIEW: { label: 'Being checked', variant: 'pending' },
  CREDITED: { label: 'Credited', variant: 'success' },
  REJECTED: { label: 'Not credited', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const trim = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v);

/** Deposits the client reported to a shared platform address, and where each one stands. */
export function DepositsPanel() {
  const wallets = useWallets();
  const list = useDepositClaims();
  const cancel = useCancelDepositClaim();
  const usesShared = wallets.data?.some((w) => w.depositMode === 'shared');
  if (!usesShared && !list.data?.length) return null;

  return (
    <Panel
      id="deposits"
      title="Deposits"
      description="After you send crypto, report the transaction from the Deposit button on any asset. Our team checks it on the blockchain and credits your balance."
    >
      {!list.data ? (
        <Skeleton className="h-24 w-full" />
      ) : list.data.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-6 text-center text-[13px] text-mist">No deposits reported yet.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {list.data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
              <div className="min-w-0">
                <p className="tabular font-medium">
                  {trim(c.creditedAmount ?? c.reportedAmount)} {c.assetType}
                  {c.creditedAmount && c.creditedAmount !== c.reportedAmount && <span className="font-normal text-mist"> (reported {trim(c.reportedAmount)})</span>}
                </p>
                <p className="mt-0.5 text-[12px] text-mist">
                  {dateFmt.format(new Date(c.createdAt))} · {shortHash(c.txHash, 10, 6)}
                  {c.status === 'REJECTED' && c.reviewNote ? ` · ${c.reviewNote}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={EXPLORERS[c.network] + c.txHash} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-brass hover:underline">
                  View transaction <ExternalLink className="size-3" />
                </a>
                {c.status === 'PENDING_REVIEW' && (
                  <Button variant="ghost" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(c.id)}>Cancel</Button>
                )}
                <Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
