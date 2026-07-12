import { useEffect, useRef, useState } from "react";
import type { AuthSessionState } from "../../types/auth";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { getSafeErrorMessage, logDevError } from "../../utils/errors";

type CallbackState = "verifying" | "success" | "error";

type Props = {
  onVerify: (callbackUrl: string) => Promise<AuthSessionState>;
  onContinue: () => void;
  onReturnToLogin: () => Promise<void>;
};

export function AuthCallbackPage({ onVerify, onContinue, onReturnToLogin }: Props) {
  const verifyRef = useRef(onVerify);
  const [state, setState] = useState<CallbackState>("verifying");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function verifyEmail() {
      try {
        await verifyRef.current(window.location.href);
        if (active) setState("success");
      } catch (verificationError) {
        if (!active) return;
        logDevError("Email verification failed", verificationError);
        setError(getSafeErrorMessage(verificationError, "auth.verification"));
        setState("error");
      }
    }

    void verifyEmail();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-[#0b1120]">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A] dark:text-blue-300">TripLedger</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">Email Verification</h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
              {state === "verifying" && "Verifying your email..."}
              {state === "success" && "Email verified"}
              {state === "error" && "Verification failed"}
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === "verifying" && (
              <p className="text-sm text-slate-600 dark:text-slate-300">Please wait while TripLedger confirms your verification link.</p>
            )}

            {state === "success" && (
              <>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Your email has been verified successfully. You can now continue to TripLedger.
                </div>
                <Button className="w-full" type="button" variant="primary" onClick={onContinue}>Continue to TripLedger</Button>
              </>
            )}

            {state === "error" && (
              <>
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                  {error || "This verification link is invalid or has expired."}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">Return to login and create the account again if you need a new verification email.</p>
                <Button className="w-full" type="button" variant="secondary" onClick={() => void onReturnToLogin()}>Return to Login</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
