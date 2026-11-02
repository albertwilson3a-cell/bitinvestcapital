'use client';

import { ExternalLink, Upload } from 'lucide-react';
import { Panel } from '@/components/dashboard/panel';
import { WithdrawDialog } from '@/components/dashboard/withdraw-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCancelWithdrawal, useWithdrawals, type WithdrawalStatus } from '@/hooks/use-withdrawals';
import { EXPLORERS } from '@/lib/brand';
import { shortHash } from '@/lib/format';

const STATUS: Record<WithdrawalStatus, { label: string; variant: 'pending' | 'success' | 'danger' | 'neutral' }> = {
  PENDING_REVIEW: { label: 'Awaiting review', variant: 'pending' },
  APPROVED: { label: 'Approved, sending', variant: 'pending' },
  COMPLETED: { label: 'Sent', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled', variant: 'neutral' },
};

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const trim = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v);

export function WithdrawalsPanel() {
  const list = useWithdrawals();
  const cancel = useCancelWithdrawal();
  return (
    <Panel
      id="withdrawals"
      title="Withdrawals"
      description="Every withdrawal is reviewed by our team before funds are released. We email you at each step."
      actions={<WithdrawDialog trigger={<Button size="sm"><Upload /> New withdrawal</Button>} />}
    >
      {!list.data ? (
        <Skeleton className="h-24 w-full" />
      ) : list.data.length === 0 ? (
        <p className="rounded-md border border-dashed border-rule p-6 text-center text-[13px] text-mist">No withdrawals yet.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {list.data.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[13px]">
              <div className="min-w-0">
                <p className="tabular font-medium">
                  {trim(w.amount)} {w.assetType} <span className="font-normal text-mist">→ {shortHash(w.address, 8, 6)}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-mist">
                  {dateFmt.format(new Date(w.createdAt))} · you receive {trim(w.netAmount)} {w.assetType}
                  {w.status === 'REJECTED' && w.reviewNote ? ` · ${w.reviewNote}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {w.txHash && (
                  <a href={EXPLORERS[w.network] + w.txHash} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[12px] text-brass hover:underline">
                    View transaction <ExternalLink className="size-3" />
                  </a>
                )}
                {w.status === 'PENDING_REVIEW' && (
                  <Button variant="ghost" size="sm" disabled={cancel.isPending} onClick={() => cancel.mutate(w.id)}>Cancel</Button>
                )}
                <Badge variant={STATUS[w.status].variant}>{STATUS[w.status].label}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
