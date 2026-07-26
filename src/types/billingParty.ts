export interface BillingParty {
  id: string;
  userId?: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type BillingPartyDraft = Omit<BillingParty, "id" | "createdAt" | "updatedAt">;

export interface BillingPartySummary {
  billingPartyId: string;
  displayName: string;
  companyName: string;
  totalBilled: number;
  totalReceived: number;
  netBalance: number;
  outstandingAmount: number;
  advanceCredit: number;
  billCount: number;
  paymentCount: number;
  latestBillDate: string;
  latestPaymentDate: string;
}

export interface LedgerEntry {
  entryDate: string;
  entryType: "bill" | "payment_received" | "advance_received";
  referenceId: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
}

export interface StatementSummary {
  openingBalance: number;
  totalBilled: number;
  totalReceived: number;
  closingBalance: number;
  closingOutstanding: number;
  advanceAvailable: number;
}

export interface StatementEntry {
  entryDate: string;
  entryType: "bill" | "payment_received" | "advance_received";
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
}

export interface BillingPartyStatement {
  billingPartyId: string;
  displayName: string;
  companyName: string;
  fromDate: string;
  toDate: string;
  summary: StatementSummary;
  entries: StatementEntry[];
}
