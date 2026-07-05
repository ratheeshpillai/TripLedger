import type { TimeFormat } from "../types/settings";
import { formatTime } from "./timeUtils";
import type { Bill } from "../types/bill";

export function currency(value: number, symbol = "₹"): string {
  return `${symbol}${Math.round(value).toLocaleString("en-IN")}`;
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
  return `${bill.guestSalutation || "Mr."} ${guestName}`.trim();
}

export function padLabel(label: string, width = 17): string {
  return label.padEnd(width, " ");
}
