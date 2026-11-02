'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Check, Circle } from 'lucide-react';
import { AuthPanel, FormNotice } from '@/components/auth/auth-panel';
import { TypedPassword } from '@/components/auth/typed-password';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

const RULES = [
  { label: '8 to 72 characters', test: (p: string) => p.length >= 8 && p.length <= 72 },
  { label: 'A lowercase and an uppercase letter', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
];

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const ok = RULES.every((r) => r.test(password));
  const matches = confirm.length > 0 && confirm === password;

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return (
      <AuthPanel title="Link not valid" description="This password reset link is incomplete or invalid.">
        <Button asChild size="lg" className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
      </AuthPanel>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setErrors(['Passwords do not match']);
    setPending(true);
    setErrors([]);
    try {
      await api('auth/password/reset', { method: 'POST', auth: false, body: JSON.stringify({ token, password, passwordConfirm: confirm }) });
      router.replace('/login?reset=1');
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['Could not change the password. Try again.']);
      setPending(false);
    }
  }

  return (
    <AuthPanel title="Choose a new password" description="Type your new password twice. For your security, pasting is disabled.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <TypedPassword id="password" value={password} onChange={setPassword} describedBy="rules" onBlocked={() => setPasteBlocked(true)} />
          <ul id="rules" className="mt-1 flex flex-col gap-1">
            {RULES.map((r) => (
              <li key={r.label} className={cn('flex items-center gap-2 text-[12px]', r.test(password) ? 'text-up' : 'text-mist')}>
                {r.test(password) ? <Check className="size-3.5" /> : <Circle className="size-3" />} {r.label}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Confirm new password</Label>
          <TypedPassword id="confirm" value={confirm} onChange={setConfirm} invalid={confirm.length > 0 && !matches} onBlocked={() => setPasteBlocked(true)} />
          <p className={cn('text-[12px]', !confirm ? 'text-mist' : matches ? 'text-up' : 'text-down')}>
            {!confirm ? 'Type the same password again.' : matches ? 'Passwords match.' : 'Passwords don’t match yet.'}
          </p>
          {pasteBlocked && <p className="text-[12px] text-brass">Passwords must be typed, not pasted.</p>}
        </div>
        {errors.length > 0 && <FormNotice tone="error">{errors.join(' ')}</FormNotice>}
        <Button type="submit" size="lg" disabled={pending || !ok || !matches}>{pending ? 'Saving…' : 'Change password'}</Button>
      </form>
    </AuthPanel>
  );
}
