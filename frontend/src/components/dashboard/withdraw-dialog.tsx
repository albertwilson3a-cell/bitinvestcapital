'use client';

import { useState } from 'react';
import { CircleAlert, MailCheck, ShieldCheck, Upload } from 'lucide-react';
import { FormNotice } from '@/components/auth/auth-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirmWithdrawal, useRequestWithdrawal, useResendWithdrawalCode, useWithdrawalOptions, type WithdrawalChallenge } from '@/hooks/use-withdrawals';
import { useInvestments } from '@/hooks/use-investments';
import { ApiError } from '@/lib/api';
import { ASSET_META, ASSETS, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

const NETWORK_LABEL = (asset: Asset) => (asset === 'BTC' ? 'Bitcoin' : asset === 'USDT' ? 'Ethereum (ERC-20)' : 'Ethereum');
const trimZeros = (v: string) => (v.includes('.') ? v.replace(/\.?0+$/, '') : v);

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-[13px]">
      <span className="text-mist">{label}</span>
      <span className={cn('tabular text-right break-all', strong && 'text-[15px] font-semibold')}>{value}</span>
    </div>
  );
}

/**
 * Withdrawal in three steps: details → emailed code → submitted for review.
 * Funds are reserved when the code is confirmed; staff release them manually.
 */
