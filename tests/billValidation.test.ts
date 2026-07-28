import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyBillDraft } from "../src/constants/defaults.ts";
import { createBillService } from "../src/services/billService.ts";
import type { Bill } from "../src/types/bill.ts";
import type { BillRepository } from "../src/repositories/billRepository.ts";
import { BillValidationError, normalizeBillDraft, validateBillDraft, validateBillStep } from "../src/utils/billValidation.ts";

function validDraft() {
  return {
    ...createEmptyBillDraft(),
    billingPartyId: "owner-1",
    guestName: "Customer",
    reportingPlace: "Airport",
    driverName: "Driver",
    vehicleName: "Innova",
    vehicleNumber: "KL 01 AB 1234",
    reportingTime: "09:00",
    garageTime: "08:00",
    closingTime: "17:00"
  };
}

test("requires a valid selected owner", () => {
  assert.equal(validateBillDraft(validDraft(), { validBillingPartyIds: new Set() }).billingPartyId, "Select a company or owner.");
  assert.deepEqual(validateBillDraft(validDraft(), { validBillingPartyIds: new Set(["owner-1"]) }), {});
});

test("quick-add text alone cannot satisfy the owner reference", () => {
  const draft = { ...validDraft(), billingPartyId: undefined, billingPartyName: "Typed but not added" };
  assert.ok(validateBillStep(0, draft, { validBillingPartyIds: new Set(["owner-1"]) }).billingPartyId);
});

test("requires the approved customer, reporting, driver, and vehicle fields", () => {
  const draft = validDraft();
  const fields = ["guestName", "reportingPlace", "driverName", "vehicleName", "vehicleNumber"] as const;
  for (const field of fields) assert.ok(validateBillDraft({ ...draft, [field]: "   " })[field]);
});

test("requires complete times without making dates compulsory", () => {
  const draft = validDraft();
  assert.ok(validateBillDraft({ ...draft, reportingTime: "" }).reportingTime);
  assert.ok(validateBillDraft({ ...draft, reportingTime: "25:00" }).reportingTime);
  assert.ok(validateBillDraft({ ...draft, garageTime: "" }).garageTime);
  assert.ok(validateBillDraft({ ...draft, closingTime: "" }).closingTime);
  assert.equal(validateBillDraft({ ...draft, tripDate: "", closingDate: "" }).tripDate, undefined);
  assert.equal(validateBillDraft({ ...draft, tripDate: "", closingDate: "" }).closingDate, undefined);
});

test("rejects reversed times but accepts overnight trips on a later date", () => {
  const draft = validDraft();
  assert.ok(validateBillDraft({ ...draft, reportingTime: "18:00", closingTime: "17:00" }).closingTime);
  assert.equal(validateBillDraft({ ...draft, reportingTime: "18:00", closingDate: "2099-01-02", closingTime: "01:00" }).closingTime, undefined);
});

test("rejects invalid numeric values and accepts zero optional charges", () => {
  const draft = validDraft();
  assert.ok(validateBillDraft({ ...draft, extraHours: -1 }).extraHours);
  assert.ok(validateBillDraft({ ...draft, baseAmount: Number.NaN }).baseAmount);
  assert.ok(validateBillDraft({ ...draft, fastag: 1.001 }).fastag);
  assert.equal(validateBillDraft({ ...draft, airportParking: 0, fastag: 0, roadParking: 0 }).fastag, undefined);
});

test("normalizes text and time without shifting local dates", () => {
  const normalized = normalizeBillDraft({ ...validDraft(), guestName: "  Guest  ", reportingTime: "9am" });
  assert.equal(normalized.guestName, "Guest");
  assert.equal(normalized.reportingTime, "09:00");
  assert.equal(normalized.tripDate, validDraft().tripDate);
});

test("the service blocks invalid payloads and normalizes valid payloads", async () => {
  let saved: Bill | undefined;
  const repository: BillRepository = {
    async listBills() { return []; },
    async saveBill(_userId, bill) { saved = bill; return bill; },
    async updateBill(_userId, bill) { return bill; },
    async deleteBill() {},
    async deleteBills() {}
  };
  const service = createBillService(repository);
  const bill = { ...validDraft(), id: "bill-1", createdAt: "", updatedAt: "" } as Bill;

  assert.throws(() => service.saveBill("user-1", { ...bill, baseAmount: Number.NaN }, "request-1"), BillValidationError);
  await service.saveBill("user-1", { ...bill, guestName: "  Guest  ", reportingTime: "9am" }, "request-2");
  assert.equal(saved?.guestName, "Guest");
  assert.equal(saved?.reportingTime, "09:00");
});
