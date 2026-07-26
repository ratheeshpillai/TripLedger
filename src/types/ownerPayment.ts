export type OwnerPaymentType = "payment_received" | "advance_received";
export type OwnerPaymentMethod = "cash" | "bank_transfer" | "upi" | "cheque" | "other" | "";

export interface OwnerPayment {
  id: string;
  userId?: string;
  billingPartyId: string;
  paymentDate: string;
  amount: number;
  paymentType: OwnerPaymentType;
  paymentMethod: OwnerPaymentMethod;
  reference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type OwnerPaymentDraft = Omit<OwnerPayment, "id" | "createdAt" | "updatedAt">;
