import type { TimeFormat } from "../types/settings";
import { formatTime } from "./timeUtils";
import type { Bill } from "../types/bill";

export function currency(value: number, symbol = "₹"): string {
  return `${symbol}${Math.round(value).toLocaleString("en-IN")}`;
}

export function compactCurrency(value: number, symbol = "₹"): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const absolute = Math.abs(safeValue);
  const sign = safeValue < 0 ? "-" : "";
  const compact = (amount: number, suffix: string) => `${Number(amount.toFixed(1))}${suffix}`;

  if (absolute >= 10_000_000) return `${sign}${symbol}${compact(absolute / 10_000_000, "Cr")}`;
  if (absolute >= 100_000) return `${sign}${symbol}${compact(absolute / 100_000, "L")}`;
  if (absolute >= 1_000) return `${sign}${symbol}${compact(absolute / 1_000, "K")}`;
  return `${sign}${symbol}${Math.round(absolute)}`;
}

export function balanceLabel(value: number, symbol = "₹"): string {
  if (value > 0) return `Outstanding ${currency(value, symbol)}`;
  if (value < 0) return `Advance ${currency(Math.abs(value), symbol)}`;
  return "Settled";
}

export function amountOrNA(value: number, symbol = "₹"): string {
  return value > 0 ? currency(value, symbol) : "NA";
}

export function numberOrNA(value: number): string {
  return value > 0 ? String(Math.round(value)) : "NA";
}

export function dateDisplay(value: string): string {
  if (!value) return "NA";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

export function timeDisplay(value: string, timeFormat: TimeFormat): string {
  return value ? formatTime(value, timeFormat) : "NA";
}

export function guestDisplay(bill: Pick<Bill, "guestName" | "guestSalutation">): string {
  const guestName = bill.guestName.trim();
  if (!guestName) return "NA";
  if (/^(mr\.?|mrs\.?|miss)\s/i.test(guestName)) return guestName;
  const salutation = bill.guestSalutation === "Miss" ? "Miss." : bill.guestSalutation || "Mr.";
  return `${salutation} ${guestName}`.trim();
}

export function padLabel(label: string, width = 17): string {
  return label.padEnd(width, " ");
}
