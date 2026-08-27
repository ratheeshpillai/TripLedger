import assert from "node:assert/strict";
import test from "node:test";
import { mapSupabaseAuthError, mapSupabaseError } from "../src/repositories/supabase/supabaseError.ts";
import { AppError, getSafeErrorMessage } from "../src/utils/errors.ts";

test("database errors map to stable application codes", () => {
  assert.equal(mapSupabaseError({ code: "23505", message: "duplicate key violates constraint bills_uidx" }).code, "CONFLICT");
  assert.equal(mapSupabaseError({ code: "42501", message: "row-level security policy" }).code, "FORBIDDEN");
  assert.equal(mapSupabaseError({ code: "23514", message: "You have reached the current record limit." }).code, "LIMIT_REACHED");
  assert.equal(mapSupabaseError({ code: "insufficient_aal" }).code, "FORBIDDEN");
  assert.equal(mapSupabaseError({ code: "40001", message: "The driver and vehicle assignment changed." }).userMessage, "This driver and vehicle assignment changed. Refresh and select the current assignment.");
});

test("auth mapping preserves safe messages without exposing provider details", () => {
  const login = mapSupabaseAuthError({ code: "invalid_credentials", message: "provider internals" });
  assert.equal(getSafeErrorMessage(login, "auth.login"), "The email or password is incorrect.");

  const mfa = mapSupabaseAuthError({ code: "mfa_verification_failed", message: "invalid totp" });
  assert.equal(getSafeErrorMessage(mfa, "auth.mfa"), "That authenticator code is invalid. Please try again.");

  const unknown = mapSupabaseError({ code: "XX999", message: "secret table and connection details" });
  assert.ok(unknown instanceof AppError);
  assert.equal(unknown.code, "UNKNOWN");
  assert.equal(getSafeErrorMessage(unknown, "bill.save"), "Unable to save the bill.");
  assert.doesNotMatch(getSafeErrorMessage(unknown, "bill.save"), /secret table|connection details/i);
});
