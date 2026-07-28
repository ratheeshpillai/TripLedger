import type { Bill, BillDraft } from "../../types/bill";
import type { BillingParty } from "../../types/billingParty";
import type { AppSettings } from "../../types/settings";
import { currency } from "../../utils/formatters";
import { formatDuration } from "../../utils/timeUtils";
import { BillPreview } from "./BillPreview";
import { CollapsibleSection } from "../shared/CollapsibleSection";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Textarea } from "../ui/Textarea";
import { cn } from "../ui/cn";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { normalizeTimeInput } from "../../utils/timeUtils";
import { MobileBottomSheet, MobileSection, useIsMobile } from "../mobile/MobilePrimitives";

type Props = {
  draft: BillDraft;
  editingBillId: string | null;
  saving: boolean;
  settings: AppSettings;
  billingParties: BillingParty[];
  onQuickCreateBillingParty: (name: string) => Promise<BillingParty>;
  onFieldChange: <K extends keyof BillDraft>(field: K, value: BillDraft[K]) => void;
  onGarageTimeChange: (value: string) => void;
  onSave: () => Promise<Bill>;
  onReset: () => void;
  onCancel?: () => void;
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
  const contentId = `logger-${id}-content`;

  return (
    <CollapsibleSection title={title} open={isOpen} contentId={contentId} onToggle={() => setOpenSections(toggleSection(openSections, id))}>
      {children}
    </CollapsibleSection>
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

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function inputDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function mobileDateDisplay(value: string) {
  return value ? parseInputDate(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Select date";
}

function MobileDateInput({ value, onOpen }: { value: string; onOpen: () => void }) {
  return <button type="button" className="flex min-h-12 w-full min-w-0 max-w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-base text-slate-950 outline-none focus:border-[#1E3A8A] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-950/70" onClick={onOpen} aria-haspopup="dialog"><span>{mobileDateDisplay(value)}</span><svg className="h-5 w-5 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" /><path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>;
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

const mobileSteps = ["Owner & customer", "Driver & vehicle", "Trip timing", "Package & distance", "Charges", "Review & save"];

function useSoftwareKeyboardOpen() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const active = document.activeElement;
      const isTextEntry = active instanceof HTMLTextAreaElement || (active instanceof HTMLInputElement && active.type !== "date");
      setKeyboardOpen(isTextEntry && window.innerHeight - viewport.height > 160);
    };
    viewport.addEventListener("resize", update);
    window.addEventListener("focusin", update);
    window.addEventListener("focusout", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("focusin", update);
      window.removeEventListener("focusout", update);
    };
  }, []);

  return keyboardOpen;
}

