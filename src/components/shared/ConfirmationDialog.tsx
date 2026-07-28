import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { useDialogFocus } from "../ui/useDialogFocus";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busyLabel?: string;
  confirmVariant?: "primary" | "danger";
  lockCancelWhileBusy?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmationDialog({ open, title, message, confirmLabel, busyLabel = "Please wait...", confirmVariant = "primary", lockCancelWhileBusy = false, onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, dialogRef, () => !(lockCancelWhileBusy && busy) && onCancel());

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4" onMouseDown={() => !(lockCancelWhileBusy && busy) && onCancel()}>
      <Card ref={dialogRef} className="w-full max-w-md focus:outline-none" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" tabIndex={-1}>
        <CardHeader className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="confirmation-dialog-title" className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{message}</p>
          </div>
          <button type="button" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Close ${title}`} disabled={busy && lockCancelWhileBusy} onClick={onCancel}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy && lockCancelWhileBusy}>Cancel</Button>
            <Button type="button" variant={confirmVariant} onClick={() => void handleConfirm()} disabled={busy}>{busy ? busyLabel : confirmLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
