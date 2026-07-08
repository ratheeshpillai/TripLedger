import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Input } from "../ui/Input";

type AuthMode = "login" | "signup";

type Props = {
  authError?: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string) => Promise<void>;
};

export function AuthPage({ authError, onLogin, onSignup }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (isLogin) {
        await onLogin(email.trim(), password);
      } else {
        await onSignup(email.trim(), password);
        setMessage("Account created. If email confirmation is enabled, verify your email before logging in.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
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
            <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{isLogin ? "Login" : "Create Account"}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isLogin ? "Use your email and password to continue." : "Create a Supabase email/password account."}</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="field-label">
                Email
                <Input autoComplete="email" inputMode="email" placeholder="you@example.com" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label className="field-label">
                Password
                <Input autoComplete={isLogin ? "current-password" : "new-password"} placeholder="At least 6 characters" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
              </label>

              {(authError || error) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200">{error || authError}</div>
              )}
              {message && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1E3A8A] dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200">{message}</div>
              )}

              <Button className="w-full" type="submit" variant="primary" disabled={submitting}>
                {submitting ? "Please wait..." : isLogin ? "Login" : "Sign Up"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {isLogin ? "New to TripLedger?" : "Already have an account?"}{" "}
              <button
                className="cursor-pointer font-bold text-[#1E3A8A] hover:underline dark:text-blue-300"
                type="button"
                onClick={() => {
                  setMode(isLogin ? "signup" : "login");
                  setError("");
                  setMessage("");
                }}
              >
                {isLogin ? "Create account" : "Login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.main>
  );
}
