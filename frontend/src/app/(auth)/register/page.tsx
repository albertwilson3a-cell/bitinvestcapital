import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPanel title="Create an account">{null}</AuthPanel>}>
      <RegisterForm />
    </Suspense>
  );
}
