import { AppError } from "../../utils/errors";

type ProviderError = {
  code?: unknown;
  message?: unknown;
  status?: unknown;
};

function metadata(error: unknown): ProviderError {
  return typeof error === "object" && error !== null ? error as ProviderError : {};
}

function details(error: unknown) {
  const value = metadata(error);
  return {
    code: typeof value.code === "string" ? value.code.toLowerCase() : "",
    message: typeof value.message === "string" ? value.message.toLowerCase() : "",
    status: typeof value.status === "number" ? value.status : undefined
  };
}

export function mapSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const { code, message, status } = details(error);

  if (message.includes("record limit")) return new AppError("LIMIT_REACHED", undefined, error);
  if (message.includes("already being processed") || message.includes("already saved")) {
    return new AppError("CONFLICT", "This request is already being processed.", error);
  }
  if (code === "23505") return new AppError("CONFLICT", undefined, error);
  if (code === "23503" || code === "23514" || code === "22023") return new AppError("VALIDATION", undefined, error);
  if (code === "pgrst116") return new AppError("NOT_FOUND", undefined, error);
  if (code === "42501" || code === "insufficient_aal" || status === 403 || message.includes("row-level security")) {
    return new AppError("FORBIDDEN", undefined, error);
  }
  if (status === 401 || ["bad_jwt", "pgrst301", "session_not_found", "refresh_token_not_found", "refresh_token_already_used"].includes(code)) {
    return new AppError("UNAUTHORIZED", undefined, error);
  }
  if (status === 429 || code === "too_many_requests" || code === "over_email_send_rate_limit") {
    return new AppError("RATE_LIMITED", undefined, error);
  }
  if (error instanceof TypeError || status && status >= 500 || message.includes("failed to fetch") || message.includes("network request failed") || message.includes("networkerror")) {
    return new AppError("UNAVAILABLE", undefined, error);
  }
  return new AppError("UNKNOWN", undefined, error);
}

export function mapSupabaseAuthError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  const { code, message, status } = details(error);

  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return new AppError("UNAUTHORIZED", "The email or password is incorrect.", error);
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return new AppError("UNAUTHORIZED", "Please verify your email before signing in.", error);
  }
  if (code === "otp_expired" || message.includes("token has expired")) {
    return new AppError("VALIDATION", undefined, error);
  }
  if (code === "mfa_challenge_expired") {
    return new AppError("VALIDATION", "That verification code has expired. Please try again.", error);
  }
  if (["mfa_verification_failed", "mfa_challenge_not_found", "invalid_otp"].includes(code) || message.includes("invalid totp")) {
    return new AppError("VALIDATION", "That authenticator code is invalid. Please try again.", error);
  }
  return mapSupabaseError(error);
}
