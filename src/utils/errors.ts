type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as ErrorLike;
    if (maybeError.code === "PGRST205") {
      return "Supabase bills table is missing. Please run supabase/bills.sql in the Supabase SQL Editor, then restart the app.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const maybeError = error as ErrorLike;
    if (typeof maybeError.message === "string" && maybeError.message) return maybeError.message;
  }
  return fallback;
}

export function logDevError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[TripLedger] ${context}`, error);
  }
}
