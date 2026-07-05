import { jsPDF } from "jspdf";
import type { Bill, BillSummaryTotals } from "../types/bill";
import type { AppSettings } from "../types/settings";
import { dateDisplay, guestDisplay, numberOrNA, timeDisplay } from "./formatters";
import { formatDuration } from "./timeUtils";

type Row = [string, string];

function pdfCurrency(value: number, settings: AppSettings): string {
  const formatted = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
  const symbol = settings.currencySymbol === "₹" ? "Rs." : settings.currencySymbol;
  return `${symbol}${formatted}`;
}

function pdfAmountOrNA(value: number, settings: AppSettings): string {
  return value > 0 ? pdfCurrency(value, settings) : "NA";
}

function billSections(bill: Bill, settings: AppSettings): Array<{ title: string; rows: Row[] }> {
  return [
    {
      title: "Bill Details",
      rows: [
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
        ["Road Parking", pdfAmountOrNA(bill.roadParking, settings)],
        ["Pending Amount", pdfAmountOrNA(bill.pendingAmount, settings)]
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
  addTotalBox(doc, pdfCurrency(bill.totalAmount, settings), y);
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
    ["Total Base Amount", pdfCurrency(totals.totalBaseAmount, settings)],
    ["Extra KM Amount", pdfAmountOrNA(totals.totalExtraKmAmount, settings)],
    ["Extra Hour Amount", pdfAmountOrNA(totals.totalExtraHourAmount, settings)],
    ["Airport Parking", pdfAmountOrNA(totals.totalAirportParking, settings)],
    ["Fastag", pdfAmountOrNA(totals.totalFastag, settings)],
    ["Road Parking", pdfAmountOrNA(totals.totalRoadParking, settings)],
    ["Pending Amount", pdfAmountOrNA(totals.totalPendingAmount, settings)]
  ], y);
  addTotalBox(doc, pdfCurrency(totals.grandTotal, settings), y);
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
