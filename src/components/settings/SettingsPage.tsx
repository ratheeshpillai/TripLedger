import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AppSettings, TimeFormat } from "../../types/settings";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { ExtraLoginVerificationSettings } from "./ExtraLoginVerificationSettings";
import { CollapsibleSection } from "../shared/CollapsibleSection";

type SettingsSectionId = "account" | "security" | "appearance" | "preferences";

type Props = {
  settings: AppSettings;
  userEmail?: string;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
};

function num(value: string): number {
  return Number(value || 0);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label">{label}{children}</label>;
}

function NumberInput({ value, onValueChange }: { value: number; onValueChange: (value: number) => void }) {
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
      value={inputValue}
      onFocus={() => setIsEditing(true)}
      onBlur={() => setIsEditing(false)}
      onChange={(event) => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        onValueChange(num(nextValue));
      }}
    />
  );
}

function SettingsSection({ id, title, openSection, setOpenSection, children }: { id: SettingsSectionId; title: string; openSection: SettingsSectionId | null; setOpenSection: (section: SettingsSectionId | null) => void; children: ReactNode }) {
  const isOpen = openSection === id;
  const contentId = `settings-${id}-content`;

  return (
    <CollapsibleSection title={title} open={isOpen} contentId={contentId} onToggle={() => setOpenSection(isOpen ? null : id)}>
      {children}
    </CollapsibleSection>
  );
}

export function SettingsPage({ settings, userEmail, isDarkMode, onToggleDarkMode, onSave }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>(null);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="pb-2">
        <h1 className="text-xl font-black text-slate-950 dark:text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account, security, appearance, and billing defaults.</p>
      </div>

      <SettingsSection id="account" title="Account Settings" openSection={openSection} setOpenSection={setOpenSection}>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#111827]">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Signed-in email</p>
          <p className="mt-1 break-all text-sm font-bold text-slate-900 dark:text-slate-100">{userEmail || "TripLedger user"}</p>
        </div>
      </SettingsSection>

      <SettingsSection id="security" title="Security Settings" openSection={openSection} setOpenSection={setOpenSection}>
        <ExtraLoginVerificationSettings />
      </SettingsSection>

      <SettingsSection id="appearance" title="Appearance Settings" openSection={openSection} setOpenSection={setOpenSection}>
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

      <SettingsSection id="preferences" title="App Preferences" openSection={openSection} setOpenSection={setOpenSection}>
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Set the defaults used when starting a new bill.</p>
          <div className="form-grid">
            <Field label="Time Format">
              <Select value={draft.timeFormat} onChange={(e) => setDraft({ ...draft, timeFormat: e.target.value as TimeFormat })}>
                <option value="24h">24-hour</option>
                <option value="ampm">AM/PM</option>
              </Select>
            </Field>
            <Field label="Currency Symbol"><Input value={draft.currencySymbol} onChange={(e) => setDraft({ ...draft, currencySymbol: e.target.value })} /></Field>
            <Field label="Business Name"><Input placeholder="Business Name" value={draft.businessName} onChange={(e) => setDraft({ ...draft, businessName: e.target.value })} /></Field>
            <Field label="Default Base Package"><Input placeholder="8 Hours / 80 KM" value={draft.defaultBasePackage} onChange={(e) => setDraft({ ...draft, defaultBasePackage: e.target.value })} /></Field>
            <Field label="Default Base Hours"><NumberInput value={draft.defaultBaseHours} onValueChange={(value) => setDraft({ ...draft, defaultBaseHours: value })} /></Field>
            <Field label="Default Base KM"><NumberInput value={draft.defaultBaseKm} onValueChange={(value) => setDraft({ ...draft, defaultBaseKm: value })} /></Field>
            <Field label="Default Base Amount"><NumberInput value={draft.defaultBaseAmount} onValueChange={(value) => setDraft({ ...draft, defaultBaseAmount: value })} /></Field>
            <Field label="Default Extra Hour Rate"><NumberInput value={draft.defaultExtraHourRate} onValueChange={(value) => setDraft({ ...draft, defaultExtraHourRate: value })} /></Field>
            <Field label="Default Extra KM Rate"><NumberInput value={draft.defaultExtraKmRate} onValueChange={(value) => setDraft({ ...draft, defaultExtraKmRate: value })} /></Field>
          </div>
          <Button type="button" variant="primary" onClick={() => void onSave(draft)}>Save Settings</Button>
        </div>
      </SettingsSection>
    </div>
  );
}
