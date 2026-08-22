import type { BillingParty, BillingPartyDraft } from "../types/billingParty";
import type { BillingPartyRepository } from "../repositories/billingPartyRepository";
import type { OrganizationScope } from "../types/organization";

export interface BillingPartyService {
  listBillingParties(scope: OrganizationScope): ReturnType<BillingPartyRepository["listBillingParties"]>;
  listBillingPartySummaries(scope: OrganizationScope): ReturnType<BillingPartyRepository["listBillingPartySummaries"]>;
  listBillingPartyLedger(scope: OrganizationScope, billingPartyId: string): ReturnType<BillingPartyRepository["listBillingPartyLedger"]>;
  getBillingPartyStatement(scope: OrganizationScope, billingPartyId: string, fromDate: string, toDate: string): ReturnType<BillingPartyRepository["getBillingPartyStatement"]>;
  saveBillingParty(scope: OrganizationScope, draft: BillingPartyDraft): Promise<BillingParty>;
  updateBillingParty(scope: OrganizationScope, party: BillingParty): Promise<BillingParty>;
  deleteBillingParty(scope: OrganizationScope, id: string): Promise<void>;
}

function validateBillingParty(draft: BillingPartyDraft) {
  if (!draft.name.trim()) throw new Error("Owner / Company name is required.");
}

export function createBillingPartyService(repository: BillingPartyRepository): BillingPartyService {
  return {
    listBillingParties(scope) {
      return repository.listBillingParties(scope);
    },
    listBillingPartySummaries(scope) {
      return repository.listBillingPartySummaries(scope);
    },
    listBillingPartyLedger(scope, billingPartyId) {
      return repository.listBillingPartyLedger(scope, billingPartyId);
    },
    getBillingPartyStatement(scope, billingPartyId, fromDate, toDate) {
      if (!billingPartyId || !fromDate || !toDate || fromDate > toDate) throw new Error("Please select a valid date range.");
      return repository.getBillingPartyStatement(scope, billingPartyId, fromDate, toDate);
    },
    saveBillingParty(scope, draft) {
      validateBillingParty(draft);
      return repository.saveBillingParty(scope, draft);
    },
    updateBillingParty(scope, party) {
      validateBillingParty(party);
      return repository.updateBillingParty(scope, party);
    },
    deleteBillingParty(scope, id) {
      return repository.deleteBillingParty(scope, id);
    }
  };
}
