'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Copy, IdCard, MoreHorizontal, Scale, Search, Wallet } from 'lucide-react';
import { AdjustDialog } from '@/components/admin/adjust-dialog';
import { PageHeader } from '@/components/admin/admin-shell';
import { UserDrawer, type DrawerTab } from '@/components/admin/user-drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminUsers, type UserQuery } from '@/hooks/use-admin';
import { useDebounced } from '@/hooks/use-debounced';
import { useMe, usePrices } from '@/hooks/use-dashboard';
import type { AdminUserRow } from '@/lib/admin-types';
import { formatAmount, formatUsd, timeAgo } from '@/lib/format';
import { ASSET_META, ASSETS } from '@/lib/types';

const PAGE = 25;

function useHoldingsUsd() {
  const prices = usePrices();
  return (u: AdminUserRow): number | null => {
    if (!prices.data) return null;
    let sum = 0;
    for (const b of u.balances) {
      const q = prices.data.quotes.find((x) => x.asset === b.assetType);
      if (!q) return null;
      sum += (Number(b.balance) + Number(b.lockedBalance)) * Number(q.usd);
    }
    return sum;
  };
}

function Holdings({ u }: { u: AdminUserRow }) {
  const nonZero = ASSETS.map((a) => ({ a, n: Number(u.balances.find((b) => b.assetType === a)?.balance ?? 0) })).filter((x) => x.n > 0);
  if (!nonZero.length) return <span className="text-[12px] text-mist">No holdings</span>;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[12px] text-mist tabular">
      {nonZero.map(({ a, n }) => (
        <span key={a}>
          <span className="text-foreground/90">{formatAmount(n, ASSET_META[a].decimals)}</span> {a}
        </span>
      ))}
    </span>
  );
}

