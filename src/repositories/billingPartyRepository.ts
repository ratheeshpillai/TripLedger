import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry } from "../types/billingParty";

export interface BillingPartyRepository {
  listBillingParties(userId: string): Promise<BillingParty[]>;
  listBillingPartySummaries(): Promise<BillingPartySummary[]>;
  listBillingPartyLedger(billingPartyId: string): Promise<LedgerEntry[]>;
  getBillingPartyStatement(billingPartyId: string, fromDate: string, toDate: string): Promise<BillingPartyStatement>;
  saveBillingParty(userId: string, draft: BillingPartyDraft): Promise<BillingParty>;
  updateBillingParty(userId: string, party: BillingParty): Promise<BillingParty>;
  deleteBillingParty(userId: string, id: string): Promise<void>;
}
