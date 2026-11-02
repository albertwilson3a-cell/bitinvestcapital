'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormNotice } from '@/components/auth/auth-panel';
import { api, ApiError } from '@/lib/api';

export function ResendVerification({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      await api('auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }), auth: false });
      setState('sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the email. Try again.');
      setState('error');
    }
  }

  if (state === 'sent') {
    return <FormNotice tone="success">If {email} has an unconfirmed account, a new link is on its way.</FormNotice>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="resend-email">Email</Label>
        <Input id="resend-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {state === 'error' && <FormNotice tone="error">{error}</FormNotice>}
      <Button type="submit" variant="secondary" disabled={state === 'sending' || !email}>
        {state === 'sending' ? 'Sending…' : 'Send a new link'}
      </Button>
    </form>
  );
}
