import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const services = ["auth", "bill", "billingParty", "dashboard", "organization", "ownerPayment", "settings"];

test("Supabase construction is isolated to the application composition root", async () => {
  const root = readFileSync(new URL("../src/app/appDependencies.ts", import.meta.url), "utf8");
  assert.match(root, /repositories\/supabase\/supabaseAuthRepository/);
  assert.match(root, /export const appServices/);

  for (const name of services) {
    const source = readFileSync(new URL(`../src/services/${name}Service.ts`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /repositories\/supabase|supabaseClient/);
  }

  const { appServices } = await import("../src/app/appDependencies.ts");
  assert.equal(typeof appServices.auth.login, "function");
  assert.equal(typeof appServices.bills.queryBills, "function");
  assert.equal(typeof appServices.dashboard.getDashboard, "function");
});
