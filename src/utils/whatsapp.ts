import type { Bill, BillSummaryTotals } from "../types/bill";
import type { BillingPartyStatement } from "../types/billingParty";
import type { AppSettings } from "../types/settings";
import { amountOrNA, balanceLabel, currency, dateDisplay, guestDisplay, numberOrNA, timeDisplay } from "./formatters";
import { chronologicalBills } from "./billOrdering";
import { formatDuration } from "./timeUtils";

function line(label: string, value: string): string {
  return `${label}: ${value}`;
}

type WhatsAppRow = string | [label: string, value: string];

function renderWhatsAppRows(rows: WhatsAppRow[]): string {
  return rows
    .flatMap((row) => Array.isArray(row) ? (row[1].trim() ? [line(row[0], row[1])] : []) : [row])
    .join("\n");
}

function singleBillWhatsAppRows(bill: Bill, settings: AppSettings): WhatsAppRow[] {
  const symbol = settings.currencySymbol;
  const ownerName = bill.billingPartyCompanyName || bill.billingPartyName || "Unassigned";
  return [
    "BILL DETAILS",
    "",
    ["Owner / Company", ownerName],
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
    "",
    "TOTAL",
    "",
    ["Current Bill Amount", currency(bill.totalAmount, symbol)]
  ];
}

export function buildSingleBillText(bill: Bill, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  const ownerName = bill.billingPartyCompanyName || bill.billingPartyName || "Unassigned";
  return [
    "BILL DETAILS",
    "",
    line("Owner / Company", ownerName),
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
    "",
    "TOTAL",
    "",
    line("Current Bill Amount", currency(bill.totalAmount, symbol))
  ].join("\n");
}

export function buildSingleBillWhatsAppText(bill: Bill, settings: AppSettings): string {
  return renderWhatsAppRows(singleBillWhatsAppRows(bill, settings));
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
    "",
    line("Grand Total", currency(totals.grandTotal, symbol))
  ].join("\n");
}

export function buildCombinedSummaryWhatsAppText(totals: BillSummaryTotals, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  return renderWhatsAppRows([
    "*Combined Bill Summary*",
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
    "",
    ["Grand Total", currency(totals.grandTotal, symbol)]
  ]);
}

export function buildIndividualSummaryText(bills: Bill[], settings: AppSettings): string {
  return chronologicalBills(bills).map((bill, index) => `BILL ${index + 1}\n\n${buildSingleBillText(bill, settings)}`).join("\n\n--------------------\n\n");
}

export function buildIndividualSummaryWhatsAppText(bills: Bill[], settings: AppSettings): string {
  const ordered = chronologicalBills(bills);
  return ordered.map((bill, index) => renderWhatsAppRows([
    `*Trip ${index + 1} - ${dateDisplay(bill.tripDate)}*`,
    "",
    ...singleBillWhatsAppRows(bill, settings),
  ])).join("\n\n--------------------\n\n");
}

function statementPositionLines(statement: BillingPartyStatement, symbol: string): WhatsAppRow[] {
  if (statement.summary.advanceAvailable > 0) {
    return [["Advance Available", currency(statement.summary.advanceAvailable, symbol)]];
  }
  if (statement.summary.closingOutstanding > 0) {
    return [["Outstanding", currency(statement.summary.closingOutstanding, symbol)]];
  }
  return [["Status", "Settled"]];
}

export function buildOwnerStatementText(statement: BillingPartyStatement, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  const ownerName = statement.companyName || statement.displayName || "Owner / Company";
  const transactionLines = statement.entries.length > 0
    ? statement.entries.map((entry) => {
      const amount = entry.debitAmount > 0 ? currency(entry.debitAmount, symbol) : currency(entry.creditAmount, symbol);
      return `${dateDisplay(entry.entryDate)} - ${labelizeStatementType(entry.entryType)} - ${amount} - ${balanceLabel(entry.runningBalance, symbol)}`;
    })
    : ["No transactions in this period."];

  return [
    line("Owner / Company", ownerName),
    line("Period", `${dateDisplay(statement.fromDate)} - ${dateDisplay(statement.toDate)}`),
    "",
    line("Opening Balance", balanceLabel(statement.summary.openingBalance, symbol)),
    line("Bills During Period", currency(statement.summary.totalBilled, symbol)),
    line("Payments Received", currency(statement.summary.totalReceived, symbol)),
    ...(statement.summary.advanceAvailable > 0
      ? [line("Advance Available", currency(statement.summary.advanceAvailable, symbol))]
      : statement.summary.closingOutstanding > 0
        ? [line("Outstanding", currency(statement.summary.closingOutstanding, symbol))]
        : [line("Status", "Settled")]),
    "",
    "Transactions:",
    ...transactionLines
  ].join("\n");
}

export function buildOwnerStatementWhatsAppText(statement: BillingPartyStatement, settings: AppSettings): string {
  const symbol = settings.currencySymbol;
  const ownerName = statement.companyName || statement.displayName || "Owner / Company";
  const rows: WhatsAppRow[] = [
    "*Owner / Company Statement*",
    "",
    ["Owner / Company", ownerName],
    ["Period", `${dateDisplay(statement.fromDate)} - ${dateDisplay(statement.toDate)}`],
    "",
    ["Opening Balance", balanceLabel(statement.summary.openingBalance, symbol)],
    ["Bills During Period", currency(statement.summary.totalBilled, symbol)],
    ["Payments Received", currency(statement.summary.totalReceived, symbol)],
    ...statementPositionLines(statement, symbol),
    "",
    "TRANSACTIONS",
    ""
  ];

  if (statement.entries.length === 0) {
    rows.push("No transactions in this period.");
  } else {
    statement.entries.forEach((entry) => {
      const amount = entry.debitAmount > 0 ? currency(entry.debitAmount, symbol) : currency(entry.creditAmount, symbol);
      rows.push([`${dateDisplay(entry.entryDate)} ${labelizeStatementType(entry.entryType)}`, `${amount} | ${balanceLabel(entry.runningBalance, symbol)}`]);
    });
  }

  return renderWhatsAppRows(rows);
}

function labelizeStatementType(value: string): string {
  if (value === "bill") return "Bill";
  if (value === "advance_received") return "Advance Received";
  return "Payment Received";
}

export function createWhatsAppUrl(message: string, phone?: string): string {
  const number = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
