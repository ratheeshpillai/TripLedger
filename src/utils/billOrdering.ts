import type { Bill } from "../types/bill";

export function chronologicalBills(bills: Bill[]): Bill[] {
  return [...bills].sort((a, b) =>
    a.tripDate.localeCompare(b.tripDate) ||
    (a.reportingTime || "").localeCompare(b.reportingTime || "") ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