function RowActions({ u, own, onOpen, onAdjust }: { u: AdminUserRow; own: boolean; onOpen: (t: DrawerTab) => void; onAdjust: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${u.email}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="truncate">{u.email}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onOpen('portfolio')}><Wallet /> View portfolio</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpen('identity')}><IdCard /> Identity record</DropdownMenuItem>
        <DropdownMenuItem onSelect={onAdjust} disabled={own}><Scale /> {own ? 'Adjust balance (not your own)' : 'Adjust balance'}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await navigator.clipboard.writeText(u.id);
            toast.success('User ID copied');
          }}
        >
          <Copy /> Copy user ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UsersView() {
  const me = useMe();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [role, setRole] = useState<'all' | 'CLIENT' | 'ADMIN'>('all');
  const [verified, setVerified] = useState<'all' | 'true' | 'false'>('all');
  const [sort, setSort] = useState<UserQuery['sort']>('created_desc');
  // Cursor stack: cursors[i] opens page i (page 0 has none).
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const page = cursors.length - 1;
  const [filterKey, setFilterKey] = useState('');

  const key = `${q}|${role}|${verified}|${sort}`;
  if (key !== filterKey) {
    // Any filter change starts again from the first page (state reset during render, no effect needed).
    setFilterKey(key);
    setCursors([undefined]);
  }

  const users = useAdminUsers({
    q: q || undefined,
    role: role === 'all' ? undefined : role,
    verified: verified === 'all' ? undefined : verified,
    sort,
    cursor: cursors[page],
    limit: PAGE,
  });
  const usd = useHoldingsUsd();

  const [drawer, setDrawer] = useState<{ id: string; tab: DrawerTab } | null>(null);
  const [adjusting, setAdjusting] = useState<AdminUserRow | null>(null);

  const rows = users.data?.items ?? [];
  const total = users.data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE + 1;
  const to = page * PAGE + rows.length;

  return (
    <>
      <PageHeader title="Users" description="Search customers, review their portfolio and record, and request balance adjustments." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-[360px]">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email, referral code or user ID"
            className="h-9 pl-9 text-[14px]"
            aria-label="Search users"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">
          <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <SelectTrigger className="lg:w-[130px]" aria-label="Role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="CLIENT">Clients</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
          <Select value={verified} onValueChange={(v) => setVerified(v as typeof verified)}>
            <SelectTrigger className="lg:w-[150px]" aria-label="Verification"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="true">Verified</SelectItem>
              <SelectItem value="false">Unverified</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as UserQuery['sort'])}>
            <SelectTrigger className="col-span-2 lg:w-[170px]" aria-label="Sort"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest first</SelectItem>
              <SelectItem value="created_asc">Oldest first</SelectItem>
              <SelectItem value="last_login_desc">Recently active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <section className="rounded-lg border border-rule bg-vault/55" aria-busy={users.isFetching}>
        {users.isLoading ? (
          <div className="flex flex-col gap-2 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : users.isError ? (
          <p className="p-6 text-[13px] text-down" role="alert">Users could not be loaded: {users.error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-mist">{q ? `No accounts match “${q}”.` : 'No accounts match these filters.'}</p>
        ) : (
          <>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="hidden xl:table-cell">Holdings</TableHead>
                  <TableHead className="hidden lg:table-cell">Referrals</TableHead>
                  <TableHead className="hidden lg:table-cell">Last sign-in</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12 pr-4"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const value = usd(u);
                  return (
                    <TableRow key={u.id} className="cursor-pointer" onClick={() => setDrawer({ id: u.id, tab: 'portfolio' })}>
                      <TableCell className="max-w-[280px] pl-5">
                        <div className="truncate font-medium">{u.email}</div>
                        <div className="font-mono text-[11px] text-mist">{u.referralCode}</div>
                      </TableCell>
                      <TableCell>
                        <span className="flex gap-1.5">
                          <Badge variant={u.isVerified ? 'success' : 'pending'}>{u.isVerified ? 'Verified' : 'Unverified'}</Badge>
                          {u.role === 'ADMIN' && <Badge>Admin</Badge>}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular">{value === null ? '—' : formatUsd(value)}</TableCell>
                      <TableCell className="hidden xl:table-cell"><Holdings u={u} /></TableCell>
                      <TableCell className="hidden text-[13px] lg:table-cell">
                        {u.referralCount > 0 ? <span>{u.referralCount} referred</span> : <span className="text-mist">None</span>}
                        {u.referredBy && <div className="max-w-[180px] truncate text-[12px] text-mist">via {u.referredBy.email}</div>}
                      </TableCell>
                      <TableCell className="hidden text-[13px] text-mist lg:table-cell">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'Never'}</TableCell>
                      <TableCell className="text-[13px] text-mist">{timeAgo(u.createdAt)}</TableCell>
                      <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                        <RowActions u={u} own={me.data?.id === u.id} onOpen={(tab) => setDrawer({ id: u.id, tab })} onAdjust={() => setAdjusting(u)} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <ul className="divide-y divide-rule/70 md:hidden">
              {rows.map((u) => {
                const value = usd(u);
                return (
                  <li key={u.id} className="flex items-start gap-3 px-4 py-3.5">
                    <button className="min-w-0 flex-1 text-left" onClick={() => setDrawer({ id: u.id, tab: 'portfolio' })}>
                      <div className="truncate text-[14px] font-medium">{u.email}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-mist">
                        <Badge variant={u.isVerified ? 'success' : 'pending'}>{u.isVerified ? 'Verified' : 'Unverified'}</Badge>
                        {u.role === 'ADMIN' && <Badge>Admin</Badge>}
                        <span className="tabular text-foreground">{value === null ? '—' : formatUsd(value)}</span>
                        <span>joined {timeAgo(u.createdAt)}</span>
                      </div>
                    </button>
                    <RowActions u={u} own={me.data?.id === u.id} onOpen={(tab) => setDrawer({ id: u.id, tab })} onAdjust={() => setAdjusting(u)} />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-rule px-5 py-3 text-[13px] text-mist">
          <span className="tabular" role="status">
            {total === 0 ? 'No results' : `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`}
          </span>
          <span className="flex gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous page" disabled={page === 0} onClick={() => setCursors((c) => c.slice(0, -1))}>
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next page"
              disabled={!users.data?.nextCursor}
              onClick={() => users.data?.nextCursor && setCursors((c) => [...c, users.data!.nextCursor!])}
            >
              <ChevronRight />
            </Button>
          </span>
        </footer>
      </section>

      <UserDrawer userId={drawer?.id ?? null} tab={drawer?.tab ?? 'portfolio'} onTabChange={(tab) => setDrawer((d) => (d ? { ...d, tab } : d))} onClose={() => setDrawer(null)} />
      {adjusting && (
        <AdjustDialog user={adjusting} balances={adjusting.balances} open onOpenChange={(o) => !o && setAdjusting(null)} />
      )}
    </>
  );
}

