'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';
import { FormNotice } from '@/components/auth/auth-panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import { useRequestAdjustment } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-dashboard';
import type { BalanceRow } from '@/lib/admin-types';
import { ApiError } from '@/lib/api';
import { formatAmount } from '@/lib/format';
import { ASSET_META, ASSETS, type Asset } from '@/lib/types';

const AMOUNT = /^(0|[1-9]\d{0,17})(\.\d{1,18})?$/;
// Mirrors backend precision (chains.ts ASSET_DECIMALS).
const MAX_DECIMALS: Record<Asset, number> = { BTC: 8, ETH: 18, USDT: 6 };
const MIN_REASON = 15;

export function AdjustDialog({
  user,
  balances,
  open,
  onOpenChange,
}: {
  user: { id: string; email: string };
  balances: BalanceRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const me = useMe();
  const request = useRequestAdjustment();
  const [asset, setAsset] = useState<Asset>('USDT');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const own = me.data?.id === user.id;
  const current = Number(balances.find((b) => b.assetType === asset)?.balance ?? 0);
  const n = Number(amount);
  const decimals = amount.split('.')[1]?.length ?? 0;
  const amountError = !amount
    ? null
    : !AMOUNT.test(amount) || n <= 0
      ? 'Enter a positive amount.'
      : decimals > MAX_DECIMALS[asset]
        ? `${asset} allows at most ${MAX_DECIMALS[asset]} decimal places.`
        : direction === 'DEBIT' && n > current
          ? `Exceeds the available ${formatAmount(current, ASSET_META[asset].decimals)} ${asset}.`
          : null;
  const after = direction === 'CREDIT' ? current + (n || 0) : current - (n || 0);
  const valid = !own && !!amount && !amountError && reason.trim().length >= MIN_REASON;

  function reset() {
    setAmount('');
    setReason('');
    setReference('');
    setErrors([]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrors([]);
    try {
      await request.mutateAsync({ userId: user.id, asset, direction, amount, reason: reason.trim(), reference: reference.trim() || undefined });
      toast.success('Adjustment submitted for approval', { description: 'Another admin must approve it before the balance changes.' });
      reset();
      onOpenChange(false);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['The request failed. Try again.']);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjust balance</DialogTitle>
          <DialogDescription>
            For <span className="text-foreground">{user.email}</span>. Nothing changes until a second admin approves.
          </DialogDescription>
        </DialogHeader>

        {own ? (
          <FormNotice tone="error">You can’t adjust your own account. Ask another admin to submit this request.</FormNotice>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Asset</Label>
                <Segmented label="Asset" value={asset} onChange={setAsset} options={ASSETS.map((a) => ({ value: a, label: a }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Direction</Label>
                <Segmented
                  label="Direction"
                  value={direction}
                  onChange={setDirection}
                  options={[{ value: 'CREDIT', label: 'Credit' }, { value: 'DEBIT', label: 'Debit' }]}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-amount">Amount ({asset})</Label>
              <Input
                id="adj-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                aria-invalid={!!amountError}
                className="tabular"
                autoComplete="off"
              />
              <p className={amountError ? 'text-[12px] text-down' : 'text-[12px] text-mist tabular'}>
                {amountError ??
                  `Balance ${formatAmount(current, ASSET_META[asset].decimals)} ${asset}${amount ? ` → ${formatAmount(Math.max(after, 0), ASSET_META[asset].decimals)} ${asset} after approval` : ''}`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-reason">Reason (the customer sees this)</Label>
              <Textarea id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
              <p className="text-right text-[12px] text-mist tabular">
                {reason.trim().length < MIN_REASON ? `${MIN_REASON - reason.trim().length} more characters needed` : `${reason.length}/500`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-ref">Case or ticket reference (optional)</Label>
              <Input id="adj-ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} autoComplete="off" />
            </div>

            {errors.length > 0 && <FormNotice tone="error">{errors.join(' ')}</FormNotice>}

            <div className="flex items-center justify-between gap-3 border-t border-rule pt-4">
              <span className="flex items-center gap-1.5 text-[12px] text-mist">
                <ShieldCheck className="size-4 text-brass" /> Requires a second admin
              </span>
              <Button type="submit" disabled={!valid || request.isPending}>
                {request.isPending ? 'Submitting…' : 'Submit for approval'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
