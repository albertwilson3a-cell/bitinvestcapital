'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { PageHeader } from '@/components/admin/admin-shell';
import { FormNotice } from '@/components/auth/auth-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAdjustments, useDecideAdjustment } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-dashboard';
import type { Adjustment, AdjustmentStatus } from '@/lib/admin-types';
import { ApiError } from '@/lib/api';
import { formatAmount, formatDateTime, timeAgo } from '@/lib/format';
import { ASSET_META } from '@/lib/types';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<AdjustmentStatus, string> = { PENDING_APPROVAL: 'Awaiting approval', APPLIED: 'Applied', REJECTED: 'Rejected' };

function Amount({ a }: { a: Adjustment }) {
  return (
    <span className={cn('tabular font-medium', a.direction === 'CREDIT' ? 'text-up' : 'text-down')}>
      {a.direction === 'CREDIT' ? '+' : '−'}
      {formatAmount(a.amount, ASSET_META[a.assetType].decimals + 2)} {a.assetType}
    </span>
  );
}

function DecideDialog({ adj, decision, onClose }: { adj: Adjustment | null; decision: 'approve' | 'reject'; onClose: () => void }) {
  const decide = useDecideAdjustment();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!adj) return null;

  async function submit() {
    if (!adj) return;
    setError(null);
    try {
      await decide.mutateAsync({ id: adj.id, decision, note: note.trim() });
      toast.success(decision === 'approve' ? 'Adjustment approved and applied' : 'Adjustment rejected', {
        description: `${adj.direction === 'CREDIT' ? '+' : '−'}${adj.amount} ${adj.assetType} for ${adj.user.email}`,
      });
      setNote('');
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.messages.join(' ') : 'The decision could not be saved.');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{decision === 'approve' ? 'Approve and apply this adjustment?' : 'Reject this adjustment?'}</DialogTitle>
          <DialogDescription>
            {decision === 'approve'
              ? 'The customer’s balance changes immediately and the entry appears in their activity.'
              : 'Nothing changes for the customer. The requester sees your note.'}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-2 rounded-md border border-rule bg-ink/50 p-4 text-[13px]">
          <dt className="text-mist">Customer</dt><dd className="truncate">{adj.user.email}</dd>
          <dt className="text-mist">Amount</dt><dd><Amount a={adj} /></dd>
          <dt className="text-mist">Reason</dt><dd>{adj.reason}</dd>
          {adj.reference && (<><dt className="text-mist">Reference</dt><dd>{adj.reference}</dd></>)}
          <dt className="text-mist">Requested by</dt><dd className="truncate">{adj.requestedBy.email}</dd>
        </dl>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="decision-note">Note {decision === 'reject' ? '(recommended)' : '(optional)'}</Label>
          <Textarea id="decision-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className="min-h-[64px]" />
        </div>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={decision === 'approve' ? 'default' : 'destructive'} onClick={submit} disabled={decide.isPending}>
            {decide.isPending ? 'Saving…' : decision === 'approve' ? 'Approve and apply' : 'Reject'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AdjustmentsView() {
  const [status, setStatus] = useState<AdjustmentStatus>('PENDING_APPROVAL');
  const list = useAdjustments(status);
  const pending = useAdjustments('PENDING_APPROVAL');
  const me = useMe();
  const [deciding, setDeciding] = useState<{ adj: Adjustment; decision: 'approve' | 'reject' } | null>(null);
  const rows = list.data ?? [];

  return (
    <>
      <PageHeader
        title="Balance adjustments"
        description="Every manual change to a customer balance is requested by one admin and approved by another. Approved adjustments are posted to the customer’s ledger with the stated reason."
      />
      <Tabs value={status} onValueChange={(v) => setStatus(v as AdjustmentStatus)}>
        <TabsList>
          <TabsTrigger value="PENDING_APPROVAL">
            Awaiting approval
            {!!pending.data?.length && <span className="rounded-sm bg-brass/15 px-1.5 text-[11px] text-brass tabular">{pending.data.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="APPLIED">Applied</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <section className="mt-4 rounded-lg border border-rule bg-vault/55">
        {list.isLoading ? (
          <div className="flex flex-col gap-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
        ) : list.isError ? (
          <p className="p-6 text-[13px] text-down" role="alert">Adjustments could not be loaded: {list.error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-mist">
            {status === 'PENDING_APPROVAL' ? 'Nothing is waiting for approval.' : `No ${STATUS_LABEL[status].toLowerCase()} adjustments yet.`}
          </p>
        ) : (
          <ul className="divide-y divide-rule/70">
            {rows.map((a) => {
              const mine = a.requestedBy.id === me.data?.id;
              return (
                <li key={a.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] lg:items-center lg:gap-6">
                  <div className="min-w-0">
                    <Amount a={a} />
                    <div className="truncate text-[13px]">{a.user.email}</div>
                  </div>
                  <div className="min-w-0 text-[13px]">
                    <p className="text-foreground/90">{a.reason}</p>
                    <p className="mt-1 text-[12px] text-mist">
                      Requested by {mine ? 'you' : a.requestedBy.email}{' '}
                      <span title={formatDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                      {a.reference && `, ref ${a.reference}`}
                      {a.decidedBy && `. ${a.status === 'APPLIED' ? 'Approved' : 'Rejected'} by ${a.decidedBy.email} ${a.decidedAt ? timeAgo(a.decidedAt) : ''}`}
                      {a.decisionNote && `: “${a.decisionNote}”`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 lg:justify-end">
                    {a.status === 'PENDING_APPROVAL' ? (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => setDeciding({ adj: a, decision: 'reject' })}>
                          <X /> {mine ? 'Withdraw' : 'Reject'}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" disabled={mine} onClick={() => setDeciding({ adj: a, decision: 'approve' })}>
                                <Check /> Approve
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {mine && <TooltipContent>You requested this. Another admin must approve it.</TooltipContent>}
                        </Tooltip>
                      </>
                    ) : (
                      <Badge variant={a.status === 'APPLIED' ? 'success' : 'neutral'}>{STATUS_LABEL[a.status]}</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {deciding && <DecideDialog adj={deciding.adj} decision={deciding.decision} onClose={() => setDeciding(null)} />}
    </>
  );
}
