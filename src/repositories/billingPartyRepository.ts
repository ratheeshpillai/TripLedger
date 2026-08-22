import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry } from "../types/billingParty";
import type { OrganizationScope } from "../types/organization";

export interface BillingPartyRepository {
  listBillingParties(scope: OrganizationScope): Promise<BillingParty[]>;
  listBillingPartySummaries(scope: OrganizationScope): Promise<BillingPartySummary[]>;
  listBillingPartyLedger(scope: OrganizationScope, billingPartyId: string): Promise<LedgerEntry[]>;
  getBillingPartyStatement(scope: OrganizationScope, billingPartyId: string, fromDate: string, toDate: string): Promise<BillingPartyStatement>;
  saveBillingParty(scope: OrganizationScope, draft: BillingPartyDraft): Promise<BillingParty>;
  updateBillingParty(scope: OrganizationScope, party: BillingParty): Promise<BillingParty>;
  deleteBillingParty(scope: OrganizationScope, id: string): Promise<void>;
}
