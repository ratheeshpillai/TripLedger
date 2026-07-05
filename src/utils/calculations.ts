import type { Bill, BillDraft, BillSummaryTotals } from "../types/bill";
import { dateTimeToMillis } from "./timeUtils";

export function calculateTotalHours(draft: Pick<BillDraft, "tripDate" | "garageTime" | "closingDate" | "closingTime">): number {
  const start = dateTimeToMillis(draft.tripDate, draft.garageTime);
  let end = dateTimeToMillis(draft.closingDate || draft.tripDate, draft.closingTime);

  if (start === null || end === null) return 0;
  if (end <= start && !draft.closingDate) end += 24 * 60 * 60 * 1000;
  return Math.max(0, (end - start) / 36e5);
}

export function calculateExtraHours(totalHours: number, baseHours: number): number {
  return Math.max(0, totalHours - Number(baseHours || 0));
}

export function calculateExtraKm(totalKm: number, baseKm: number): number {
  return Math.max(0, Number(totalKm || 0) - Number(baseKm || 0));
}

export function calculateBillDraft(draft: BillDraft): BillDraft {
  const totalHours = calculateTotalHours(draft);
  const extraHours = calculateExtraHours(totalHours, draft.baseHours);
  const autoExtraKm = calculateExtraKm(draft.totalKm, draft.baseKm);
  const extraKm = Number(draft.extraKm || 0) > 0 ? Number(draft.extraKm) : autoExtraKm;
  const autoExtraHourAmount = Math.round(extraHours * Number(draft.extraHourRate || 0));
  const autoExtraKmAmount = Math.round(extraKm * Number(draft.extraKmRate || 0));
  const extraHourAmount = Number(draft.extraHourAmount || 0) > 0 ? Number(draft.extraHourAmount) : autoExtraHourAmount;
  const extraKmAmount = Number(draft.extraKmAmount || 0) > 0 ? Number(draft.extraKmAmount) : autoExtraKmAmount;
  const totalAmount =
    Number(draft.baseAmount || 0) +
    extraHourAmount +
    extraKmAmount +
    Number(draft.airportParking || 0) +
    Number(draft.fastag || 0) +
    Number(draft.roadParking || 0) +
    Number(draft.pendingAmount || 0);

  return {
    ...draft,
    totalHours,
    extraHours,
    extraKm,
    extraHourAmount,
    extraKmAmount,
    totalAmount
  };
}

export function calculateBillTotal(bill: Pick<Bill, "baseAmount" | "extraHourAmount" | "extraKmAmount" | "airportParking" | "fastag" | "roadParking" | "pendingAmount">): number {
  return (
    Number(bill.baseAmount || 0) +
    Number(bill.extraHourAmount || 0) +
    Number(bill.extraKmAmount || 0) +
    Number(bill.airportParking || 0) +
    Number(bill.fastag || 0) +
    Number(bill.roadParking || 0) +
    Number(bill.pendingAmount || 0)
  );
}

export function calculateCombinedSummary(bills: Bill[]): BillSummaryTotals {
  return bills.reduce<BillSummaryTotals>(
    (summary, bill) => ({
      selectedBillsCount: summary.selectedBillsCount + 1,
      totalKm: summary.totalKm + Number(bill.totalKm || 0),
      totalHours: summary.totalHours + Number(bill.totalHours || 0),
      totalBaseAmount: summary.totalBaseAmount + Number(bill.baseAmount || 0),
      totalExtraKmAmount: summary.totalExtraKmAmount + Number(bill.extraKmAmount || 0),
      totalExtraHourAmount: summary.totalExtraHourAmount + Number(bill.extraHourAmount || 0),
      totalAirportParking: summary.totalAirportParking + Number(bill.airportParking || 0),
      totalFastag: summary.totalFastag + Number(bill.fastag || 0),
      totalRoadParking: summary.totalRoadParking + Number(bill.roadParking || 0),
      totalPendingAmount: summary.totalPendingAmount + Number(bill.pendingAmount || 0),
      grandTotal: summary.grandTotal + Number(bill.totalAmount || 0)
    }),
    {
      selectedBillsCount: 0,
      totalKm: 0,
      totalHours: 0,
      totalBaseAmount: 0,
      totalExtraKmAmount: 0,
      totalExtraHourAmount: 0,
      totalAirportParking: 0,
      totalFastag: 0,
      totalRoadParking: 0,
      totalPendingAmount: 0,
      grandTotal: 0
    }
  );
}
