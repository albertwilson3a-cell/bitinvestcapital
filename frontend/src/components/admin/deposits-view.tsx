'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Info, Radar, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAdminDeposit,
  useAdminDeposits,
  useChainCheck,
  useDepositAction,
  useDepositCounts,
  useSharedAddresses,
  type AdminDepositClaim,
  type DepositClaimStatus,
} from '@/hooks/use-deposits';
import { ApiError } from '@/lib/api';
import { shortHash, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const trim = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v);
const STATUS: Record<DepositClaimStatus, { label: string; variant: 'pending' | 'success' | 'danger' | 'neutral' }> = {
  PENDING_REVIEW: { label: 'To check', variant: 'pending' },
  CREDITED: { label: 'Credited', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'danger' },
  CANCELLED: { label: 'Cancelled by client', variant: 'neutral' },
};
const net = (n: string, asset: string) => (n === 'BITCOIN' ? 'Bitcoin' : asset === 'USDT' ? 'Ethereum (ERC-20)' : 'Ethereum');
const errMsg = (e: unknown) => (e instanceof ApiError ? e.messages.join(' ') : 'Action failed');

function Copyable({ value }: { value: string }) {
  return (
    <button type="button" title="Copy" onClick={() => { void navigator.clipboard.writeText(value); toast.success('Copied'); }} className="text-left font-mono text-[12.5px] break-all hover:text-brass">
      {value}
    </button>
  );
}

