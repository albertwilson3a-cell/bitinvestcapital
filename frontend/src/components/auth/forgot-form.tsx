'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { AuthPanel, FormNotice } from '@/components/auth/auth-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';

export function ForgotForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api('auth/password/forgot', { method: 'POST', auth: false, body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthPanel title="Check your inbox" description={<>If an account exists for <span className="text-foreground">{email}</span>, we’ve sent a link to reset the password. It works for one hour.</>}>
        <div className="flex items-center gap-3 rounded-md border border-rule bg-ink/50 p-3 text-[13px] text-mist">
          <MailCheck className="size-4 shrink-0 text-brass" />
          Open the link on this device to choose a new password. Check your spam folder if it doesn’t arrive.
        </div>
        <p className="mt-6 text-[13px] text-mist"><Link href="/login" className="text-brass underline-offset-4 hover:underline">Back to log in</Link></p>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title="Reset your password" description="Enter the email you registered with and we’ll send you a link to choose a new password.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <Button type="submit" size="lg" disabled={pending || !email}>{pending ? 'Sending…' : 'Send reset link'}</Button>
      </form>
      <p className="mt-6 text-[13px] text-mist">Remembered it? <Link href="/login" className="text-brass underline-offset-4 hover:underline">Log in</Link></p>
    </AuthPanel>
  );
}
