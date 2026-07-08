import type { Bill, BillSummaryTotals } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { amountOrNA, currency, dateDisplay, guestDisplay, numberOrNA, padLabel, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

function line(label: string, value: string): string {
  return `${padLabel(label)}: ${value}`;
}

type WhatsAppRow = string | [label: string, value: string];

function renderWhatsAppRows(rows: WhatsAppRow[]): string {
  const labelWidth = rows.reduce((width, row) => Array.isArray(row) ? Math.max(width, row[0].length) : width, 0);
  return rows.map((row) => Array.isArray(row) ? `${row[0].padEnd(labelWidth, " ")} : ${row[1]}` : row).join("\n");
}

function wrapWhatsAppCodeBlock(message: string): string {
  return ["```", message, "```"].join("\n");
}

function singleBillWhatsAppRows(bill: Bill, settings: AppSettings): WhatsAppRow[] {
  const symbol = settings.currencySymbol;
  return [
    "BILL DETAILS",
    "",
    ["Driver", bill.driverName || "NA"],
    ["Vehicle", bill.vehicleName || "NA"],
    ["Vehicle Number", bill.vehicleNumber || "NA"],
    ["Guest", guestDisplay(bill)],
    ["Reporting Place", bill.reportingPlace || "NA"],
    "",
    "TRIP TIMING",
    "",
    ["Trip Date", dateDisplay(bill.tripDate)],
    ["Reporting Time", timeDisplay(bill.reportingTime, settings.timeFormat)],
    ["Garage Time", timeDisplay(bill.garageTime, settings.timeFormat)],
    ["Closing Date", dateDisplay(bill.closingDate)],
    ["Closing Time", timeDisplay(bill.closingTime, settings.timeFormat)],
    ["Total Hours", formatDuration(bill.totalHours)],
    ["Extra Hours", formatDuration(bill.extraHours)],
    "",
    "PACKAGE & KM",
    "",
    ["Base Package", bill.basePackage || `${bill.baseHours} Hours / ${bill.baseKm} KM`],
    ["Base Amount", currency(bill.baseAmount, symbol)],
    ["Total KM", numberOrNA(bill.totalKm)],
    ["Extra KM", numberOrNA(bill.extraKm)],
    "",
    "CHARGES",
    "",
    ["Extra KM Rate", bill.extraKm > 0 ? `${amountOrNA(bill.extraKmRate, symbol)} / KM` : "NA"],
    ["Extra KM Amount", amountOrNA(bill.extraKmAmount, symbol)],
    ["Extra Hour Rate", bill.extraHours > 0 ? `${amountOrNA(bill.extraHourRate, symbol)} / Hour` : "NA"],
    ["Extra Hour Amount", amountOrNA(bill.extraHourAmount, symbol)],
    ["Airport Parking", amountOrNA(bill.airportParking, symbol)],
    ["Fastag", amountOrNA(bill.fastag, symbol)],
    ["Road Parking", amountOrNA(bill.roadParking, symbol)],
    ["Pending Amount", amountOrNA(bill.pendingAmount, symbol)],
    "",
    "TOTAL",
    "",
    ["Total Amount", currency(bill.totalAmount, symbol)]
  ];
}

export function buildSingleBillText(bill: Bill, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  return [
    "BILL DETAILS",
    "",
    line("Driver", bill.driverName || "NA"),
    line("Vehicle", bill.vehicleName || "NA"),
    line("Vehicle Number", bill.vehicleNumber || "NA"),
    line("Guest", guestDisplay(bill)),
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
    line("Extra KM Rate", bill.extraKm > 0 ? `${amountOrNA(bill.extraKmRate, symbol)} / KM` : "NA"),
    line("Extra KM Amount", amountOrNA(bill.extraKmAmount, symbol)),
    line("Extra Hour Rate", bill.extraHours > 0 ? `${amountOrNA(bill.extraHourRate, symbol)} / Hour` : "NA"),
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

export function buildSingleBillWhatsAppText(bill: Bill, settings: AppSettings): string {
  return wrapWhatsAppCodeBlock(renderWhatsAppRows(singleBillWhatsAppRows(bill, settings)));
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

export function buildCombinedSummaryWhatsAppText(totals: BillSummaryTotals, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  return wrapWhatsAppCodeBlock(renderWhatsAppRows([
    "COMBINED BILL SUMMARY",
    "",
    ["Selected Bills", String(totals.selectedBillsCount)],
    ["Total KM", numberOrNA(totals.totalKm)],
    ["Total Hours", formatDuration(totals.totalHours)],
    ["Base Amount", currency(totals.totalBaseAmount, symbol)],
    ["Extra KM Amount", amountOrNA(totals.totalExtraKmAmount, symbol)],
    ["Extra Hour Amount", amountOrNA(totals.totalExtraHourAmount, symbol)],
    ["Airport Parking", amountOrNA(totals.totalAirportParking, symbol)],
    ["Fastag", amountOrNA(totals.totalFastag, symbol)],
    ["Road Parking", amountOrNA(totals.totalRoadParking, symbol)],
    ["Pending Amount", amountOrNA(totals.totalPendingAmount, symbol)],
    "",
    ["Grand Total", currency(totals.grandTotal, symbol)]
  ]));
}

export function buildIndividualSummaryText(bills: Bill[], settings: AppSettings): string {
  return bills.map((bill, index) => `BILL ${index + 1}\n\n${buildSingleBillText(bill, settings)}`).join("\n\n--------------------\n\n");
}

export function buildIndividualSummaryWhatsAppText(bills: Bill[], settings: AppSettings): string {
  const rows = bills.flatMap<WhatsAppRow>((bill, index) => [
    `BILL ${index + 1}`,
    "",
    ...singleBillWhatsAppRows(bill, settings),
    ...(index < bills.length - 1 ? ["", "--------------------", ""] : [])
  ]);

  return wrapWhatsAppCodeBlock(renderWhatsAppRows(rows));
}

export function createWhatsAppUrl(message: string, phone?: string): string {
  const number = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function logWhatsAppTextForDebug(message: string): void {
  if (import.meta.env.DEV) {
    console.info("TripLedger WhatsApp text:\n" + message);
  }
}
