import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";
import type { OwnerPaymentRepository } from "../repositories/ownerPaymentRepository";
import type { OrganizationScope } from "../types/organization";

export interface OwnerPaymentService {
  listOwnerPayments(scope: OrganizationScope, billingPartyId?: string): ReturnType<OwnerPaymentRepository["listOwnerPayments"]>;
  saveOwnerPayment(scope: OrganizationScope, draft: OwnerPaymentDraft, requestId: string): Promise<OwnerPayment>;
  updateOwnerPayment(scope: OrganizationScope, payment: OwnerPayment): Promise<OwnerPayment>;
  deleteOwnerPayment(scope: OrganizationScope, id: string): Promise<void>;
}

function validatePayment(draft: OwnerPaymentDraft) {
  if (!draft.billingPartyId) throw new Error("Owner / Company is required.");
  if (!draft.paymentDate) throw new Error("Payment date is required.");
  if (Number(draft.amount || 0) <= 0) throw new Error("Payment amount must be greater than zero.");
}

export function createOwnerPaymentService(repository: OwnerPaymentRepository): OwnerPaymentService {
  return {
    listOwnerPayments(scope, billingPartyId) {
      return repository.listOwnerPayments(scope, billingPartyId);
    },
    saveOwnerPayment(scope, draft, requestId) {
      validatePayment(draft);
      return repository.saveOwnerPayment(scope, draft, requestId);
    },
    updateOwnerPayment(scope, payment) {
      validatePayment(payment);
      return repository.updateOwnerPayment(scope, payment);
    },
    deleteOwnerPayment(scope, id) {
      return repository.deleteOwnerPayment(scope, id);
    }
  };
}
