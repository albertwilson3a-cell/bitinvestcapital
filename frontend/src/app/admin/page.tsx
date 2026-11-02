import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { OverviewView } from '@/components/admin/overview-view';

export const metadata: Metadata = { title: 'Overview' };

export default function AdminOverviewPage() {
  return (
    <AdminGate>
      <OverviewView />
    </AdminGate>
  );
}
