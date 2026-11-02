import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { AdjustmentsView } from '@/components/admin/adjustments-view';

export const metadata: Metadata = { title: 'Adjustments' };

export default function AdminAdjustmentsPage() {
  return (
    <AdminGate>
      <AdjustmentsView />
    </AdminGate>
  );
}
