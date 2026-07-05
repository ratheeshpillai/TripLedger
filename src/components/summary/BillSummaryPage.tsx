import { useMemo, useState } from "react";
import type { Bill } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { calculateCombinedSummary } from "../../utils/calculations";
import { amountOrNA, currency, dateDisplay } from "../../utils/formatters";
import { exportCombinedSummaryPdf, exportIndividualSummaryPdf } from "../../utils/pdf";
import { formatDuration } from "../../utils/timeUtils";
import { buildCombinedSummaryText, buildIndividualSummaryText, createWhatsAppUrl } from "../../utils/whatsapp";
import { EmptyState } from "../shared/EmptyState";
import { MetricCard } from "../shared/MetricCard";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";

export function BillSummaryPage({ bills, settings, onCopy }: { bills: Bill[]; settings: AppSettings; onCopy: (text: string) => void }) {
  const [mode, setMode] = useState<"combined" | "individual">("combined");
  const totals = useMemo(() => calculateCombinedSummary(bills), [bills]);

  if (bills.length === 0) {
    return <EmptyState title="No selected bills" description="Select one or more bills from the History tab to build a combined or individual summary." />;
  }

  const combinedText = buildCombinedSummaryText(totals, settings);
  const individualText = buildIndividualSummaryText(bills, settings);
  const activeText = mode === "combined" ? combinedText : individualText;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">Bill Summary</h2>
            <p className="mt-1 text-sm text-slate-500">Switch between combined totals and bill-wise details.</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "combined" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setMode("combined")}>Combined</button>
            <button className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === "individual" ? "bg-white shadow-sm" : "text-slate-500"}`} onClick={() => setMode("individual")}>Individual</button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Selected Bills" value={String(totals.selectedBillsCount)} />
            <MetricCard label="Total KM" value={`${Math.round(totals.totalKm)} KM`} />
            <MetricCard label="Total Hours" value={formatDuration(totals.totalHours)} />
            <MetricCard label="Grand Total" value={currency(totals.grandTotal, settings.currencySymbol)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => onCopy(activeText)}>Copy Summary</Button>
            <a className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white" href={createWhatsAppUrl(activeText)} target="_blank" rel="noreferrer">WhatsApp</a>
            <Button type="button" onClick={() => mode === "combined" ? exportCombinedSummaryPdf(totals, settings) : exportIndividualSummaryPdf(bills, settings)}>Export PDF</Button>
          </div>
        </CardContent>
      </Card>

      {mode === "combined" ? (
        <Card>
          <CardContent className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Base Amount" value={currency(totals.totalBaseAmount, settings.currencySymbol)} />
            <MetricCard label="Extra KM Amount" value={amountOrNA(totals.totalExtraKmAmount, settings.currencySymbol)} />
            <MetricCard label="Extra Hour Amount" value={amountOrNA(totals.totalExtraHourAmount, settings.currencySymbol)} />
            <MetricCard label="Airport Parking" value={amountOrNA(totals.totalAirportParking, settings.currencySymbol)} />
            <MetricCard label="Fastag" value={amountOrNA(totals.totalFastag, settings.currencySymbol)} />
            <MetricCard label="Road Parking" value={amountOrNA(totals.totalRoadParking, settings.currencySymbol)} />
            <MetricCard label="Pending Amount" value={amountOrNA(totals.totalPendingAmount, settings.currencySymbol)} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bills.map((bill) => (
            <Card key={bill.id} className="shadow-none">
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard label="Guest" value={bill.guestName || "NA"} />
                <MetricCard label="Driver" value={bill.driverName || "NA"} />
                <MetricCard label="Vehicle" value={`${bill.vehicleName || "NA"} ${bill.vehicleNumber || ""}`} />
                <MetricCard label="Date" value={dateDisplay(bill.tripDate)} />
                <MetricCard label="Reporting Place" value={bill.reportingPlace || "NA"} />
                <MetricCard label="Total KM" value={`${Math.round(bill.totalKm)} KM`} />
                <MetricCard label="Total Hours" value={formatDuration(bill.totalHours)} />
                <MetricCard label="Base Amount" value={currency(bill.baseAmount, settings.currencySymbol)} />
                <MetricCard label="Extra KM Amount" value={amountOrNA(bill.extraKmAmount, settings.currencySymbol)} />
                <MetricCard label="Extra Hour Amount" value={amountOrNA(bill.extraHourAmount, settings.currencySymbol)} />
                <MetricCard label="Airport Parking" value={amountOrNA(bill.airportParking, settings.currencySymbol)} />
                <MetricCard label="Total Amount" value={currency(bill.totalAmount, settings.currencySymbol)} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
