import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
const billsHookSource = readFileSync(new URL("../src/hooks/useBills.ts", import.meta.url), "utf8");
const billFormSource = readFileSync(new URL("../src/hooks/useBillForm.ts", import.meta.url), "utf8");
const loggerSource = readFileSync(new URL("../src/components/logger/LoggerPage.tsx", import.meta.url), "utf8");
const duplicateMigration = readFileSync(new URL("../supabase/migrations/20260803_bill_duplicate_fingerprint.sql", import.meta.url), "utf8");

test("repeated saves retain the created bill identity and use single-flight guards", () => {
  assert.match(appSource, /if \(saveActionPromiseRef\.current\) return/);
  assert.match(appSource, /form\.setEditingBillId\(saved\.id\)/);
  assert.match(billsHookSource, /if \(savePromiseRef\.current\) return savePromiseRef\.current/);
});

test("Create New Bill clears the edit identity while retaining the settings-aware reset", () => {
  assert.match(appSource, /onCreateNew=\{\(\) => \{\s*form\.resetLogger\(\)/);
  assert.match(billFormSource, /setDraft\(createEmptyBillDraft\(settings\)\)/);
  assert.match(billFormSource, /setEditingBillId\(null\)/);
  assert.match(loggerSource, /validation\.reset\(\)/);
  assert.match(loggerSource, /setSaveSucceeded\(false\)/);
});

test("Update Bill uses the update path and a new bill returns to one guarded create path", () => {
  assert.match(billsHookSource, /if \(editingBillId\)[\s\S]*service\.updateBill\(userId, updated\)/);
  assert.match(billsHookSource, /service\.saveBill\(userId, bill, createRequestIdRef\.current\)/);
  assert.doesNotMatch(loggerSource, /Quick Add Owner \/ Company/);
});

test("concurrent inserts are protected by a user-scoped business fingerprint", () => {
  assert.match(duplicateMigration, /create unique index if not exists bills_user_business_fingerprint_uidx/i);
  for (const field of ["user_id", "billing_party_id", "guest_name", "vehicle_number", "reporting_place", "trip_date", "reporting_time", "closing_date", "closing_time"]) {
    assert.match(duplicateMigration, new RegExp(`\\b${field}\\b`, "i"));
  }
});
