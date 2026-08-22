import type { Bill } from "../types/bill";

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
  | "auth.resend"
  | "auth.passwordReset"
  | "auth.passwordUpdate"
  | "auth.logout"
  | "auth.verification"
  | "auth.mfa"
  | "bill.load"
  | "bill.save"
  | "bill.update"
  | "bill.delete"
  | "owner.save"
  | "owner.update"
  | "owner.delete"
  | "payment.save"
  | "payment.update"
  | "payment.delete"
  | "settings.load"
  | "settings.save"
  | "unexpected";

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "LIMIT_REACHED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "UNKNOWN";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly userMessage?: string,
    readonly cause?: unknown
  ) {
    super(code);
    this.name = "AppError";
  }
}

const CONTEXT_MESSAGES: Record<SafeErrorContext, string> = {
  "auth.initialize": "Unable to verify your session. Please sign in again.",
  "auth.login": "Unable to sign in with those credentials.",
  "auth.signup": "Unable to create your account right now.",
  "auth.resend": "Unable to send that email right now. Please try again shortly.",
  "auth.passwordReset": "Unable to send a reset link right now. Please try again shortly.",
  "auth.passwordUpdate": "Unable to update your password. Please try again.",
  "auth.logout": "Unable to log out. Please try again.",
  "auth.verification": "This verification link is invalid or has expired.",
  "auth.mfa": "Unable to verify that authenticator code.",
  "bill.load": "Unable to load bills.",
  "bill.save": "Unable to save the bill.",
  "bill.update": "Unable to update the bill.",
  "bill.delete": "Unable to delete the bill.",
  "owner.save": "Unable to add the Owner / Company.",
  "owner.update": "Unable to update the Owner / Company.",
  "owner.delete": "Unable to delete the Owner / Company.",
  "payment.save": "Unable to record the payment.",
  "payment.update": "Unable to update the payment.",
  "payment.delete": "Unable to delete the payment.",
  "settings.load": "Unable to load your settings.",
  "settings.save": "Unable to save your settings.",
  unexpected: "Something went wrong. Please try again."
};

export class DuplicateBillError extends Error {
  readonly code = "BILL_DUPLICATE";

  constructor(readonly existingBill: Bill) {
    super("A matching bill already exists.");
    this.name = "DuplicateBillError";
  }
}

function errorMetadata(error: unknown): ErrorLike {
  return typeof error === "object" && error !== null ? error as ErrorLike : {};
}

export function getSafeErrorMessage(error: unknown, context: SafeErrorContext = "unexpected"): string {
  if (error instanceof DuplicateBillError) {
    return "A matching bill already exists. The existing bill was opened for editing.";
  }

  if (error instanceof AppError) {
    if (error.userMessage) return error.userMessage;
    if (error.code === "UNAUTHORIZED") return "Your session has expired. Please sign in again.";
    if (error.code === "FORBIDDEN") {
      return context.startsWith("auth.")
        ? "Your session is not authorized for this action. Please sign in again."
        : "You do not have permission to perform this action.";
    }
    if (error.code === "CONFLICT") return "A matching record already exists.";
    if (error.code === "LIMIT_REACHED") return "You have reached the current record limit.";
    if (error.code === "RATE_LIMITED") return "Too many attempts. Please wait a moment before trying again.";
    if (error.code === "UNAVAILABLE") return "We couldn’t connect right now. Please check your internet connection and try again.";
    if (error.code === "VALIDATION" && (context === "bill.save" || context === "bill.update")) {
      return "Unable to save the bill. Please review the details and try again.";
    }
  }

  return CONTEXT_MESSAGES[context];
}

export function logDevError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    const metadata = errorMetadata(error instanceof AppError ? error.cause : error);
    const code = typeof metadata.code === "string" && /^[a-z0-9_]{1,40}$/i.test(metadata.code) ? metadata.code : undefined;
    const status = typeof metadata.status === "number" ? metadata.status : undefined;
    const name = typeof metadata.name === "string" && /^(Error|TypeError|AuthApiError|AuthSessionMissingError|PostgrestError)$/.test(metadata.name)
      ? metadata.name
      : "Error";
    console.error(`[TripLedger] ${context}`, { name, code, status });
  }
}
