import type { Bill } from "../types/bill";

export type MonthlyBillingPoint = {
  key: string;
  label: string;
  amount: number;
};

export type DashboardSummary = {
  totalBills: number;
  totalAmount: number;
  currentMonthAmount: number;
  recentBills: Bill[];
  monthlyTrend: MonthlyBillingPoint[];
};

function parseTripDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function recentMonthStarts(count: number, now = new Date()): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    date.setHours(0, 0, 0, 0);
    return date;
  });
}

export function buildMonthlyBillingTrend(bills: Bill[], months = 6, now = new Date()): MonthlyBillingPoint[] {
  const monthStarts = recentMonthStarts(months, now);
  const totals = new Map(monthStarts.map((date) => [monthKey(date), 0]));

  bills.forEach((bill) => {
    const tripDate = parseTripDate(bill.tripDate);
    if (!tripDate) return;
    const key = monthKey(tripDate);
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + bill.totalAmount);
    }
  });

  return monthStarts.map((date) => ({
    key: monthKey(date),
    label: monthLabel(date),
    amount: totals.get(monthKey(date)) ?? 0
  }));
}

export function buildDashboardSummary(bills: Bill[], now = new Date()): DashboardSummary {
  const currentMonthKey = monthKey(now);
  const totalAmount = bills.reduce((sum, bill) => sum + bill.totalAmount, 0);
  const currentMonthAmount = bills
    .filter((bill) => {
      const tripDate = parseTripDate(bill.tripDate);
      return tripDate ? monthKey(tripDate) === currentMonthKey : false;
    })
    .reduce((sum, bill) => sum + bill.totalAmount, 0);
  const recentBills = [...bills]
    .sort((a, b) => {
      const dateSort = b.tripDate.localeCompare(a.tripDate);
      return dateSort || b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 5);

  return {
    totalBills: bills.length,
    totalAmount,
    currentMonthAmount,
    recentBills,
    monthlyTrend: buildMonthlyBillingTrend(bills, 6, now)
  };
}
