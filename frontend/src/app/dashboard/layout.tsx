import { LiveChat } from '@/components/support/live-chat';

/** Client portal shell: every /dashboard page gets the live chat button. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <LiveChat />
    </>
  );
}
