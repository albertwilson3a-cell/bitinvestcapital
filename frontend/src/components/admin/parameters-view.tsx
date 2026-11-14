'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Play } from 'lucide-react';
import { PageHeader } from '@/components/admin/admin-shell';
import { FormNotice } from '@/components/auth/auth-panel';
import { AssetDot, Panel } from '@/components/dashboard/panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useSetYieldRate,
  useSettings,
  useTriggerRun,
  useUpdateSettings,
  useYieldOverview,
  useYieldRateHistory,
  useYieldRuns,
} from '@/hooks/use-admin';
import { percentToFraction, settingLabel, toPercent } from '@/lib/admin-format';
import type { SettingView, YieldRateRow } from '@/lib/admin-types';
import { ApiError } from '@/lib/api';
import { formatDateTime, timeAgo } from '@/lib/format';
import { ASSET_META, type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

type Interval = 'HOURLY' | 'DAILY';
const PCT = /^\d{1,3}(\.\d{1,4})?$/;
const WEEKLY = /^\d{1,3}(\.\d{1,6})?$/;

/** Same conversions as the server: a weekly rate compounds over 365/7 weeks a year. */
const WEEKS = 365 / 7;
const weeklyToApy = (w: number) => (Math.pow(1 + w / 100, WEEKS) - 1) * 100;
const apyToWeekly = (a: number) => (Math.pow(1 + a / 100, 1 / WEEKS) - 1) * 100;
const trimPct = (n: number, dp = 4) => `${Number(n.toFixed(dp))}%`;

function perPeriod(weekly: number, interval: Interval): string {
  const per = interval === 'DAILY' ? 7 : 168;
  const r = Math.pow(1 + weekly / 100, 1 / per) - 1;
  return `${(r * 100).toFixed(interval === 'DAILY' ? 5 : 6)}% per ${interval === 'DAILY' ? 'day' : 'hour'}`;
}

function ReviewDialog({
  title,
  rows,
  note,
  onNote,
  noteRequired,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  rows: { label: string; from: string; to: string }[];
  note: string;
  onNote: (v: string) => void;
  noteRequired: boolean;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const noteOk = !noteRequired || note.trim().length >= 5;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Applies from the next payout or deposit. The change is recorded with your account and note.</DialogDescription>
        </DialogHeader>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-rule text-left text-[12px] text-mist">
              <th className="pb-2 font-medium">Setting</th>
              <th className="pb-2 font-medium">Current</th>
              <th className="pb-2 font-medium">New</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-rule/60 last:border-0">
                <td className="py-2 pr-3">{r.label}</td>
                <td className="py-2 pr-3 text-mist tabular">{r.from}</td>
                <td className="py-2 text-brass tabular">{r.to}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="change-note">Reason for the change{noteRequired ? '' : ' (optional)'}</Label>
          <Input id="change-note" value={note} onChange={(e) => onNote(e.target.value)} maxLength={280} autoComplete="off" />
        </div>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onConfirm} disabled={pending || !noteOk}>{pending ? 'Saving…' : 'Confirm change'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RateRow({ row, maxWeekly, lastBy }: { row: YieldRateRow; maxWeekly: number; lastBy?: string }) {
  const set = useSetYieldRate();
  const currentWeekly = row.weeklyPercent ? String(Number(Number(row.weeklyPercent).toFixed(6))) : row.apyPercent ? String(Number(apyToWeekly(Number(row.apyPercent)).toFixed(6))) : '0';
  const [weekly, setWeekly] = useState(currentWeekly);
  const [interval, setInterval] = useState<Interval>(row.interval ?? 'DAILY');
  // A first-time rate starts active: setting a rate should pay it unless explicitly paused.
  const [active, setActive] = useState(row.isActive ?? true);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const w = Number(weekly);
  const weeklyError = !WEEKLY.test(weekly) ? 'Up to 6 decimals' : w > maxWeekly ? `Max ${trimPct(maxWeekly)} a week` : null;
  const dirty = row.configured
    ? w !== Number(currentWeekly) || interval !== row.interval || active !== row.isActive
    : w > 0; // a first rate only makes sense when it pays something

  async function confirm() {
    setError(null);
    try {
      await set.mutateAsync({ asset: row.asset, weeklyPercent: w, interval, isActive: active, note: note.trim() || undefined });
      toast.success(`${row.asset} return updated`, { description: `${trimPct(w)} a week (${trimPct(weeklyToApy(w), 2)} a year)${active ? '' : ', paused'}. Clients see it within seconds.` });
      setReviewing(false);
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.messages.join(' ') : 'The change could not be saved.');
    }
  }

  return (
    <li className="grid gap-4 py-5 first:pt-1 last:pb-1 lg:grid-cols-[minmax(150px,1fr)_minmax(0,2.6fr)_auto] lg:items-center lg:gap-6">
      <div>
        <div className="flex items-center gap-2 text-[14px] font-medium">
          <AssetDot color={ASSET_META[row.asset].color} />
          {ASSET_META[row.asset].name}
        </div>
        <div className="mt-1 text-[12px] text-mist">
          {row.configured ? (
            <>
              Now {trimPct(Number(currentWeekly))} a week ({row.apyPercent ?? '-'}% a year), paid {row.interval?.toLowerCase()}
              {!row.isActive && <Badge variant="neutral" className="ml-1.5">Paused</Badge>}
              {row.updatedAt && <div>Changed {timeAgo(row.updatedAt)}{lastBy ? ` by ${lastBy}` : ''}</div>}
            </>
          ) : (
            'Not configured: earns nothing'
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[170px_auto_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`weekly-${row.asset}`}>Return per week</Label>
          <div className="relative">
            <Input
              id={`weekly-${row.asset}`}
              inputMode="decimal"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={!!weeklyError}
              className="h-10 pr-8 text-right tabular"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-mist">%</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Pays out</Label>
          <Segmented label={`${row.asset} payout interval`} value={interval} onChange={setInterval} options={[{ value: 'DAILY', label: 'Daily' }, { value: 'HOURLY', label: 'Hourly' }]} />
        </div>
        <label className="flex h-10 items-center gap-2.5 text-[13px] text-mist">
          <Switch checked={active} onCheckedChange={setActive} aria-label={`${row.asset} payouts active`} />
          {active ? 'Active' : 'Paused'}
        </label>
        <p className={cn('text-[12px] tabular sm:col-span-3', weeklyError ? 'text-down' : 'text-mist')}>
          {weeklyError ?? (active && w > 0 ? `= ${trimPct(weeklyToApy(w), 2)} a year · ${perPeriod(w, interval)}, compounding` : 'No return will be paid')}
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty || !!weeklyError} onClick={() => setReviewing(true)}>
          Review change
        </Button>
      </div>

      {reviewing && (
        <ReviewDialog
          title={`Change ${row.asset} return?`}
          rows={[
            { label: 'Per week', from: row.configured ? trimPct(Number(currentWeekly)) : 'Not set', to: trimPct(w) },
            { label: 'Per year (APY)', from: row.configured ? (row.apyPercent ?? '-') + '%' : '-', to: trimPct(weeklyToApy(w), 2) },
            { label: 'Payout', from: row.interval?.toLowerCase() ?? '—', to: interval.toLowerCase() },
            { label: 'Status', from: row.configured ? (row.isActive ? 'Active' : 'Paused') : '—', to: active ? 'Active' : 'Paused' },
          ]}
          note={note}
          onNote={setNote}
          noteRequired={false}
          pending={set.isPending}
          error={error}
          onConfirm={confirm}
          onClose={() => setReviewing(false)}
        />
      )}
    </li>
  );
}

function InterestPanel() {
  const overview = useYieldOverview();
  const history = useYieldRateHistory();
  const lastBy = (a: Asset) => history.data?.find((h) => h.assetType === a)?.createdBy?.email;
  return (
    <Panel
      title="Returns per week"
      description={
        overview.data
          ? `One slot per active coin. Changes reach the website and every client portal within about 20 seconds and apply from the next payout. Highest allowed: ${trimPct(Number(overview.data.maxWeeklyPercent))} a week (${overview.data.maxApyPercent}% a year).`
          : 'One slot per active coin.'
      }
    >
      {!overview.data ? (
        <div className="flex flex-col gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <ul className="divide-y divide-rule/70">
          {overview.data.rates.map((r) => (
            // Keyed on the saved version so the form resets after each confirmed change.
            <RateRow key={`${r.asset}-${r.updatedAt ?? 'new'}`} row={r} maxWeekly={Number(overview.data.maxWeeklyPercent)} lastBy={lastBy(r.asset)} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ReferralForm({ settings }: { settings: SettingView[] }) {
  const update = useUpdateSettings();
  const initial = Object.fromEntries(settings.map((s) => [s.name, String(Number((Number(s.value) * 100).toFixed(4)))])) as Record<SettingView['name'], string>;
  const [values, setValues] = useState(initial);
  const [reviewing, setReviewing] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const issues = settings.map((s) => {
    const v = values[s.name];
    if (!PCT.test(v)) return 'Enter a percentage with up to 4 decimals.';
    if (Number(v) > Number(s.max) * 100) return `Maximum is ${toPercent(s.max)}.`;
    return null;
  });
  const changed = settings.filter((s) => percentToFraction(values[s.name]) !== String(Number(s.value)));

  async function confirm() {
    setError(null);
    try {
      const body: Record<string, string> = { note: note.trim() };
      for (const s of changed) body[s.name] = percentToFraction(values[s.name]);
      const res = await update.mutateAsync(body as never);
      toast.success('Referral payouts updated', { description: res.applied.map((a) => `${settingLabel(a.name)}: ${toPercent(a.to)}`).join(', ') });
      setReviewing(false);
      setNote('');
    } catch (err) {
      setError(err instanceof ApiError ? err.messages.join(' ') : 'The change could not be saved.');
    }
  }

  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
        {settings.map((s, i) => (
          <div key={s.name} className="flex flex-col gap-1.5">
            <Label htmlFor={s.name}>{settingLabel(s.name)}</Label>
            <div className="relative max-w-[200px]">
              <Input
                id={s.name}
                inputMode="decimal"
                value={values[s.name]}
                onChange={(e) => setValues((v) => ({ ...v, [s.name]: e.target.value.replace(/[^\d.]/g, '') }))}
                aria-invalid={!!issues[i]}
                className="h-9 pr-8 text-right tabular"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-mist">%</span>
            </div>
            <p className={cn('text-[12px]', issues[i] ? 'text-down' : 'text-mist')}>{issues[i] ?? s.description}</p>
            <p className="text-[12px] text-mist">
              {s.source === 'default' ? 'Using the server default' : `Set by an admin ${s.updatedAt ? timeAgo(s.updatedAt) : ''}`}. Maximum {toPercent(s.max)}.
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2 border-t border-rule pt-4">
        <Button variant="ghost" disabled={!changed.length} onClick={() => setValues(initial)}>Reset</Button>
        <Button disabled={!changed.length || issues.some(Boolean)} onClick={() => setReviewing(true)}>Review change</Button>
      </div>
      {reviewing && (
        <ReviewDialog
          title="Change referral payouts?"
          rows={changed.map((s) => ({ label: settingLabel(s.name), from: toPercent(s.value, 4), to: `${values[s.name]}%` }))}
          note={note}
          onNote={setNote}
          noteRequired
          pending={update.isPending}
          error={error}
          onConfirm={confirm}
          onClose={() => setReviewing(false)}
        />
      )}
    </>
  );
}

function ReferralPanel() {
  const settings = useSettings();
  return (
    <Panel title="Referral payouts" description="Paid to a customer’s direct referrer. Changes apply from the next deposit or payout run.">
      {!settings.data ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        // Remount after each save so the form starts from the stored values.
        <ReferralForm key={settings.data.settings.map((s) => s.value).join('|')} settings={settings.data.settings} />
      )}
    </Panel>
  );
}

function HistoryPanel() {
  const settings = useSettings();
  const rates = useYieldRateHistory();
  const items = [
    ...(settings.data?.history ?? []).map((h) => ({
      id: h.id,
      at: h.createdAt,
      who: h.changedBy.email,
      what: `${settingLabel(h.key === 'referral.deposit_reward_rate' ? 'referralDepositRewardRate' : 'affiliateYieldRewardRate')}: ${h.oldValue ? toPercent(h.oldValue, 4) : 'default'} → ${toPercent(h.newValue, 4)}`,
      note: h.note,
    })),
    ...(rates.data ?? []).map((r) => ({
      id: r.id,
      at: r.createdAt,
      who: r.createdBy?.email ?? 'Former admin',
      what: `${r.assetType} interest: ${r.apyPercent}% APY, ${r.interval.toLowerCase()}${r.isActive ? '' : ', paused'}`,
      note: r.note,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);

  return (
    <Panel title="Change history" description="Most recent parameter changes, newest first.">
      {!settings.data || !rates.data ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="text-[13px] text-mist">No changes have been made yet.</p>
      ) : (
        <ul className="divide-y divide-rule/70">
          {items.map((i) => (
            <li key={i.id} className="flex items-start justify-between gap-4 py-2.5 text-[13px]">
              <div className="min-w-0">
                <div className="tabular">{i.what}</div>
                <div className="text-[12px] text-mist">{i.who}{i.note ? `: “${i.note}”` : ''}</div>
              </div>
              <span className="shrink-0 text-[12px] text-mist" title={formatDateTime(i.at)}>{timeAgo(i.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RunsPanel() {
  const runs = useYieldRuns();
  const trigger = useTriggerRun();
  const [confirming, setConfirming] = useState<Interval | null>(null);

  async function run(interval: Interval) {
    try {
      const r = await trigger.mutateAsync(interval);
      const msg: Record<string, string> = {
        completed: 'Payout run completed',
        already_completed: 'This period was already paid',
        in_progress: 'A run for this period is in progress',
        skipped: 'Nothing to pay: no active rates for this interval',
        failed: 'The run failed and can be retried',
      };
      (r.status === 'failed' ? toast.error : toast.success)(msg[r.status] ?? r.status, {
        description: r.run ? `${r.run.periodKey}: ${r.run.payoutsCreated} payouts, ${r.run.affiliateRewards} referral shares` : undefined,
      });
    } catch (err) {
      toast.error('Run not started', { description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setConfirming(null);
    }
  }

  return (
    <Panel
      title="Payout runs"
      description="Daily runs start at 00:00 UTC and hourly runs on the hour. Each period is paid once."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setConfirming('DAILY')}><Play /> Run daily payout</Button>
          <Button variant="outline" size="sm" onClick={() => setConfirming('HOURLY')}><Play /> Run hourly payout</Button>
        </>
      }
    >
      {!runs.data ? (
        <Skeleton className="h-24 w-full" />
      ) : runs.data.length === 0 ? (
        <p className="text-[13px] text-mist">No payout runs yet.</p>
      ) : (
        <ul className="divide-y divide-rule/70">
          {runs.data.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
              <div className="min-w-0">
                <div className="font-mono text-[12px]">{r.periodKey}</div>
                <div className="text-[12px] text-mist tabular">
                  {r.payoutsCreated.toLocaleString()} payouts, {r.affiliateRewards.toLocaleString()} referral shares, {r.trigger}
                </div>
              </div>
              <Badge variant={r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' ? 'danger' : 'pending'}>{r.status.toLowerCase()}</Badge>
            </li>
          ))}
        </ul>
      )}
      {confirming && (
        <Dialog open onOpenChange={(o) => !o && setConfirming(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Run the latest {confirming.toLowerCase()} payout now?</DialogTitle>
              <DialogDescription>Pays the most recently completed {confirming === 'DAILY' ? 'day' : 'hour'} if it hasn’t been paid. Running it again is safe: a period is never paid twice.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
              <Button onClick={() => run(confirming)} disabled={trigger.isPending}>{trigger.isPending ? 'Running…' : 'Run payout'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Panel>
  );
}

export function ParametersView() {
  return (
    <>
      <PageHeader title="Platform parameters" description="Interest rates and referral payouts. Every change is reviewed before it’s saved and kept in the history below." />
      <div className="flex flex-col gap-5">
        <InterestPanel />
        <ReferralPanel />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-2">
          <HistoryPanel />
          <RunsPanel />
        </div>
      </div>
    </>
  );
}
