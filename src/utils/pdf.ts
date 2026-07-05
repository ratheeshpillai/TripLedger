import { jsPDF } from "jspdf";
import type { Bill, BillSummaryTotals } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { amountOrNA, currency, dateDisplay, numberOrNA, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

type Row = [string, string];

function billSections(bill: Bill, settings: AppSettings): Array<{ title: string; rows: Row[] }> {
  const symbol = settings.currencySymbol;
  return [
    {
      title: "Bill Details",
      rows: [
        ["Guest", bill.guestName || "NA"],
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
        ["Base Amount", currency(bill.baseAmount, symbol)],
        ["Total KM", numberOrNA(bill.totalKm)],
        ["Extra KM", numberOrNA(bill.extraKm)],
        ["Extra KM Amount", amountOrNA(bill.extraKmAmount, symbol)]
      ]
    },
    {
      title: "Charges",
      rows: [
        ["Extra Hour Amount", amountOrNA(bill.extraHourAmount, symbol)],
        ["Airport Parking", amountOrNA(bill.airportParking, symbol)],
        ["Fastag", amountOrNA(bill.fastag, symbol)],
        ["Road Parking", amountOrNA(bill.roadParking, symbol)],
        ["Pending Amount", amountOrNA(bill.pendingAmount, symbol)]
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
    doc.text(value, 82, y);
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
  doc.text("TOTAL AMOUNT", 20, y + 11);
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
  addTotalBox(doc, currency(bill.totalAmount, settings.currencySymbol), y);
}

export function exportSingleBillPdf(bill: Bill, settings: AppSettings): void {
  const doc = new jsPDF();
  const y = addHeader(doc, `Trip Bill | Bill Date: ${dateDisplay(bill.tripDate)}`, settings);
  addBill(doc, bill, settings, y);
  doc.save(`tripledger-${bill.guestName || "bill"}-${bill.tripDate || "export"}.pdf`);
}

export function exportCombinedSummaryPdf(totals: BillSummaryTotals, settings: AppSettings): void {
  const doc = new jsPDF();
  let y = addHeader(doc, "Trip Summary | Combined Bill Summary", settings);
  y = addSection(doc, "Summary Totals", [
    ["Selected Bills", String(totals.selectedBillsCount)],
    ["Total KM", numberOrNA(totals.totalKm)],
    ["Total Hours", formatDuration(totals.totalHours)],
    ["Total Base Amount", currency(totals.totalBaseAmount, settings.currencySymbol)],
    ["Extra KM Amount", amountOrNA(totals.totalExtraKmAmount, settings.currencySymbol)],
    ["Extra Hour Amount", amountOrNA(totals.totalExtraHourAmount, settings.currencySymbol)],
    ["Airport Parking", amountOrNA(totals.totalAirportParking, settings.currencySymbol)],
    ["Fastag", amountOrNA(totals.totalFastag, settings.currencySymbol)],
    ["Road Parking", amountOrNA(totals.totalRoadParking, settings.currencySymbol)],
    ["Pending Amount", amountOrNA(totals.totalPendingAmount, settings.currencySymbol)]
  ], y);
  addTotalBox(doc, currency(totals.grandTotal, settings.currencySymbol), y);
  doc.save("tripledger-combined-summary.pdf");
}

export function exportIndividualSummaryPdf(bills: Bill[], settings: AppSettings): void {
  const doc = new jsPDF();
  bills.forEach((bill, index) => {
    if (index > 0) doc.addPage();
    const y = addHeader(doc, `Trip Summary | Individual Bill ${index + 1}`, settings);
    addBill(doc, bill, settings, y);
  });
  doc.save("tripledger-individual-summary.pdf");
}
