'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard', label: 'Portfolio' },
  { href: '/dashboard/markets', label: 'Markets' },
];

export function DashboardNav({ className }: { className?: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className={cn('flex items-center gap-1', className)}>
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium text-mist transition-colors hover:text-foreground', active && 'bg-accent text-foreground')}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
