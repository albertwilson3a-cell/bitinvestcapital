'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftRight, ArrowUpFromLine, ClipboardCheck, LayoutGrid, LogOut, MessageCircle, ScrollText, ShieldAlert, SlidersHorizontal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Wordmark } from '@/components/wordmark';
import { useAdjustments } from '@/hooks/use-admin';
import { useMe } from '@/hooks/use-dashboard';
import { useStaffUnread } from '@/hooks/use-support';
import { useWithdrawalCounts } from '@/hooks/use-admin-withdrawals';
import { session } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, badge: 'withdrawals' as const },
  { href: '/admin/adjustments', label: 'Adjustments', icon: ClipboardCheck, badge: 'pending' as const },
  { href: '/admin/support', label: 'Live chat', icon: MessageCircle, badge: 'chat' as const },
  { href: '/admin/parameters', label: 'Rates & parameters', icon: SlidersHorizontal },
  { href: '/admin/audit', label: 'Audit log', icon: ScrollText },
];

function PendingBadge() {
  const pending = useAdjustments('PENDING_APPROVAL');
  const n = pending.data?.length ?? 0;
  if (!n) return null;
  return (
    <span className="ml-auto rounded-sm bg-brass/15 px-1.5 text-[11px] font-semibold text-brass tabular" aria-label={`${n} awaiting approval`}>
      {n}
    </span>
  );
}

function WithdrawalBadge() {
  const c = useWithdrawalCounts().data;
  const n = (c?.pendingReview ?? 0) + (c?.approved ?? 0);
  if (!n) return null;
  return (
    <span className="ml-auto rounded-sm bg-brass/15 px-1.5 text-[11px] font-semibold text-brass tabular" aria-label={`${n} withdrawals need action`}>
      {n}
    </span>
  );
}

function ChatBadge() {
  const unread = useStaffUnread();
  const n = unread.data?.conversations ?? 0;
  if (!n) return null;
  return (
    <span className="ml-auto rounded-sm bg-brass/15 px-1.5 text-[11px] font-semibold text-brass tabular" aria-label={`${n} conversations with unread messages`}>
      {n}
    </span>
  );
}

function NavLinks({ orientation }: { orientation: 'vertical' | 'horizontal' }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className={cn(orientation === 'vertical' ? 'flex flex-col gap-0.5' : 'flex gap-1')}>
      {NAV.map(({ href, label, icon: Icon, badge }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md text-[13px] font-medium whitespace-nowrap text-mist transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-brass/40',
              orientation === 'vertical' ? 'h-9 px-3' : 'h-8 px-3',
              active && 'bg-accent text-foreground',
              active && orientation === 'vertical' && 'shadow-[inset_2px_0_0_var(--brass)]',
            )}
          >
            <Icon className={cn('size-4', active && 'text-brass')} />
            {label}
            {badge === 'pending' && <PendingBadge />}
            {badge === 'chat' && <ChatBadge />}
            {badge === 'withdrawals' && <WithdrawalBadge />}
          </Link>
        );
      })}
    </nav>
  );
}

function AccessDenied() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <section className="w-full max-w-[420px] rounded-lg border border-rule bg-vault/70 p-8">
        <ShieldAlert className="size-6 text-down" />
        <h1 className="mt-4 text-[20px] font-semibold">Admin access required</h1>
        <p className="mt-2 text-[14px] text-mist">
          This account doesn’t have the administrator role. If you need access, ask an existing administrator to grant it.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard">Go to your portfolio</Link>
        </Button>
      </section>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();

  async function signOut() {
    await session('logout').catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  if (me.isLoading) {
    // Chrome placeholder while the role is checked. The page segment still renders;
    // each page's AdminGate holds its content (and its API calls) until the role is confirmed.
    return (
      <div className="flex min-h-dvh" aria-busy="true">
        <div className="hidden w-[236px] shrink-0 border-r border-rule p-5 lg:block">
          <Skeleton className="h-5 w-32" />
          <div className="mt-8 flex flex-col gap-2">{NAV.map((n) => <Skeleton key={n.href} className="h-8 w-full" />)}</div>
        </div>
        <main className="mx-auto min-w-0 max-w-[1320px] flex-1 px-4 pt-7 pb-16 sm:px-6 lg:px-10 lg:pt-9">{children}</main>
      </div>
    );
  }
  // The role shown here is read from the API; every admin endpoint enforces it again server-side.
  if (!me.data || me.data.role !== 'ADMIN') return <AccessDenied />;

  return (
    <div className="min-h-dvh border-t-2 border-brass/70 lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col border-r border-rule bg-ink lg:flex">
        <div className="px-5 pt-5 pb-6">
          <Wordmark href="/admin" />
          <p className="mt-1.5 pl-[30px] text-[12px] text-brass">Admin console</p>
        </div>
        <div className="flex-1 px-3">
          <NavLinks orientation="vertical" />
        </div>
        <div className="border-t border-rule px-3 py-4">
          <p className="truncate px-3 text-[12px] text-mist" title={me.data.email}>{me.data.email}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            <Link href="/dashboard" className="flex h-8 items-center gap-2.5 rounded-md px-3 text-[13px] text-mist hover:bg-accent hover:text-foreground">
              <ArrowLeftRight className="size-4" /> Customer view
            </Link>
            <button onClick={signOut} className="flex h-8 items-center gap-2.5 rounded-md px-3 text-left text-[13px] text-mist hover:bg-accent hover:text-foreground">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-rule bg-ink/90 backdrop-blur-md lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Wordmark href="/admin" />
            <span className="text-[12px] text-brass">Admin</span>
            <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={signOut} aria-label="Sign out">
              <LogOut />
            </Button>
          </div>
          <div className="overflow-x-auto px-3 pb-2 sm:px-5">
            <NavLinks orientation="horizontal" />
          </div>
        </header>
        <main className="mx-auto max-w-[1320px] px-4 pt-7 pb-16 sm:px-6 lg:px-10 lg:pt-9">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.02em]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-[14px] text-mist">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Renders admin content only once the API has confirmed the ADMIN role. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const me = useMe();
  if (me.data?.role === 'ADMIN') return <>{children}</>;
  if (me.isLoading) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-5 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    );
  }
  return null;
}
