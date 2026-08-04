import { useMemo, useState } from "react";
import type { Bill } from "../../types/bill";
import type { BillingParty, BillingPartySummary } from "../../types/billingParty";
import type { OwnerPayment } from "../../types/ownerPayment";
import type { AppSettings } from "../../types/settings";
import { buildDashboardData, buildMonthlyBillingTrend, dashboardDateLabel, type DashboardActivity, type DashboardPeriod } from "../../utils/dashboard";
import { currency } from "../../utils/formatters";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { cn } from "../ui/cn";
import { BillingTrendChart } from "./BillingTrendChart";

type Props = {
  bills: Bill[];
  billingParties: BillingParty[];
  ownerSummaries: BillingPartySummary[];
  ownerPayments: OwnerPayment[];
  settings: AppSettings;
  loading: boolean;
  error: string;
  billError: string;
  onCreateBill: () => void;
  onRecordPayment: () => void;
  onViewHistory: () => void;
  onViewOwners: () => void;
  onOpenOwner: (billingPartyId: string) => void;
  onOpenBill: (bill: Bill) => void;
  onRetry: () => void;
};

const periods: Array<{ id: DashboardPeriod; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" }
];

const periodBillingLabels: Record<DashboardPeriod, string> = {
  today: "Billing for Today",
  week: "Billing for This Week",
  month: "Billing for This Month"
};

function DashboardIcon({ name, className }: { name: "bill" | "wallet" | "alert" | "owner" | "check" | "plus" | "arrow" | "history"; className?: string }) {
  const common = { className: cn("h-5 w-5", className), viewBox: "0 0 24 24", fill: "none", "aria-hidden": true };
  if (name === "wallet") return <svg {...common}><path d="M4 7h15a2 2 0 0 1 2 2v9H4a2 2 0 0 1-2-2V5a2 2 0 0 0 2 2Zm13 5h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
  if (name === "alert") return <svg {...common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v6m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "owner") return <svg {...common}><path d="M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "check") return <svg {...common}><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "plus") return <svg {...common}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
  if (name === "arrow") return <svg {...common}><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (name === "history") return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-4v4h4M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...common}><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function relativeTime(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: date.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading Dashboard">
      <div className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-11 w-96 max-w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      </div>
    </div>
  );
}

function SummaryMetric({ icon, value, label, primary = false }: { icon: "bill" | "wallet" | "alert"; value: string; label: string; primary?: boolean }) {
  return (
    <div className={cn(
      "grid h-[5.25rem] min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] content-start gap-x-1.5 rounded-xl bg-white/10 p-2 lg:h-auto lg:items-center lg:gap-x-2.5 lg:rounded-none lg:bg-transparent lg:p-2.5 lg:py-1",
      primary ? "lg:pr-6" : "lg:border-l lg:border-white/20 lg:pl-6"
    )}>
      <span className={cn("row-start-1 grid h-5 w-5 shrink-0 place-items-center self-center rounded-md bg-white/12 text-white lg:row-span-2 lg:h-11 lg:w-11 lg:rounded-full", primary && "lg:h-16 lg:w-16")}>
        <DashboardIcon name={icon} className={cn("h-[18px] w-[18px] lg:h-5 lg:w-5", primary && "lg:h-7 lg:w-7")} />
      </span>
      <span className={cn("col-start-2 row-start-1 block self-center text-[13px] font-semibold leading-4 text-blue-100 lg:row-start-2 lg:mt-0.5 lg:text-sm", primary && "lg:sr-only")}>{label}</span>
      <span className={cn("col-start-2 row-start-2 mt-1.5 block whitespace-nowrap text-xl font-black leading-6 text-white min-[360px]:text-[22px] lg:row-start-1 lg:mt-0 lg:leading-tight", primary && "lg:text-4xl")}>{value}</span>
    </div>
  );
}

function ActivityIcon({ type }: { type: DashboardActivity["type"] }) {
  const style = type === "payment"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
    : type === "owner"
      ? "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
      : "bg-blue-50 text-[#1E3A8A] dark:bg-blue-950/50 dark:text-blue-200";
  return <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", style)}><DashboardIcon name={type === "payment" ? "wallet" : type === "owner" ? "owner" : "bill"} className="h-4 w-4" /></span>;
}

