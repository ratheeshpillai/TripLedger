type ErrorLike = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  name?: unknown;
  details?: unknown;
  hint?: unknown;
};

export type SafeErrorContext =
  | "auth.initialize"
  | "auth.login"
  | "auth.signup"
  | "auth.logout"
  | "auth.verification"
  | "auth.mfa"
  | "bill.load"
  | "bill.save"
  | "bill.update"
  | "bill.delete"
  | "settings.load"
  | "settings.save"
  | "unexpected";

const CONTEXT_MESSAGES: Record<SafeErrorContext, string> = {
  "auth.initialize": "Unable to verify your session. Please sign in again.",
  "auth.login": "Unable to sign in with those credentials.",
  "auth.signup": "Unable to create your account right now.",
  "auth.logout": "Unable to log out. Please try again.",
  "auth.verification": "This verification link is invalid or has expired.",
  "auth.mfa": "Unable to verify that authenticator code.",
  "bill.load": "Unable to load bills.",
  "bill.save": "Unable to save the bill.",
  "bill.update": "Unable to update the bill.",
  "bill.delete": "Unable to delete the bill.",
  "settings.load": "Unable to load your settings.",
  "settings.save": "Unable to save your settings.",
  unexpected: "Something went wrong. Please try again."
};

function errorMetadata(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? error as ErrorLike : {};
}

function normalizedMessage(error: unknown): string {
  const message = errorMetadata(error).message;
  return typeof message === "string" ? message.toLowerCase() : "";
}

export function getSafeErrorMessage(error: unknown, context: SafeErrorContext = "unexpected"): string {
  const metadata = errorMetadata(error);
  const code = typeof metadata.code === "string" ? metadata.code.toLowerCase() : "";
  const status = typeof metadata.status === "number" ? metadata.status : undefined;
  const message = normalizedMessage(error);

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Verify your email before signing in.";
  }
  if (["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"].includes(code) || code === "pgrst301") {
    return "Your session has expired. Please sign in again.";
  }
  if (code === "otp_expired" || code === "mfa_challenge_expired" || message.includes("token has expired")) {
    return context === "auth.verification"
      ? "This verification link is invalid or has expired."
      : "That verification code has expired. Please try again.";
  }
  if (["mfa_verification_failed", "mfa_challenge_not_found", "invalid_otp"].includes(code) || message.includes("invalid totp")) {
    return "That authenticator code is invalid. Please try again.";
  }
  if (code === "23505") {
    return "A matching record already exists.";
  }
  if (code === "42501" || code === "insufficient_aal" || status === 401 || status === 403 || message.includes("row-level security")) {
    return context.startsWith("auth.")
      ? "Your session is not authorized for this action. Please sign in again."
      : "You do not have permission to perform this action.";
  }
  if (error instanceof TypeError || message.includes("failed to fetch") || message.includes("network request failed") || message.includes("networkerror")) {
    return "Unable to connect. Check your internet connection and try again.";
  }

  return CONTEXT_MESSAGES[context];
}

export function logDevError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    const metadata = errorMetadata(error);
    const code = typeof metadata.code === "string" && /^[a-z0-9_]{1,40}$/i.test(metadata.code) ? metadata.code : undefined;
    const status = typeof metadata.status === "number" ? metadata.status : undefined;
    const name = typeof metadata.name === "string" && /^(Error|TypeError|AuthApiError|AuthSessionMissingError|PostgrestError)$/.test(metadata.name)
      ? metadata.name
      : "Error";
    console.error(`[TripLedger] ${context}`, { name, code, status });
  }
}
