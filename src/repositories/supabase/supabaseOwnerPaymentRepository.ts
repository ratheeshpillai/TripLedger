import type { OwnerPayment, OwnerPaymentDraft } from "../../types/ownerPayment";
import { logDevError } from "../../utils/errors";
import type { OwnerPaymentRepository } from "../ownerPaymentRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type OwnerPaymentRow = Database["public"]["Tables"]["owner_payments"]["Row"];
type OwnerPaymentWriteRow = Database["public"]["Tables"]["owner_payments"]["Update"];
// Generated RPC args do not retain PostgreSQL parameter nullability.
type CreateOwnerPaymentArgs = Database["public"]["Functions"]["create_owner_payment"]["Args"];

function text(value: string | null | undefined): string {
  return value ?? "";
}

function paymentType(value: string): OwnerPayment["paymentType"] {
  if (value === "payment_received" || value === "advance_received") return value;
  throw new Error("Unsupported owner payment type.");
}

function paymentMethod(value: string | null): OwnerPayment["paymentMethod"] {
  if (!value) return "";
  if (value === "cash" || value === "bank_transfer" || value === "upi" || value === "cheque" || value === "other") return value;
  throw new Error("Unsupported owner payment method.");
}

function toOwnerPayment(row: OwnerPaymentRow): OwnerPayment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    billingPartyId: row.billing_party_id,
    paymentDate: row.payment_date,
    amount: Number(row.amount ?? 0),
    paymentType: paymentType(row.payment_type),
    paymentMethod: paymentMethod(row.payment_method),
    reference: text(row.reference),
    notes: text(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toWriteRow(draft: OwnerPaymentDraft): OwnerPaymentWriteRow {
  return {
    billing_party_id: draft.billingPartyId,
    payment_date: draft.paymentDate,
    amount: draft.amount,
    payment_type: draft.paymentType,
    payment_method: draft.paymentMethod || null,
    reference: draft.reference.trim() || null,
    notes: draft.notes.trim() || null
  };
}

function toCreateRpcParams(draft: OwnerPaymentDraft, requestId: string) {
  return {
    p_client_request_id: requestId,
    p_billing_party_id: draft.billingPartyId,
    p_payment_date: draft.paymentDate,
    p_amount: draft.amount,
    p_payment_type: draft.paymentType,
    p_payment_method: draft.paymentMethod || null,
    p_reference: draft.reference.trim() || null,
    p_notes: draft.notes.trim() || null
  };
}

export const supabaseOwnerPaymentRepository: OwnerPaymentRepository = {
  async listOwnerPayments(scope, billingPartyId) {
    let query = getSupabaseClient()
      .from("owner_payments")
      .select("*")
      .eq("organization_id", scope.organizationId)
      .order("payment_date", { ascending: false });

    if (billingPartyId) query = query.eq("billing_party_id", billingPartyId);

    const { data, error } = await query;

    if (error) {
      logDevError("Supabase owner payment list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toOwnerPayment);
  },

  async saveOwnerPayment(_scope, draft, requestId) {
    const { data, error } = await getSupabaseClient()
      .rpc("create_owner_payment", toCreateRpcParams(draft, requestId) as CreateOwnerPaymentArgs)
      .single();

    if (error) {
      logDevError("Supabase owner payment save failed", error);
      throw mapSupabaseError(error);
    }
    return toOwnerPayment(data);
  },

  async updateOwnerPayment(scope, payment) {
    const { data, error } = await getSupabaseClient()
      .from("owner_payments")
      .update(toWriteRow(payment))
      .eq("id", payment.id)
      .eq("organization_id", scope.organizationId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase owner payment update failed", error);
      throw mapSupabaseError(error);
    }
    return toOwnerPayment(data);
  },

  async deleteOwnerPayment(scope, id) {
    const { error } = await getSupabaseClient()
      .from("owner_payments")
      .delete()
      .eq("id", id)
      .eq("organization_id", scope.organizationId);

    if (error) {
      logDevError("Supabase owner payment delete failed", error);
      throw mapSupabaseError(error);
    }
  }
};
