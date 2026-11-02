'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalMe } from '@/hooks/use-public';

type Size = 'default' | 'sm' | 'lg';

/**
 * Sign-up / log-in buttons that turn into a link to the signed-in user's
 * dashboard (or admin console), so logged-in visitors are never asked to open
 * an account. Renders the signed-out version until the session is known.
 */
export function AuthButton({
  href,
  children,
  size = 'lg',
  variant = 'default',
  signedInLabel,
  signedInHref,
  hideWhenSignedIn = false,
}: {
  href: string;
  children: React.ReactNode;
  size?: Size;
  variant?: 'default' | 'outline';
  signedInLabel?: string;
  signedInHref?: string;
  hideWhenSignedIn?: boolean;
}) {
  const me = useOptionalMe().data;
  if (me) {
    if (hideWhenSignedIn) return null;
    const admin = me.role === 'ADMIN';
    return (
      <Button asChild size={size} variant={variant}>
        <Link href={signedInHref ?? (admin ? '/admin' : '/dashboard')}>
          {signedInLabel ?? (admin ? 'Go to admin console' : 'Go to your dashboard')} <ArrowRight />
        </Link>
      </Button>
    );
  }
  return (
    <Button asChild size={size} variant={variant}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

/** Shows `signedIn` for logged-in visitors and `signedOut` otherwise. */
export function AuthSwitch({ signedIn, signedOut }: { signedIn: React.ReactNode; signedOut: React.ReactNode }) {
  const me = useOptionalMe().data;
  return <>{me ? signedIn : signedOut}</>;
}
