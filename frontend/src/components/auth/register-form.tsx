'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Check, Circle, MailCheck } from 'lucide-react';
import { AuthPanel, FormNotice } from '@/components/auth/auth-panel';
import { TypedPassword } from '@/components/auth/typed-password';
import { ResendVerification } from '@/components/auth/resend-verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError } from '@/lib/api';
import { APP_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

// Mirrors the backend's RegisterDto so people see the rules before submitting.
const RULES = [
  { label: '8 to 72 characters', test: (p: string) => p.length >= 8 && p.length <= 72 },
  { label: 'A lowercase and an uppercase letter', test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: 'A number', test: (p: string) => /\d/.test(p) },
];

export function RegisterForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pasteBlocked, setPasteBlocked] = useState(false);
  const [referralCode, setReferralCode] = useState(params.get('ref') ?? '');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const passwordOk = RULES.every((r) => r.test(password));
  const matches = confirm.length > 0 && confirm === password;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setErrors(['Passwords do not match']);
      return;
    }
    setPending(true);
    setErrors([]);
    try {
      await api('auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password, ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}) }),
      });
      setDone(true);
    } catch (err) {
      setErrors(err instanceof ApiError ? err.messages : ['Could not create the account. Try again.']);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <AuthPanel title="Check your inbox" description={<>We sent a confirmation link to <span className="text-foreground">{email}</span>. It works for 24 hours.</>}>
        <div className="flex items-center gap-3 rounded-md border border-rule bg-ink/50 p-3 text-[13px] text-mist">
          <MailCheck className="size-4 shrink-0 text-brass" />
          Open the link on this device to confirm your email, then sign in.
        </div>
        <div className="mt-6 border-t border-rule pt-5">
          <p className="mb-3 text-[13px] text-mist">Nothing arrived after a few minutes?</p>
          <ResendVerification defaultEmail={email} />
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel title={`Open your ${APP_NAME} account`} description="You’ll confirm your email before you can sign in.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <TypedPassword id="password" value={password} onChange={setPassword} describedBy="password-rules" onBlocked={() => setPasteBlocked(true)} />
          <ul id="password-rules" className="mt-1 flex flex-col gap-1">
            {RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={cn('flex items-center gap-2 text-[12px] transition-colors', ok ? 'text-up' : 'text-mist')}>
                  {ok ? <Check className="size-3.5" /> : <Circle className="size-3" />}
                  {r.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password-confirm">Confirm password</Label>
          <TypedPassword id="password-confirm" value={confirm} onChange={setConfirm} invalid={confirm.length > 0 && !matches} describedBy="confirm-status" onBlocked={() => setPasteBlocked(true)} />
          <p id="confirm-status" className={cn('text-[12px]', !confirm ? 'text-mist' : matches ? 'text-up' : 'text-down')}>
            {!confirm ? 'Type the same password again.' : matches ? 'Passwords match.' : 'Passwords don’t match yet.'}
          </p>
          {pasteBlocked && <p className="text-[12px] text-brass">For your security, passwords must be typed, not pasted.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ref">Referral code (optional)</Label>
          <Input id="ref" autoComplete="off" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} maxLength={16} className="uppercase tracking-wider" />
        </div>

        {errors.length > 0 && (
          <FormNotice tone="error">
            {errors.length === 1 ? errors[0] : <ul className="list-disc pl-4">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
          </FormNotice>
        )}

        <Button type="submit" size="lg" disabled={pending || !email || !passwordOk || !matches}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-[13px] text-mist">
        Already registered?{' '}
        <Link href="/login" className="text-brass underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPanel>
  );
}
