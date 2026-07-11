import { useMemo } from "react";
import type { Bill } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { buildDashboardSummary } from "../../utils/dashboard";
import { currency, dateDisplay, guestDisplay } from "../../utils/formatters";
import { MetricCard } from "../shared/MetricCard";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { BillingTrendChart } from "./BillingTrendChart";

type Props = {
  bills: Bill[];
  settings: AppSettings;
  loading: boolean;
  error: string;
  onCreateBill: () => void;
  onViewHistory: () => void;
  onOpenBill: (bill: Bill) => void;
};

export function DashboardPage({ bills, settings, loading, error, onCreateBill, onViewHistory, onOpenBill }: Props) {
  const summary = useMemo(() => buildDashboardSummary(bills), [bills]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">Dashboard</p>
          <h1 className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">Billing Overview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track your saved bills and jump back into daily billing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onViewHistory}>View History</Button>
          <Button type="button" variant="primary" onClick={onCreateBill}>Create Bill</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total Bills Created" value={loading ? "Loading..." : String(summary.totalBills)} />
        <MetricCard label="Total Amount Billed" value={loading ? "Loading..." : currency(summary.totalAmount, settings.currencySymbol)} />
        <MetricCard label="This Month Billed" value={loading ? "Loading..." : currency(summary.currentMonthAmount, settings.currencySymbol)} />
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-red-700 dark:text-red-200">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <BillingTrendChart data={summary.monthlyTrend} currencySymbol={settings.currencySymbol} loading={loading} />

        <Card className="min-w-0">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Recent Bills</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Latest bills by trip date.</p>
            </div>
            <Button type="button" variant="ghost" onClick={onViewHistory}>View all</Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-300">Loading recent bills...</div>
            ) : summary.recentBills.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-700 dark:bg-[#0f172a]">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">No bills yet</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">Create your first bill to see totals and recent activity here.</p>
                <div className="mt-4">
                  <Button type="button" variant="primary" onClick={onCreateBill}>Create First Bill</Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.recentBills.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    className="grid w-full cursor-pointer gap-2 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3"
                    onClick={() => onOpenBill(bill)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        {dateDisplay(bill.tripDate)} | {bill.vehicleName || "Vehicle"} {bill.vehicleNumber ? `| ${bill.vehicleNumber}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-black text-[#1E3A8A] dark:text-blue-200">{currency(bill.totalAmount, settings.currencySymbol)}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
