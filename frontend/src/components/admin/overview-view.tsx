'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/admin/admin-shell';
import { MetricPanels } from '@/components/admin/metric-panels';
import { Panel } from '@/components/dashboard/panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdjustments, useAdminMetrics, useAudit } from '@/hooks/use-admin';
import { actionLabel, auditSummary } from '@/lib/admin-format';
import { formatAmount, timeAgo } from '@/lib/format';
import { ASSET_META } from '@/lib/types';

function Updated() {
  const { data, dataUpdatedAt } = useAdminMetrics();
  if (!data) return null;
  return (
    <span className="text-[12px] text-mist">
      Refreshed {timeAgo(new Date(dataUpdatedAt).toISOString())}
    </span>
  );
}

function ApprovalQueue() {
  const pending = useAdjustments('PENDING_APPROVAL');
  const items = pending.data ?? [];
  return (
    <Panel
      title="Awaiting approval"
      description="Balance adjustments requested by one admin need a second admin to approve."
      actions={items.length > 0 ? <Button asChild variant="outline" size="sm"><Link href="/admin/adjustments">Review all</Link></Button> : undefined}
    >
      {pending.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : items.length === 0 ? (
        <p className="rounded-md border border-rule/70 px-3 py-2.5 text-[13px] text-mist">Nothing is waiting for approval.</p>
      ) : (
        <ul className="divide-y divide-rule/70">
          {items.slice(0, 5).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-3 text-[13px]">
              <div className="min-w-0">
                <div className="truncate">
                  <span className={a.direction === 'CREDIT' ? 'text-up' : 'text-down'}>{a.direction === 'CREDIT' ? '+' : '−'}{formatAmount(a.amount, ASSET_META[a.assetType].decimals)} {a.assetType}</span>
                  <span className="text-mist"> for </span>
                  {a.user.email}
                </div>
                <div className="truncate text-[12px] text-mist">Requested by {a.requestedBy.email} {timeAgo(a.createdAt)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentActivity() {
  const audit = useAudit(6);
  const items = audit.data?.pages[0]?.items ?? [];
  return (
    <Panel
      title="Recent admin activity"
      description="From the audit log."
      actions={<Button asChild variant="ghost" size="sm"><Link href="/admin/audit">Open audit log</Link></Button>}
    >
      {audit.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-mist">No admin actions recorded yet.</p>
      ) : (
        <ul className="divide-y divide-rule/70">
          {items.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
              <div className="min-w-0">
                <div className="truncate">{actionLabel(e.action)}</div>
                {auditSummary(e) && <div className="truncate text-[12px] text-foreground/80 tabular">{auditSummary(e)}</div>}
                <div className="truncate text-[12px] text-mist">{e.actor.email}</div>
              </div>
              <span className="shrink-0 text-[12px] text-mist">{timeAgo(e.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function OverviewView() {
  return (
    <>
      <PageHeader title="Platform overview" description="Live figures from the ledger. USD values use current prices." actions={<Updated />} />
      <MetricPanels />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <ApprovalQueue />
        <RecentActivity />
      </div>
    </>
  );
}
