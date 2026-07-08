import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AppSettings, TimeFormat } from "../../types/settings";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";

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

export function SettingsPage({ settings, onSave }: { settings: AppSettings; onSave: (settings: AppSettings) => Promise<void> }) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Settings</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Defaults live behind the settings service, ready for cloud sync later.</p>
      </CardHeader>
      <CardContent className="space-y-6">
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
      </CardContent>
    </Card>
  );
}
