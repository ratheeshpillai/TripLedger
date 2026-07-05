import type { Bill, BillDraft } from "../../types/bill";
import type { AppSettings } from "../../types/settings";
import { buildSingleBillText, createWhatsAppUrl } from "../../utils/whatsapp";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Textarea } from "../ui/Textarea";

function previewBill(draft: BillDraft): Bill {
  const now = new Date().toISOString();
  return { ...draft, id: "preview", createdAt: now, updatedAt: now };
}

export function BillPreview({ draft, settings, onCopy, onPdf }: { draft: BillDraft; settings: AppSettings; onCopy: (text: string) => void; onPdf: () => void }) {
  const text = buildSingleBillText(previewBill(draft), settings);
  return (
    <Card className="lg:sticky lg:top-36">
      <CardHeader>
        <h2 className="text-base font-black text-slate-950">Bill Preview</h2>
        <p className="mt-1 text-sm text-slate-500">This same format is used for WhatsApp and PDF exports.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea value={text} readOnly className="min-h-[420px] font-mono text-xs leading-5" />
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
          <Button type="button" onClick={() => onCopy(text)}>Copy Bill</Button>
          <a className="inline-flex min-h-10 items-center justify-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" href={createWhatsAppUrl(text, draft.whatsappNumber)} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <Button type="button" onClick={onPdf}>Export PDF</Button>
        </div>
      </CardContent>
    </Card>
  );
}
