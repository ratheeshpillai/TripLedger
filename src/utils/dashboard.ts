import type { Bill } from "../types/bill";
import type { BillingParty, BillingPartySummary } from "../types/billingParty";
import type { OwnerPayment } from "../types/ownerPayment";

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

export type DashboardPeriod = "today" | "week" | "month";

export type DashboardActivity = {
  id: string;
  type: "bill" | "payment" | "owner";
  recordId: string;
  title: string;
  amount?: number;
  timestamp: string;
};

export type DashboardData = {
  billingTotal: number;
  billsCreated: number;
  paymentsReceived: number;
  currentOutstanding: number;
  outstandingOwners: number;
  advanceOwners: number;
  totalAdvance: number;
  billsThisWeek: number;
  paymentsThisWeek: number;
  recentActivity: DashboardActivity[];
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

function dateRange(period: DashboardPeriod, now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const mondayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayOffset);
  } else if (period === "month") {
    start.setDate(1);
  }

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function timestampDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function inputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function isWithin(date: Date | null, range: { start: Date; end: Date }): boolean {
  return Boolean(date && date >= range.start && date <= range.end);
}

function partyName(party: BillingParty | undefined): string {
  return party ? party.companyName || party.name : "Owner / Company";
}

export function buildDashboardData(
  bills: Bill[],
  payments: OwnerPayment[],
  parties: BillingParty[],
  summaries: BillingPartySummary[],
  period: DashboardPeriod,
  now = new Date()
): DashboardData {
  const selectedRange = dateRange(period, now);
  const weekRange = dateRange("week", now);
  const periodBills = bills.filter((bill) => isWithin(timestampDate(bill.createdAt), selectedRange));
  const periodPayments = payments.filter((payment) => isWithin(inputDate(payment.paymentDate), selectedRange));
  const partyById = new Map(parties.map((party) => [party.id, party]));

  const billActivities: DashboardActivity[] = bills.map((bill) => ({
    id: `bill-${bill.id}`,
    type: "bill",
    recordId: bill.id,
    title: `Bill created for ${bill.billingPartyCompanyName || bill.billingPartyName || bill.guestName || "Customer"}`,
    amount: bill.totalAmount,
    timestamp: bill.createdAt
  }));
  const paymentActivities: DashboardActivity[] = payments.map((payment) => ({
    id: `payment-${payment.id}`,
    type: "payment",
    recordId: payment.billingPartyId,
    title: `Payment recorded for ${partyName(partyById.get(payment.billingPartyId))}`,
    amount: payment.amount,
    timestamp: payment.createdAt
  }));
  const ownerActivities: DashboardActivity[] = parties.map((party) => ({
    id: `owner-${party.id}`,
    type: "owner",
    recordId: party.id,
    title: `Owner added: ${partyName(party)}`,
    timestamp: party.createdAt
  }));

  return {
    billingTotal: periodBills.reduce((total, bill) => total + Number(bill.totalAmount || 0), 0),
    billsCreated: periodBills.length,
    paymentsReceived: periodPayments.reduce((total, payment) => total + Number(payment.amount || 0), 0),
    currentOutstanding: summaries.reduce((total, summary) => total + Number(summary.outstandingAmount || 0), 0),
    outstandingOwners: summaries.filter((summary) => summary.outstandingAmount > 0).length,
    advanceOwners: summaries.filter((summary) => summary.advanceCredit > 0).length,
    totalAdvance: summaries.reduce((total, summary) => total + Number(summary.advanceCredit || 0), 0),
    billsThisWeek: bills.filter((bill) => isWithin(timestampDate(bill.createdAt), weekRange)).length,
    paymentsThisWeek: payments
      .filter((payment) => isWithin(inputDate(payment.paymentDate), weekRange))
      .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    recentActivity: [...billActivities, ...paymentActivities, ...ownerActivities]
      .filter((activity) => timestampDate(activity.timestamp))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id))
      .slice(0, 5)
  };
}
