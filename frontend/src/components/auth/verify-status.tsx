'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Check, Loader2, MailWarning } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { ResendVerification } from '@/components/auth/resend-verification';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';

type State =
  | { kind: 'verifying' }
  | { kind: 'verified'; email: string }
  | { kind: 'expired' }
  | { kind: 'invalid'; message: string }
  | { kind: 'missing' };

const TOKEN = /^[a-f0-9]{64}$/i;
const REDIRECT_SECONDS = 5;

// One request per token, even when React runs effects twice in development:
// the token is single-use, so a second call would wrongly report it as used.
const inflight = new Map<string, Promise<State>>();

function verify(token: string): Promise<State> {
  let p = inflight.get(token);
  if (!p) {
    p = api<{ user: { email: string } }>(`auth/verify?token=${encodeURIComponent(token)}`, { auth: false })
      .then((r): State => ({ kind: 'verified', email: r.user.email }))
      .catch((err: unknown): State => {
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Try the link again.';
        return /expired/i.test(message) ? { kind: 'expired' } : { kind: 'invalid', message };
      });
    inflight.set(token, p);
  }
  return p;
}

export function VerifyStatus() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token')?.trim() ?? '';
  const [state, setState] = useState<State>(() => (TOKEN.test(token) ? { kind: 'verifying' } : { kind: 'missing' }));
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (!TOKEN.test(token)) return;
    let active = true;
    void verify(token).then((s) => active && setState(s));
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (state.kind !== 'verified') return;
    if (seconds <= 0) {
      router.replace('/login?verified=1');
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [state.kind, seconds, router]);

  if (state.kind === 'verifying') {
    return (
      <AuthPanel title="Confirming your email" description="This takes a moment.">
        <div className="flex items-center gap-3 text-[14px] text-mist" role="status">
          <Loader2 className="size-4 animate-spin" />
          Checking your link
        </div>
      </AuthPanel>
    );
  }

  if (state.kind === 'verified') {
    return (
      <section className="rounded-lg border border-rule bg-vault/70 p-6 sm:p-8" aria-live="polite">
        <div className="flex size-11 items-center justify-center rounded-full border border-brass/50 bg-brass/10">
          <Check className="size-5 text-brass" strokeWidth={2.25} />
        </div>
        <h1 className="mt-5 text-[22px] leading-tight font-semibold tracking-[-0.015em]">Email confirmed</h1>
        <p className="mt-2 text-[14px] text-mist">
          <span className="text-foreground">{state.email}</span> is verified and your account is active.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button size="lg" onClick={() => router.replace('/login?verified=1')}>
            Continue to sign in
          </Button>
          <p className="text-center text-[13px] text-mist tabular" role="timer">
            Opening sign-in in {seconds}s
          </p>
        </div>
        <div className="mt-6 h-px overflow-hidden bg-rule">
          <div
            className="h-full origin-left bg-brass/70"
            style={{ animation: `ribbon-grow ${REDIRECT_SECONDS}s linear both` }}
          />
        </div>
      </section>
    );
  }

  if (state.kind === 'expired') {
    return (
      <AuthPanel title="This link has expired" description="Verification links work for 24 hours. Enter your email and we'll send a new one.">
        <ResendVerification />
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title={state.kind === 'missing' ? 'No confirmation code in this link' : 'This link can’t be used'}
      description={
        state.kind === 'missing'
          ? 'Open the link from your welcome email again, or request a new one below.'
          : `${state.message} If you already confirmed your email, sign in instead.`
      }
    >
      <div className="flex flex-col gap-5">
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
        <div className="flex items-center gap-3 text-[12px] text-mist">
          <MailWarning className="size-4" />
          Need a new link?
        </div>
        <ResendVerification />
      </div>
    </AuthPanel>
  );
}
