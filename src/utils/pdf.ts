import { jsPDF } from "jspdf";
import type { Bill, BillSummaryTotals } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { amountOrNA, currency, dateDisplay, numberOrNA, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

type Row = [string, string];

function rowsForBill(bill: Bill, settings: AppSettings): Row[] {
  const symbol = settings.currencySymbol;
  return [
    ["Guest", bill.guestName || "NA"],
    ["Driver", bill.driverName || "NA"],
    ["Vehicle", bill.vehicleName || "NA"],
    ["Vehicle Number", bill.vehicleNumber || "NA"],
    ["Reporting Place", bill.reportingPlace || "NA"],
    ["Trip Date", dateDisplay(bill.tripDate)],
    ["Reporting Time", timeDisplay(bill.reportingTime, settings.timeFormat)],
    ["Garage Time", timeDisplay(bill.garageTime, settings.timeFormat)],
    ["Closing Date", dateDisplay(bill.closingDate)],
    ["Closing Time", timeDisplay(bill.closingTime, settings.timeFormat)],
    ["Total Hours", formatDuration(bill.totalHours)],
    ["Base Package", bill.basePackage || `${bill.baseHours} Hours / ${bill.baseKm} KM`],
    ["Base Amount", currency(bill.baseAmount, symbol)],
    ["Total KM", numberOrNA(bill.totalKm)],
    ["Extra KM", numberOrNA(bill.extraKm)],
    ["Extra KM Amount", amountOrNA(bill.extraKmAmount, symbol)],
    ["Extra Hour Amount", amountOrNA(bill.extraHourAmount, symbol)],
    ["Airport Parking", amountOrNA(bill.airportParking, symbol)],
    ["Fastag", amountOrNA(bill.fastag, symbol)],
    ["Road Parking", amountOrNA(bill.roadParking, symbol)],
    ["Pending Amount", amountOrNA(bill.pendingAmount, symbol)],
    ["Total Amount", currency(bill.totalAmount, symbol)]
  ];
}

function addHeader(doc: jsPDF, title: string, settings: AppSettings): number {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(settings.businessName || "Your Business Name", 14, 12);
  doc.setFontSize(10);
  doc.text(title, 14, 20);
  doc.setTextColor(15, 23, 42);
  return 40;
}

function addRows(doc: jsPDF, rows: Row[], startY: number): number {
  let y = startY;
  doc.setFontSize(10);
  rows.forEach(([label, value], index) => {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(index % 2 === 0 ? 248 : 255, 250, 252);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text(label, 18, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 82, y);
    y += 9;
  });
  return y;
}

export function exportSingleBillPdf(bill: Bill, settings: AppSettings): void {
  const doc = new jsPDF();
  const y = addHeader(doc, `Bill Date: ${dateDisplay(bill.tripDate)}`, settings);
  addRows(doc, rowsForBill(bill, settings), y);
  doc.save(`tripledger-${bill.guestName || "bill"}-${bill.tripDate || "export"}.pdf`);
}

export function exportCombinedSummaryPdf(totals: BillSummaryTotals, settings: AppSettings): void {
  const doc = new jsPDF();
  const y = addHeader(doc, "Combined Bill Summary", settings);
  addRows(doc, [
    ["Selected Bills", String(totals.selectedBillsCount)],
    ["Total KM", numberOrNA(totals.totalKm)],
    ["Total Hours", formatDuration(totals.totalHours)],
    ["Total Base Amount", currency(totals.totalBaseAmount, settings.currencySymbol)],
    ["Extra KM Amount", amountOrNA(totals.totalExtraKmAmount, settings.currencySymbol)],
    ["Extra Hour Amount", amountOrNA(totals.totalExtraHourAmount, settings.currencySymbol)],
    ["Airport Parking", amountOrNA(totals.totalAirportParking, settings.currencySymbol)],
    ["Fastag", amountOrNA(totals.totalFastag, settings.currencySymbol)],
    ["Road Parking", amountOrNA(totals.totalRoadParking, settings.currencySymbol)],
    ["Pending Amount", amountOrNA(totals.totalPendingAmount, settings.currencySymbol)],
    ["Grand Total", currency(totals.grandTotal, settings.currencySymbol)]
  ], y);
  doc.save("tripledger-combined-summary.pdf");
}

export function exportIndividualSummaryPdf(bills: Bill[], settings: AppSettings): void {
  const doc = new jsPDF();
  bills.forEach((bill, index) => {
    if (index > 0) doc.addPage();
    const y = addHeader(doc, `Individual Bill ${index + 1}`, settings);
    addRows(doc, rowsForBill(bill, settings), y);
  });
  doc.save("tripledger-individual-summary.pdf");
}
