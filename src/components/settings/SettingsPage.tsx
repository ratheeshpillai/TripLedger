import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { AppSettings, TimeFormat } from "../../types/settings";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { DecimalInput } from "../ui/DecimalInput";
import { Select } from "../ui/Select";
import { ExtraLoginVerificationSettings } from "./ExtraLoginVerificationSettings";
import { CollapsibleSection } from "../shared/CollapsibleSection";

type SettingsSectionId = "account" | "security" | "appearance" | "preferences";

type Props = {
  settings: AppSettings;
  userEmail?: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onSave: (settings: AppSettings) => Promise<AppSettings>;
};

type NumericSetting = "defaultBaseHours" | "defaultBaseKm" | "defaultBaseAmount" | "defaultExtraHourRate" | "defaultExtraKmRate";
type SettingsErrors = Partial<Record<NumericSetting, string>>;

function Field({ label, children, error, errorId }: { label: string; children: ReactNode; error?: string; errorId?: string }) {
  return <label className="field-label"><span className="leading-5 sm:min-h-10 xl:min-h-5">{label}</span>{children}{errorId && <span id={errorId} role={error ? "alert" : undefined} aria-hidden={error ? undefined : true} className="field-validation-message text-xs font-semibold text-red-600 dark:text-red-300">{error || "\u00a0"}</span>}</label>;
}

function validateSettings(settings: AppSettings): SettingsErrors {
  const errors: SettingsErrors = {};
  if (!Number.isFinite(settings.defaultBaseHours) || settings.defaultBaseHours <= 0) errors.defaultBaseHours = "Base hours must be greater than 0.";
  if (!Number.isFinite(settings.defaultBaseKm) || settings.defaultBaseKm <= 0) errors.defaultBaseKm = "Base KM must be greater than 0.";
  if (!Number.isFinite(settings.defaultBaseAmount) || settings.defaultBaseAmount <= 0) errors.defaultBaseAmount = "Base amount must be greater than 0.";
  if (!Number.isFinite(settings.defaultExtraHourRate) || settings.defaultExtraHourRate < 0) errors.defaultExtraHourRate = "Extra hour rate cannot be negative.";
  if (!Number.isFinite(settings.defaultExtraKmRate) || settings.defaultExtraKmRate < 0) errors.defaultExtraKmRate = "Extra KM rate cannot be negative.";
  return errors;
}

function SettingsSection({ id, title, openSection, setOpenSection, children }: { id: SettingsSectionId; title: ReactNode; openSection: SettingsSectionId | null; setOpenSection: (section: SettingsSectionId | null) => void; children: ReactNode }) {
  const isOpen = openSection === id;
  const contentId = `settings-${id}-content`;

  return (
    <CollapsibleSection title={title} open={isOpen} contentId={contentId} onToggle={() => setOpenSection(isOpen ? null : id)}>
      {children}
    </CollapsibleSection>
  );
}

