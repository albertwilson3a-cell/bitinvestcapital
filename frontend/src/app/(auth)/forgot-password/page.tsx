import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { ForgotForm } from '@/components/auth/forgot-form';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthPanel title="Reset your password">{null}</AuthPanel>}>
      <ForgotForm />
    </Suspense>
  );
}
