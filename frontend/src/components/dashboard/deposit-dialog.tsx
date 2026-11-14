'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Check, CheckCircle2, Copy, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReportDeposit } from '@/hooks/use-deposits';
import { ApiError } from '@/lib/api';
import { ASSET_META, type Wallet } from '@/lib/types';

const DECIMALS: Record<string, number> = { BTC: 8, ETH: 18, USDT: 6 };

function CopyAddress({ wallet, shared }: { wallet: Wallet; shared: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(wallet.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-md border border-rule bg-ink/70 p-4 sm:flex-row sm:items-start">
      {/* Plain address (no payment URI): every wallet and exchange app can read it. White quiet zone so it scans on the dark theme. */}
      <figure className="shrink-0 text-center">
        <div className="rounded-md bg-white p-2.5">
          <QRCodeSVG value={wallet.depositAddress} size={148} level="M" marginSize={0} title={`${wallet.asset} deposit address QR code`} />
        </div>
        <figcaption className="mt-1.5 text-[11px] text-mist">Scan with your wallet app</figcaption>
      </figure>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-mist">{shared ? `BitInvest Capital ${wallet.asset} deposit address` : `Your ${wallet.asset} address`}</p>
        <p className="mt-1.5 font-mono text-[13px] leading-relaxed break-all text-foreground">{wallet.depositAddress}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={copy}>
          {copied ? <Check className="text-up" /> : <Copy />}
          {copied ? 'Copied' : 'Copy address'}
        </Button>
        <p className="mt-3 text-[12px] text-mist">
          After scanning or pasting, check that the first and last 6 characters match:{' '}
          <span className="font-mono text-foreground">{wallet.depositAddress.slice(0, 6)}…{wallet.depositAddress.slice(-6)}</span>
        </p>
      </div>
    </div>
  );
}

function ReportForm({ wallet, onBack, onDone }: { wallet: Wallet; onBack: () => void; onDone: () => void }) {
  const report = useReportDeposit();
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const isBtc = wallet.network === 'BITCOIN';
  const decimals = DECIMALS[wallet.asset] ?? 8;
  const amountOk = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(amount) && Number(amount) > 0;
  const hashOk = isBtc ? /^[0-9a-fA-F]{64}$/.test(txHash) : /^(0x)?[0-9a-fA-F]{64}$/.test(txHash);
  const errors = report.error instanceof ApiError ? report.error.messages : report.error ? ['Something went wrong. Please try again.'] : [];

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!amountOk || !hashOk) return;
        report.mutate({ asset: wallet.asset, amount, txHash, fromAddress: fromAddress || undefined }, { onSuccess: onDone });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dep-amount">Amount you sent ({wallet.asset})</Label>
        <Input id="dep-amount" inputMode="decimal" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder={wallet.asset === 'BTC' ? '0.015' : wallet.asset === 'ETH' ? '0.5' : '250'} className="tabular" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dep-hash">{isBtc ? 'Transaction ID' : 'Transaction hash'}</Label>
        <Input id="dep-hash" autoComplete="off" spellCheck={false} value={txHash} onChange={(e) => setTxHash(e.target.value.trim())} placeholder={isBtc ? '64 characters from your wallet' : '0x… from your wallet'} className="font-mono text-[12.5px]" />
        <p className="text-[12px] text-mist">Find it in your wallet or exchange’s withdrawal history, often called “TxID” or “transaction hash”.</p>
        {txHash && !hashOk && <p className="text-[12px] text-down">{isBtc ? 'A Bitcoin transaction ID is 64 letters and numbers.' : 'An Ethereum transaction hash is 0x followed by 64 letters and numbers.'}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dep-from">Sending address (optional, speeds up the check)</Label>
        <Input id="dep-from" autoComplete="off" spellCheck={false} value={fromAddress} onChange={(e) => setFromAddress(e.target.value.trim())} placeholder={isBtc ? 'bc1…' : '0x…'} className="font-mono text-[12.5px]" />
      </div>
      {errors.length > 0 && (
        <div role="alert" className="rounded-md border border-down/40 bg-down/5 p-3 text-[13px] text-down">
          {errors.map((m) => <p key={m}>{m}</p>)}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft /> Back</Button>
        <Button type="submit" disabled={!amountOk || !hashOk || report.isPending}><Send /> {report.isPending ? 'Sending…' : 'Report deposit'}</Button>
      </div>
    </form>
  );
}

export function DepositDialog({ wallet, trigger }: { wallet: Wallet; trigger?: React.ReactNode }) {
  const meta = ASSET_META[wallet.asset];
  const shared = wallet.depositMode === 'shared';
  const [step, setStep] = useState<'address' | 'report' | 'done'>('address');

  return (
    <Dialog onOpenChange={(open) => !open && setStep('address')}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" aria-label={`Deposit ${wallet.asset}`}>
            <Download />
            <span className="hidden sm:inline">Deposit</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{step === 'report' ? `Report your ${wallet.asset} deposit` : `Deposit ${meta.name}`}</DialogTitle>
          <DialogDescription>
            {step === 'report'
              ? 'Tell us which transaction is yours so we can match it to your account.'
              : shared
                ? `Send only ${wallet.asset} on ${meta.network} to this address, then report the transaction so we can credit you.`
                : `Send only ${wallet.asset} on ${meta.network} to this address. It belongs to your account alone.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'address' && (
          <>
            <CopyAddress wallet={wallet} shared={shared} />
            {shared ? (
              <>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-[13px] text-mist">
                  <li>Scan the QR code with your wallet app (or copy the address) and send {wallet.asset} to it.</li>
                  <li>Copy the <span className="text-foreground">transaction hash</span> your wallet shows once it is sent.</li>
                  <li>Press <span className="text-foreground">I’ve sent it</span> and paste the hash. We check it on the blockchain and credit your balance, usually within a few hours.</li>
                </ol>
                <ul className="flex flex-col gap-2 text-[13px] text-mist">
                  {wallet.asset === 'USDT' && <li>Use the Ethereum network (ERC-20) only. USDT sent on Tron, BNB Chain or any other network cannot be credited.</li>}
                  <li>This address is shared by all clients: a deposit that is never reported cannot be matched to you.</li>
                </ul>
                <Button className="w-full" onClick={() => setStep('report')}><Send /> I’ve sent it: report my deposit</Button>
              </>
            ) : (
              <ul className="flex flex-col gap-2 text-[13px] text-mist">
                <li>
                  Credited after <span className="text-foreground">{wallet.requiredConfirmations} network confirmations</span>. You can follow it in
                  Activity while it confirms.
                </li>
                {wallet.asset === 'USDT' && <li>Only the official Tether (ERC-20) contract is accepted. Other tokens named USDT are not credited.</li>}
                <li>Sending any other asset or network to this address can result in permanent loss.</li>
              </ul>
            )}
          </>
        )}

        {step === 'report' && <ReportForm wallet={wallet} onBack={() => setStep('address')} onDone={() => setStep('done')} />}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-10 text-up" />
            <p className="text-[15px] font-medium">Thanks, we’re checking it</p>
            <p className="max-w-sm text-[13px] text-mist">We’ve emailed you a confirmation. Your balance updates as soon as our team confirms the transaction on the blockchain. You can follow it under Deposits on your dashboard.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