export function WithdrawDialog({ asset: initialAsset, trigger }: { asset?: Asset; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [asset, setAsset] = useState<Asset>(initialAsset ?? 'USDT');
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [challenge, setChallenge] = useState<WithdrawalChallenge | null>(null);
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const options = useWithdrawalOptions(open);
  const investments = useInvestments();
  const request = useRequestWithdrawal();
  const confirm = useConfirmWithdrawal();
  const resend = useResendWithdrawalCode();
  const opt = options.data?.find((o) => o.asset === asset);

  const n = Number(amount);
  const fee = Number(opt?.fee ?? 0);
  const receive = n > fee ? n - fee : 0;
  const tooMuch = opt ? n > Number(opt.available) : false;
  const investedHere = Number(investments.data?.assets.find((x) => x.asset === asset)?.invested ?? 0);

  function reset() {
    setAmount('');
    setAddress('');
    setChallenge(null);
    setCode('');
    setDone(false);
    setError([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError([]);
    try {
      setChallenge(await request.mutateAsync({ asset, amount: amount.trim(), address: address.trim() }));
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : ['Could not start the withdrawal.']);
    }
  }

  async function verify(value: string) {
    if (!challenge) return;
    setError([]);
    try {
      await confirm.mutateAsync({ challengeId: challenge.challengeId, code: value });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.messages : ['That code didn’t work.']);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" aria-label={`Withdraw ${initialAsset ?? ''}`}>
            <Upload />
            <span className="hidden sm:inline">Withdraw</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[460px]">
        {done && challenge ? (
          <>
            <DialogHeader>
              <DialogTitle>Withdrawal submitted for review</DialogTitle>
              <DialogDescription>Our team reviews every withdrawal before releasing funds. We’ll email you when it’s sent.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-rule bg-ink/60 px-4 py-2">
              <Row label="Amount" value={`${challenge.amount} ${challenge.asset}`} />
              <Row label="You receive" value={`${challenge.netAmount} ${challenge.asset}`} strong />
              <Row label="To" value={challenge.address} />
            </div>
            <p className="flex items-start gap-2 text-[13px] text-mist"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-up" /> The amount is reserved from your balance while it’s reviewed. You can cancel from the Withdrawals panel until it is approved.</p>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </>
        ) : challenge ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm with the code we emailed you</DialogTitle>
              <DialogDescription>For your security, every withdrawal is confirmed with a 6-digit code sent to your email.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-rule bg-ink/60 px-4 py-2">
              <Row label="Amount" value={`${challenge.amount} ${challenge.asset}`} />
              <Row label="Network fee" value={`${challenge.fee} ${challenge.asset}`} />
              <Row label="You receive" value={`${challenge.netAmount} ${challenge.asset}`} strong />
              <Row label="To" value={challenge.address} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wd-code" className="flex items-center gap-2"><MailCheck className="size-4 text-brass" /> Confirmation code</Label>
              <Input
                id="wd-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(v);
                  if (v.length === 6 && !confirm.isPending) void verify(v);
                }}
                className="tabular h-12 text-center font-mono text-[24px] tracking-[0.45em]"
              />
            </div>
            {error.length > 0 && <FormNotice tone="error">{error.join(' ')}</FormNotice>}
            <div className="flex items-center justify-between gap-3">
              <button type="button" className="text-[13px] text-brass hover:underline" onClick={() => resend.mutate(challenge.challengeId, { onError: (e) => setError(e instanceof ApiError ? e.messages : ['Could not resend']) })}>
                Resend code
              </button>
              <Button onClick={() => verify(code)} disabled={code.length !== 6 || confirm.isPending}>{confirm.isPending ? 'Confirming…' : 'Confirm withdrawal'}</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Withdraw crypto</DialogTitle>
              <DialogDescription>Send funds to an external wallet. Every withdrawal is reviewed by our team before it is released.</DialogDescription>
            </DialogHeader>
            {!options.data ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                <Segmented label="Asset" value={asset} onChange={(a) => { setAsset(a); setError([]); }} options={ASSETS.map((a) => ({ value: a, label: a }))} className="w-full" />
                {!opt?.enabled ? (
                  <FormNotice tone="info">{asset} withdrawals are temporarily unavailable.</FormNotice>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wd-amount">Amount</Label>
                        <button type="button" className="text-[12px] text-brass hover:underline" onClick={() => setAmount(trimZeros(opt.available))}>
                          Available: {trimZeros(opt.available)} {asset} · Max
                        </button>
                      </div>
                      <Input id="wd-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} className="tabular h-11 text-[16px]" aria-invalid={tooMuch} />
                      <p className="text-[12px] text-mist">Withdrawals come from your BitInvest wallet.</p>
                      {investedHere > 0 && (
                        <FormNotice tone="info">
                          You also have {trimZeros(String(investedHere))} {asset} invested. To withdraw it, first use “Move to wallet” on your dashboard.
                        </FormNotice>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="wd-address">{NETWORK_LABEL(asset)} address</Label>
                      <Input id="wd-address" autoComplete="off" spellCheck={false} placeholder={asset === 'BTC' ? 'bc1…' : '0x…'} value={address} onChange={(e) => setAddress(e.target.value.trim())} className="font-mono text-[13px]" />
                    </div>
                    <div className="rounded-md border border-rule bg-ink/60 px-4 py-2">
                      <Row label="Network" value={NETWORK_LABEL(asset)} />
                      <Row label="Network fee" value={`${trimZeros(opt.fee)} ${asset}`} />
                      {Number(opt.minAmount) > 0 && <Row label="Minimum" value={`${trimZeros(opt.minAmount)} ${asset}`} />}
                      <Row label="You receive" value={`${receive > 0 ? trimZeros(receive.toFixed(ASSET_META[asset].decimals === 2 ? 6 : 8)) : '0'} ${asset}`} strong />
                    </div>
                    <p className="flex gap-2 rounded-md border border-brass/30 bg-brass/5 p-3 text-[12px] leading-relaxed text-mist">
                      <CircleAlert className="mt-0.5 size-4 shrink-0 text-brass" />
                      Double-check the address and network. Funds sent to a wrong address or network cannot be recovered.
                    </p>
                    {error.length > 0 && <FormNotice tone="error">{error.join(' ')}</FormNotice>}
                    <Button type="submit" size="lg" disabled={request.isPending || !amount || !address || tooMuch || n <= fee}>
                      {request.isPending ? 'Checking…' : 'Continue'}
                    </Button>
                  </>
                )}
              </form>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
