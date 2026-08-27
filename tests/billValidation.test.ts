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

test("Fleet Owner bills require managed driver and vehicle references", () => {
  const draft = validDraft();
  const errors = validateBillDraft(draft, { requireManagedFleetResources: true });
  assert.ok(errors.driverId);
  assert.ok(errors.vehicleId);
  assert.deepEqual(validateBillDraft({ ...draft, driverId: "driver-1", vehicleId: "vehicle-1" }, { requireManagedFleetResources: true }), {});
  assert.equal(validateBillDraft(draft).driverId, undefined);
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
  assert.equal(validateBillDraft({ ...draft, reportingTime: "18:00", closingTime: "17:00" }).closingTime, "Closing must be after reporting.");
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
    async queryBills() { return { items: [], totalCount: 0, totalAmount: 0 }; },
    async getBill() { throw new Error("not used"); },
    async saveBill(_userId, bill) { saved = bill; return bill; },
    async updateBill(_userId, bill) { return bill; },
    async deleteBill() {},
    async deleteBills() {}
  };
  const service = createBillService(repository);
  const bill = { ...validDraft(), id: "bill-1", createdAt: "", updatedAt: "" } as Bill;
  const scope = { organizationId: "org-1", userId: "user-1", businessType: "individual_driver" as const, role: "owner" as const };

  assert.throws(() => service.saveBill(scope, { ...bill, baseAmount: Number.NaN }, "request-1"), BillValidationError);
  await service.saveBill(scope, { ...bill, guestName: "  Guest  ", reportingTime: "9am" }, "request-2");
  assert.equal(saved?.guestName, "Guest");
  assert.equal(saved?.reportingTime, "09:00");
});

test("the service enforces managed references only for Fleet Owner workspaces", async () => {
  const repository: BillRepository = {
    async queryBills() { return { items: [], totalCount: 0, totalAmount: 0 }; },
    async getBill() { throw new Error("not used"); },
    async saveBill(_scope, bill) { return bill; },
    async updateBill(_scope, bill) { return bill; },
    async deleteBill() {},
    async deleteBills() {}
  };
  const service = createBillService(repository);
  const bill = { ...validDraft(), id: "bill-1", createdAt: "", updatedAt: "" } as Bill;
  const fleetScope = { organizationId: "org-1", userId: "user-1", businessType: "vendor" as const, role: "member" as const };

  assert.throws(() => service.saveBill(fleetScope, bill, "request-1"), BillValidationError);
  await service.saveBill(fleetScope, { ...bill, driverId: "driver-1", vehicleId: "vehicle-1" }, "request-2");
  await service.updateBill(fleetScope, bill);
  assert.throws(() => service.updateBill(fleetScope, { ...bill, driverId: "driver-1" }), BillValidationError);
});
