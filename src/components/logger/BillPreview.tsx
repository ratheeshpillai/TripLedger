import type { Bill, BillDraft } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { buildSingleBillText, createWhatsAppUrl } from "../../utils/whatsapp";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { useState } from "react";

const outlineActionClass = "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-[#1E3A8A] bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] transition duration-200 hover:bg-[#1E3A8A] hover:text-white";

function previewBill(draft: BillDraft): Bill {
  const now = new Date().toISOString();
  return { ...draft, id: "preview", createdAt: now, updatedAt: now };
}

export function BillPreview({ draft, settings, onCopy, onPdf }: { draft: BillDraft; settings: AppSettings; onCopy: (text: string) => void; onPdf: () => void }) {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const text = buildSingleBillText(previewBill(draft), settings);
  return (
    <Card className="lg:sticky lg:top-28">
      <CardHeader>
        <h2 className="text-base font-black text-slate-950">Bill Preview</h2>
        <p className="mt-1 text-sm text-slate-500">This same format is used for WhatsApp and PDF exports.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <Textarea value={text} readOnly className="min-h-[360px] max-h-[460px] overflow-auto font-mono text-xs leading-5" />
        <label className="field-label">
          WhatsApp Number
          <Input placeholder="e.g. 919876543210" inputMode="tel" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} />
        </label>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Button type="button" onClick={() => onCopy(text)}>Copy Bill Text</Button>
          <a className={outlineActionClass} href={createWhatsAppUrl(text, whatsappNumber)} target="_blank" rel="noreferrer">
            Share on WhatsApp
          </a>
          <Button type="button" onClick={onPdf}>Export PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}
