'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, ChevronDown, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Wordmark } from '@/components/wordmark';
import { useOptionalMe } from '@/hooks/use-public';
import { HEADER_MENUS, type NavMenu } from '@/lib/site-nav';
import { cn } from '@/lib/utils';

function Actions({ stacked = false }: { stacked?: boolean }) {
  const me = useOptionalMe();
  if (me.data) {
    const admin = me.data.role === 'ADMIN';
    return (
      <Button asChild size="sm" className={cn(stacked && 'w-full')}>
        <Link href={admin ? '/admin' : '/dashboard'}>
          Go to {admin ? 'admin' : 'dashboard'} <ArrowRight />
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="secondary" size="sm" className={cn(stacked && 'w-full')}>
        <Link href="/login">Log In</Link>
      </Button>
      <Button asChild size="sm" className={cn(stacked && 'w-full')}>
        <Link href="/register">Sign Up</Link>
      </Button>
    </>
  );
}

function isActive(path: string, menu: NavMenu) {
  const hrefs = menu.href ? [menu.href] : (menu.items ?? []).map((i) => i.href);
  return hrefs.some((h) => h !== '/dashboard' && (path === h || path.startsWith(`${h}/`)));
}

/** Desktop dropdown: opens on click or keyboard, and on hover for mouse users. */
function MenuDropdown({ menu, active }: { menu: NavMenu; active: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-1 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-foreground/85 outline-none transition-colors hover:text-foreground data-[state=open]:text-brass',
            active && 'text-brass',
          )}
        >
          {menu.label}
          <ChevronDown className="size-3.5 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={2} className="w-[320px] p-2">
          {menu.items!.map((item) => (
            <DropdownMenuItem key={item.href} asChild className="cursor-pointer rounded-md px-3 py-2.5">
              <Link href={item.href} className="flex flex-col items-start gap-0.5">
                <span className="text-[14px] font-medium text-foreground">{item.label}</span>
                {item.description && <span className="text-[12px] text-mist">{item.description}</span>}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SiteHeader() {
  const path = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-rule/70 bg-ink/90 backdrop-blur supports-[backdrop-filter]:bg-ink/75">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
        <Wordmark href="/" />
        <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
          {HEADER_MENUS.map((m) =>
            m.items ? (
              <MenuDropdown key={m.label} menu={m} active={isActive(path, m)} />
            ) : (
              <Link
                key={m.label}
                href={m.href!}
                aria-current={isActive(path, m) ? 'page' : undefined}
                className={cn('rounded-md px-2.5 py-2 text-[13.5px] font-medium text-foreground/85 hover:text-foreground', isActive(path, m) && 'text-brass')}
              >
                {m.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Actions />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="ml-auto sm:ml-0 xl:hidden" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 overflow-y-auto bg-vault p-6">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-6 flex flex-col gap-2 border-b border-rule pb-6 sm:hidden">
              <Actions stacked />
            </div>
            <nav aria-label="Mobile" className="mt-4 space-y-5">
              <SheetClose asChild>
                <Link href="/" className="block text-[15px] font-medium">Home</Link>
              </SheetClose>
              {HEADER_MENUS.map((m) => (
                <div key={m.label}>
                  {m.href ? (
                    <SheetClose asChild>
                      <Link href={m.href} className="block text-[15px] font-medium">{m.label}</Link>
                    </SheetClose>
                  ) : (
                    <>
                      <p className="text-[12px] font-medium tracking-[0.12em] text-brass uppercase">{m.label}</p>
                      <ul className="mt-2 space-y-1">
                        {m.items!.map((i) => (
                          <li key={i.href}>
                            <SheetClose asChild>
                              <Link href={i.href} className={cn('block rounded-md px-2 py-1.5 text-[14px] text-mist hover:bg-accent hover:text-foreground', path === i.href && 'bg-accent text-foreground')}>
                                {i.label}
                              </Link>
                            </SheetClose>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
