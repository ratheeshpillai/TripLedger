import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { AuthRepository } from "../src/repositories/authRepository";
import { createAuthService } from "../src/services/authService";
import type { SignupCredentials } from "../src/types/auth";

test("signup preserves the selected workspace type without accepting a membership role", async () => {
  let received: SignupCredentials | undefined;
  const repository = {
    async signUp(credentials: SignupCredentials) {
      received = credentials;
      return null;
    }
  } as AuthRepository;

  await createAuthService(repository).signup(
    { email: "vendor@example.test", password: "secret", businessType: "vendor" },
    "https://example.test/auth/callback"
  );

  assert.deepEqual(received, {
    email: "vendor@example.test",
    password: "secret",
    businessType: "vendor"
  });
  assert.equal("role" in (received ?? {}), false);
});

test("signup UI and Supabase adapter map only the approved business-type values", () => {
  const authPage = readFileSync(new URL("../src/components/auth/AuthPage.tsx", import.meta.url), "utf8");
  const repository = readFileSync(new URL("../src/repositories/supabase/supabaseAuthRepository.ts", import.meta.url), "utf8");

  assert.match(authPage, /How will you use TripLoggy\?/);
  assert.match(authPage, /value="individual_driver">Individual Driver/);
  assert.match(authPage, /value="vendor">Fleet Owner/);
  assert.match(repository, /data: \{ business_type: businessType \}/);
  assert.doesNotMatch(repository, /data: \{[^}]*role:/s);
});