export function DashboardPage({
  bills,
  billingParties,
  ownerSummaries,
  ownerPayments,
  settings,
  loading,
  error,
  billError,
  onCreateBill,
  onRecordPayment,
  onViewHistory,
  onViewOwners,
  onOpenOwner,
  onOpenBill,
  onRetry
}: Props) {
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const data = useMemo(
    () => buildDashboardData(bills, ownerPayments, billingParties, ownerSummaries, period),
    [bills, ownerPayments, billingParties, ownerSummaries, period]
  );
  const billById = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);
  const monthlyBilling = useMemo(() => buildMonthlyBillingTrend(bills), [bills]);

  function openActivity(activity: DashboardActivity) {
    if (activity.type === "bill") {
      const bill = billById.get(activity.recordId);
      if (bill) onOpenBill(bill);
      return;
    }
    onViewOwners();
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <span>Some Dashboard data could not be loaded.</span>
          <Button type="button" variant="danger" className="shrink-0" onClick={onRetry}>Try Again</Button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-blue-800/40 bg-[#1E3A8A] p-2.5 shadow-lg shadow-blue-950/10 dark:border-blue-700/50 dark:bg-[#172554] dark:shadow-black/20 sm:p-3 lg:p-6" aria-labelledby="dashboard-billing-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dashboard-billing-title" className="text-lg font-bold leading-5 text-blue-100 lg:text-sm"><span className="lg:hidden">{periods.find((option) => option.id === period)?.label}</span><span className="hidden lg:inline">{periodBillingLabels[period]}</span></h2>
          <label className="w-auto min-w-32 shrink-0">
            <span className="sr-only">Dashboard period</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}
              className="min-h-11 w-full cursor-pointer rounded-lg border border-white/25 bg-white/10 px-3 pr-8 text-sm font-bold text-white outline-none hover:bg-white/15 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1E3A8A] dark:focus:ring-offset-[#172554]"
            >
              {periods.map((option) => <option key={option.id} value={option.id} className="text-slate-900">{option.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-2.5 grid grid-cols-2 items-stretch gap-1.5 min-[360px]:gap-2 lg:mt-3 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))] lg:items-center lg:gap-3">
          <SummaryMetric primary icon="bill" value={currency(data.billingTotal, settings.currencySymbol)} label="Billing" />
          <SummaryMetric icon="bill" value={String(data.tripsBilled)} label="Trips Billed" />
          <SummaryMetric icon="wallet" value={currency(data.paymentsReceived, settings.currencySymbol)} label="Payments Received" />
          <SummaryMetric icon="alert" value={currency(data.currentOutstanding, settings.currencySymbol)} label="Current Outstanding" />
        </div>
      </section>

      <div className="hidden gap-2 lg:flex lg:flex-wrap lg:items-center lg:gap-2.5">
        <Button type="button" variant="primary" className="min-h-11 w-full gap-2 sm:w-auto" onClick={onCreateBill}><DashboardIcon name="plus" /> Create Bill</Button>
        <Button type="button" variant="secondary" className="min-h-11 gap-2" onClick={onRecordPayment}><DashboardIcon name="wallet" /> Record Payment</Button>
        <Button type="button" variant="ghost" className="min-h-11 gap-1.5 px-2" onClick={onViewHistory}>View History <DashboardIcon name="arrow" className="h-4 w-4" /></Button>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <Card className="min-w-0 shadow-none">
          <CardHeader className="flex items-center gap-2 !p-3">
            <DashboardIcon name="alert" className="h-4 w-4 text-red-600 dark:text-red-300" />
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Needs Attention</h2>
          </CardHeader>
          <CardContent className="!p-2.5">
            {data.outstandingOwners === 0 && data.advanceOwners === 0 ? (
              <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200"><DashboardIcon name="check" className="h-4 w-4" /></span>
                <div><p className="font-black text-emerald-900 dark:text-emerald-100">You're all caught up</p><p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-300">No balance or payment issues need attention right now.</p></div>
              </div>
            ) : (
              <div className="grid gap-2">
                {data.outstandingOwners > 0 && (
                  <button type="button" aria-label="Review owners with outstanding balances" className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-left hover:border-red-200 hover:bg-red-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/20" onClick={onViewOwners}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300"><DashboardIcon name="owner" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950 dark:text-slate-50">{data.outstandingOwners} {data.outstandingOwners === 1 ? "owner has" : "owners have"} outstanding balances</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Total outstanding: {currency(data.currentOutstanding, settings.currencySymbol)}</span></span>
                    <DashboardIcon name="arrow" className="shrink-0 text-slate-400" />
                  </button>
                )}
                {data.advanceOwners > 0 && (
                  <button type="button" aria-label="Review owners with advance available" className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-left hover:border-emerald-200 hover:bg-emerald-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/20" onClick={onViewOwners}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><DashboardIcon name="wallet" className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950 dark:text-slate-50">{data.advanceOwners} {data.advanceOwners === 1 ? "owner has" : "owners have"} advance available</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Advance total: {currency(data.totalAdvance, settings.currencySymbol)}</span></span>
                    <DashboardIcon name="arrow" className="shrink-0 text-slate-400" />
                  </button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardHeader className="!p-3">
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Recent Activity</h2>
          </CardHeader>
          <CardContent className="!p-2.5">
            {data.recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700">
                <DashboardIcon name="history" className="mx-auto text-slate-400" />
                <p className="mt-2 font-black text-slate-900 dark:text-slate-100">No recent activity</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">New bills, payments and owners will appear here.</p>
              </div>
            ) : (
              <div role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentActivity.slice(0, 3).map((activity) => (
                  <button key={activity.id} type="button" role="listitem" className="grid min-h-14 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-1 py-2 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-slate-800/60 sm:grid-cols-[auto_minmax(0,1fr)_auto]" onClick={() => openActivity(activity)}>
                    <ActivityIcon type={activity.type} />
                    <span className="min-w-0"><span className="block break-words text-sm font-bold text-slate-950 dark:text-slate-50">{activity.title}</span><span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-400 dark:text-slate-500">{activity.businessDate ? `${activity.type === "payment" ? "Payment" : "Trip"} date: ${dashboardDateLabel(activity.businessDate)} · ` : ""}Added {relativeTime(activity.timestamp)}</span></span>
                    {activity.amount !== undefined && <span className="col-start-2 whitespace-nowrap text-xs font-black text-[#1E3A8A] dark:text-blue-200 sm:col-start-auto sm:text-sm">{currency(activity.amount, settings.currencySymbol)}</span>}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-[#1E3A8A] hover:bg-[#E0E7FF] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-slate-800" onClick={onViewHistory}>View all activity <DashboardIcon name="arrow" className="h-4 w-4" /></button>
          </CardContent>
        </Card>

        <Card className="min-w-0 shadow-none">
          <CardHeader className="!p-3">
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Top Owners This Month</h2>
          </CardHeader>
          <CardContent className="!p-2.5">
            {data.topOwnersThisMonth.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center dark:border-slate-700">
                <DashboardIcon name="owner" className="mx-auto text-slate-400" />
                <p className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100">No owner billing this month</p>
              </div>
            ) : (
              <div role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.topOwnersThisMonth.map((owner) => (
                  <button key={owner.billingPartyId} type="button" role="listitem" className="flex min-h-14 w-full cursor-pointer items-center gap-2 px-1 py-2 text-left hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:hover:bg-slate-800/60" aria-label={`Open ${owner.name} owner details`} onClick={() => onOpenOwner(owner.billingPartyId)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-950 dark:text-slate-50" title={owner.name}>{owner.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{currency(owner.billedAmount, settings.currencySymbol)} billed{owner.outstandingAmount > 0 ? ` · ${currency(owner.outstandingAmount, settings.currencySymbol)} outstanding` : ""}</span>
                    </span>
                    <DashboardIcon name="arrow" className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-[#1E3A8A] hover:bg-[#E0E7FF] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-slate-800" onClick={onViewOwners}>View all owners <DashboardIcon name="arrow" className="h-4 w-4" /></button>
          </CardContent>
        </Card>

        <BillingTrendChart data={monthlyBilling} currencySymbol={settings.currencySymbol} loading={loading} error={billError} />
      </div>
    </div>
  );
}
