import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { VerifyStatus } from '@/components/auth/verify-status';

export const metadata: Metadata = { title: 'Confirm your email' };

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <AuthPanel title="Confirming your email">
          <Loader2 className="size-5 animate-spin text-mist" aria-label="Loading" />
        </AuthPanel>
      }
    >
      <VerifyStatus />
    </Suspense>
  );
}
