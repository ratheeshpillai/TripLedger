import type { MonthlyBillingPoint } from "../../utils/dashboard";
import { currency } from "../../utils/formatters";
import { Card, CardContent, CardHeader } from "../ui/Card";

type Props = {
  data: MonthlyBillingPoint[];
  currencySymbol: string;
  loading: boolean;
};

export function BillingTrendChart({ data, currencySymbol, loading }: Props) {
  const hasData = data.some((point) => point.amount > 0);
  const maxAmount = Math.max(...data.map((point) => point.amount), 1);
  const chartHeight = 128;
  const chartScaleMax = maxAmount * 1.18;

  return (
    <Card className="h-full min-w-0">
      <CardHeader>
        <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Monthly Billing</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Billed amount by trip date for the last six months.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-300">Loading billing trend...</div>
        ) : !hasData ? (
          <div className="grid h-56 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-[#0f172a]">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">No recent billing trend</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Bills from the last six months will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-700 dark:bg-[#0f172a] sm:px-5">
            <div className="flex h-52 min-w-0 items-end gap-1.5 px-1 sm:gap-3 sm:px-2">
              {data.map((point) => {
                const barHeight = Math.max(8, Math.round((point.amount / chartScaleMax) * chartHeight));
                return (
                  <div key={point.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                    <div className="min-h-8 max-w-full text-center">
                      <p className="truncate text-[10px] font-black text-slate-900 dark:text-slate-100 sm:text-[11px]">{point.amount > 0 ? currency(point.amount, currencySymbol) : "NA"}</p>
                    </div>
                    <div
                      className="w-full rounded-t-xl bg-[#1E3A8A] shadow-sm dark:bg-blue-500"
                      style={{ height: `${barHeight}px` }}
                      title={`${point.label}: ${currency(point.amount, currencySymbol)}`}
                    />
                    <p className="w-full truncate text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">{point.label.replace(" 20", " '")}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
