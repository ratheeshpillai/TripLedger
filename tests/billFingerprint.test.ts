import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyBillDraft } from "../src/constants/defaults.ts";
import type { Bill } from "../src/types/bill.ts";
import { sameBillFingerprint } from "../src/utils/billFingerprint.ts";

function bill(overrides: Partial<Bill> = {}): Bill {
  return {
    ...createEmptyBillDraft(),
    id: "bill-1",
    billingPartyId: "owner-1",
    guestSalutation: "Mr.",
    guestName: "Guest",
    vehicleNumber: "MH03CV4312",
    reportingPlace: "The Leela",
    tripDate: "2026-08-03",
    reportingTime: "05:00",
    closingDate: "2026-08-03",
    closingTime: "17:00",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-08-03T00:00:00.000Z",
    ...overrides
  };
}

test("matching bill identity ignores harmless case and surrounding whitespace", () => {
  assert.equal(sameBillFingerprint(bill(), bill({ guestName: " guest ", reportingPlace: "the leela" })), true);
});

test("same-day trips with different timing are not duplicates", () => {
  assert.equal(sameBillFingerprint(bill(), bill({ id: "bill-2", reportingTime: "18:00", closingTime: "22:00" })), false);
});

test("same request details are recognized as a probable duplicate", () => {
  assert.equal(sameBillFingerprint(bill(), bill({ id: "bill-2" })), true);
});
