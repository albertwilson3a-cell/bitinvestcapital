import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { SupportInbox } from '@/components/admin/support-inbox';

export const metadata: Metadata = { title: 'Live chat' };

export default function AdminSupportPage() {
  return (
    <AdminGate>
      <SupportInbox />
    </AdminGate>
  );
}
