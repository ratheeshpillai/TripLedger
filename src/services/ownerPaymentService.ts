import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";
import type { OwnerPaymentRepository } from "../repositories/ownerPaymentRepository";
import { supabaseOwnerPaymentRepository } from "../repositories/supabase/supabaseOwnerPaymentRepository";

export interface OwnerPaymentService {
  listOwnerPayments(userId: string, billingPartyId?: string): ReturnType<OwnerPaymentRepository["listOwnerPayments"]>;
  saveOwnerPayment(userId: string, draft: OwnerPaymentDraft, requestId: string): Promise<OwnerPayment>;
  updateOwnerPayment(userId: string, payment: OwnerPayment): Promise<OwnerPayment>;
  deleteOwnerPayment(userId: string, id: string): Promise<void>;
}

function validatePayment(draft: OwnerPaymentDraft) {
  if (!draft.billingPartyId) throw new Error("Owner / Company is required.");
  if (!draft.paymentDate) throw new Error("Payment date is required.");
  if (Number(draft.amount || 0) <= 0) throw new Error("Payment amount must be greater than zero.");
}

export function createOwnerPaymentService(repository: OwnerPaymentRepository): OwnerPaymentService {
  return {
    listOwnerPayments(userId, billingPartyId) {
      return repository.listOwnerPayments(userId, billingPartyId);
    },
    saveOwnerPayment(userId, draft, requestId) {
      validatePayment(draft);
      return repository.saveOwnerPayment(userId, draft, requestId);
    },
    updateOwnerPayment(userId, payment) {
      validatePayment(payment);
      return repository.updateOwnerPayment(userId, payment);
    },
    deleteOwnerPayment(userId, id) {
      return repository.deleteOwnerPayment(userId, id);
    }
  };
}

export const ownerPaymentService = createOwnerPaymentService(supabaseOwnerPaymentRepository);
