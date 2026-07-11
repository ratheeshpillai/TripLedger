import { useState, type FormEvent } from "react";
import { useExtraLoginVerification } from "../../hooks/useExtraLoginVerification";
import { ConfirmationDialog } from "../shared/ConfirmationDialog";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";

export function ExtraLoginVerificationSettings() {
  const verification = useExtraLoginVerification();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await verification.confirmEnrollment(code.trim());
      setCode("");
      setMessage("Extra Login Verification is now enabled.");
    } catch {
      // The hook exposes the provider's safe error message in this card.
    }
  }

  async function disableVerification() {
    try {
      await verification.disable();
      setDisableConfirmOpen(false);
      setMessage("Extra Login Verification is disabled.");
    } catch {
      // Keep the confirmation open so the user can retry or cancel.
    }
  }

  return (
    <>
      <Card id="extra-login-verification">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Extra Login Verification</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add a secure authenticator-code step after your email and password.</p>
            </div>
            {!verification.loading && (
              <span className={`rounded-full px-3 py-1 text-xs font-black ${verification.status.enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                {verification.status.enabled ? "Enabled" : "Disabled"}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {verification.loading && <p className="text-sm text-slate-600 dark:text-slate-300">Loading security settings...</p>}

          {!verification.loading && !verification.status.enabled && !verification.enrollment && (
            <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                You will scan a QR code with an authenticator app. Future logins will require its 6-digit code after your password.
              </p>
              <Button type="button" variant="primary" disabled={verification.working} onClick={() => void verification.startEnrollment()}>
                {verification.working ? "Starting setup..." : "Enable Extra Login Verification"}
              </Button>
            </>
          )}

          {verification.enrollment && (
            <div className="space-y-5">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">1. Scan this QR code in your authenticator app</p>
                <div className="mt-4 flex justify-center">
                  <img className="h-48 w-48 rounded-lg bg-white p-2" src={verification.enrollment.qrCode} alt="Authenticator setup QR code" />
                </div>
                <details className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                  <summary className="cursor-pointer font-semibold">Cannot scan? Show manual setup key</summary>
                  <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-xs text-slate-900 dark:bg-slate-900 dark:text-slate-100">{verification.enrollment.secret}</code>
                </details>
              </div>

              <form className="space-y-3" onSubmit={confirmEnrollment}>
                <label className="field-label">
                  2. Enter the 6-digit code from the app
                  <Input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="123456"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="primary" disabled={verification.working || code.length !== 6}>
                    {verification.working ? "Verifying..." : "Verify and Enable"}
                  </Button>
                  <Button type="button" variant="ghost" disabled={verification.working} onClick={() => void verification.cancelEnrollment()}>Cancel Setup</Button>
                </div>
              </form>
            </div>
          )}

          {!verification.loading && verification.status.enabled && (
            <>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Your next password login will also require a current code from your authenticator app.</p>
              <Button type="button" variant="danger" disabled={verification.working} onClick={() => setDisableConfirmOpen(true)}>Disable Extra Login Verification</Button>
            </>
          )}

          {verification.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">{verification.error}</div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">{message}</div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={disableConfirmOpen}
        title="Disable Extra Login Verification?"
        message="Future logins will only require your email and password."
        confirmLabel="Disable Verification"
        confirmVariant="danger"
        onCancel={() => setDisableConfirmOpen(false)}
        onConfirm={() => void disableVerification()}
      />
    </>
  );
}
