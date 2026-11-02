'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, MailCheck } from 'lucide-react';
import { AuthPanel, FormNotice } from '@/components/auth/auth-panel';
import { ResendVerification } from '@/components/auth/resend-verification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, ApiError, session } from '@/lib/api';
import { APP_NAME } from '@/lib/brand';

/** Only same-site paths, never protocol-relative (//evil.com) or absolute URLs. */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/dashboard';
}

interface Challenge {
  challengeId: string;
  email: string;
  expiresInSeconds: number;
}

/** Step 2: the six-digit code from the email. */
function CodeStep({ challenge, onBack, onDone }: { challenge: Challenge; onBack: () => void; onDone: (user: { role?: string } | undefined) => void }) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(value: string) {
    setPending(true);
    setError(null);
    try {
      const res = await session<{ user?: { role?: string } }>('verify', { challengeId: challenge.challengeId, code: value });
      onDone(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code didn’t work. Try again.');
      setPending(false);
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    try {
      await api('auth/login/resend', { method: 'POST', auth: false, body: JSON.stringify({ challengeId: challenge.challengeId }) });
      setNotice('A new code is on its way.');
      setCooldown(30);
      setCode('');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send a new code.');
    }
  }

  return (
    <AuthPanel title="Check your email" description={<>We sent a 6-digit code to <span className="text-foreground">{challenge.email}</span>. It expires in {Math.round(challenge.expiresInSeconds / 60)} minutes.</>}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex items-center gap-3 rounded-md border border-rule bg-ink/50 p-3 text-[13px] text-mist">
          <MailCheck className="size-4 shrink-0 text-brass" />
          For your security, every sign-in is confirmed with a code sent to your email.
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Sign-in code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
              if (v.length === 6 && !pending) void verify(v);
            }}
            className="tabular h-14 text-center font-mono text-[28px] tracking-[0.5em]"
            aria-invalid={!!error}
          />
        </div>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        {notice && <FormNotice tone="success">{notice}</FormNotice>}
        <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
          {pending ? 'Checking…' : 'Confirm and sign in'}
        </Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-[13px]">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-mist hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Use a different account
        </button>
        <button type="button" onClick={resend} disabled={cooldown > 0} className="text-brass hover:underline disabled:text-mist disabled:no-underline">
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </AuthPanel>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; unverified?: boolean } | null>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      setChallenge(await session<Challenge>('login', { email, password }));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Sign-in failed. Try again.';
      setError({ message, unverified: err instanceof ApiError && err.status === 403 && /verif/i.test(message) });
    } finally {
      setPending(false);
    }
  }

  if (challenge) {
    return (
      <CodeStep
        challenge={challenge}
        onBack={() => {
          setChallenge(null);
          setPassword('');
        }}
        onDone={(user) => {
          const next = params.get('next');
          router.replace(next ? safeNext(next) : user?.role === 'ADMIN' ? '/admin' : '/dashboard');
          router.refresh();
        }}
      />
    );
  }

  return (
    <AuthPanel title={`Log in to ${APP_NAME}`} description="Use the email and password you registered with. We’ll then email you a sign-in code.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {params.get('verified') && <FormNotice tone="success">Email confirmed. Log in to open your dashboard.</FormNotice>}
        {params.get('expired') && <FormNotice tone="info">Your session ended. Log in again to continue.</FormNotice>}
        {params.get('reset') && <FormNotice tone="success">Password changed. Log in with your new password.</FormNotice>}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-[12px] text-brass underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              aria-invalid={!!error && !error.unverified}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-mist hover:text-foreground" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error && <FormNotice tone="error">{error.message}</FormNotice>}

        <Button type="submit" size="lg" disabled={pending || !email || !password}>
          {pending ? 'Checking…' : 'Continue'}
        </Button>
      </form>

      {error?.unverified && (
        <div className="mt-6 border-t border-rule pt-5">
          <p className="mb-3 text-[13px] text-mist">Didn’t get the confirmation email?</p>
          <ResendVerification defaultEmail={email} />
        </div>
      )}

      <p className="mt-6 text-[13px] text-mist">
        New here? <Link href="/register" className="text-brass underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </AuthPanel>
  );
}
