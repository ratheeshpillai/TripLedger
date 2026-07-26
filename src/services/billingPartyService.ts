import type { BillingParty, BillingPartyDraft } from "../types/billingParty";
import type { BillingPartyRepository } from "../repositories/billingPartyRepository";
import { supabaseBillingPartyRepository } from "../repositories/supabase/supabaseBillingPartyRepository";

export interface BillingPartyService {
  listBillingParties(userId: string): ReturnType<BillingPartyRepository["listBillingParties"]>;
  listBillingPartySummaries(): ReturnType<BillingPartyRepository["listBillingPartySummaries"]>;
  listBillingPartyLedger(billingPartyId: string): ReturnType<BillingPartyRepository["listBillingPartyLedger"]>;
  getBillingPartyStatement(billingPartyId: string, fromDate: string, toDate: string): ReturnType<BillingPartyRepository["getBillingPartyStatement"]>;
  saveBillingParty(userId: string, draft: BillingPartyDraft): Promise<BillingParty>;
  updateBillingParty(userId: string, party: BillingParty): Promise<BillingParty>;
  deleteBillingParty(userId: string, id: string): Promise<void>;
}

function validateBillingParty(draft: BillingPartyDraft) {
  if (!draft.name.trim()) throw new Error("Owner / Company name is required.");
}

export function createBillingPartyService(repository: BillingPartyRepository): BillingPartyService {
  return {
    listBillingParties(userId) {
      return repository.listBillingParties(userId);
    },
    listBillingPartySummaries() {
      return repository.listBillingPartySummaries();
    },
    listBillingPartyLedger(billingPartyId) {
      return repository.listBillingPartyLedger(billingPartyId);
    },
    getBillingPartyStatement(billingPartyId, fromDate, toDate) {
      if (!billingPartyId || !fromDate || !toDate || fromDate > toDate) throw new Error("Please select a valid date range.");
      return repository.getBillingPartyStatement(billingPartyId, fromDate, toDate);
    },
    saveBillingParty(userId, draft) {
      validateBillingParty(draft);
      return repository.saveBillingParty(userId, draft);
    },
    updateBillingParty(userId, party) {
      validateBillingParty(party);
      return repository.updateBillingParty(userId, party);
    },
    deleteBillingParty(userId, id) {
      return repository.deleteBillingParty(userId, id);
    }
  };
}

export const billingPartyService = createBillingPartyService(supabaseBillingPartyRepository);
