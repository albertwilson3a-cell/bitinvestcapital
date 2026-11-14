import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { DepositsView } from '@/components/admin/deposits-view';

export const metadata: Metadata = { title: 'Deposits' };

export default function AdminDepositsPage() {
  return (
    <AdminGate>
      <DepositsView />
    </AdminGate>
  );
}