function ChainPanel({ id, asset, reported, onUseAmount }: { id: string; asset: string; reported: string; onUseAmount: (v: string) => void }) {
  const check = useChainCheck(id);
  const r = check.data;
  return (
    <section className="space-y-3 rounded-lg border border-rule p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[13px] font-semibold">Blockchain check</h3>
        <Button size="sm" variant="outline" disabled={check.isFetching} onClick={() => void check.refetch()}>
          <Radar /> {check.isFetching ? 'Checking…' : r ? 'Check again' : 'Check on blockchain'}
        </Button>
      </div>
      {!r && !check.isFetching && <p className="text-[12.5px] text-mist">Looks the transaction up on a public explorer and shows what reached the platform address.</p>}
      {r && (
        <div className="space-y-2 text-[13px]">
          {r.status === 'found' && r.paysAddress ? (
            <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-up" />
              <span><strong className="tabular">{trim(r.amountToAddress ?? '0')} {asset}</strong> reached the platform address
                {r.amountToAddress && trim(r.amountToAddress) !== trim(reported) && <span className="text-brass"> (client reported {trim(reported)})</span>}.</span>
            </p>
          ) : (
            <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-brass" />{r.message ?? 'Nothing was received by the platform address.'}</p>
          )}
          {r.status === 'found' && (
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-4"><dt className="text-mist">Confirmations</dt><dd className="tabular">{r.confirmed ? r.confirmations : 'Not yet in a block'}</dd></div>
              {r.from.length > 0 && (
                <div className="flex justify-between gap-4"><dt className="text-mist">Sent from</dt>
                  <dd className="max-w-[70%] text-right font-mono text-[12px]">
                    {r.from.map((f) => <span key={f} className="block break-all">{f}</span>)}
                    {r.fromMatches === true && <span className="text-up">matches the client’s sending address</span>}
                    {r.fromMatches === false && <span className="text-brass">differs from the address the client gave</span>}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {r.status === 'found' && r.paysAddress && r.amountToAddress && (
            <Button size="sm" variant="ghost" onClick={() => onUseAmount(trim(r.amountToAddress!))}>Use {trim(r.amountToAddress)} as the amount to credit</Button>
          )}
        </div>
      )}
    </section>
  );
}

function Detail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useAdminDeposit(id);
  const action = useDepositAction();
  const [amount, setAmount] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  if (!data) return <div className="p-6"><Skeleton className="h-80 w-full" /></div>;
  const c = data.claim;
  const credit = amount ?? trim(c.reportedAmount);
  const run = (a: 'approve' | 'reject', body: object, msg: string) =>
    action.mutate({ id, action: a, body }, { onSuccess: () => { toast.success(msg); onClose(); }, onError: (e) => toast.error(errMsg(e)) });

  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
      <section className="rounded-lg border border-rule bg-ink/50 p-4">
        <p className="text-[12px] text-mist">Client reports sending</p>
        <p className="tabular mt-1 text-[28px] leading-none font-semibold">{trim(c.reportedAmount)} {c.assetType}</p>
        <dl className="mt-4 space-y-2 text-[13px]">
          <div className="flex justify-between gap-4"><dt className="text-mist">Network</dt><dd>{net(c.network, c.assetType)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">Transaction</dt><dd className="max-w-[70%] text-right"><Copyable value={c.txHash} /></dd></div>
          <div className="flex justify-between gap-4"><dt className="text-mist">To (platform)</dt><dd className="max-w-[70%] text-right"><Copyable value={c.address} /></dd></div>
          {c.fromAddress && <div className="flex justify-between gap-4"><dt className="text-mist">From (client says)</dt><dd className="max-w-[70%] text-right"><Copyable value={c.fromAddress} /></dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-mist">Reported</dt><dd>{timeAgo(c.createdAt)}</dd></div>
        </dl>
        <a href={data.explorerUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] text-brass hover:underline">
          Open in {c.network === 'BITCOIN' ? 'mempool.space' : 'Etherscan'} <ExternalLink className="size-3" />
        </a>
        {c.assetType === 'USDT' && <p className="mt-2 text-[12px] text-mist">On Etherscan, check the “ERC-20 Tokens Transferred” line: it must be Tether USD (USDT) to the platform address.</p>}
      </section>

      {c.status === 'PENDING_REVIEW' && <ChainPanel id={id} asset={c.assetType} reported={c.reportedAmount} onUseAmount={setAmount} />}

      <section>
        <h3 className="text-[13px] font-semibold">Checks</h3>
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
          {data.client.balances.map((b) => (
            <div key={b.assetType} className="flex justify-between gap-4"><dt className="text-mist">{b.assetType} balance</dt><dd className="tabular">{trim(b.balance)}</dd></div>
          ))}
        </dl>
      </section>

      {c.status === 'PENDING_REVIEW' && (
        <>
          <section className="space-y-3 rounded-lg border border-up/30 bg-up/5 p-4">
            <p className="text-[13px]">Credit only what the blockchain shows arrived at the platform address, after enough confirmations.</p>
            <Label htmlFor="dc-amount">Amount to credit ({c.assetType})</Label>
            <Input id="dc-amount" inputMode="decimal" value={credit} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className="tabular" />
            <Label htmlFor="dc-note">Review note (optional)</Label>
            <Input id="dc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 14 confirmations on Etherscan" />
            <Button className="w-full" disabled={!credit || Number(credit) <= 0 || action.isPending} onClick={() => run('approve', { amount: credit, note: note || undefined }, `Credited ${credit} ${c.assetType}. The client has been emailed.`)}>
              <ShieldCheck /> Credit {credit || '0'} {c.assetType} to the client
            </Button>
          </section>
          <section>
            {rejecting ? (
              <div className="space-y-2 rounded-lg border border-down/40 p-4">
                <Label htmlFor="dc-reason">Reason (shown to the client)</Label>
                <Input id="dc-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. This transaction does not pay our address" />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                  <Button variant="destructive" size="sm" disabled={reason.trim().length < 5 || action.isPending} onClick={() => run('reject', { reason }, 'Rejected. The client has been emailed.')}>
                    <XCircle /> Reject report
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="w-full text-down" onClick={() => setRejecting(true)}>Reject report…</Button>
            )}
          </section>
        </>
      )}

      {c.status === 'CREDITED' && c.creditedAmount && <p className="text-[13px]">Credited <strong className="tabular">{trim(c.creditedAmount)} {c.assetType}</strong>{c.reviewedBy ? ` by ${c.reviewedBy.email}` : ''}.</p>}
      {c.reviewNote && <p className="text-[13px] text-mist">Note: {c.reviewNote}</p>}
    </div>
  );
}

function SharedAddresses() {
  const { data } = useSharedAddresses();
  const entries = Object.entries(data ?? {});
  if (!entries.length) return null;
  return (
    <section className="rounded-lg border border-rule bg-vault/55 p-5">
      <h2 className="text-[15px] font-semibold">Deposit addresses shown to clients</h2>
      <p className="mt-0.5 text-[13px] text-mist">Set in the server’s settings file (DEPOSIT_ADDRESS_…), so they can’t be changed from a browser. Funds arrive directly in these wallets.</p>
      <dl className="mt-3 space-y-2 text-[13px]">
        {entries.map(([asset, address]) => (
          <div key={asset} className={cn('flex flex-wrap justify-between gap-2 border-t border-rule pt-2')}>
            <dt className="font-medium">{asset} <span className="font-normal text-mist">· {net(asset === 'BTC' ? 'BITCOIN' : 'ETHEREUM', asset)}</span></dt>
            <dd><Copyable value={address!} /></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Review queue for deposits clients reported to the shared addresses. */
export function DepositsView() {
  const [status, setStatus] = useState<string>('PENDING_REVIEW');
  const list = useAdminDeposits(status);
  const counts = useDepositCounts().data;
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Deposits</h1>
          <p className="mt-1 text-[14px] text-mist">Clients report each deposit with its transaction hash. Check it on the blockchain, then credit the amount that arrived. Every step is audited and the client is emailed.</p>
        </div>
        <Segmented
          label="Status"
          value={status}
          onChange={(v) => { setStatus(v); setSelected(null); }}
          options={[
            { value: 'PENDING_REVIEW', label: `To check${counts?.pendingReview ? ` (${counts.pendingReview})` : ''}` },
            { value: 'CREDITED', label: 'Credited' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'ALL', label: 'All' },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-rule bg-vault/55">
        <table className="w-full min-w-[760px] text-[13px]">
          <thead className="text-left text-[12px] text-mist">
            <tr className="border-b border-rule"><th className="px-4 py-3 font-medium">Client</th><th className="px-4 py-3 font-medium">Reported</th><th className="px-4 py-3 font-medium">Transaction</th><th className="px-4 py-3 font-medium">Submitted</th><th className="px-4 py-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {!list.data ? (
              <tr><td colSpan={5} className="p-4"><Skeleton className="h-16" /></td></tr>
            ) : list.data.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-mist">Nothing here. {status === 'PENDING_REVIEW' ? 'No deposits are waiting to be checked.' : ''}</td></tr>
            ) : (
              list.data.map((c: AdminDepositClaim) => (
                <tr key={c.id} onClick={() => setSelected(c.id)} className="cursor-pointer border-b border-rule/60 hover:bg-accent/40">
                  <td className="px-4 py-3">{c.user.email}</td>
                  <td className="tabular px-4 py-3 font-medium">{trim(c.creditedAmount ?? c.reportedAmount)} {c.assetType}</td>
                  <td className="px-4 py-3 font-mono text-[12px] text-mist">{shortHash(c.txHash, 10, 6)}</td>
                  <td className="px-4 py-3 text-mist">{timeAgo(c.createdAt)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SharedAddresses />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent aria-describedby={undefined} className="flex flex-col">
          <SheetHeader>
            <SheetTitle>Deposit check</SheetTitle>
            <SheetDescription>Confirm the transaction on the blockchain before crediting.</SheetDescription>
          </SheetHeader>
          {selected && <Detail key={selected} id={selected} onClose={() => setSelected(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
