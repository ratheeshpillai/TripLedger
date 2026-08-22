import type { BillingParty, BillingPartyDraft, BillingPartyStatement, BillingPartySummary, LedgerEntry, StatementEntry } from "../../types/billingParty";
import type { OrganizationScope } from "../../types/organization";
import { logDevError } from "../../utils/errors";
import type { BillingPartyRepository } from "../billingPartyRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type BillingPartyRow = Database["public"]["Tables"]["billing_parties"]["Row"];
type BillingPartyWriteRow = Database["public"]["Tables"]["billing_parties"]["Insert"];
type BillingPartyUpdateRow = Database["public"]["Tables"]["billing_parties"]["Update"];
type GeneratedBillingPartySummaryRow = Database["public"]["Functions"]["get_billing_party_summaries"]["Returns"][number];
type BillingPartySummaryRow = Omit<GeneratedBillingPartySummaryRow, "company_name" | "latest_bill_date" | "latest_payment_date"> & {
  company_name: string | null;
  latest_bill_date: string | null;
  latest_payment_date: string | null;
};
type LedgerEntryRow = Database["public"]["Functions"]["get_billing_party_ledger"]["Returns"][number];
type GeneratedStatementRow = Database["public"]["Functions"]["get_billing_party_statement"]["Returns"][number];
type StatementRow = Omit<GeneratedStatementRow, "company_name" | "entry_date" | "entry_type" | "reference_id" | "description" | "debit_amount" | "credit_amount" | "running_balance"> & {
  company_name: string | null;
  entry_date: string | null;
  entry_type: string | null;
  reference_id: string | null;
  description: string | null;
  debit_amount: number | null;
  credit_amount: number | null;
  running_balance: number | null;
};

function numeric(value: number | string | null | undefined): number {
  return Number(value ?? 0);
}

function text(value: string | null | undefined): string {
  return value ?? "";
}

function ledgerEntryType(value: string): LedgerEntry["entryType"] {
  if (value === "bill" || value === "payment_received" || value === "advance_received") return value;
  throw new Error("Unsupported owner ledger entry type.");
}

function toBillingParty(row: BillingPartyRow): BillingParty {
  return {
    id: row.id,
    organizationId: row.organization_id,
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

function toWriteRow(scope: OrganizationScope, draft: BillingPartyDraft): BillingPartyWriteRow {
  return {
    organization_id: scope.organizationId,
    user_id: scope.userId,
    name: draft.name.trim(),
    company_name: draft.companyName.trim() || null,
    phone: draft.phone.trim() || null,
    email: draft.email.trim() || null,
    address: draft.address.trim() || null,
    notes: draft.notes.trim() || null
  };
}

function toUpdateRow(draft: BillingPartyDraft): BillingPartyUpdateRow {
  return {
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
    entryType: ledgerEntryType(row.entry_type),
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
      entryType: ledgerEntryType(row.entry_type!),
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
  async listBillingParties(scope) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .select("*")
      .eq("organization_id", scope.organizationId)
      .order("name", { ascending: true });

    if (error) {
      logDevError("Supabase billing party list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toBillingParty);
  },

  async listBillingPartySummaries(scope) {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_summaries", { p_organization_id: scope.organizationId });

    if (error) {
      logDevError("Supabase billing party summaries failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toSummary);
  },

  async listBillingPartyLedger(scope, billingPartyId) {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_ledger", {
      p_organization_id: scope.organizationId,
      p_billing_party_id: billingPartyId
    });

    if (error) {
      logDevError("Supabase billing party ledger failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toLedgerEntry);
  },

  async getBillingPartyStatement(scope, billingPartyId, fromDate, toDate) {
    const { data, error } = await getSupabaseClient().rpc("get_billing_party_statement", {
      p_organization_id: scope.organizationId,
      p_billing_party_id: billingPartyId,
      p_from_date: fromDate,
      p_to_date: toDate
    });

    if (error) {
      logDevError("Supabase billing party statement failed", error);
      throw mapSupabaseError(error);
    }
    return toStatement(data ?? [], billingPartyId, fromDate, toDate);
  },

  async saveBillingParty(scope, draft) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .insert(toWriteRow(scope, draft))
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase billing party save failed", error);
      throw mapSupabaseError(error);
    }
    return toBillingParty(data);
  },

  async updateBillingParty(scope, party) {
    const { data, error } = await getSupabaseClient()
      .from("billing_parties")
      .update(toUpdateRow(party))
      .eq("id", party.id)
      .eq("organization_id", scope.organizationId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase billing party update failed", error);
      throw mapSupabaseError(error);
    }
    return toBillingParty(data);
  },

  async deleteBillingParty(scope, id) {
    const { error } = await getSupabaseClient()
      .from("billing_parties")
      .delete()
      .eq("id", id)
      .eq("organization_id", scope.organizationId);

    if (error) {
      logDevError("Supabase billing party delete failed", error);
      throw mapSupabaseError(error);
    }
  }
};
