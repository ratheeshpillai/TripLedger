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
import { useEffect, useState, type ReactNode } from "react";

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

function NumberInput({ value, onValueChange, placeholder, readOnly = false }: { value: number; onValueChange?: (value: number) => void; placeholder?: string; readOnly?: boolean }) {
  const [inputValue, setInputValue] = useState(value === 0 ? "" : String(value));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(value === 0 ? "" : String(value));
    }
  }, [isEditing, value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      readOnly={readOnly}
      value={inputValue}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      onChange={(event) => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        onValueChange?.(num(nextValue));
      }}
    />
  );
}

export function LoggerPage({ draft, editingBillId, settings, onFieldChange, onGarageTimeChange, onSave, onReset, onCopy, onPdf }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total KM" value={draft.totalKm > 0 ? `${draft.totalKm} KM` : "NA"} />
          <MetricCard label="Extra KM" value={draft.extraKm > 0 ? `${draft.extraKm} KM` : "NA"} />
          <MetricCard label="Total Hours" value={formatDuration(draft.totalHours)} />
          <MetricCard label="Extra Hours" value={formatDuration(draft.extraHours)} />
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
                <Field label="Driver"><Input placeholder="e.g. Radha" value={draft.driverName} onChange={(e) => onFieldChange("driverName", e.target.value)} /></Field>
                <Field label="Vehicle"><Input placeholder="e.g. Innova Crysta" value={draft.vehicleName} onChange={(e) => onFieldChange("vehicleName", e.target.value)} /></Field>
                <Field label="Vehicle Number"><Input placeholder="e.g. MH03CV4312" value={draft.vehicleNumber} onChange={(e) => onFieldChange("vehicleNumber", e.target.value)} /></Field>
                <Field label="Guest"><Input placeholder="e.g. Mr. X" value={draft.guestName} onChange={(e) => onFieldChange("guestName", e.target.value)} /></Field>
                <Field label="Reporting Place"><Input placeholder="e.g. The Leela Mumbai" value={draft.reportingPlace} onChange={(e) => onFieldChange("reportingPlace", e.target.value)} /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Trip Timing</h3>
              <div className="form-grid">
                <Field label="Trip Date"><Input type="date" value={draft.tripDate} onChange={(e) => onFieldChange("tripDate", e.target.value)} /></Field>
                <Field label="Reporting Time"><Input placeholder={settings.timeFormat === "24h" ? "03:00" : "3:00 AM"} value={draft.reportingTime} onChange={(e) => onFieldChange("reportingTime", e.target.value)} /></Field>
                <Field label="Garage Time"><Input placeholder={settings.timeFormat === "24h" ? "02:00" : "2:00 AM"} value={draft.garageTime} onChange={(e) => onGarageTimeChange(e.target.value)} /></Field>
                <Field label="Closing Date"><Input type="date" value={draft.closingDate} onChange={(e) => onFieldChange("closingDate", e.target.value)} /></Field>
                <Field label="Closing Time"><Input placeholder={settings.timeFormat === "24h" ? "23:20" : "11:20 PM"} value={draft.closingTime} onChange={(e) => onFieldChange("closingTime", e.target.value)} /></Field>
                <Field label="Total Hours"><Input value={formatDuration(draft.totalHours)} readOnly /></Field>
                <Field label="Extra Hours"><Input value={formatDuration(draft.extraHours)} readOnly /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Package & KM</h3>
              <div className="form-grid">
                <Field label="Base Package"><Input placeholder="e.g. 8 Hours / 80 KM" value={draft.basePackage} onChange={(e) => onFieldChange("basePackage", e.target.value)} /></Field>
                <Field label="Base Hours"><NumberInput value={draft.baseHours} onValueChange={(value) => onFieldChange("baseHours", value)} placeholder="e.g. 8" /></Field>
                <Field label="Base KM"><NumberInput value={draft.baseKm} onValueChange={(value) => onFieldChange("baseKm", value)} placeholder="e.g. 80" /></Field>
                <Field label="Base Amount"><NumberInput value={draft.baseAmount} onValueChange={(value) => onFieldChange("baseAmount", value)} placeholder="e.g. 2800" /></Field>
                <Field label="Total KM"><NumberInput value={draft.totalKm} onValueChange={(value) => onFieldChange("totalKm", value)} placeholder="e.g. 80" /></Field>
                <Field label="Extra KM"><NumberInput value={draft.extraKm} onValueChange={(value) => onFieldChange("extraKm", value)} placeholder="Auto calculated" /></Field>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="section-title">Charges</h3>
              <div className="form-grid">
                <Field label="Extra KM Rate"><NumberInput value={draft.extraKmRate} onValueChange={(value) => onFieldChange("extraKmRate", value)} placeholder="e.g. 25" /></Field>
                <Field label="Extra KM Amount"><NumberInput value={draft.extraKmAmount} onValueChange={(value) => onFieldChange("extraKmAmount", value)} placeholder="Auto calculated" /></Field>
                <Field label="Extra Hour Rate"><NumberInput value={draft.extraHourRate} onValueChange={(value) => onFieldChange("extraHourRate", value)} placeholder="e.g. 200" /></Field>
                <Field label="Extra Hour Amount"><NumberInput value={draft.extraHourAmount} onValueChange={(value) => onFieldChange("extraHourAmount", value)} placeholder="Auto calculated" /></Field>
                <Field label="Airport Parking"><NumberInput value={draft.airportParking} onValueChange={(value) => onFieldChange("airportParking", value)} placeholder="e.g. 300" /></Field>
                <Field label="Fastag"><NumberInput value={draft.fastag} onValueChange={(value) => onFieldChange("fastag", value)} placeholder="e.g. 150" /></Field>
                <Field label="Road Parking"><NumberInput value={draft.roadParking} onValueChange={(value) => onFieldChange("roadParking", value)} placeholder="e.g. 100" /></Field>
                <Field label="Pending Bills"><NumberInput value={draft.pendingAmount} onValueChange={(value) => onFieldChange("pendingAmount", value)} placeholder="0" /></Field>
              </div>
              <Field label="Notes"><Textarea placeholder="e.g. Airport pickup and local travel" value={draft.notes} onChange={(e) => onFieldChange("notes", e.target.value)} /></Field>
              <div className="grid gap-2 pt-2 sm:flex sm:justify-end">
                <Button type="button" variant="secondary" onClick={onReset}>Reset Logger</Button>
                <Button type="button" variant="primary" onClick={() => void onSave()}>{editingBillId ? "Update Bill" : "Save Bill"}</Button>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <BillPreview draft={draft} settings={settings} onCopy={onCopy} onPdf={onPdf} />
      </div>

    </div>
  );
}
