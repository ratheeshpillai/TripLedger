import type { Bill, BillQuery } from "../../types/bill";

export type AppliedFilters = {
  billingPartyId: string;
};

export type DateRange = {
  fromDate: string;
  toDate: string;
  label: string;
};

export type HistorySortOption = "newest" | "oldest" | "highest" | "lowest" | "customer" | "owner";

export const emptyHistoryFilters: AppliedFilters = { billingPartyId: "" };
export const historyRowsPerPageOptions = [20, 50, 100];

export function ownerName(bill: Bill): string {
  return bill.billingPartyCompanyName || bill.billingPartyName || "Unassigned";
}

export function formatHistoryDate(value: string): string {
  if (!value) return "NA";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "NA";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatHistoryDateRange(bills: Bill[]): string {
  const dates = bills.map((bill) => bill.tripDate).filter(Boolean).sort();
  if (dates.length === 0) return "NA";
  return dates[0] === dates[dates.length - 1]
    ? formatHistoryDate(dates[0])
    : `${formatHistoryDate(dates[0])} - ${formatHistoryDate(dates[dates.length - 1])}`;
}

export function activeHistoryFilterCount(filters: AppliedFilters): number {
  return filters.billingPartyId ? 1 : 0;
}

export function inputDate(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function quickHistoryDateRange(preset: "today" | "week" | "month" | "last-month", now = new Date()): DateRange {
  if (preset === "today") {
    const today = inputDate(now);
    return { fromDate: today, toDate: today, label: "Today" };
  }

  if (preset === "week") {
    const day = now.getDay() || 7;
    const first = new Date(now);
    first.setDate(now.getDate() - day + 1);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { fromDate: inputDate(first), toDate: inputDate(last), label: "This Week" };
  }

  const monthOffset = preset === "last-month" ? -1 : 0;
  const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return {
    fromDate: inputDate(first),
    toDate: inputDate(last),
    label: preset === "last-month" ? "Last Month" : "This Month"
  };
}

export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function validateHistoryDateRange(fromDate: string, toDate: string): string {
  if (!fromDate || !toDate) return "Choose both From Date and To Date.";
  if (fromDate > toDate) return "From Date cannot be after To Date.";
  return "";
}

export function buildHistoryQuery(input: {
  page: number;
  pageSize: number;
  search: string;
  dateRange: DateRange | null;
  filters: AppliedFilters;
  sort: HistorySortOption;
}): BillQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    search: input.search.trim() || undefined,
    dateFrom: input.dateRange?.fromDate,
    dateTo: input.dateRange?.toDate,
    billingPartyId: input.filters.billingPartyId || undefined,
    sort: input.sort
  };
}

export function paginationPages(currentPage: number, pageCount: number): number[] {
  const totalVisible = Math.min(5, pageCount);
  const start = Math.max(1, Math.min(currentPage - 2, pageCount - totalVisible + 1));
  return Array.from({ length: totalVisible }, (_, index) => start + index);
}

export function historySortKey(userId: string): string {
  return `tripledger.history.sort.${userId}`;
}

export function isHistorySortOption(value: string | null): value is HistorySortOption {
  return value === "newest" || value === "oldest" || value === "highest" || value === "lowest" || value === "customer" || value === "owner";
}
