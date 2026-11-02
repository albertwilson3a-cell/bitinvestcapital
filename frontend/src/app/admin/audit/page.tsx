import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { AuditView } from '@/components/admin/audit-view';

export const metadata: Metadata = { title: 'Audit log' };

export default function AdminAuditPage() {
  return (
    <AdminGate>
      <AuditView />
    </AdminGate>
  );
}
