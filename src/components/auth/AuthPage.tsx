import { motion } from "framer-motion";
import { useEffect, useId, useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { getSafeErrorMessage, logDevError } from "../../utils/errors";
import type { OrganizationBusinessType } from "../../types/organization";

type AuthMode = "login" | "signup" | "forgot";

type Props = {
  authError?: string;
  initialMode?: AuthMode;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string, businessType: OrganizationBusinessType) => Promise<void>;
  onResendActivation: (email: string) => Promise<void>;
  onPasswordReset: (email: string) => Promise<void>;
  onRouteChange?: (path: string) => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 6;
const RESEND_COOLDOWN_MS = 30000;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function emailValidationMessage(value: string): string {
  const email = normalizeEmail(value);
  if (!email) return "Email address is required.";
  return EMAIL_PATTERN.test(email) ? "" : "Enter a valid email address.";
}

export function AuthPage({ authError, initialMode = "login", onLogin, onSignup, onResendActivation, onPasswordReset, onRouteChange }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessType, setBusinessType] = useState<OrganizationBusinessType>("individual_driver");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [resendCoolingDown, setResendCoolingDown] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const emailErrorId = useId();

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const canResend = !resendCoolingDown;
  const displayEmail = submittedEmail || normalizeEmail(email);
  const emailError = emailValidationMessage(email);
  const visibleEmailError = emailTouched || submitAttempted ? emailError : "";
  const loginNeedsVerification = (error || authError) === "Please verify your email before signing in.";

  function go(nextMode: AuthMode) {
    setMode(nextMode);
    setSignupComplete(false);
    setResetSent(false);
    setError("");
    setMessage("");
    setEmailTouched(false);
    setSubmitAttempted(false);
    if (nextMode === "login") onRouteChange?.("/");
    if (nextMode === "forgot") onRouteChange?.("/forgot-password");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitAttempted(true);
    const nextEmail = normalizeEmail(email);
    if (emailError) {
      setError("");
      return;
    }
    if (!isForgot && password.length < PASSWORD_MIN_LENGTH) {
      setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        await onLogin(nextEmail, password);
      } else if (isSignup) {
        await onSignup(nextEmail, password, businessType);
        setSubmittedEmail(nextEmail);
        setPassword("");
        setSignupComplete(true);
      } else {
        await onPasswordReset(nextEmail);
        setSubmittedEmail(nextEmail);
        setResetSent(true);
      }
    } catch (submitError) {
      logDevError(isLogin ? "Login failed" : isSignup ? "Signup failed" : "Password reset request failed", submitError);
      setError(getSafeErrorMessage(submitError, isLogin ? "auth.login" : isSignup ? "auth.signup" : "auth.passwordReset"));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendActivation() {
    if (resending || !canResend) return;
    const nextEmail = displayEmail;
    const validationError = emailValidationMessage(nextEmail);
    if (validationError) {
      setEmailTouched(true);
      setSubmitAttempted(true);
      setError(submittedEmail ? validationError : "");
      return;
    }
    setResending(true);
    setError("");
    try {
      await onResendActivation(nextEmail);
      setSubmittedEmail(nextEmail);
      setMessage("If this email has a pending registration, a new activation link has been sent.");
      setResendCoolingDown(true);
      window.setTimeout(() => setResendCoolingDown(false), RESEND_COOLDOWN_MS);
    } catch (resendError) {
      logDevError("Activation resend failed", resendError);
      setError(getSafeErrorMessage(resendError, "auth.resend"));
    } finally {
      setResending(false);
    }
  }

  async function resendReset() {
    if (resending || !canResend) return;
    const nextEmail = displayEmail;
    const validationError = emailValidationMessage(nextEmail);
    if (validationError) {
      setEmailTouched(true);
      setSubmitAttempted(true);
      setError(submittedEmail ? validationError : "");
      return;
    }
    setResending(true);
    setError("");
    try {
      await onPasswordReset(nextEmail);
      setSubmittedEmail(nextEmail);
      setMessage("If an account exists for this email, a password-reset link has been sent.");
      setResendCoolingDown(true);
      window.setTimeout(() => setResendCoolingDown(false), RESEND_COOLDOWN_MS);
    } catch (resetError) {
      logDevError("Password reset resend failed", resetError);
      setError(getSafeErrorMessage(resetError, "auth.passwordReset"));
    } finally {
      setResending(false);
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
          <p className="text-xs font-bold uppercase tracking-wide text-[#1E3A8A]">TripLedger</p>
          <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">Fleet & Billing Platform</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Sign in to save bills securely and access history across devices.</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">
              {signupComplete ? "Check your email" : isForgot ? "Reset your password" : isLogin ? "Login" : "Create Account"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {signupComplete
                ? `If this is a new account, we’ve sent an activation link to ${displayEmail}. If you already have an account, please sign in or reset your password.`
                : isForgot
                  ? "Enter your email address and we’ll send you a secure password-reset link."
                  : isLogin
                    ? "Use your email and password to continue."
                    : "Create a Supabase email/password account."}
            </p>
          </CardHeader>
          <CardContent>
            {signupComplete ? (
              <div className="space-y-3">
                {(message || error) && (
                  <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200" : "border-blue-200 bg-blue-50 text-[#1E3A8A] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200"}`}>
                    {error || message}
                  </div>
                )}
                <Button className="w-full" type="button" variant="primary" onClick={() => go("login")}>Go to Login</Button>
                <Button className="w-full" type="button" variant="secondary" onClick={() => go("forgot")}>Forgot Password</Button>
                <Button className="w-full" type="button" variant="ghost" disabled={resending || !canResend} onClick={() => void resendActivation()}>
                  {resending ? "Sending..." : "Resend Activation Email"}
                </Button>
              </div>
            ) : resetSent ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1E3A8A] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200">
                  If an account exists for this email, a password-reset link has been sent.
                </div>
                {(message || error) && (
                  <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200" : "border-blue-200 bg-blue-50 text-[#1E3A8A] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200"}`}>
                    {error || message}
                  </div>
                )}
                <Button className="w-full" type="button" variant="primary" onClick={() => go("login")}>Back to Login</Button>
                <Button className="w-full" type="button" variant="secondary" disabled={resending || !canResend} onClick={() => void resendReset()}>
                  {resending ? "Sending..." : "Resend Reset Link"}
                </Button>
              </div>
            ) : (
              <>
                <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                  <label className="field-label">
                    Email address
                    <Input
                      aria-describedby={visibleEmailError ? emailErrorId : undefined}
                      aria-invalid={Boolean(visibleEmailError)}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      required
                    />
                    {visibleEmailError && <span id={emailErrorId} className="text-xs font-semibold text-red-600 dark:text-red-300">{visibleEmailError}</span>}
                  </label>
                  {!isForgot && (
                    <label className="field-label">
                      <span className="flex items-center justify-between gap-3">
                        Password
                        {isLogin && (
                          <button className="text-xs font-bold text-[#1E3A8A] hover:underline dark:text-blue-300" type="button" onClick={() => go("forgot")}>
                            Forgot password?
                          </button>
                        )}
                      </span>
                      <Input autoComplete={isLogin ? "current-password" : "new-password"} placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} />
                    </label>
                  )}
                  {isSignup && (
                    <label className="field-label">
                      How will you use TripLoggy?
                      <Select value={businessType} onChange={(event) => setBusinessType(event.target.value as OrganizationBusinessType)}>
                        <option value="individual_driver">Individual Driver</option>
                        <option value="vendor">Fleet Owner</option>
                      </Select>
                    </label>
                  )}

                  {(authError || error) && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">
                      {error || authError}
                      {loginNeedsVerification && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" disabled={resending || !canResend} onClick={() => void resendActivation()}>
                            {resending ? "Sending..." : "Resend Activation Email"}
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => { setEmail(""); setEmailTouched(false); setSubmitAttempted(false); }}>Change Email</Button>
                        </div>
                      )}
                    </div>
                  )}
                  {message && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1E3A8A] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200">{message}</div>
                  )}

                  <Button className="w-full" type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Please wait..." : isForgot ? "Send Reset Link" : isLogin ? "Login" : "Sign Up"}
                  </Button>
                </form>

                <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isForgot ? (
                    <button className="cursor-pointer font-bold text-[#1E3A8A] hover:underline dark:text-blue-300" type="button" onClick={() => go("login")}>Back to Login</button>
                  ) : (
                    <>
                      {isLogin ? "New to TripLedger?" : "Already have an account?"}{" "}
                      <button
                        className="cursor-pointer font-bold text-[#1E3A8A] hover:underline dark:text-blue-300"
                        type="button"
                        onClick={() => {
                          setSignupComplete(false);
                          setResetSent(false);
                          go(isLogin ? "signup" : "login");
                        }}
                      >
                        {isLogin ? "Create account" : "Login"}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
