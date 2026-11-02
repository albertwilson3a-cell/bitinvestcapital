'use client';

import { useState } from 'react';
import { Check, Copy, Plus } from 'lucide-react';
import { AdjustDialog } from '@/components/admin/adjust-dialog';
import { AssetDot } from '@/components/dashboard/panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminUser } from '@/hooks/use-admin';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api';
import { usePrices } from '@/hooks/use-dashboard';
import type { AdminUserDetail } from '@/lib/admin-types';
import { formatAmount, formatDateTime, formatUsd, shortHash, timeAgo } from '@/lib/format';
import { ASSET_META, ASSETS, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

export type DrawerTab = 'portfolio' | 'identity' | 'activity' | 'adjustments';

const TX_LABEL: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAWAL: 'Withdrawal',
  YIELD_PAYOUT: 'Yield payout',
  REFERRAL_BONUS: 'Referral bonus',
  AFFILIATE_YIELD_REWARD: 'Referral yield share',
  ADJUSTMENT_CREDIT: 'Adjustment (credit)',
  ADJUSTMENT_DEBIT: 'Adjustment (debit)',
};

function CopyValue({ value, display }: { value: string; display?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="group inline-flex max-w-full items-center gap-1.5 rounded-sm text-left font-mono text-[12px] break-all text-foreground hover:text-brass"
      aria-label={`Copy ${display ?? value}`}
    >
      <span className="min-w-0 break-all">{display ?? value}</span>
      {done ? <Check className="size-3.5 shrink-0 text-up" /> : <Copy className="size-3.5 shrink-0 text-mist group-hover:text-brass" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 border-b border-rule/60 py-2.5 text-[13px] last:border-0 sm:grid-cols-[170px_1fr]">
      <dt className="text-mist">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Portfolio({ u }: { u: AdminUserDetail }) {
  const prices = usePrices();
  const price = (a: Asset) => {
    const q = prices.data?.quotes.find((x) => x.asset === a);
    return q ? Number(q.usd) : null;
  };
  const rows = ASSETS.map((a) => {
    const b = u.balances.find((x) => x.assetType === a);
    const amount = Number(b?.balance ?? 0) + Number(b?.lockedBalance ?? 0);
    const p = price(a);
    return { a, amount, locked: Number(b?.lockedBalance ?? 0), yieldEarned: Number(b?.flexibleYieldEarned ?? 0), usd: p === null ? null : amount * p };
  });
  const total = rows.every((r) => r.usd !== null) ? rows.reduce((s, r) => s + (r.usd ?? 0), 0) : null;
  const alloc = (a: Asset) => u.dynamicAllocations.find((x) => x.assetType === a);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[12px] text-mist">Portfolio value</p>
        <p className="mt-1 font-display text-[40px] leading-none">{total === null ? '—' : formatUsd(total)}</p>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-rule text-left text-[12px] text-mist">
            <th className="pb-2 font-medium">Asset</th>
            <th className="pb-2 text-right font-medium">Balance</th>
            <th className="pb-2 text-right font-medium">Value</th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">Interest earned</th>
            <th className="pb-2 text-right font-medium">Target</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.a} className="border-b border-rule/60 last:border-0">
              <td className="py-2.5"><span className="flex items-center gap-2"><AssetDot color={ASSET_META[r.a].color} />{r.a}</span></td>
              <td className="py-2.5 text-right tabular">
                {formatAmount(r.amount, ASSET_META[r.a].decimals + 2)}
                {r.locked > 0 && <div className="text-[11px] text-mist">{formatAmount(r.locked, 6)} locked</div>}
              </td>
              <td className="py-2.5 text-right text-mist tabular">{r.usd === null ? '—' : formatUsd(r.usd)}</td>
              <td className="hidden py-2.5 text-right text-mist tabular sm:table-cell">{formatAmount(r.yieldEarned, ASSET_META[r.a].decimals + 2)}</td>
              <td className="py-2.5 text-right tabular">{alloc(r.a) ? `${Number(alloc(r.a)!.allocationPercentage)}%` : <span className="text-mist">Off</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h3 className="mb-2 text-[13px] font-medium text-mist">Deposit addresses</h3>
        {u.depositAddresses.length === 0 ? (
          <p className="text-[13px] text-mist">Not issued yet. They’re created the first time the customer opens their wallets.</p>
        ) : (
          <dl>
            {u.depositAddresses.map((d) => (
              <Field key={d.assetType} label={`${d.assetType} (${d.derivationPath})`}>
                <CopyValue value={d.address} />
              </Field>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}

function Identity({ u }: { u: AdminUserDetail }) {
  return (
    <dl>
      <Field label="Email"><CopyValue value={u.email} /></Field>
      <Field label="User ID"><CopyValue value={u.id} /></Field>
      <Field label="Role">{u.role === 'ADMIN' ? 'Administrator' : 'Client'}</Field>
      <Field label="Email verification">
        {u.isVerified ? (
          <span>Verified {u.verifiedAt ? formatDateTime(u.verifiedAt) : ''}</span>
        ) : (
          <span className="text-brass">
            Not verified{u.verificationTokenExpiresAt ? `, link ${new Date(u.verificationTokenExpiresAt) > new Date() ? 'expires' : 'expired'} ${timeAgo(u.verificationTokenExpiresAt)}` : ''}
          </span>
        )}
      </Field>
      <Field label="Account created">{formatDateTime(u.createdAt)}</Field>
      <Field label="Last sign-in">{u.lastLoginAt ? `${formatDateTime(u.lastLoginAt)} (${timeAgo(u.lastLoginAt)})` : 'Never'}</Field>
      <Field label="Referral code"><CopyValue value={u.referralCode} /></Field>
      <Field label="Referred by">
        {u.referredBy ? (
          <span>{u.referredBy.email} <span className="text-mist">({u.referralReceived?.registrationStatus.toLowerCase() ?? 'no referral record'})</span></span>
        ) : (
          <span className="text-mist">Signed up directly</span>
        )}
      </Field>
      <Field label="Referred customers">{u.referralCount}</Field>
      <Field label="Referral earnings">
        {u.referralEarnings.length === 0 ? (
          <span className="text-mist">None</span>
        ) : (
          u.referralEarnings.map((r) => <div key={r.asset} className="tabular">{formatAmount(r.amount, ASSET_META[r.asset].decimals + 2)} {r.asset}</div>)
        )}
      </Field>
      <Field label="Ledger entries">{u.transactionCount.toLocaleString()}</Field>
    </dl>
  );
}

function Activity({ u }: { u: AdminUserDetail }) {
  if (u.recentTransactions.length === 0) return <p className="text-[13px] text-mist">No ledger entries yet.</p>;
  return (
    <ul className="divide-y divide-rule/60">
      {u.recentTransactions.map((t) => {
        const debit = t.type === 'WITHDRAWAL' || t.type === 'ADJUSTMENT_DEBIT';
        return (
          <li key={t.id} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
            <div className="min-w-0">
              <div>{TX_LABEL[t.type] ?? t.type}</div>
              <div className="text-[12px] text-mist">
                {t.status === 'COMPLETED' ? 'Completed' : t.status === 'PENDING' ? `Confirming, ${t.confirmations ?? 0} confirmations` : t.status.toLowerCase()}
                {t.blockchainTxHash && <span className="ml-2 font-mono">{shortHash(t.blockchainTxHash)}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className={cn('tabular', debit ? 'text-down' : 'text-foreground')}>{debit ? '−' : '+'}{formatAmount(t.amount, ASSET_META[t.assetType].decimals + 2)} {t.assetType}</div>
              <div className="text-[12px] text-mist">{timeAgo(t.confirmedAt ?? t.createdAt)}</div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const STATUS: Record<string, { label: string; variant: 'pending' | 'success' | 'neutral' }> = {
  PENDING_APPROVAL: { label: 'Awaiting approval', variant: 'pending' },
  APPLIED: { label: 'Applied', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'neutral' },
};

function Adjustments({ u, onNew }: { u: AdminUserDetail; onNew: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={onNew}><Plus /> New adjustment</Button>
      </div>
      {u.adjustments.length === 0 ? (
        <p className="text-[13px] text-mist">No adjustments have been requested for this customer.</p>
      ) : (
        <ul className="divide-y divide-rule/60">
          {u.adjustments.map((a) => (
            <li key={a.id} className="py-3 text-[13px]">
              <div className="flex items-start justify-between gap-3">
                <span className={cn('tabular', a.direction === 'CREDIT' ? 'text-up' : 'text-down')}>
                  {a.direction === 'CREDIT' ? '+' : '−'}{formatAmount(a.amount, ASSET_META[a.assetType].decimals + 2)} {a.assetType}
                </span>
                <Badge variant={STATUS[a.status].variant}>{STATUS[a.status].label}</Badge>
              </div>
              <p className="mt-1 text-foreground/90">{a.reason}</p>
              <p className="mt-1 text-[12px] text-mist">
                Requested by {a.requestedBy.email} {timeAgo(a.createdAt)}
                {a.decidedBy && `, ${a.status === 'APPLIED' ? 'approved' : 'rejected'} by ${a.decidedBy.email}`}
                {a.reference && `, ref ${a.reference}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Suspend blocks sign-in, ends sessions and stops new withdrawals; restore undoes it. */
function SuspendControl({ u }: { u: AdminUserDetail }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [open, setOpen] = useState(false);
  const act = useMutation({
    mutationFn: (suspend: boolean) =>
      api(`admin/users/${u.id}/${suspend ? 'suspend' : 'unsuspend'}`, { method: 'POST', ...(suspend ? { body: JSON.stringify({ reason }) } : {}) }),
    onSuccess: (_, suspend) => {
      toast.success(suspend ? 'Account suspended' : 'Account restored');
      setOpen(false);
      setReason('');
      void qc.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Action failed'),
  });
  if (u.suspendedAt) {
    return (
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-down/40 bg-down/10 p-3 text-[13px]">
        <span>Suspended {timeAgo(u.suspendedAt)}{u.suspensionReason ? `: ${u.suspensionReason}` : ''}</span>
        <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate(false)}>Restore access</Button>
      </div>
    );
  }
  return open ? (
    <div className="mb-5 flex flex-col gap-2 rounded-md border border-rule bg-ink/50 p-3">
      <label htmlFor="suspend-reason" className="text-[12px] text-mist">Reason for suspension (recorded in the audit log)</label>
      <Input id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Reported compromised account" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" variant="destructive" disabled={reason.trim().length < 5 || act.isPending} onClick={() => act.mutate(true)}>Suspend account</Button>
      </div>
    </div>
  ) : (
    <div className="mb-5 flex justify-end">
      <Button size="sm" variant="ghost" className="text-down" onClick={() => setOpen(true)}>Suspend account…</Button>
    </div>
  );
}

export function UserDrawer({ userId, tab, onTabChange, onClose }: { userId: string | null; tab: DrawerTab; onTabChange: (t: DrawerTab) => void; onClose: () => void }) {
  const { data: u, isLoading, isError, error } = useAdminUser(userId);
  const [adjustOpen, setAdjustOpen] = useState(false);

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="truncate">{u?.email ?? 'Customer record'}</SheetTitle>
          {u && (
            <SheetDescription asChild>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={u.isVerified ? 'success' : 'pending'}>{u.isVerified ? 'Verified' : 'Unverified'}</Badge>
                {u.role === 'ADMIN' && <Badge variant="neutral">Admin</Badge>}
                {u.suspendedAt && <Badge variant="danger">Suspended</Badge>}
                <span className="text-[12px] text-mist">Joined {timeAgo(u.createdAt)}</span>
              </div>
            </SheetDescription>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {u && <SuspendControl u={u} />}
          {isLoading ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 w-full" /></div>
          ) : isError || !u ? (
            <p className="text-[13px] text-down">This record could not be loaded: {error?.message ?? 'not found'}.</p>
          ) : (
            <Tabs value={tab} onValueChange={(v) => onTabChange(v as DrawerTab)}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
              </TabsList>
              <TabsContent value="portfolio"><Portfolio u={u} /></TabsContent>
              <TabsContent value="identity"><Identity u={u} /></TabsContent>
              <TabsContent value="activity"><Activity u={u} /></TabsContent>
              <TabsContent value="adjustments"><Adjustments u={u} onNew={() => setAdjustOpen(true)} /></TabsContent>
            </Tabs>
          )}
        </div>
        {u && <AdjustDialog user={u} balances={u.balances} open={adjustOpen} onOpenChange={setAdjustOpen} />}
      </SheetContent>
    </Sheet>
  );
}
