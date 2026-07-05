import type { Bill, BillDraft } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { currency } from "../../utils/formatters";
import { formatDuration } from "../../utils/timeUtils";
import { BillPreview } from "./BillPreview";
import { MetricCard } from "../shared/MetricCard";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import type { ReactNode } from "react";

type Props = {
  draft: BillDraft;
  editingBillId: string | null;
  settings: AppSettings;
  onFieldChange: <K extends keyof BillDraft>(field: K, value: BillDraft[K]) => void;
  onGarageTimeChange: (value: string) => void;
  onSave: () => Promise<Bill>;
  onReset: () => void;
  onCopy: (text: string) => void;
  onPdf: () => void;
};

function num(value: string): number {
  return Number(value || 0);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label">{label}{children}</label>;
}

export function LoggerPage({ draft, editingBillId, settings, onFieldChange, onGarageTimeChange, onSave, onReset, onCopy, onPdf }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total Hours" value={formatDuration(draft.totalHours)} />
          <MetricCard label="Extra Hours" value={formatDuration(draft.extraHours)} />
          <MetricCard label="Extra KM" value={draft.extraKm > 0 ? `${draft.extraKm} KM` : "NA"} />
          <MetricCard label="Total Amount" value={currency(draft.totalAmount, settings.currencySymbol)} />
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950">{editingBillId ? "Edit Bill" : "Logger"}</h2>
            <p className="mt-1 text-sm text-slate-500">Save one bill, then change only a few fields to create another similar bill.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <h3 className="section-title">Trip Details</h3>
              <div className="form-grid">
                <Field label="Driver"><Input placeholder="Driver Name" value={draft.driverName} onChange={(e) => onFieldChange("driverName", e.target.value)} /></Field>
                <Field label="Vehicle"><Input placeholder="Vehicle Name" value={draft.vehicleName} onChange={(e) => onFieldChange("vehicleName", e.target.value)} /></Field>
                <Field label="Vehicle Number"><Input placeholder="Vehicle Number" value={draft.vehicleNumber} onChange={(e) => onFieldChange("vehicleNumber", e.target.value)} /></Field>
                <Field label="Guest"><Input placeholder="Guest Name" value={draft.guestName} onChange={(e) => onFieldChange("guestName", e.target.value)} /></Field>
                <Field label="Reporting Place"><Input placeholder="Reporting Place" value={draft.reportingPlace} onChange={(e) => onFieldChange("reportingPlace", e.target.value)} /></Field>
                <Field label="WhatsApp Number"><Input placeholder="WhatsApp Number" inputMode="tel" value={draft.whatsappNumber} onChange={(e) => onFieldChange("whatsappNumber", e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Trip Timing</h3>
              <div className="form-grid">
                <Field label="Trip Date"><Input type="date" value={draft.tripDate} onChange={(e) => onFieldChange("tripDate", e.target.value)} /></Field>
                <Field label="Reporting Time"><Input placeholder={settings.timeFormat === "24h" ? "03:00" : "3:00 AM"} value={draft.reportingTime} onChange={(e) => onFieldChange("reportingTime", e.target.value)} /></Field>
                <Field label="Garage Time"><Input placeholder="Garage Time" value={draft.garageTime} onChange={(e) => onGarageTimeChange(e.target.value)} /></Field>
                <Field label="Closing Date"><Input type="date" value={draft.closingDate} onChange={(e) => onFieldChange("closingDate", e.target.value)} /></Field>
                <Field label="Closing Time"><Input placeholder={settings.timeFormat === "24h" ? "23:20" : "11:20 PM"} value={draft.closingTime} onChange={(e) => onFieldChange("closingTime", e.target.value)} /></Field>
                <Field label="Total Hours"><Input value={formatDuration(draft.totalHours)} readOnly /></Field>
                <Field label="Extra Hours"><Input value={formatDuration(draft.extraHours)} readOnly /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Package & KM</h3>
              <div className="form-grid">
                <Field label="Base Package"><Input placeholder="8 Hours / 80 KM" value={draft.basePackage} onChange={(e) => onFieldChange("basePackage", e.target.value)} /></Field>
                <Field label="Base Hours"><Input type="number" value={draft.baseHours} onChange={(e) => onFieldChange("baseHours", num(e.target.value))} /></Field>
                <Field label="Base KM"><Input type="number" value={draft.baseKm} onChange={(e) => onFieldChange("baseKm", num(e.target.value))} /></Field>
                <Field label="Base Amount"><Input type="number" value={draft.baseAmount} onChange={(e) => onFieldChange("baseAmount", num(e.target.value))} /></Field>
                <Field label="Total KM"><Input type="number" value={draft.totalKm} onChange={(e) => onFieldChange("totalKm", num(e.target.value))} /></Field>
                <Field label="Extra KM"><Input type="number" value={draft.extraKm} onChange={(e) => onFieldChange("extraKm", num(e.target.value))} /></Field>
                <Field label="Extra KM Rate"><Input type="number" value={draft.extraKmRate} onChange={(e) => onFieldChange("extraKmRate", num(e.target.value))} /></Field>
                <Field label="Extra KM Amount"><Input type="number" value={draft.extraKmAmount} onChange={(e) => onFieldChange("extraKmAmount", num(e.target.value))} /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Charges</h3>
              <div className="form-grid">
                <Field label="Extra Hour Rate"><Input type="number" value={draft.extraHourRate} onChange={(e) => onFieldChange("extraHourRate", num(e.target.value))} /></Field>
                <Field label="Extra Hour Amount"><Input type="number" value={draft.extraHourAmount} onChange={(e) => onFieldChange("extraHourAmount", num(e.target.value))} /></Field>
                <Field label="Airport Parking"><Input type="number" placeholder="0" value={draft.airportParking} onChange={(e) => onFieldChange("airportParking", num(e.target.value))} /></Field>
                <Field label="Fastag"><Input type="number" placeholder="0" value={draft.fastag} onChange={(e) => onFieldChange("fastag", num(e.target.value))} /></Field>
                <Field label="Road Parking"><Input type="number" placeholder="0" value={draft.roadParking} onChange={(e) => onFieldChange("roadParking", num(e.target.value))} /></Field>
                <Field label="Pending Bills"><Input type="number" placeholder="0" value={draft.pendingAmount} onChange={(e) => onFieldChange("pendingAmount", num(e.target.value))} /></Field>
              </div>
              <Field label="Notes"><Textarea placeholder="Notes" value={draft.notes} onChange={(e) => onFieldChange("notes", e.target.value)} /></Field>
            </section>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <BillPreview draft={draft} settings={settings} onCopy={onCopy} onPdf={onPdf} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
          <Button type="button" variant="secondary" onClick={onReset}>Reset Logger</Button>
          <Button type="button" variant="primary" onClick={() => void onSave()}>{editingBillId ? "Update Bill" : "Save Bill"}</Button>
        </div>
      </div>
      <div className="hidden lg:fixed lg:bottom-5 lg:right-6 lg:z-30 lg:flex lg:gap-2">
        <Button type="button" variant="secondary" onClick={onReset}>Reset Logger</Button>
        <Button type="button" variant="primary" onClick={() => void onSave()}>{editingBillId ? "Update Bill" : "Save Bill"}</Button>
      </div>
    </div>
  );
}
