import assert from "node:assert/strict";
import test from "node:test";
import { createEmptyBillDraft } from "../src/constants/defaults.ts";
import type { Bill } from "../src/types/bill.ts";
import type { BillingParty, BillingPartySummary } from "../src/types/billingParty.ts";
import type { OwnerPayment } from "../src/types/ownerPayment.ts";
import { buildDashboardData } from "../src/utils/dashboard.ts";

const party: BillingParty = {
  id: "owner-1",
  name: "Murugan Thevar",
  companyName: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  createdAt: "2026-07-01T09:00:00.000Z",
  updatedAt: "2026-07-01T09:00:00.000Z"
};

const summary: BillingPartySummary = {
  billingPartyId: party.id,
  displayName: party.name,
  companyName: "",
  totalBilled: 1500,
  totalReceived: 300,
  netBalance: 1200,
  outstandingAmount: 1200,
  advanceCredit: 0,
  billCount: 2,
  paymentCount: 1,
  latestBillDate: "2026-08-04",
  latestPaymentDate: "2026-08-04"
};

function bill(id: string, tripDate: string, createdAt: string, totalAmount: number): Bill {
  return {
    ...createEmptyBillDraft(),
    id,
    billingPartyId: party.id,
    billingPartyName: party.name,
    guestName: "Customer",
    reportingPlace: "Airport",
    driverName: "Driver",
    vehicleName: "Innova",
    vehicleNumber: "MH03CV4312",
    tripDate,
    reportingTime: "09:00",
    garageTime: "08:00",
    closingDate: tripDate,
    closingTime: "17:00",
    totalAmount,
    createdAt,
    updatedAt: createdAt
  };
}

function payment(id: string, paymentDate: string, createdAt: string, amount: number): OwnerPayment {
  return {
    id,
    billingPartyId: party.id,
    paymentDate,
    amount,
    paymentType: "payment_received",
    paymentMethod: "upi",
    reference: "",
    notes: "",
    createdAt,
    updatedAt: createdAt
  };
}

const now = new Date("2026-08-04T12:00:00+05:30");
const backdatedBill = bill("july-trip", "2026-07-31", "2026-08-04T05:00:00.000Z", 1000);
const currentWeekBill = bill("august-trip", "2026-08-04", "2026-08-04T04:00:00.000Z", 500);
const backdatedPayment = payment("july-payment", "2026-07-31", "2026-08-04T06:00:00.000Z", 100);
const currentWeekPayment = payment("august-payment", "2026-08-04", "2026-08-04T03:00:00.000Z", 200);

test("dashboard billing and trip counts use trip dates rather than creation timestamps", () => {
  const week = buildDashboardData([backdatedBill, currentWeekBill], [], [party], [summary], "week", now);
  assert.equal(week.billingTotal, 500);
  assert.equal(week.tripsBilled, 1);

  const july = buildDashboardData([backdatedBill], [], [party], [summary], "month", new Date("2026-07-31T12:00:00+05:30"));
  assert.equal(july.billingTotal, 1000);
  assert.equal(july.tripsBilled, 1);
});

test("payments use payment dates and outstanding remains the live ledger balance", () => {
  const week = buildDashboardData([], [backdatedPayment, currentWeekPayment], [party], [summary], "week", now);
  assert.equal(week.paymentsReceived, 200);
  assert.equal(week.currentOutstanding, 1200);
});

test("Recent Activity keeps backdated records, business dates, and created-time ordering", () => {
  const data = buildDashboardData([backdatedBill, currentWeekBill], [backdatedPayment], [party], [summary], "week", now);
  assert.deepEqual(data.recentActivity.slice(0, 3).map((activity) => activity.id), ["payment-july-payment", "bill-july-trip", "bill-august-trip"]);
  assert.equal(data.recentActivity[0].businessDate, "2026-07-31");
  assert.equal(data.recentActivity[1].title, "Bill added for Murugan Thevar");
  assert.equal(data.recentActivity[1].businessDate, "2026-07-31");
});
