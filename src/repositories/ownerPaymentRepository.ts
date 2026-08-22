import type { OwnerPayment, OwnerPaymentDraft } from "../types/ownerPayment";
import type { OrganizationScope } from "../types/organization";

export interface OwnerPaymentRepository {
  listOwnerPayments(scope: OrganizationScope, billingPartyId?: string): Promise<OwnerPayment[]>;
  saveOwnerPayment(scope: OrganizationScope, draft: OwnerPaymentDraft, requestId: string): Promise<OwnerPayment>;
  updateOwnerPayment(scope: OrganizationScope, payment: OwnerPayment): Promise<OwnerPayment>;
  deleteOwnerPayment(scope: OrganizationScope, id: string): Promise<void>;
}