function CreateBillStepActions({ step, canContinue, saving, keyboardOpen, onBack, onNext, onPreview, onSave }: { step: number; canContinue: boolean; saving: boolean; keyboardOpen: boolean; onBack: () => void; onNext: () => void; onPreview: () => void; onSave: () => void }) {
  const reduceMotion = useReducedMotion();
  const actionMotion = { opacity: 1, y: 0 };
  const initialMotion = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 };

  if (keyboardOpen) return null;

  if (step === mobileSteps.length - 1) {
    return (
      <motion.div initial={initialMotion} animate={actionMotion} transition={{ duration: 0.18 }} className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.05rem)] z-10 px-4 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Button type="button" variant="secondary" className="pointer-events-auto h-11 w-36 gap-2 rounded-full shadow-sm" onClick={onPreview}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="2" /></svg> Preview</Button>
          <Button type="button" variant="primary" className="pointer-events-auto h-11 w-36 gap-2 rounded-full shadow-md shadow-blue-950/15" disabled={saving || !canContinue} onClick={onSave}><span aria-hidden="true">✓</span> {saving ? "Saving..." : "Save Bill"}</Button>
        </div>
      </motion.div>
    );
  }

  if (step === 0 && !canContinue) return null;

  return <motion.div initial={initialMotion} animate={actionMotion} transition={{ duration: 0.18 }} className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.05rem)] z-10 px-4 lg:hidden">
    <div className="mx-auto flex max-w-lg items-end justify-between">
      {step > 0 ? <button type="button" className="pointer-events-auto flex w-[52px] flex-col items-center gap-1 rounded-md text-xs font-bold text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:text-blue-200 dark:focus-visible:ring-offset-slate-950" aria-label="Previous step" onClick={onBack}><span className="grid h-[52px] w-[52px] place-items-center rounded-full border border-[#1E3A8A] bg-white shadow-sm hover:bg-blue-50 active:scale-95 dark:border-blue-400 dark:bg-[#111827] dark:hover:bg-slate-800 motion-reduce:transform-none"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Back</span></button> : <span aria-hidden="true" />}
      <button type="button" className="pointer-events-auto flex w-[52px] flex-col items-center gap-1 rounded-md text-xs font-bold text-[#1E3A8A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-slate-400 dark:text-blue-200 dark:focus-visible:ring-offset-slate-950 dark:disabled:text-slate-500" aria-label="Next step" disabled={!canContinue} onClick={onNext}><span className={cn("grid h-[52px] w-[52px] place-items-center rounded-full", canContinue ? "bg-[#1E3A8A] text-white shadow-md shadow-blue-950/20 hover:bg-[#1D4ED8] active:scale-95 dark:bg-blue-600" : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 motion-reduce:transform-none")}><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>Next</span></button>
    </div>
  </motion.div>;
}

function MobileLoggerPage({ draft, editingBillId, saving, settings, billingParties, onQuickCreateBillingParty, onFieldChange, onGarageTimeChange, onSave, onReset, onCancel, onCopy, onPdf, displayDraft }: Props & { displayDraft: BillDraft }) {
  const [step, setStep] = useState(0);
  const [quickOwnerName, setQuickOwnerName] = useState("");
  const [quickOwnerBusy, setQuickOwnerBusy] = useState(false);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"tripDate" | "closingDate" | null>(null);
  const keyboardOpen = useSoftwareKeyboardOpen();
  const canContinue = step === 0 ? Boolean(draft.billingPartyId) : true;

  async function createQuickOwner() {
    const name = quickOwnerName.trim();
    if (!name) return;
    setQuickOwnerBusy(true);
    try {
      await onQuickCreateBillingParty(name);
      setQuickOwnerName("");
      setError("");
    } finally {
      setQuickOwnerBusy(false);
    }
  }

  function continueStep() {
    if (step === 0 && !draft.billingPartyId) {
      setError("Select an Owner / Company before continuing.");
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-mobile-owner]")?.focus());
      return;
    }
    setError("");
    setStep((current) => Math.min(mobileSteps.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setError("");
    try {
      await onSave();
    } catch {
      setError("Unable to save the bill. Check the details and try again.");
    }
  }

  return (
    <div className="relative min-w-0 max-w-full">
      <div className="relative z-20 space-y-4 bg-slate-50 dark:bg-[#0b1120]">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1E3A8A] dark:text-blue-200">{editingBillId ? "Editing bill" : "New bill"}</p>
            <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">Step {step + 1} of {mobileSteps.length} · {mobileSteps[step]}</p>
          </div>
          <div className="shrink-0 text-right"><p className="text-[11px] font-bold text-[#1E3A8A] dark:text-blue-200">Current total</p><p className="text-lg font-black text-[#1E3A8A] dark:text-blue-200">{currency(draft.totalAmount, settings.currencySymbol)}</p></div>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1" aria-label={`Step ${step + 1} of ${mobileSteps.length}`}>
          {mobileSteps.map((label, index) => <span key={label} className={cn("h-1.5 rounded-full", index <= step ? "bg-[#1E3A8A] dark:bg-blue-500" : "bg-blue-100 dark:bg-slate-700")}><span className="sr-only">{label}{index === step ? ", current step" : ""}</span></span>)}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

      {step === 0 && (
        <MobileSection title="Owner and customer" description="Who is this trip billed to?">
          <div className="grid gap-4">
            <Field label="Owner / Company">
              <Select data-mobile-owner aria-invalid={Boolean(error && !draft.billingPartyId)} value={draft.billingPartyId ?? ""} onChange={(event) => { onFieldChange("billingPartyId", event.target.value || undefined); setError(""); }}>
                <option value="">Select Owner / Company</option>
                {billingParties.map((party) => <option key={party.id} value={party.id}>{party.companyName || party.name}</option>)}
              </Select>
            </Field>
            {billingParties.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Recent owners</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {billingParties.slice(0, 3).map((party) => <button key={party.id} type="button" className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200" onClick={() => onFieldChange("billingPartyId", party.id)}>{party.companyName || party.name}</button>)}
                </div>
              </div>
            )}
            <Field label="Quick Add Owner / Company">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <Input placeholder="Owner / Company name" value={quickOwnerName} onChange={(event) => setQuickOwnerName(event.target.value)} />
                <Button type="button" onClick={() => void createQuickOwner()} disabled={quickOwnerBusy || !quickOwnerName.trim()}>{quickOwnerBusy ? "Adding..." : "Add"}</Button>
              </div>
            </Field>
            <Field label="Guest / Customer">
              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
                <Select value={draft.guestSalutation === "Miss" ? "Miss." : draft.guestSalutation || "Mr."} onChange={(event) => onFieldChange("guestSalutation", event.target.value as BillDraft["guestSalutation"])}>
                  <option value="Mr.">Mr.</option><option value="Mrs.">Mrs.</option><option value="Miss.">Miss.</option>
                </Select>
                <Input value={draft.guestName} onChange={(event) => onFieldChange("guestName", event.target.value)} placeholder="Customer name" />
              </div>
            </Field>
            <Field label="Reporting Place"><Input value={draft.reportingPlace} onChange={(event) => onFieldChange("reportingPlace", event.target.value)} placeholder="Pickup or reporting place" /></Field>
          </div>
        </MobileSection>
      )}

      {step === 1 && (
        <MobileSection title="Driver and vehicle">
          <div className="grid gap-4">
            <Field label="Driver"><Input value={draft.driverName} onChange={(event) => onFieldChange("driverName", event.target.value)} placeholder="Driver name" /></Field>
            <Field label="Vehicle"><Input value={draft.vehicleName} onChange={(event) => onFieldChange("vehicleName", event.target.value)} placeholder="Vehicle model" /></Field>
            <Field label="Vehicle Number"><Input value={draft.vehicleNumber} onChange={(event) => onFieldChange("vehicleNumber", event.target.value)} placeholder="Registration number" /></Field>
          </div>
        </MobileSection>
      )}

      {step === 2 && (
        <MobileSection title="Trip timing">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <Field label="Trip Date"><MobileDateInput value={draft.tripDate} onOpen={() => setActiveDateField("tripDate")} /></Field>
            <Field label="Reporting Time"><TimeInput value={draft.reportingTime} placeholder={settings.timeFormat === "24h" ? "03:00" : "3:00 AM"} onChange={(value) => onFieldChange("reportingTime", value)} /></Field>
            <Field label="Garage Time"><TimeInput value={draft.garageTime} placeholder={settings.timeFormat === "24h" ? "02:00" : "2:00 AM"} onChange={onGarageTimeChange} /></Field>
            <Field label="Closing Date"><MobileDateInput value={draft.closingDate} onOpen={() => setActiveDateField("closingDate")} /></Field>
            <Field label="Closing Time"><TimeInput value={draft.closingTime} placeholder={settings.timeFormat === "24h" ? "23:20" : "11:20 PM"} onChange={(value) => onFieldChange("closingTime", value)} /></Field>
            <Field label="Total Hours"><Input value={formatDuration(draft.totalHours)} readOnly /></Field>
            <Field label="Extra Hours"><Input value={formatDuration(draft.extraHours)} readOnly /></Field>
          </div>
        </MobileSection>
      )}

      {step === 3 && (
        <MobileSection title="Package and distance">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Base Package"><Input value={draft.basePackage} onChange={(event) => onFieldChange("basePackage", event.target.value)} placeholder="8 Hours / 80 KM" /></Field>
            <Field label="Base Hours"><NumberInput value={draft.baseHours} onValueChange={(value) => onFieldChange("baseHours", value)} /></Field>
            <Field label="Base KM"><NumberInput value={draft.baseKm} onValueChange={(value) => onFieldChange("baseKm", value)} /></Field>
            <Field label="Base Amount"><NumberInput value={draft.baseAmount} onValueChange={(value) => onFieldChange("baseAmount", value)} /></Field>
            <Field label="Total KM"><NumberInput value={draft.totalKm} onValueChange={(value) => onFieldChange("totalKm", value)} /></Field>
            <Field label="Extra KM"><NumberInput value={draft.extraKm} onValueChange={(value) => onFieldChange("extraKm", value)} /></Field>
          </div>
        </MobileSection>
      )}

      {step === 4 && (
        <MobileSection title="Charges">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Extra KM Rate"><NumberInput value={draft.extraKmRate} onValueChange={(value) => onFieldChange("extraKmRate", value)} /></Field>
            <Field label="Extra KM Amount"><NumberInput value={draft.extraKmAmount} onValueChange={(value) => onFieldChange("extraKmAmount", value)} /></Field>
            <Field label="Extra Hour Rate"><NumberInput value={draft.extraHourRate} onValueChange={(value) => onFieldChange("extraHourRate", value)} /></Field>
            <Field label="Extra Hour Amount"><NumberInput value={draft.extraHourAmount} onValueChange={(value) => onFieldChange("extraHourAmount", value)} /></Field>
            <Field label="Airport Parking"><NumberInput value={draft.airportParking} onValueChange={(value) => onFieldChange("airportParking", value)} /></Field>
            <Field label="Fastag"><NumberInput value={draft.fastag} onValueChange={(value) => onFieldChange("fastag", value)} /></Field>
            <Field label="Road Parking"><NumberInput value={draft.roadParking} onValueChange={(value) => onFieldChange("roadParking", value)} /></Field>
          </div>
        </MobileSection>
      )}

      {step === 5 && (
        <div className="space-y-4">
          <button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-bold text-[#1E3A8A] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-blue-200 dark:hover:bg-slate-800" onClick={() => setStep((current) => current - 1)}>
            <span aria-hidden="true">‹</span> Back to charges
          </button>
          <MobileSection title="Review and save">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-4 text-sm">
              <div><dt className="text-slate-500 dark:text-slate-400">Owner</dt><dd className="mt-1 truncate font-bold text-slate-950 dark:text-slate-50">{displayDraft.billingPartyCompanyName || displayDraft.billingPartyName || "Not selected"}</dd></div>
              <div><dt className="text-slate-500 dark:text-slate-400">Customer</dt><dd className="mt-1 truncate font-bold text-slate-950 dark:text-slate-50">{draft.guestName || "Not added"}</dd></div>
              <div><dt className="text-slate-500 dark:text-slate-400">Vehicle</dt><dd className="mt-1 truncate font-bold text-slate-950 dark:text-slate-50">{[draft.vehicleName, draft.vehicleNumber].filter(Boolean).join(" · ") || "Not added"}</dd></div>
              <div><dt className="text-slate-500 dark:text-slate-400">Trip</dt><dd className="mt-1 font-bold text-slate-950 dark:text-slate-50">{draft.tripDate || "No date"}</dd></div>
              <div className="col-span-2 rounded-xl bg-blue-50 p-3 dark:bg-blue-950/30"><dt className="font-bold text-[#1E3A8A] dark:text-blue-200">Trip total</dt><dd className="mt-1 text-2xl font-black text-[#1E3A8A] dark:text-blue-200">{currency(draft.totalAmount, settings.currencySymbol)}</dd></div>
            </dl>
          </MobileSection>
          <MobileSection title="Notes"><Textarea value={draft.notes} onChange={(event) => onFieldChange("notes", event.target.value)} placeholder="Optional trip notes" /></MobileSection>
          <div className="text-right"><Button type="button" variant="ghost" className="min-h-9 px-2 text-xs" onClick={onReset}>Clear form</Button></div>
        </div>
      )}

      </div>

      <CreateBillStepActions step={step} canContinue={canContinue} saving={saving} keyboardOpen={keyboardOpen} onBack={() => setStep((current) => current - 1)} onNext={continueStep} onPreview={() => setPreviewOpen(true)} onSave={() => void save()} />

      <MobileBottomSheet open={previewOpen} title="Bill Preview" description="Review before saving" onClose={() => setPreviewOpen(false)}>
        <BillPreview draft={displayDraft} settings={settings} onCopy={onCopy} onPdf={onPdf} compact />
      </MobileBottomSheet>
      <MobileBottomSheet open={activeDateField !== null} title={activeDateField === "tripDate" ? "Trip Date" : "Closing Date"} onClose={() => setActiveDateField(null)}>
        <DayPicker mode="single" selected={activeDateField ? parseInputDate(draft[activeDateField]) : undefined} defaultMonth={activeDateField ? parseInputDate(draft[activeDateField]) : new Date()} fixedWeeks showOutsideDays navLayout="around" className="tripledger-calendar mx-auto" onSelect={(date) => {
          if (!date || !activeDateField) return;
          onFieldChange(activeDateField, inputDate(date));
          setActiveDateField(null);
        }} />
      </MobileBottomSheet>
    </div>
  );
}

export function LoggerPage({ draft, editingBillId, saving, settings, billingParties, onQuickCreateBillingParty, onFieldChange, onGarageTimeChange, onSave, onReset, onCancel, onCopy, onPdf }: Props) {
  const [openSections, setOpenSections] = useState(() => {
    return ["tripDetails"];
  });
  const [quickOwnerName, setQuickOwnerName] = useState("");
  const [quickOwnerBusy, setQuickOwnerBusy] = useState(false);
  const selectedBillingParty = billingParties.find((party) => party.id === draft.billingPartyId);
  const displayDraft: BillDraft = {
    ...draft,
    billingPartyName: selectedBillingParty?.name,
    billingPartyCompanyName: selectedBillingParty?.companyName
  };
  const isMobile = useIsMobile();

  async function createQuickOwner() {
    const name = quickOwnerName.trim();
    if (!name) return;
    setQuickOwnerBusy(true);
    try {
      await onQuickCreateBillingParty(name);
      setQuickOwnerName("");
    } finally {
      setQuickOwnerBusy(false);
    }
  }

  if (isMobile) {
    return <MobileLoggerPage draft={draft} editingBillId={editingBillId} saving={saving} settings={settings} billingParties={billingParties} onQuickCreateBillingParty={onQuickCreateBillingParty} onFieldChange={onFieldChange} onGarageTimeChange={onGarageTimeChange} onSave={onSave} onReset={onReset} onCancel={onCancel} onCopy={onCopy} onPdf={onPdf} displayDraft={displayDraft} />;
  }

  return (
    <div className="grid gap-6">
      <header className="lg:hidden">
        <h1 className="text-xl font-black text-slate-950 dark:text-slate-50">Create Bill</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Enter trip and billing details</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-4">

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="hidden lg:block">
                <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{editingBillId ? "Edit Bill" : "Bill Details"}</h2>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left dark:border-blue-900 dark:bg-blue-950/30 sm:text-right">
                <p className="text-xs font-black uppercase tracking-wide text-[#1E3A8A] dark:text-blue-200">Total Amount</p>
                <p className="mt-1 text-xl font-black text-slate-950 dark:text-slate-50">{currency(draft.totalAmount, settings.currencySymbol)}</p>
              </div>
            </div>
            <details className="trip-totals rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[#0f172a]">
              <summary className="cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300">Trip totals</summary>
              <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                <span>Total KM: {draft.totalKm > 0 ? `${draft.totalKm} KM` : "NA"}</span>
                <span>Extra KM: {draft.extraKm > 0 ? `${draft.extraKm} KM` : "NA"}</span>
                <span>Total Hours: {formatDuration(draft.totalHours)}</span>
                <span>Extra Hours: {formatDuration(draft.extraHours)}</span>
              </div>
            </details>
          </CardHeader>
          <CardContent className="space-y-3">
            <AccordionSection id="tripDetails" title="TRIP DETAILS" openSections={openSections} setOpenSections={setOpenSections}>
              <div className="form-grid compact-form-grid">
                <Field label="Owner / Company">
                  <Select value={draft.billingPartyId ?? ""} onChange={(event) => onFieldChange("billingPartyId", event.target.value || undefined)}>
                    <option value="">Select Owner / Company</option>
                    {billingParties.map((party) => (
                      <option key={party.id} value={party.id}>{party.companyName || party.name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Quick Add Owner / Company">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input placeholder="Owner / Company name" value={quickOwnerName} onChange={(event) => setQuickOwnerName(event.target.value)} />
                    <Button type="button" onClick={() => void createQuickOwner()} disabled={quickOwnerBusy || !quickOwnerName.trim()}>{quickOwnerBusy ? "Adding..." : "Add"}</Button>
                  </div>
                </Field>
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
                <Field label="Trip Date"><Input type="date" value={draft.tripDate} onChange={(event) => onFieldChange("tripDate", event.target.value)} /></Field>
                <Field label="Reporting Time"><TimeInput placeholder={settings.timeFormat === "24h" ? "03:00" : "3:00 AM"} value={draft.reportingTime} onChange={(value) => onFieldChange("reportingTime", value)} /></Field>
                <Field label="Garage Time"><TimeInput placeholder={settings.timeFormat === "24h" ? "02:00" : "2:00 AM"} value={draft.garageTime} onChange={onGarageTimeChange} /></Field>
                <Field label="Closing Date"><Input type="date" value={draft.closingDate} onChange={(event) => onFieldChange("closingDate", event.target.value)} /></Field>
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
              </div>
            </AccordionSection>

            <div className="lg:hidden">
              <AccordionSection id="preview" title="Preview & Share" openSections={openSections} setOpenSections={setOpenSections}>
                <BillPreview draft={displayDraft} settings={settings} onCopy={onCopy} onPdf={onPdf} compact />
              </AccordionSection>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#111827] sm:p-5">
              <Field label="Notes"><Textarea placeholder="e.g. Airport pickup and local travel" value={draft.notes} onChange={(e) => onFieldChange("notes", e.target.value)} /></Field>
              <div className="mt-4 grid gap-2 sm:flex sm:justify-end">
                <Button type="button" variant="neutral" onClick={onReset}>Reset Logger</Button>
                <Button type="button" variant="primary" className="hidden sm:inline-flex" disabled={saving || !draft.billingPartyId} onClick={() => void onSave()}>{saving ? "Saving..." : editingBillId ? "Update Bill" : "Save Bill"}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-[#0b1120]/95 lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpenSections(["preview"])}>Preview</Button>
            <Button type="button" variant="primary" disabled={saving || !draft.billingPartyId} onClick={() => void onSave()}>{saving ? "Saving..." : editingBillId ? "Update Bill" : "Save Bill"}</Button>
          </div>
        </div>
      </div>

        <div className="hidden space-y-4 lg:block">
          <BillPreview draft={displayDraft} settings={settings} onCopy={onCopy} onPdf={onPdf} />
        </div>

      </div>
    </div>
  );
}
