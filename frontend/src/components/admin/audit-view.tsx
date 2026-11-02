'use client';

import { PageHeader } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAudit } from '@/hooks/use-admin';
import { actionLabel, auditSummary } from '@/lib/admin-format';
import { formatDateTime, timeAgo } from '@/lib/format';

export function AuditView() {
  const audit = useAudit(40);
  const rows = audit.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Audit log" description="Every administrative action, including viewing a customer record. Entries can’t be edited." />
      <section className="rounded-lg border border-rule bg-vault/55">
        {audit.isLoading ? (
          <div className="flex flex-col gap-2 p-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : audit.isError ? (
          <p className="p-6 text-[13px] text-down" role="alert">The audit log could not be loaded: {audit.error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-[13px] text-mist">No admin actions recorded yet.</p>
        ) : (
          <>
            <Table className="hidden md:table">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Action</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead className="hidden lg:table-cell">IP address</TableHead>
                  <TableHead className="pr-5 text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="pl-5">{actionLabel(e.action)}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-[13px] text-mist tabular" title={auditSummary(e)}>
                      {auditSummary(e) || (e.targetType ? `${e.targetType} ${e.targetId?.slice(0, 8) ?? ''}` : '—')}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-[13px]">{e.actor.email}</TableCell>
                    <TableCell className="hidden font-mono text-[12px] text-mist lg:table-cell">{e.ip ?? '—'}</TableCell>
                    <TableCell className="pr-5 text-right text-[13px] text-mist" title={formatDateTime(e.createdAt)}>{timeAgo(e.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ul className="divide-y divide-rule/70 md:hidden">
              {rows.map((e) => (
                <li key={e.id} className="px-4 py-3 text-[13px]">
                  <div className="flex justify-between gap-3">
                    <span>{actionLabel(e.action)}</span>
                    <span className="shrink-0 text-[12px] text-mist">{timeAgo(e.createdAt)}</span>
                  </div>
                  {auditSummary(e) && <div className="mt-0.5 text-[12px] text-foreground/80 tabular">{auditSummary(e)}</div>}
                  <div className="mt-0.5 truncate text-[12px] text-mist">{e.actor.email}</div>
                </li>
              ))}
            </ul>
            {audit.hasNextPage && (
              <div className="flex justify-center border-t border-rule py-3">
                <Button variant="ghost" size="sm" onClick={() => audit.fetchNextPage()} disabled={audit.isFetchingNextPage}>
                  {audit.isFetchingNextPage ? 'Loading…' : 'Load older entries'}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
