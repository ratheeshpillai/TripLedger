import assert from "node:assert/strict";
import test from "node:test";
import type { BillingParty, BillingPartySummary, LedgerEntry } from "../src/types/billingParty.ts";
import { filterAndSortOwners, quickOwnerDateRange, sortOwnerLedger } from "../src/components/owners/ownerPageModel.ts";

const parties = [
  { id: "party-1", name: "Zed", companyName: "", phone: "111", email: "" },
  { id: "party-2", name: "Amy", companyName: "Amy Travels", phone: "222", email: "amy@example.com" }
] as BillingParty[];

const summaries = new Map<string, BillingPartySummary>([
  ["party-1", { billingPartyId: "party-1", outstandingAmount: 100, latestBillDate: "2026-08-01" } as BillingPartySummary],
  ["party-2", { billingPartyId: "party-2", outstandingAmount: 500, latestPaymentDate: "2026-08-10" } as BillingPartySummary]
]);

test("owner directory filtering and sorting are independent of rendering", () => {
  assert.deepEqual(filterAndSortOwners(parties, summaries, "amy", "recent").map(({ id }) => id), ["party-2"]);
  assert.deepEqual(filterAndSortOwners(parties, summaries, "", "highest").map(({ id }) => id), ["party-2", "party-1"]);
  assert.deepEqual(filterAndSortOwners(parties, summaries, "", "name-asc").map(({ id }) => id), ["party-2", "party-1"]);
});

test("owner ledger sort and statement ranges remain deterministic", () => {
  const ledger = [
    { referenceId: "b", entryType: "bill", description: "B", entryDate: "2026-08-02" },
    { referenceId: "a", entryType: "bill", description: "A", entryDate: "2026-08-01" }
  ] as LedgerEntry[];
  assert.deepEqual(sortOwnerLedger(ledger, "oldest").map(({ referenceId }) => referenceId), ["a", "b"]);
  assert.deepEqual(sortOwnerLedger(ledger, "newest").map(({ referenceId }) => referenceId), ["b", "a"]);
  assert.deepEqual(quickOwnerDateRange("last-month", new Date(2026, 7, 20)), { fromDate: "2026-07-01", toDate: "2026-07-31" });
});
