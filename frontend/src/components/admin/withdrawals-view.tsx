'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Send, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useAdminWithdrawal, useAdminWithdrawals, useSaveWithdrawalSetting, useWithdrawalAction, useWithdrawalCounts, useWithdrawalSettings, type AdminWithdrawal, type WithdrawalSettingRow } from '@/hooks/use-admin-withdrawals';
import type { WithdrawalStatus } from '@/hooks/use-withdrawals';
import { ApiError } from '@/lib/api';
import { shortHash, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const trim = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v);
const STATUS: Record<WithdrawalStatus, { label: string; variant: 'pending' | 'success' | 'danger' | 'neutral' }> = {
  PENDING_REVIEW: { label: 'Awaiting review', variant: 'pending' },
  APPROVED: { label: 'Approved, send funds', variant: 'pending' },
  COMPLETED: { label: 'Sent', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled by client', variant: 'neutral' },
};
const net = (n: string, asset: string) => (n === 'BITCOIN' ? 'Bitcoin' : asset === 'USDT' ? 'Ethereum (ERC-20)' : 'Ethereum');
const errMsg = (e: unknown) => (e instanceof ApiError ? e.messages.join(' ') : 'Action failed');

function Copyable({ value, mono = true }: { value: string; mono?: boolean }) {
  return (
    <button type="button" title="Copy" onClick={() => { void navigator.clipboard.writeText(value); toast.success('Copied'); }} className={cn('text-left break-all hover:text-brass', mono && 'font-mono text-[12.5px]')}>
      {value}
    </button>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useAdminWithdrawal(id);
  const action = useWithdrawalAction();
  const [note, setNote] = useState('');
  const [hash, setHash] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  if (!data) return <div className="p-6"><Skeleton className="h-80 w-full" /></div>;
  const w = data.withdrawal;
  const run = (a: 'approve' | 'complete' | 'reject', body: object, msg: string) =>
    action.mutate({ id, action: a, body }, { onSuccess: () => { toast.success(msg); if (a !== 'approve') onClose(); }, onError: (e) => toast.error(errMsg(e)) });

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
      <section className="rounded-lg border border-rule bg-ink/50 p-4">
        <p className="text-[12px] text-mist">Send exactly</p>
        <p className="tabular mt-1 text-[28px] leading-none font-semibold">{trim(w.netAmount)} {w.assetType}</p>
        <dl className="mt-4 space-y-2 text-[13px]">
          <div className="flex justify-between gap-4"><dt className="text-mist">Network</dt><dd>{net(w.network, w.assetType)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">To address</dt><dd className="max-w-[70%] text-right"><Copyable value={w.address} /></dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">Requested</dt><dd>{trim(w.amount)} {w.assetType} (fee {trim(w.fee)})</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">Submitted</dt><dd>{timeAgo(w.createdAt)}</dd></div>
        </dl>
        <a href={data.addressExplorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-brass hover:underline">Check address on explorer <ExternalLink className="size-3" /></a>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold">Risk checks</h3>
        <ul className="mt-2 space-y-1.5 text-[13px]">
          {data.signals.length === 0 && <li className="text-mist">No flags.</li>}
          {data.signals.map((s) => (
            <li key={s.text} className="flex items-start gap-2">
              {s.level === 'warn' ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brass" /> : s.level === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-up" /> : <Info className="mt-0.5 size-4 shrink-0 text-mist" />}
              {s.text}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold">Client</h3>
        <dl className="mt-2 space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-4"><dt className="text-mist">Email</dt><dd className="truncate">{data.client.email}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">Joined</dt><dd>{timeAgo(data.client.createdAt)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">Total {w.assetType} deposits</dt><dd className="tabular">{trim(data.client.totalDeposits)} ({data.client.depositCount})</dd></div>
          {data.client.balances.map((b) => (
            <div key={b.assetType} className="flex justify-between gap-4"><dt className="text-mist">{b.assetType} balance</dt><dd className="tabular">{trim(b.balance)} available · {trim(b.lockedBalance)} reserved</dd></div>
          ))}
        </dl>
      </section>

      {w.status === 'PENDING_REVIEW' && (
        <section className="space-y-3 rounded-lg border border-rule p-4">
          <Label htmlFor="wd-note">Review note (optional)</Label>
          <Input id="wd-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Address verified with client" />
          <Button className="w-full" disabled={action.isPending} onClick={() => run('approve', { note: note || undefined }, 'Approved: now send the funds and record the hash')}>
            <ShieldCheck /> Approve withdrawal
          </Button>
        </section>
      )}

      {w.status === 'APPROVED' && (
        <section className="space-y-3 rounded-lg border border-brass/40 bg-brass/5 p-4">
          <p className="text-[13px]"><strong>Next:</strong> send <span className="tabular">{trim(w.netAmount)} {w.assetType}</span> from the custody wallet to the address above, then paste the transaction hash here.</p>
          <Label htmlFor="wd-hash">Transaction hash</Label>
          <Input id="wd-hash" value={hash} onChange={(e) => setHash(e.target.value.trim())} placeholder={w.network === 'BITCOIN' ? '64 hex characters' : '0x…'} className="font-mono text-[12.5px]" />
          <Button className="w-full" disabled={!hash || action.isPending} onClick={() => run('complete', { txHash: hash }, 'Marked as sent. The client has been emailed.')}>
            <Send /> Mark as sent
          </Button>
        </section>
      )}

      {(w.status === 'PENDING_REVIEW' || w.status === 'APPROVED') && (
        <section className="space-y-3">
          {rejecting ? (
            <div className="space-y-2 rounded-lg border border-down/40 p-4">
              <Label htmlFor="wd-reason">Reason (shown to the client)</Label>
              <Input id="wd-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. We couldn’t verify this address" />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                <Button variant="destructive" size="sm" disabled={reason.trim().length < 5 || action.isPending} onClick={() => run('reject', { reason }, 'Rejected. Funds returned to the client’s balance.')}>
                  <XCircle /> Reject and return funds
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="w-full text-down" onClick={() => setRejecting(true)}>Reject withdrawal…</Button>
          )}
        </section>
      )}

      {w.status === 'COMPLETED' && data.explorerUrl && (
        <a href={data.explorerUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[13px] text-brass hover:underline">
          View on-chain transaction {shortHash(w.txHash ?? '', 10, 8)} <ExternalLink className="size-3.5" />
        </a>
      )}
      {w.reviewNote && <p className="text-[13px] text-mist">Note: {w.reviewNote}{w.reviewedBy ? ` (${w.reviewedBy.email})` : ''}</p>}
    </div>
  );
}

function SettingRow({ s }: { s: WithdrawalSettingRow }) {
  const save = useSaveWithdrawalSetting();
  const [fee, setFee] = useState(trim(s.fee));
  const [min, setMin] = useState(trim(s.minAmount));
  const [enabled, setEnabled] = useState(s.enabled);
  const dirty = fee !== trim(s.fee) || min !== trim(s.minAmount) || enabled !== s.enabled;
  return (
    <tr className="border-t border-rule">
      <td className="py-2.5 pr-3 font-medium">{s.asset}</td>
      <td className="py-2.5 pr-3"><Input aria-label={`${s.asset} fee`} value={fee} onChange={(e) => setFee(e.target.value.replace(/[^\d.]/g, ''))} className="tabular h-8 w-28" /></td>
      <td className="py-2.5 pr-3"><Input aria-label={`${s.asset} minimum`} value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ''))} className="tabular h-8 w-28" /></td>
      <td className="py-2.5 pr-3"><Switch checked={enabled} onCheckedChange={setEnabled} aria-label={`${s.asset} withdrawals enabled`} /></td>
      <td className="py-2.5 text-right">
        <Button size="sm" variant="outline" disabled={!dirty || save.isPending} onClick={() => save.mutate({ asset: s.asset, fee: fee || '0', minAmount: min || '0', enabled }, { onSuccess: () => toast.success(`${s.asset} withdrawal settings saved`), onError: (e) => toast.error(errMsg(e)) })}>
          Save
        </Button>
      </td>
    </tr>
  );
}

function Settings() {
  const { data } = useWithdrawalSettings();
  return (
    <section className="rounded-lg border border-rule bg-vault/55 p-5">
      <h2 className="text-[15px] font-semibold">Withdrawal settings</h2>
      <p className="mt-0.5 text-[13px] text-mist">Network fee charged to the client and minimum amount per asset, in asset units. Switch an asset off to pause new withdrawals.</p>
      {!data ? <Skeleton className="mt-4 h-28" /> : (
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[520px] text-[13px]">
          <thead className="text-left text-[12px] text-mist"><tr><th className="pb-2 font-medium">Asset</th><th className="pb-2 font-medium">Fee</th><th className="pb-2 font-medium">Minimum</th><th className="pb-2 font-medium">Enabled</th><th /></tr></thead>
          <tbody>{data.map((s) => <SettingRow key={`${s.asset}-${s.updatedAt}`} s={s} />)}</tbody>
        </table></div>
      )}
    </section>
  );
}

/** Manual review queue for client withdrawals. */
export function WithdrawalsView() {
  const [status, setStatus] = useState<string>('PENDING_REVIEW');
  const list = useAdminWithdrawals(status);
  const counts = useWithdrawalCounts().data;
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Withdrawals</h1>
          <p className="mt-1 text-[14px] text-mist">Review each request, send the funds from custody, then record the transaction hash. Every step is audited and the client is emailed.</p>
        </div>
        <Segmented
          label="Status"
          value={status}
          onChange={(v) => { setStatus(v); setSelected(null); }}
          options={[
            { value: 'PENDING_REVIEW', label: `To review${counts?.pendingReview ? ` (${counts.pendingReview})` : ''}` },
            { value: 'APPROVED', label: `To send${counts?.approved ? ` (${counts.approved})` : ''}` },
            { value: 'COMPLETED', label: 'Sent' },
            { value: 'ALL', label: 'All' },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-rule bg-vault/55">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="text-left text-[12px] text-mist">
            <tr className="border-b border-rule"><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Amount</th><th className="px-4 py-3 font-medium">To</th><th className="px-4 py-3 font-medium">Submitted</th><th className="px-4 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {!list.data ? (
              <tr><td colSpan={5} className="p-4"><Skeleton className="h-16" /></td></tr>
            ) : list.data.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-mist">Nothing here. {status === 'PENDING_REVIEW' ? 'No withdrawals are waiting for review.' : ''}</td></tr>
            ) : (
              list.data.map((w: AdminWithdrawal) => (
                <tr key={w.id} onClick={() => setSelected(w.id)} className="cursor-pointer border-b border-rule/60 hover:bg-accent/40">
                  <td className="px-4 py-3">{w.user.email}</td>
                  <td className="tabular px-4 py-3 font-medium">{trim(w.amount)} {w.assetType}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-mist">{shortHash(w.address, 8, 6)}</td>
                  <td className="px-4 py-3 text-mist">{timeAgo(w.createdAt)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS[w.status].variant}>{STATUS[w.status].label}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Settings />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent aria-describedby={undefined} className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Withdrawal review</SheetTitle>
            <SheetDescription>Check the details and risk flags before approving.</SheetDescription>
          </SheetHeader>
          {selected && <Detail key={selected} id={selected} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
