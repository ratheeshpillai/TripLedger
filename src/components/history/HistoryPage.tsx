import { useMemo, useState } from "react";
import { todayInputDate } from "../../constants/defaults";
import type { Bill } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { calculateCombinedSummary } from "../../utils/calculations";
import { amountOrNA, currency, dateDisplay, guestDisplay } from "../../utils/formatters";
import { exportCombinedSummaryPdf, exportIndividualSummaryPdf, exportSingleBillPdf } from "../../utils/pdf";
import { formatDuration } from "../../utils/timeUtils";
import { buildCombinedSummaryText, buildIndividualSummaryText, buildSingleBillText, createWhatsAppUrl } from "../../utils/whatsapp";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";

type Props = {
  bills: Bill[];
  settings: AppSettings;
  selectedIds: string[];
  onToggleSelected: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelection: () => void;
  onEdit: (bill: Bill) => void;
  onDuplicate: (bill: Bill) => void;
  onDelete: (id: string) => Promise<void>;
  onCopy: (text: string) => void;
};

const outlineActionClass = "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[#1E3A8A] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] transition duration-200 hover:bg-[#1E3A8A] hover:text-white dark:border-blue-400 dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-blue-500 dark:hover:text-white";

export function HistoryPage({ bills, settings, selectedIds, onToggleSelected, onSelectAll, onClearSelection, onEdit, onDuplicate, onDelete, onCopy }: Props) {
  const today = todayInputDate();
  const [guestSearch, setGuestSearch] = useState("");
  const [tripDate, setTripDate] = useState(today);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [tripDateActive, setTripDateActive] = useState(false);
  const [fromDateActive, setFromDateActive] = useState(false);
  const [toDateActive, setToDateActive] = useState(false);
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"combined" | "individual">("combined");
  const [shareNumber, setShareNumber] = useState("");

  const filtered = useMemo(() => {
    return bills
      .filter((bill) => bill.guestName.toLowerCase().includes(guestSearch.toLowerCase()))
      .filter((bill) => !tripDateActive || bill.tripDate === tripDate)
      .filter((bill) => !fromDateActive || bill.tripDate >= fromDate)
      .filter((bill) => !toDateActive || bill.tripDate <= toDate)
      .sort((a, b) => sort === "newest" ? b.tripDate.localeCompare(a.tripDate) : a.tripDate.localeCompare(b.tripDate));
  }, [bills, fromDate, fromDateActive, guestSearch, sort, toDate, toDateActive, tripDate, tripDateActive]);

  const selectedBills = useMemo(() => bills.filter((bill) => selectedIds.includes(bill.id)), [bills, selectedIds]);
  const summaryBills = selectedBills;
  const summaryTotals = useMemo(() => calculateCombinedSummary(summaryBills), [summaryBills]);
  const previewText = previewBill ? buildSingleBillText(previewBill, settings) : "";
  const summaryText = summaryMode === "combined"
    ? buildCombinedSummaryText(summaryTotals, settings)
    : buildIndividualSummaryText(summaryBills, settings);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-base font-black text-slate-950 dark:text-slate-50">History</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Search, filter, select, edit, duplicate, or export saved bills.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <label className="field-label">Search by Guest Name<Input placeholder="e.g. Mr. X" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} /></label>
            <label className="field-label">Trip Date<Input type="date" value={tripDate} onChange={(e) => {
              setTripDate(e.target.value);
              setTripDateActive(true);
            }} /></label>
            <label className="field-label">From Date<Input type="date" value={fromDate} onChange={(e) => {
              setFromDate(e.target.value);
              setFromDateActive(true);
            }} /></label>
            <label className="field-label">To Date<Input type="date" value={toDate} onChange={(e) => {
              setToDate(e.target.value);
              setToDateActive(true);
            }} /></label>
            <label className="field-label">Sort Order
              <Select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </Select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => onSelectAll(filtered.map((bill) => bill.id))}>Select All</Button>
            <Button type="button" onClick={onClearSelection}>Clear Selection</Button>
            <Button type="button" onClick={() => {
              setGuestSearch("");
              setTripDate(todayInputDate());
              setFromDate(todayInputDate());
              setToDate(todayInputDate());
              setTripDateActive(false);
              setFromDateActive(false);
              setToDateActive(false);
              setSort("newest");
            }}>Clear Filters</Button>
            <Button type="button" variant="primary" disabled={selectedBills.length === 0} onClick={() => setSummaryOpen(true)}>Generate Bill Summary</Button>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1E3A8A] dark:bg-blue-950/50 dark:text-blue-200">{selectedIds.length} bills selected</span>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="No bills found" description="Saved bills will appear here. Use the Logger tab to create your first bill." />
      ) : (
        <div className="grid gap-3">
          {filtered.map((bill) => {
            const text = buildSingleBillText(bill, settings);
            return (
              <Card key={bill.id} className="shadow-none">
                <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
                  <input className="h-5 w-5 rounded border-slate-300" type="checkbox" checked={selectedIds.includes(bill.id)} onChange={() => onToggleSelected(bill.id)} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-950 dark:text-slate-50">{guestDisplay(bill)}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{dateDisplay(bill.tripDate)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{bill.driverName || "Driver"} | {bill.vehicleName || "Vehicle"} | {bill.vehicleNumber || "Vehicle Number"}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Route: {bill.reportingPlace || "NA"}</p>
                    <p className="mt-2 text-sm font-bold text-slate-950 dark:text-slate-50">
                      Total: {currency(bill.totalAmount, settings.currencySymbol)} | Balance: {amountOrNA(bill.pendingAmount, settings.currencySymbol)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setPreviewBill(bill)}>View / Preview</Button>
                    <Button type="button" onClick={() => onCopy(text)}>Copy Bill Text</Button>
                    <Button type="button" onClick={() => exportSingleBillPdf(bill, settings)}>Export PDF</Button>
                    <Button type="button" onClick={() => onEdit(bill)}>Edit</Button>
                    <Button type="button" onClick={() => onDuplicate(bill)}>Duplicate</Button>
                    <Button type="button" variant="danger" onClick={() => {
                      if (confirm("Delete this bill?")) void onDelete(bill.id);
                    }}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {previewBill && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Bill Preview</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review this bill before sharing, copying, editing, or exporting.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setPreviewBill(null)}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea value={previewText} readOnly className="min-h-[420px] font-mono text-xs leading-5" />
              <label className="field-label">WhatsApp Number<Input placeholder="e.g. 919876543210" inputMode="tel" value={shareNumber} onChange={(event) => setShareNumber(event.target.value)} /></label>
              <div className="flex flex-wrap gap-2">
                <a className={outlineActionClass} href={createWhatsAppUrl(previewText, shareNumber)} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                <Button type="button" onClick={() => onCopy(previewText)}>Copy Bill Text</Button>
                <Button type="button" onClick={() => exportSingleBillPdf(previewBill, settings)}>Export PDF</Button>
                <Button type="button" onClick={() => {
                  onEdit(previewBill);
                  setPreviewBill(null);
                }}>Edit Bill</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {summaryOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Bill Summary Preview</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Generated from selected bills in History. Switch modes before sharing or exporting.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setSummaryOpen(false)}>Close</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
                <button className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition duration-200 ${summaryMode === "combined" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800"}`} onClick={() => setSummaryMode("combined")}>Combined Summary</button>
                <button className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition duration-200 ${summaryMode === "individual" ? "bg-[#1E3A8A] text-white" : "text-[#1E3A8A] hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-slate-800"}`} onClick={() => setSummaryMode("individual")}>Individual Summary</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Bills</p><p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{summaryTotals.selectedBillsCount}</p></CardContent></Card>
                <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Total Hours</p><p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{formatDuration(summaryTotals.totalHours)}</p></CardContent></Card>
                <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Extra Charges</p><p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{amountOrNA(summaryTotals.totalExtraHourAmount + summaryTotals.totalExtraKmAmount, settings.currencySymbol)}</p></CardContent></Card>
                <Card className="shadow-none"><CardContent className="p-4"><p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Grand Total</p><p className="mt-2 text-lg font-bold text-slate-950 dark:text-slate-50">{currency(summaryTotals.grandTotal, settings.currencySymbol)}</p></CardContent></Card>
              </div>
              <Textarea value={summaryText} readOnly className="min-h-[360px] font-mono text-xs leading-5" />
              <label className="field-label">WhatsApp Number<Input placeholder="e.g. 919876543210" inputMode="tel" value={shareNumber} onChange={(event) => setShareNumber(event.target.value)} /></label>
              <div className="flex flex-wrap gap-2">
                <a className={outlineActionClass} href={createWhatsAppUrl(summaryText, shareNumber)} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                <Button type="button" onClick={() => onCopy(summaryText)}>Copy Bill Text</Button>
                <Button type="button" onClick={() => summaryMode === "combined" ? exportCombinedSummaryPdf(summaryTotals, settings) : exportIndividualSummaryPdf(summaryBills, settings)}>Export PDF</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
