import { useMemo, useState } from "react";
import type { Bill } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { currency, dateDisplay } from "../../utils/formatters";
import { exportSingleBillPdf } from "../../utils/pdf";
import { buildSingleBillText, createWhatsAppUrl } from "../../utils/whatsapp";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

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

export function HistoryPage({ bills, settings, selectedIds, onToggleSelected, onSelectAll, onClearSelection, onEdit, onDuplicate, onDelete, onCopy }: Props) {
  const [guestSearch, setGuestSearch] = useState("");
  const [tripDate, setTripDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    return bills
      .filter((bill) => bill.guestName.toLowerCase().includes(guestSearch.toLowerCase()))
      .filter((bill) => !tripDate || bill.tripDate === tripDate)
      .filter((bill) => !fromDate || bill.tripDate >= fromDate)
      .filter((bill) => !toDate || bill.tripDate <= toDate)
      .sort((a, b) => sort === "newest" ? b.tripDate.localeCompare(a.tripDate) : a.tripDate.localeCompare(b.tripDate));
  }, [bills, fromDate, guestSearch, sort, toDate, tripDate]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-base font-black text-slate-950">History</h2>
          <p className="mt-1 text-sm text-slate-500">Search, filter, select, edit, duplicate, or export saved bills.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <Input placeholder="Search by Guest Name" value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} />
            <Input type="date" value={tripDate} onChange={(e) => setTripDate(e.target.value)} />
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => onSelectAll(filtered.map((bill) => bill.id))}>Select All</Button>
            <Button type="button" onClick={onClearSelection}>Clear Selection</Button>
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600">{selectedIds.length} selected</span>
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
                      <h3 className="font-bold text-slate-950">{bill.guestName || "Guest"}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{dateDisplay(bill.tripDate)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{bill.driverName || "Driver"} | {bill.vehicleName || "Vehicle"} | {bill.vehicleNumber || "Vehicle Number"} | {bill.reportingPlace || "Reporting Place"}</p>
                    <p className="mt-2 text-sm font-bold text-slate-950">{currency(bill.totalAmount, settings.currencySymbol)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => onCopy(text)}>View/Copy</Button>
                    <a className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50" href={createWhatsAppUrl(text, bill.whatsappNumber)} target="_blank" rel="noreferrer">WhatsApp</a>
                    <Button type="button" onClick={() => exportSingleBillPdf(bill, settings)}>PDF</Button>
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
    </div>
  );
}
