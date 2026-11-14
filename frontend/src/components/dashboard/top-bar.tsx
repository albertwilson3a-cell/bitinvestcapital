'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, ShieldCheck } from 'lucide-react';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { PriceTicker } from '@/components/dashboard/price-ticker';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeQuickSwitch } from '@/components/theme-toggle';
import { Wordmark } from '@/components/wordmark';
import { useMe } from '@/hooks/use-dashboard';
import { session } from '@/lib/api';

export function TopBar() {
  const router = useRouter();
  const me = useMe();

  async function signOut() {
    await session('logout').catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Wordmark href="/dashboard" compact />
        <DashboardNav />
        <PriceTicker className="hidden xl:flex" />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {me.data?.role === 'ADMIN' && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">
                <ShieldCheck className="text-brass" />
                <span className="hidden sm:inline">Admin console</span>
              </Link>
            </Button>
          )}
          {me.data && <span className="hidden max-w-[220px] truncate text-[13px] text-mist xl:inline">{me.data.email}</span>}
          <ThemeQuickSwitch />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out">
                <LogOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-rule/60 xl:hidden">
        <PriceTicker className="h-10 px-4 sm:px-6" />
      </div>
    </header>
  );
}
