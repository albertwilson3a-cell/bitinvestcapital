'use client';

import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ASSET_META, type Wallet } from '@/lib/types';

export function DepositDialog({ wallet }: { wallet: Wallet }) {
  const [copied, setCopied] = useState(false);
  const meta = ASSET_META[wallet.asset];

  async function copy() {
    await navigator.clipboard.writeText(wallet.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Deposit ${wallet.asset}`}>
          <Download />
          <span className="hidden sm:inline">Deposit</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit {meta.name}</DialogTitle>
          <DialogDescription>
            Send only {wallet.asset} on {meta.network} to this address. It belongs to your account alone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-rule bg-ink/70 p-4">
          <p className="text-[12px] text-mist">Your {wallet.asset} address</p>
          <p className="mt-1.5 font-mono text-[13px] leading-relaxed break-all text-foreground">{wallet.depositAddress}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={copy}>
            {copied ? <Check className="text-up" /> : <Copy />}
            {copied ? 'Copied' : 'Copy address'}
          </Button>
        </div>

        <ul className="flex flex-col gap-2 text-[13px] text-mist">
          <li>
            Credited after <span className="text-foreground">{wallet.requiredConfirmations} network confirmations</span>. You can follow it in
            Activity while it confirms.
          </li>
          {wallet.asset === 'USDT' && <li>Only the official Tether (ERC-20) contract is accepted. Other tokens named USDT are not credited.</li>}
          <li>Sending any other asset or network to this address can result in permanent loss.</li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
