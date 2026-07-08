import type { Bill, BillDraft } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { currency } from "../../utils/formatters";
import { formatDuration } from "../../utils/timeUtils";
import { BillPreview } from "./BillPreview";
import { MetricCard } from "../shared/MetricCard";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { useEffect, useState, type ReactNode } from "react";
import { normalizeTimeInput } from "../../utils/timeUtils";

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

function toggleSection(openSections: string[], sectionId: string): string[] {
  const isOpen = openSections.includes(sectionId);
  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

  if (isMobile) return isOpen ? [] : [sectionId];
  return isOpen ? openSections.filter((id) => id !== sectionId) : [...openSections, sectionId];
}

function AccordionSection({ id, title, openSections, setOpenSections, children }: { id: string; title: string; openSections: string[]; setOpenSections: (sections: string[]) => void; children: ReactNode }) {
  const isOpen = openSections.includes(id);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-[#111827] dark:shadow-black/20">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 sm:px-5"
        onClick={() => setOpenSections(toggleSection(openSections, id))}
      >
        <div className="min-w-0">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">{title}</h3>
        </div>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-50 text-lg font-black text-[#1E3A8A] dark:bg-slate-800 dark:text-blue-200">{isOpen ? "-" : "+"}</span>
      </button>
      {isOpen && <div className="border-t border-slate-100 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-[#0f172a]/65 sm:p-5">{children}</div>}
    </section>
  );
}

function TimeInput({ value, placeholder, onChange }: { value: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <Input
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onChange(normalizeTimeInput(event.target.value))}
    />
  );
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
  const [openSections, setOpenSections] = useState(() => {
    return ["tripDetails"];
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total KM" value={draft.totalKm > 0 ? `${draft.totalKm} KM` : "NA"} />
        <MetricCard label="Extra KM" value={draft.extraKm > 0 ? `${draft.extraKm} KM` : "NA"} />
        <MetricCard label="Total Hours" value={formatDuration(draft.totalHours)} />
        <MetricCard label="Extra Hours" value={formatDuration(draft.extraHours)} />
        <MetricCard label="Total Amount" value={currency(draft.totalAmount, settings.currencySymbol)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4">

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{editingBillId ? "Edit Bill" : "Logger"}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Save one bill, then change only a few fields to create another similar bill.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <AccordionSection id="tripDetails" title="TRIP DETAILS" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Driver"><Input placeholder="e.g. Radha" value={draft.driverName} onChange={(e) => onFieldChange("driverName", e.target.value)} /></Field>
                <Field label="Vehicle"><Input placeholder="e.g. Innova Crysta" value={draft.vehicleName} onChange={(e) => onFieldChange("vehicleName", e.target.value)} /></Field>
                <Field label="Vehicle Number"><Input placeholder="e.g. MH03CV4312" value={draft.vehicleNumber} onChange={(e) => onFieldChange("vehicleNumber", e.target.value)} /></Field>
                <Field label="Guest">
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                    <Select value={draft.guestSalutation === "Miss" ? "Miss." : draft.guestSalutation || "Mr."} onChange={(e) => onFieldChange("guestSalutation", e.target.value as BillDraft["guestSalutation"])}>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Miss.">Miss.</option>
                    </Select>
                    <Input placeholder="e.g. X" value={draft.guestName} onChange={(e) => onFieldChange("guestName", e.target.value)} />
                  </div>
                </Field>
                <Field label="Reporting Place"><Input placeholder="e.g. The Leela Mumbai" value={draft.reportingPlace} onChange={(e) => onFieldChange("reportingPlace", e.target.value)} /></Field>
              </div>
            </AccordionSection>

            <AccordionSection id="tripTiming" title="TRIP TIMING" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Trip Date"><Input type="date" value={draft.tripDate} onChange={(e) => onFieldChange("tripDate", e.target.value)} /></Field>
                <Field label="Reporting Time"><TimeInput placeholder={settings.timeFormat === "24h" ? "03:00" : "3:00 AM"} value={draft.reportingTime} onChange={(value) => onFieldChange("reportingTime", value)} /></Field>
                <Field label="Garage Time"><TimeInput placeholder={settings.timeFormat === "24h" ? "02:00" : "2:00 AM"} value={draft.garageTime} onChange={onGarageTimeChange} /></Field>
                <Field label="Closing Date"><Input type="date" value={draft.closingDate} onChange={(e) => onFieldChange("closingDate", e.target.value)} /></Field>
                <Field label="Closing Time"><TimeInput placeholder={settings.timeFormat === "24h" ? "23:20" : "11:20 PM"} value={draft.closingTime} onChange={(value) => onFieldChange("closingTime", value)} /></Field>
                <Field label="Total Hours"><Input value={formatDuration(draft.totalHours)} readOnly /></Field>
                <Field label="Extra Hours"><Input value={formatDuration(draft.extraHours)} readOnly /></Field>
              </div>
            </AccordionSection>

            <AccordionSection id="packageKm" title="PACKAGE & KM" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Base Package"><Input placeholder="e.g. 8 Hours / 80 KM" value={draft.basePackage} onChange={(e) => onFieldChange("basePackage", e.target.value)} /></Field>
                <Field label="Base Hours"><NumberInput value={draft.baseHours} onValueChange={(value) => onFieldChange("baseHours", value)} placeholder="e.g. 8" /></Field>
                <Field label="Base KM"><NumberInput value={draft.baseKm} onValueChange={(value) => onFieldChange("baseKm", value)} placeholder="e.g. 80" /></Field>
                <Field label="Base Amount"><NumberInput value={draft.baseAmount} onValueChange={(value) => onFieldChange("baseAmount", value)} placeholder="e.g. 2800" /></Field>
                <Field label="Total KM"><NumberInput value={draft.totalKm} onValueChange={(value) => onFieldChange("totalKm", value)} placeholder="e.g. 80" /></Field>
                <Field label="Extra KM"><NumberInput value={draft.extraKm} onValueChange={(value) => onFieldChange("extraKm", value)} placeholder="Auto calculated" /></Field>
              </div>
            </AccordionSection>

            <AccordionSection id="charges" title="CHARGES" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Extra KM Rate"><NumberInput value={draft.extraKmRate} onValueChange={(value) => onFieldChange("extraKmRate", value)} placeholder="e.g. 25" /></Field>
                <Field label="Extra KM Amount"><NumberInput value={draft.extraKmAmount} onValueChange={(value) => onFieldChange("extraKmAmount", value)} placeholder="Auto calculated" /></Field>
                <Field label="Extra Hour Rate"><NumberInput value={draft.extraHourRate} onValueChange={(value) => onFieldChange("extraHourRate", value)} placeholder="e.g. 200" /></Field>
                <Field label="Extra Hour Amount"><NumberInput value={draft.extraHourAmount} onValueChange={(value) => onFieldChange("extraHourAmount", value)} placeholder="Auto calculated" /></Field>
                <Field label="Airport Parking"><NumberInput value={draft.airportParking} onValueChange={(value) => onFieldChange("airportParking", value)} placeholder="e.g. 300" /></Field>
                <Field label="Fastag"><NumberInput value={draft.fastag} onValueChange={(value) => onFieldChange("fastag", value)} placeholder="e.g. 150" /></Field>
                <Field label="Road Parking"><NumberInput value={draft.roadParking} onValueChange={(value) => onFieldChange("roadParking", value)} placeholder="e.g. 100" /></Field>
                <Field label="Pending Bills"><NumberInput value={draft.pendingAmount} onValueChange={(value) => onFieldChange("pendingAmount", value)} placeholder="0" /></Field>
              </div>
            </AccordionSection>

            <AccordionSection id="payment" title="ADVANCE & BALANCE / PAYMENT SUMMARY" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Advance"><NumberInput value={draft.advanceAmount} onValueChange={(value) => onFieldChange("advanceAmount", value)} placeholder="0" /></Field>
                <Field label="Total Amount"><Input value={currency(draft.totalAmount, settings.currencySymbol)} readOnly /></Field>
                <Field label="Balance / Pending Amount"><Input value={currency(draft.pendingAmount, settings.currencySymbol)} readOnly /></Field>
              </div>
            </AccordionSection>

            <div className="lg:hidden">
              <AccordionSection id="preview" title="Preview & Share" openSections={openSections} setOpenSections={setOpenSections}>
                <BillPreview draft={draft} settings={settings} onCopy={onCopy} onPdf={onPdf} compact />
              </AccordionSection>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827] sm:p-5">
              <Field label="Notes"><Textarea placeholder="e.g. Airport pickup and local travel" value={draft.notes} onChange={(e) => onFieldChange("notes", e.target.value)} /></Field>
              <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
                <Button type="button" variant="neutral" onClick={onReset}>Reset Logger</Button>
                <Button type="button" variant="primary" onClick={() => void onSave()}>{editingBillId ? "Update Bill" : "Save Bill"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <button
          type="button"
          className="fixed bottom-4 right-4 z-30 rounded-full bg-[#1E3A8A] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/25 lg:hidden"
          onClick={() => setOpenSections(["preview"])}
        >
          Preview Bill
        </button>
      </div>

        <div className="hidden space-y-4 lg:block">
          <BillPreview draft={draft} settings={settings} onCopy={onCopy} onPdf={onPdf} />
        </div>

      </div>
    </div>
  );
}
