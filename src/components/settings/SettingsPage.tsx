import { useState } from "react";
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

export function SettingsPage({ settings, onSave }: { settings: AppSettings; onSave: (settings: AppSettings) => Promise<void> }) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-black text-slate-950">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Defaults live behind the settings service, ready for cloud sync later.</p>
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
          <Field label="Default Base Hours"><Input type="number" value={draft.defaultBaseHours} onChange={(e) => setDraft({ ...draft, defaultBaseHours: num(e.target.value) })} /></Field>
          <Field label="Default Base KM"><Input type="number" value={draft.defaultBaseKm} onChange={(e) => setDraft({ ...draft, defaultBaseKm: num(e.target.value) })} /></Field>
          <Field label="Default Base Amount"><Input type="number" value={draft.defaultBaseAmount} onChange={(e) => setDraft({ ...draft, defaultBaseAmount: num(e.target.value) })} /></Field>
          <Field label="Default Extra Hour Rate"><Input type="number" value={draft.defaultExtraHourRate} onChange={(e) => setDraft({ ...draft, defaultExtraHourRate: num(e.target.value) })} /></Field>
          <Field label="Default Extra KM Rate"><Input type="number" value={draft.defaultExtraKmRate} onChange={(e) => setDraft({ ...draft, defaultExtraKmRate: num(e.target.value) })} /></Field>
        </div>
        <Button type="button" variant="primary" onClick={() => void onSave(draft)}>Save Settings</Button>
      </CardContent>
    </Card>
  );
}
