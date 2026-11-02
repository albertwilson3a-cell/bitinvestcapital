import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { ResetForm } from '@/components/auth/reset-form';

export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthPanel title="Choose a new password">{null}</AuthPanel>}>
      <ResetForm />
    </Suspense>
  );
}
