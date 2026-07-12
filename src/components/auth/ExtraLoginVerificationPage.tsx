import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { getSafeErrorMessage, logDevError } from "../../utils/errors";

type Props = {
  email?: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => Promise<void>;
};

export function ExtraLoginVerificationPage({ email, onVerify, onCancel }: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await onVerify(code.trim());
    } catch (verificationError) {
      logDevError("Extra login verification failed", verificationError);
      setError(getSafeErrorMessage(verificationError, "auth.mfa"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-[#0b1120]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">TripLedger</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">Extra Login Verification</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Enter the current code from your authenticator app.</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">Verify your login</h2>
            {email && <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">Signed in as {email}</p>}
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="field-label">
                6-digit verification code
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

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">{error}</div>
              )}

              <Button className="w-full" type="submit" variant="primary" disabled={submitting || code.length !== 6}>
                {submitting ? "Verifying..." : "Verify and Continue"}
              </Button>
              <Button className="w-full" type="button" variant="ghost" disabled={submitting} onClick={() => void onCancel()}>Cancel and Logout</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
