import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";

export interface OwnerPaymentRepository {
  listOwnerPayments(userId: string, billingPartyId?: string): Promise<OwnerPayment[]>;
  saveOwnerPayment(userId: string, draft: OwnerPaymentDraft, requestId: string): Promise<OwnerPayment>;
  updateOwnerPayment(userId: string, payment: OwnerPayment): Promise<OwnerPayment>;
  deleteOwnerPayment(userId: string, id: string): Promise<void>;
}
