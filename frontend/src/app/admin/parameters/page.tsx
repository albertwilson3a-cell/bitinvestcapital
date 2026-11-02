import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { ParametersView } from '@/components/admin/parameters-view';

export const metadata: Metadata = { title: 'Parameters' };

export default function AdminParametersPage() {
  return (
    <AdminGate>
      <ParametersView />
    </AdminGate>
  );
}
