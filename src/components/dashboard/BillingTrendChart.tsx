import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps
} from "recharts";
import type { MonthlyBillingPoint } from "../../types/dashboard";
import { compareMonthlyBilling } from "../../utils/dashboard";
import { compactCurrency, currency } from "../../utils/formatters";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { cn } from "../ui/cn";

type Props = {
  data: MonthlyBillingPoint[];
  currencySymbol: string;
  loading: boolean;
  error?: string;
};

function BillingTooltip({ active, payload, currencySymbol }: TooltipContentProps & { currencySymbol: string }) {
  const point = payload[0]?.payload as MonthlyBillingPoint | undefined;
  if (!active || !point) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg dark:border-slate-700 dark:bg-[#111827]">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{point.fullMonthLabel}</p>
      <p className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{currency(point.amount, currencySymbol)} billed</p>
    </div>
  );
}

export function BillingTrendChart({ data, currencySymbol, loading, error }: Props) {
  const hasData = data.some((point) => point.amount !== 0);
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];
  const comparison = compareMonthlyBilling(currentMonth?.amount ?? 0, previousMonth?.amount ?? 0);

  return (
    <Card className="min-w-0 shadow-none [--chart-cursor:#CBD5E1] [--chart-grid:#E2E8F0] [--chart-line:#1E3A8A] dark:[--chart-cursor:#475569] dark:[--chart-grid:#334155] dark:[--chart-line:#60A5FA]">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 !p-3 sm:!px-4">
        <div>
          <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Monthly Billing Trend</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Last 6 months</p>
        </div>
        {!loading && !error && (
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">This month</p>
            <p className="mt-0.5 text-lg font-black text-[#1E3A8A] dark:text-blue-200">{currency(currentMonth?.amount ?? 0, currencySymbol)}</p>
            {comparison && (
              <p className={cn(
                "mt-1 text-xs font-bold",
                comparison.direction === "higher" && "text-emerald-700 dark:text-emerald-300",
                comparison.direction === "lower" && "text-orange-700 dark:text-orange-300",
                comparison.direction === "neutral" && "text-slate-500 dark:text-slate-400"
              )}>{comparison.label}</p>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="!p-3 sm:!px-4">
        {loading ? (
          <div className="h-[184px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 sm:h-[196px]" aria-label="Loading monthly billing trend" />
        ) : error ? (
          <div className="grid h-[184px] place-items-center rounded-xl border border-dashed border-red-200 bg-red-50/50 p-4 text-center dark:border-red-900 dark:bg-red-950/20 sm:h-[196px]">
            <div><p className="text-sm font-black text-red-700 dark:text-red-200">Unable to load billing trend</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try refreshing the Dashboard.</p></div>
          </div>
        ) : !hasData ? (
          <div className="grid h-[184px] place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-[#0f172a] sm:h-[196px]">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">No billing activity yet</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create your first bill to see the monthly trend.</p>
            </div>
          </div>
        ) : (
          <>
            <div role="img" aria-label="Monthly billed amounts for the last six calendar months" className="h-[184px] min-w-0 sm:h-[196px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tickMargin={10} tick={{ fill: "currentColor", fontSize: 11, fontWeight: 700 }} className="text-slate-500 dark:text-slate-400" />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                    width={52}
                    domain={[(minimum: number) => Math.min(0, minimum * 1.1), (maximum: number) => Math.max(1, maximum * 1.12)]}
                    tickFormatter={(value) => compactCurrency(Number(value), currencySymbol)}
                    tick={{ fill: "currentColor", fontSize: 11, fontWeight: 700 }}
                    className="text-slate-500 dark:text-slate-400"
                  />
                  <Tooltip content={(props) => <BillingTooltip {...props} currencySymbol={currencySymbol} />} cursor={{ stroke: "var(--chart-cursor)", strokeWidth: 1 }} />
                  <Line type="monotone" dataKey="amount" stroke="var(--chart-line)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "var(--chart-line)", stroke: "var(--chart-line)" }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="sr-only">
              {data.map((point) => <li key={point.monthKey}>{point.fullMonthLabel}: {currency(point.amount, currencySymbol)}</li>)}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
