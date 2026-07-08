import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmationDialog({ open, title, message, confirmLabel, confirmVariant = "primary", onCancel, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel, open]);

  useEffect(() => {
    if (!open) setBusy(false);
  }, [open]);

  if (!open) return null;

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4" onMouseDown={onCancel}>
      <Card className="w-full max-w-md" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirmation-dialog-title">
        <CardHeader>
          <h2 id="confirmation-dialog-title" className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:flex sm:justify-end">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button type="button" variant={confirmVariant} onClick={() => void handleConfirm()} disabled={busy}>{busy ? "Please wait..." : confirmLabel}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
