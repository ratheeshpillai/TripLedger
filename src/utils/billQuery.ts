import type { BillQuery } from "../types/bill";

export function billSelectionKey(query: BillQuery): string {
  return JSON.stringify([
    query.search?.trim().toLowerCase() ?? "",
    query.dateFrom ?? "",
    query.dateTo ?? "",
    query.billingPartyId ?? ""
  ]);
}
