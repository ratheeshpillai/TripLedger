import type { Bill, BillSummaryTotals } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { amountOrNA, currency, dateDisplay, numberOrNA, padLabel, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

function line(label: string, value: string): string {
  return `${padLabel(label)}: ${value}`;
}

export function buildSingleBillText(bill: Bill, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  return [
    "BILL DETAILS",
    "",
    line("Driver", bill.driverName || "NA"),
    line("Vehicle", bill.vehicleName || "NA"),
    line("Vehicle Number", bill.vehicleNumber || "NA"),
    line("Guest", bill.guestName || "NA"),
    line("Reporting Place", bill.reportingPlace || "NA"),
    "",
    "TRIP TIMING",
    "",
    line("Trip Date", dateDisplay(bill.tripDate)),
    line("Reporting Time", timeDisplay(bill.reportingTime, settings.timeFormat)),
    line("Garage Time", timeDisplay(bill.garageTime, settings.timeFormat)),
    line("Closing Date", dateDisplay(bill.closingDate)),
    line("Closing Time", timeDisplay(bill.closingTime, settings.timeFormat)),
    line("Total Hours", formatDuration(bill.totalHours)),
    line("Extra Hours", formatDuration(bill.extraHours)),
    "",
    "PACKAGE & KM",
    "",
    line("Base Package", bill.basePackage || `${bill.baseHours} Hours / ${bill.baseKm} KM`),
    line("Base Amount", currency(bill.baseAmount, symbol)),
    line("Total KM", numberOrNA(bill.totalKm)),
    line("Extra KM", numberOrNA(bill.extraKm)),
    "",
    "CHARGES",
    "",
    line("Extra KM Rate", bill.extraKm > 0 ? amountOrNA(bill.extraKmRate, symbol) : "NA"),
    line("Extra KM Amount", amountOrNA(bill.extraKmAmount, symbol)),
    line("Extra Hour Amount", amountOrNA(bill.extraHourAmount, symbol)),
    line("Airport Parking", amountOrNA(bill.airportParking, symbol)),
    line("Fastag", amountOrNA(bill.fastag, symbol)),
    line("Road Parking", amountOrNA(bill.roadParking, symbol)),
    line("Pending Amount", amountOrNA(bill.pendingAmount, symbol)),
    "",
    "TOTAL",
    "",
    line("Total Amount", currency(bill.totalAmount, symbol))
  ].join("\n");
}

export function buildCombinedSummaryText(totals: BillSummaryTotals, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  return [
    "COMBINED BILL SUMMARY",
    "",
    line("Selected Bills", String(totals.selectedBillsCount)),
    line("Total KM", numberOrNA(totals.totalKm)),
    line("Total Hours", formatDuration(totals.totalHours)),
    line("Base Amount", currency(totals.totalBaseAmount, symbol)),
    line("Extra KM Amount", amountOrNA(totals.totalExtraKmAmount, symbol)),
    line("Extra Hour Amount", amountOrNA(totals.totalExtraHourAmount, symbol)),
    line("Airport Parking", amountOrNA(totals.totalAirportParking, symbol)),
    line("Fastag", amountOrNA(totals.totalFastag, symbol)),
    line("Road Parking", amountOrNA(totals.totalRoadParking, symbol)),
    line("Pending Amount", amountOrNA(totals.totalPendingAmount, symbol)),
    "",
    line("Grand Total", currency(totals.grandTotal, symbol))
  ].join("\n");
}

export function buildIndividualSummaryText(bills: Bill[], settings: AppSettings): string {
  return bills.map((bill, index) => `BILL ${index + 1}\n\n${buildSingleBillText(bill, settings)}`).join("\n\n--------------------\n\n");
}

export function createWhatsAppUrl(message: string, phone?: string): string {
  const number = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
