import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry, StatementEntry } from "../../types/billingParty";
import { logDevError } from "../../utils/errors";
import type { BillingPartyRepository } from "../billingPartyRepository";
import { getSupabaseClient } from "./supabaseClient";

type BillingPartyRow = {
  id: string;
  user_id: string;
  name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type BillingPartySummaryRow = {
  billing_party_id: string;
  display_name: string;
  company_name: string | null;
  total_billed: number | string | null;
  total_received: number | string | null;
  net_balance: number | string | null;
  outstanding_amount: number | string | null;
  advance_credit: number | string | null;
  bill_count: number | string | null;
  payment_count: number | string | null;
  latest_bill_date: string | null;
  latest_payment_date: string | null;
};

type LedgerEntryRow = {
  entry_date: string;
  entry_type: "bill" | "payment_received" | "advance_received";
  reference_id: string;
  description: string | null;
  debit_amount: number | string | null;
  credit_amount: number | string | null;
  running_balance: number | string | null;
};

type StatementRow = {
  billing_party_id: string;
  display_name: string;
  company_name: string | null;
  from_date: string;
  to_date: string;
  opening_balance: number | string | null;
  total_billed: number | string | null;
  total_received: number | string | null;
  closing_balance: number | string | null;
  closing_outstanding: number | string | null;
  advance_available: number | string | null;
  entry_date: string | null;
  entry_type: "bill" | "payment_received" | "advance_received" | null;
  reference_id: string | null;
  description: string | null;
  debit_amount: number | string | null;
  credit_amount: number | string | null;
  running_balance: number | string | null;
};

function numeric(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function text(value: string | null | undefined): string {
  return value ?? "";
}

function toBillingParty(row: BillingPartyRow): BillingParty {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    companyName: text(row.company_name),
    phone: text(row.phone),
    email: text(row.email),
    address: text(row.address),
    notes: text(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toWriteRow(userId: string, draft: BillingPartyDraft): Partial<BillingPartyRow> {
  return {
    user_id: userId,
    name: draft.name.trim(),
    company_name: draft.companyName.trim() || null,
    phone: draft.phone.trim() || null,
    email: draft.email.trim() || null,
    address: draft.address.trim() || null,
    notes: draft.notes.trim() || null
  };
}

function toSummary(row: BillingPartySummaryRow): BillingPartySummary {
  return {
    billingPartyId: row.billing_party_id,
    displayName: row.display_name,
    companyName: text(row.company_name),
    totalBilled: numeric(row.total_billed),
    totalReceived: numeric(row.total_received),
    netBalance: numeric(row.net_balance),
    outstandingAmount: numeric(row.outstanding_amount),
    advanceCredit: numeric(row.advance_credit),
    billCount: numeric(row.bill_count),
    paymentCount: numeric(row.payment_count),
    latestBillDate: text(row.latest_bill_date),
    latestPaymentDate: text(row.latest_payment_date)
  };
}

function toLedgerEntry(row: LedgerEntryRow): LedgerEntry {
  return {
    entryDate: row.entry_date,
    entryType: row.entry_type,
    referenceId: row.reference_id,
    description: text(row.description),
    debitAmount: numeric(row.debit_amount),
    creditAmount: numeric(row.credit_amount),
    runningBalance: numeric(row.running_balance)
  };
}

function toStatement(rows: StatementRow[], billingPartyId: string, fromDate: string, toDate: string): BillingPartyStatement {
  if (rows.length === 0) throw new Error("Unable to load the owner statement.");

  const first = rows[0];
  const entries = rows
    .filter((row) => row.entry_date && row.entry_type)
    .map<StatementEntry>((row) => ({
      entryDate: row.entry_date!,
      entryType: row.entry_type!,
      description: text(row.description),
      debitAmount: numeric(row.debit_amount),
      creditAmount: numeric(row.credit_amount),
      runningBalance: numeric(row.running_balance)
    }));

  return {
    billingPartyId: first?.billing_party_id ?? billingPartyId,
    displayName: text(first?.display_name),
    companyName: text(first?.company_name),
    fromDate: first?.from_date ?? fromDate,
    toDate: first?.to_date ?? toDate,
    summary: {
      openingBalance: numeric(first?.opening_balance),
      totalBilled: numeric(first?.total_billed),
      totalReceived: numeric(first?.total_received),
      closingBalance: numeric(first?.closing_balance),
      closingOutstanding: numeric(first?.closing_outstanding),
      advanceAvailable: numeric(first?.advance_available)
    },
    entries
  };
}

export const supabaseBillingPartyRepository: BillingPartyRepository = {
  async listBillingParties(userId) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (error) {
      logDevError("Supabase billing party list failed", error);
      throw error;
    }
    return ((data ?? []) as BillingPartyRow[]).map(toBillingParty);
  },

  async listBillingPartySummaries() {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_summaries");

    if (error) {
      logDevError("Supabase billing party summaries failed", error);
      throw error;
    }
    return ((data ?? []) as BillingPartySummaryRow[]).map(toSummary);
  },

  async listBillingPartyLedger(billingPartyId) {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_ledger", { p_billing_party_id: billingPartyId });

    if (error) {
      logDevError("Supabase billing party ledger failed", error);
      throw error;
    }
    return ((data ?? []) as LedgerEntryRow[]).map(toLedgerEntry);
  },

  async getBillingPartyStatement(billingPartyId, fromDate, toDate) {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_statement", {
      p_billing_party_id: billingPartyId,
      p_from_date: fromDate,
      p_to_date: toDate
    });

    if (error) {
      logDevError("Supabase billing party statement failed", error);
      throw error;
    }
    return toStatement((data ?? []) as StatementRow[], billingPartyId, fromDate, toDate);
  },

  async saveBillingParty(userId, draft) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .insert(toWriteRow(userId, draft))
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase billing party save failed", error);
      throw error;
    }
    return toBillingParty(data as BillingPartyRow);
  },

  async updateBillingParty(userId, party) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .update(toWriteRow(userId, party))
      .eq("id", party.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase billing party update failed", error);
      throw error;
    }
    return toBillingParty(data as BillingPartyRow);
  },

  async deleteBillingParty(userId, id) {
    const { error } = await getSupabaseClient()
      .from("billing_parties")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      logDevError("Supabase billing party delete failed", error);
      throw error;
    }
  }
};
