import type { Metadata } from 'next';
import { AdminGate } from '@/components/admin/admin-shell';
import { UsersView } from '@/components/admin/users-view';

export const metadata: Metadata = { title: 'Users' };

export default function AdminUsersPage() {
  return (
    <AdminGate>
      <UsersView />
    </AdminGate>
  );
}
