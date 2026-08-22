export type MonthlyBillingComparison = {
  label: string;
  direction: "higher" | "lower" | "neutral";
};

function inputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function dashboardDateLabel(value: string): string {
  return inputDate(value)?.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) ?? "Date unavailable";
}

export function compareMonthlyBilling(current: number, previous: number): MonthlyBillingComparison | null {
  const safeCurrent = Number.isFinite(current) ? current : 0;
  const safePrevious = Number.isFinite(previous) ? previous : 0;
  if (safeCurrent === 0 && safePrevious === 0) return null;
  if (safePrevious === 0) return { label: "New billing this month", direction: "higher" };

  const change = ((safeCurrent - safePrevious) / Math.abs(safePrevious)) * 100;
  const rounded = Math.round(Math.abs(change) * 10) / 10;
  if (rounded === 0) return { label: "No change from last month", direction: "neutral" };
  return {
    label: `${rounded.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% ${change > 0 ? "higher" : "lower"} than last month`,
    direction: change > 0 ? "higher" : "lower"
  };
}
