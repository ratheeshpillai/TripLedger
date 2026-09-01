import { motion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { getSafeErrorMessage, logDevError } from "../../utils/errors";

type RecoveryState = "checking" | "ready" | "invalid" | "updating" | "success" | "error";

type Props = {
  recoveryReady: boolean;
  onCheckRecovery: () => Promise<boolean>;
  onUpdatePassword: (password: string) => Promise<void>;
  onBackToLogin: () => void;
  onRequestNewLink: () => void;
};

const PASSWORD_MIN_LENGTH = 6;

export function ResetPasswordPage({ recoveryReady, onCheckRecovery, onUpdatePassword, onBackToLogin, onRequestNewLink }: Props) {
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      setState("checking");
      try {
        const ready = await onCheckRecovery();
        if (active) setState(ready ? "ready" : "invalid");
      } catch (checkError) {
        logDevError("Password recovery check failed", checkError);
        if (active) setState("invalid");
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [recoveryReady]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "updating") return;
    if (!password || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setState("updating");
    setError("");
    try {
      await onUpdatePassword(password);
      setPassword("");
      setConfirmPassword("");
      setState("success");
    } catch (updateError) {
      logDevError("Password update failed", updateError);
      setError(getSafeErrorMessage(updateError, "auth.passwordUpdate"));
      setState("error");
    }
  }

  return (
    <motion.main
      className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10 dark:bg-[#0b1120]"
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">TripLoggy</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">Fleet & Billing Platform</h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
              {state === "success" ? "Password updated successfully" : "Create a new password"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {state === "invalid"
                ? "This password-reset link is invalid or has expired."
                : state === "success"
                  ? "Please sign in again using your new password."
                  : "Choose a new password for your TripLoggy account."}
            </p>
          </CardHeader>
          <CardContent>
            {state === "checking" ? (
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-200">Checking reset link...</div>
            ) : state === "invalid" ? (
              <div className="space-y-3">
                <Button className="w-full" type="button" variant="primary" onClick={onRequestNewLink}>Request a New Reset Link</Button>
                <Button className="w-full" type="button" variant="secondary" onClick={onBackToLogin}>Back to Login</Button>
              </div>
            ) : state === "success" ? (
              <Button className="w-full" type="button" variant="primary" onClick={onBackToLogin}>Continue to Login</Button>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="field-label">
                  New password
                  <div className="flex gap-2">
                    <Input autoComplete="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} />
                    <Button type="button" variant="secondary" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</Button>
                  </div>
                </label>
                <label className="field-label">
                  Confirm new password
                  <div className="flex gap-2">
                    <Input autoComplete="new-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} />
                    <Button type="button" variant="secondary" onClick={() => setShowConfirmPassword((value) => !value)}>{showConfirmPassword ? "Hide" : "Show"}</Button>
                  </div>
                </label>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">{error}</div>
                )}
                <Button className="w-full" type="submit" variant="primary" disabled={state === "updating"}>
                  {state === "updating" ? "Updating..." : "Update Password"}
                </Button>
                <Button className="w-full" type="button" variant="secondary" onClick={onRequestNewLink}>Request a New Reset Link</Button>
                <Button className="w-full" type="button" variant="ghost" onClick={onBackToLogin}>Back to Login</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
