import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: { default: `Admin | ${APP_NAME}`, template: `%s | Admin | ${APP_NAME}` },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