export function SettingsPage({ settings, userEmail, isDarkMode, onToggleDarkMode, onLogout, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [savedSettings, setSavedSettings] = useState<AppSettings>(settings);
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = submitAttempted ? validateSettings(draft) : {};
  const isDirty = JSON.stringify(draft) !== JSON.stringify(savedSettings);

  useEffect(() => {
    setDraft(settings);
    setSavedSettings(settings);
    setSubmitAttempted(false);
  }, [settings]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !isDirty) return;
    setSubmitAttempted(true);
    const nextErrors = validateSettings(draft);
    if (Object.keys(nextErrors).length > 0) {
      window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    try {
      const saved = await onSave(draft);
      setDraft(saved);
      setSavedSettings(saved);
      setSubmitAttempted(false);
    } catch {
      // The page-level handler displays the existing error toast.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <SettingsSection id="account" title={<><span className="lg:hidden">User Information</span><span className="hidden lg:inline">Account Settings</span></>} openSection={openSection} setOpenSection={setOpenSection}>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#111827]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Signed-in email</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-slate-100">{userEmail || "TripLedger user"}</p>
        </div>
      </SettingsSection>

      <SettingsSection id="security" title={<><span className="lg:hidden">Settings & Security</span><span className="hidden lg:inline">Security Settings</span></>} openSection={openSection} setOpenSection={setOpenSection}>
        <ExtraLoginVerificationSettings />
      </SettingsSection>

      <SettingsSection id="appearance" title={<><span className="lg:hidden">Appearance / Dark Mode</span><span className="hidden lg:inline">Appearance Settings</span></>} openSection={openSection} setOpenSection={setOpenSection}>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#111827]">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">Color theme</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use {isDarkMode ? "light" : "dark"} mode across TripLedger.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isDarkMode}
            className="flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={onToggleDarkMode}
          >
            <span>{isDarkMode ? "Dark" : "Light"}</span>
            <span className="theme-switch" aria-hidden="true"><span className="theme-switch-thumb" /></span>
          </button>
        </div>
      </SettingsSection>

      <SettingsSection id="preferences" title={<><span className="lg:hidden">Billing Defaults</span><span className="hidden lg:inline">App Preferences</span></>} openSection={openSection} setOpenSection={setOpenSection}>
        <form ref={formRef} className="space-y-5" onSubmit={save} noValidate>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set the defaults used when starting a new bill.</p>
          <section aria-labelledby="billing-defaults-title" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40 sm:p-5">
            <h3 id="billing-defaults-title" className="text-sm font-black text-slate-900 dark:text-slate-100">Driver & Vehicle Defaults</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prefill new bills while keeping every bill editable.</p>
            <div className="mt-4 form-grid">
              <Field label="Default Driver Name"><Input maxLength={120} value={draft.defaultDriverName} onChange={(event) => setDraft({ ...draft, defaultDriverName: event.target.value })} /></Field>
              <Field label="Default Vehicle Model"><Input maxLength={120} value={draft.defaultVehicleModel} onChange={(event) => setDraft({ ...draft, defaultVehicleModel: event.target.value })} /></Field>
              <Field label="Default Vehicle Number"><Input maxLength={32} value={draft.defaultVehicleNumber} onChange={(event) => setDraft({ ...draft, defaultVehicleNumber: event.target.value })} /></Field>
            </div>
          </section>
          <section aria-labelledby="general-preferences-title" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/40 sm:p-5">
            <h3 id="general-preferences-title" className="text-sm font-black text-slate-900 dark:text-slate-100">General Billing Preferences</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set the default package, rates and business details used for new bills.</p>
            <div className="mt-4 form-grid">
              <Field label="Time Format">
                <Select value={draft.timeFormat} onChange={(e) => setDraft({ ...draft, timeFormat: e.target.value as TimeFormat })}>
                  <option value="24h">24-hour</option>
                  <option value="ampm">AM/PM</option>
                </Select>
              </Field>
              <Field label="Currency Symbol"><Input value={draft.currencySymbol} onChange={(e) => setDraft({ ...draft, currencySymbol: e.target.value })} /></Field>
              <Field label="Business Name"><Input placeholder="Business Name" value={draft.businessName} onChange={(e) => setDraft({ ...draft, businessName: e.target.value })} /></Field>
              <Field label="Default Base Package"><Input placeholder="8 Hours / 80 KM" value={draft.defaultBasePackage} onChange={(e) => setDraft({ ...draft, defaultBasePackage: e.target.value })} /></Field>
              <Field label="Default Base Hours" error={errors.defaultBaseHours} errorId="default-base-hours-error"><DecimalInput id="default-base-hours" value={draft.defaultBaseHours} aria-describedby={errors.defaultBaseHours ? "default-base-hours-error" : undefined} aria-invalid={Boolean(errors.defaultBaseHours)} onValueChange={(value) => setDraft({ ...draft, defaultBaseHours: value })} /></Field>
              <Field label="Default Base KM" error={errors.defaultBaseKm} errorId="default-base-km-error"><DecimalInput id="default-base-km" value={draft.defaultBaseKm} aria-describedby={errors.defaultBaseKm ? "default-base-km-error" : undefined} aria-invalid={Boolean(errors.defaultBaseKm)} onValueChange={(value) => setDraft({ ...draft, defaultBaseKm: value })} /></Field>
              <Field label="Default Base Amount" error={errors.defaultBaseAmount} errorId="default-base-amount-error"><DecimalInput id="default-base-amount" value={draft.defaultBaseAmount} aria-describedby={errors.defaultBaseAmount ? "default-base-amount-error" : undefined} aria-invalid={Boolean(errors.defaultBaseAmount)} onValueChange={(value) => setDraft({ ...draft, defaultBaseAmount: value })} /></Field>
              <Field label="Default Extra Hour Rate" error={errors.defaultExtraHourRate} errorId="default-extra-hour-rate-error"><DecimalInput id="default-extra-hour-rate" value={draft.defaultExtraHourRate} aria-describedby={errors.defaultExtraHourRate ? "default-extra-hour-rate-error" : undefined} aria-invalid={Boolean(errors.defaultExtraHourRate)} onValueChange={(value) => setDraft({ ...draft, defaultExtraHourRate: value })} /></Field>
              <Field label="Default Extra KM Rate" error={errors.defaultExtraKmRate} errorId="default-extra-km-rate-error"><DecimalInput id="default-extra-km-rate" value={draft.defaultExtraKmRate} aria-describedby={errors.defaultExtraKmRate ? "default-extra-km-rate-error" : undefined} aria-invalid={Boolean(errors.defaultExtraKmRate)} onValueChange={(value) => setDraft({ ...draft, defaultExtraKmRate: value })} /></Field>
            </div>
          </section>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" className="w-full sm:w-auto" disabled={saving || !isDirty}>{saving ? "Saving..." : "Save Settings"}</Button>
          </div>
        </form>
      </SettingsSection>

      <Button type="button" variant="danger" className="min-h-11 w-full lg:hidden" onClick={onLogout}>Logout</Button>
    </div>
  );
}
