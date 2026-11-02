import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { WithdrawalsView } from '@/components/admin/withdrawals-view';

export const metadata: Metadata = { title: 'Withdrawals' };

export default function AdminWithdrawalsPage() {
  return (
    <AdminGate>
      <WithdrawalsView />
    </AdminGate>
  );
}
