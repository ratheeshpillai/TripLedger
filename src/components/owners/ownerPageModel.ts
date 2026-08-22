import type { BillingParty, BillingPartySummary, LedgerEntry } from "../../types/billingParty";
import type { OwnerPaymentDraft } from "../../types/ownerPayment";
import { todayInputDate } from "../../constants/defaults";
import { currency } from "../../utils/formatters";

export type OwnerSortOption = "recent" | "highest" | "name-asc" | "name-desc";
export type TransactionSortOption = "newest" | "oldest";

export function emptyPaymentDraft(billingPartyId: string): OwnerPaymentDraft {
  return { userId: undefined, billingPartyId, paymentDate: todayInputDate(), amount: 0, paymentType: "payment_received", paymentMethod: "", reference: "", notes: "" };
}

export function latestActivity(summary?: BillingPartySummary): string {
  const dates = summary ? [summary.latestBillDate, summary.latestPaymentDate].filter(Boolean).sort() : [];
  return dates[dates.length - 1] ?? "";
}

export function labelize(value: string): string {
  if (value === "bill") return "Bill";
  if (value === "advance_received") return "Advance Received";
  if (value === "bank_transfer") return "Bank Transfer";
  if (value === "upi") return "UPI";
  return value === "payment_received" ? "Payment Received" : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ownerDateDisplay(value: string): string {
  if (!value) return "NA";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "NA";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function plural(count: number | undefined, singular: string, pluralLabel = `${singular}s`): string {
  const value = Number(count ?? 0);
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

export function runningBalanceDisplay(value: number, symbol: string): string {
  return value < 0 ? `Advance ${currency(Math.abs(value), symbol)}` : currency(value, symbol);
}

export function entryCustomer(entry: LedgerEntry | { entryType: LedgerEntry["entryType"]; description: string }): string {
  return entry.entryType === "bill" ? entry.description || "NA" : "—";
}

export function balanceStatus(summary: BillingPartySummary | undefined, symbol: string): { label: string; amountLabel: string; tone: "danger" | "success" | "info" } {
  if (summary?.outstandingAmount && summary.outstandingAmount > 0) return { label: "Outstanding", amountLabel: currency(summary.outstandingAmount, symbol), tone: "danger" };
  if (summary?.advanceCredit && summary.advanceCredit > 0) return { label: "Advance Available", amountLabel: currency(summary.advanceCredit, symbol), tone: "success" };
  return { label: "Settled", amountLabel: "", tone: "info" };
}

export function partyDisplayName(party: BillingParty | undefined): string {
  return party ? party.companyName || party.name : "Owner / Company";
}

export function sortOwnerLedger(entries: LedgerEntry[], sort: TransactionSortOption): LedgerEntry[] {
  return entries.map((entry, index) => ({ entry, index })).sort((a, b) => {
    const secondaryA = `${a.entry.referenceId}|${a.entry.entryType}|${a.entry.description}`;
    const secondaryB = `${b.entry.referenceId}|${b.entry.entryType}|${b.entry.description}`;
    const oldestFirst = a.entry.entryDate.localeCompare(b.entry.entryDate) || secondaryA.localeCompare(secondaryB) || a.index - b.index;
    return sort === "oldest" ? oldestFirst : -oldestFirst;
  }).map(({ entry }) => entry);
}

export function filterAndSortOwners(parties: BillingParty[], summaries: Map<string, BillingPartySummary>, search: string, sort: OwnerSortOption): BillingParty[] {
  const needle = search.trim().toLowerCase();
  return parties.filter((party) => !needle || `${party.name} ${party.companyName} ${party.phone} ${party.email}`.toLowerCase().includes(needle)).sort((a, b) => {
    const summaryA = summaries.get(a.id);
    const summaryB = summaries.get(b.id);
    if (sort === "highest") return Number(summaryB?.outstandingAmount ?? 0) - Number(summaryA?.outstandingAmount ?? 0);
    if (sort === "name-asc") return partyDisplayName(a).localeCompare(partyDisplayName(b));
    if (sort === "name-desc") return partyDisplayName(b).localeCompare(partyDisplayName(a));
    return latestActivity(summaryB).localeCompare(latestActivity(summaryA));
  });
}

export function ownerTransactionSortKey(ownerId: string): string {
  return `tripledger.ownerTransactionSort.${ownerId}`;
}

export function isTransactionSortOption(value: string | null): value is TransactionSortOption {
  return value === "newest" || value === "oldest";
}

export function currentMonthStart(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function inputDate(date: Date): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function parseInputDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function quickOwnerDateRange(preset: "today" | "week" | "month" | "last-month", now = new Date()): { fromDate: string; toDate: string } {
  if (preset === "today") {
    const today = inputDate(now);
    return { fromDate: today, toDate: today };
  }
  if (preset === "week") {
    const day = now.getDay() || 7;
    const first = new Date(now);
    first.setDate(now.getDate() - day + 1);
    const last = new Date(first);
    last.setDate(first.getDate() + 6);
    return { fromDate: inputDate(first), toDate: inputDate(last) };
  }
  const monthOffset = preset === "last-month" ? -1 : 0;
  return {
    fromDate: inputDate(new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)),
    toDate: inputDate(new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0))
  };
}

export function isOwnerSortOption(value: string | null): value is OwnerSortOption {
  return value === "recent" || value === "highest" || value === "name-asc" || value === "name-desc";
}
