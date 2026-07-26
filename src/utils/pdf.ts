import { jsPDF } from "jspdf";
import type { Bill, BillSummaryTotals } from "../types/bill";
import type { BillingPartyStatement } from "../types/billingParty";
import type { AppSettings } from "../types/settings";
import { chronologicalBills } from "./billOrdering";
import { balanceLabel, dateDisplay, guestDisplay, numberOrNA, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

type Row = [string, string];
const STATEMENT_PDF_COLUMNS = ["DATE", "TYPE", "CUSTOMER", "DEBIT", "CREDIT", "RUNNING BALANCE"] as const;
const STATEMENT_TABLE_X = 14;
const STATEMENT_TABLE_WIDTH = 182;
const STATEMENT_COLUMN_WIDTH = STATEMENT_TABLE_WIDTH / STATEMENT_PDF_COLUMNS.length;
const STATEMENT_CELL_PADDING = 2;

function pdfCurrency(value: number, settings: AppSettings): string {
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
  const symbol = settings.currencySymbol === "₹" ? "Rs." : settings.currencySymbol;
  return `${symbol}${formatted}`;
}

function pdfAmountOrNA(value: number, settings: AppSettings): string {
  return value > 0 ? pdfCurrency(value, settings) : "NA";
}

function billSections(bill: Bill, settings: AppSettings): Array<{ title: string; rows: Row[] }> {
  const ownerName = bill.billingPartyCompanyName || bill.billingPartyName || "Unassigned";
  return [
    {
      title: "Bill Details",
      rows: [
        ["Owner / Company", ownerName],
        ["Guest", guestDisplay(bill)],
        ["Driver", bill.driverName || "NA"],
        ["Vehicle", bill.vehicleName || "NA"],
        ["Vehicle Number", bill.vehicleNumber || "NA"],
        ["Reporting Place", bill.reportingPlace || "NA"]
      ]
    },
    {
      title: "Trip Timing",
      rows: [
        ["Trip Date", dateDisplay(bill.tripDate)],
        ["Reporting Time", timeDisplay(bill.reportingTime, settings.timeFormat)],
        ["Garage Time", timeDisplay(bill.garageTime, settings.timeFormat)],
        ["Closing Date", dateDisplay(bill.closingDate)],
        ["Closing Time", timeDisplay(bill.closingTime, settings.timeFormat)],
        ["Total Hours", formatDuration(bill.totalHours)],
        ["Extra Hours", formatDuration(bill.extraHours)]
      ]
    },
    {
      title: "Package & KM",
      rows: [
        ["Base Package", bill.basePackage || `${bill.baseHours} Hours / ${bill.baseKm} KM`],
        ["Base Amount", pdfCurrency(bill.baseAmount, settings)],
        ["Total KM", numberOrNA(bill.totalKm)],
        ["Extra KM", numberOrNA(bill.extraKm)]
      ]
    },
    {
      title: "Charges",
      rows: [
        ["Extra KM Rate", bill.extraKm > 0 ? `${pdfAmountOrNA(bill.extraKmRate, settings)} / KM` : "NA"],
        ["Extra KM Amount", pdfAmountOrNA(bill.extraKmAmount, settings)],
        ["Extra Hour Rate", bill.extraHours > 0 ? `${pdfAmountOrNA(bill.extraHourRate, settings)} / Hour` : "NA"],
        ["Extra Hour Amount", pdfAmountOrNA(bill.extraHourAmount, settings)],
        ["Airport Parking", pdfAmountOrNA(bill.airportParking, settings)],
        ["Fastag", pdfAmountOrNA(bill.fastag, settings)],
        ["Road Parking", pdfAmountOrNA(bill.roadParking, settings)]
      ]
    }
  ];
}

function addHeader(doc: jsPDF, title: string, settings: AppSettings): number {
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, 210, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(settings.businessName || "Your Business Name", 14, 13);
  doc.setFontSize(10);
  doc.text(title, 14, 23);
  doc.setTextColor(15, 23, 42);
  return 44;
}

function ensureSpace(doc: jsPDF, y: number, needed = 18): number {
  if (y + needed > 285) {
    doc.addPage();
    return 18;
  }
  return y;
}

function addSection(doc: jsPDF, title: string, rows: Row[], startY: number): number {
  let y = startY;
  y = ensureSpace(doc, y, 16 + rows.length * 8);
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(14, y - 6, 182, 10, 2, 2, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title.toUpperCase(), 18, y);
  y += 12;

  doc.setFontSize(10);
  rows.forEach(([label, value]) => {
    y = ensureSpace(doc, y, 10);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, y - 5, 182, 8, 1, 1, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.text(label, 18, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(value, 82, y, { maxWidth: 105 });
    y += 9;
  });
  return y + 4;
}

function addTotalBox(doc: jsPDF, total: string, startY: number): number {
  const y = ensureSpace(doc, startY, 24);
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(14, y, 182, 18, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CURRENT BILL AMOUNT", 20, y + 11);
  doc.setFontSize(16);
  doc.text(total, 174, y + 12, { align: "right" });
  doc.setTextColor(15, 23, 42);
  return y + 26;
}

function addBill(doc: jsPDF, bill: Bill, settings: AppSettings, startY: number): void {
  let y = startY;
  billSections(bill, settings).forEach((section) => {
    y = addSection(doc, section.title, section.rows, y);
  });
  addTotalBox(doc, pdfCurrency(bill.totalAmount, settings), y);
}

export function createSingleBillPdf(bill: Bill, settings: AppSettings): jsPDF {
  const doc = new jsPDF();
  const y = addHeader(doc, `Trip Bill | Bill Date: ${dateDisplay(bill.tripDate)}`, settings);
  addBill(doc, bill, settings, y);
  return doc;
}

export function exportSingleBillPdf(bill: Bill, settings: AppSettings): void {
  createSingleBillPdf(bill, settings).save(`tripledger-${bill.guestName || "bill"}-${bill.tripDate || "export"}.pdf`);
}

export function createCombinedSummaryPdf(totals: BillSummaryTotals, settings: AppSettings): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, "Trip Summary | Combined Bill Summary", settings);
  y = addSection(doc, "Summary Totals", [
    ["Selected Bills", String(totals.selectedBillsCount)],
    ["Total KM", numberOrNA(totals.totalKm)],
    ["Total Hours", formatDuration(totals.totalHours)],
    ["Total Base Amount", pdfCurrency(totals.totalBaseAmount, settings)],
    ["Extra KM Amount", pdfAmountOrNA(totals.totalExtraKmAmount, settings)],
    ["Extra Hour Amount", pdfAmountOrNA(totals.totalExtraHourAmount, settings)],
    ["Airport Parking", pdfAmountOrNA(totals.totalAirportParking, settings)],
    ["Fastag", pdfAmountOrNA(totals.totalFastag, settings)],
    ["Road Parking", pdfAmountOrNA(totals.totalRoadParking, settings)]
  ], y);
  addTotalBox(doc, pdfCurrency(totals.grandTotal, settings), y);
  return doc;
}

export function exportCombinedSummaryPdf(totals: BillSummaryTotals, settings: AppSettings): void {
  createCombinedSummaryPdf(totals, settings).save("tripledger-combined-summary.pdf");
}

export function createIndividualSummaryPdf(bills: Bill[], settings: AppSettings): jsPDF {
  const doc = new jsPDF();
  chronologicalBills(bills).forEach((bill, index) => {
    if (index > 0) doc.addPage();
    const y = addHeader(doc, `Trip Summary | Individual Bill ${index + 1}`, settings);
    addBill(doc, bill, settings, y);
  });
  return doc;
}

export function exportIndividualSummaryPdf(bills: Bill[], settings: AppSettings): void {
  createIndividualSummaryPdf(bills, settings).save("tripledger-individual-summary.pdf");
}

function statementTypeLabel(value: string): string {
  if (value === "bill") return "Bill";
  if (value === "advance_received") return "Advance Received";
  return "Payment Received";
}

function statementColumnX(index: number): number {
  return STATEMENT_TABLE_X + index * STATEMENT_COLUMN_WIDTH + STATEMENT_CELL_PADDING;
}

function truncatePdfText(doc: jsPDF, value: string): string {
  const maxWidth = STATEMENT_COLUMN_WIDTH - STATEMENT_CELL_PADDING * 2;
  if (doc.getTextWidth(value) <= maxWidth) return value;
  let text = value;
  while (text && doc.getTextWidth(`${text}...`) > maxWidth) text = text.slice(0, -1);
  return `${text.trimEnd()}...`;
}

function addPageNumbers(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page} of ${totalPages}`, 196, 290, { align: "right" });
  }
}

function addStatementTableHeader(doc: jsPDF, y: number): number {
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(STATEMENT_TABLE_X, y - 6, STATEMENT_TABLE_WIDTH, 10, 2, 2, "F");
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  STATEMENT_PDF_COLUMNS.forEach((label, index) => doc.text(label, statementColumnX(index), y));
  return y + 9;
}

function ensureStatementRowSpace(doc: jsPDF, y: number): number {
  if (y + 12 > 282) {
    doc.addPage();
    return addStatementTableHeader(doc, 22);
  }
  return y;
}

export function createOwnerStatementPdf(statement: BillingPartyStatement, settings: AppSettings): jsPDF {
  const doc = new jsPDF();
  const ownerName = statement.companyName || statement.displayName || "Owner / Company";
  let y = addHeader(doc, "Owner / Company Statement", settings);
  y = addSection(doc, "Statement Details", [
    ["Owner / Company", ownerName],
    ["Period", `${dateDisplay(statement.fromDate)} - ${dateDisplay(statement.toDate)}`],
    ["Generated", dateDisplay(new Date().toISOString().slice(0, 10))],
    ["Opening Balance", balanceLabel(statement.summary.openingBalance, settings.currencySymbol)],
    ["Bills During Period", pdfCurrency(statement.summary.totalBilled, settings)],
    ["Payments Received", pdfCurrency(statement.summary.totalReceived, settings)],
    ["Closing Outstanding", pdfCurrency(statement.summary.closingOutstanding, settings)],
    ["Advance Available", pdfCurrency(statement.summary.advanceAvailable, settings)]
  ], y);

  y = ensureSpace(doc, y, 18);
  doc.setTextColor(30, 58, 138);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TRANSACTIONS", 14, y);
  y = addStatementTableHeader(doc, y + 12);

  if (statement.entries.length === 0) {
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("No transactions in this period.", 16, y + 2);
  } else {
    statement.entries.forEach((entry) => {
      y = ensureStatementRowSpace(doc, y);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(STATEMENT_TABLE_X, y - 5, STATEMENT_TABLE_WIDTH, 8, 1, 1, "F");
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      [
        dateDisplay(entry.entryDate),
        statementTypeLabel(entry.entryType),
        entry.description || "NA",
        entry.debitAmount > 0 ? pdfCurrency(entry.debitAmount, settings) : "-",
        entry.creditAmount > 0 ? pdfCurrency(entry.creditAmount, settings) : "-",
        pdfCurrency(entry.runningBalance, settings)
      ].forEach((value, index) => doc.text(truncatePdfText(doc, value), statementColumnX(index), y));
      y += 9;
    });
  }

  addPageNumbers(doc);
  return doc;
}

export function exportOwnerStatementPdf(statement: BillingPartyStatement, settings: AppSettings): void {
  const ownerName = (statement.companyName || statement.displayName || "owner").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  createOwnerStatementPdf(statement, settings).save(`tripledger-owner-statement-${ownerName || "owner"}-${statement.fromDate}-${statement.toDate}.pdf`);
}
