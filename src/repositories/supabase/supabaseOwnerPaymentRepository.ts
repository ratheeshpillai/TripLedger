import type { OwnerPayment, OwnerPaymentDraft } from "../../types/ownerPayment";
import { logDevError } from "../../utils/errors";
import type { OwnerPaymentRepository } from "../ownerPaymentRepository";
import { getSupabaseClient } from "./supabaseClient";

type OwnerPaymentRow = {
  id: string;
  user_id: string;
  billing_party_id: string;
  payment_date: string;
  amount: number | string;
  payment_type: OwnerPayment["paymentType"];
  payment_method: OwnerPayment["paymentMethod"] | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function text(value: string | null | undefined): string {
  return value ?? "";
}

function toOwnerPayment(row: OwnerPaymentRow): OwnerPayment {
  return {
    id: row.id,
    userId: row.user_id,
    billingPartyId: row.billing_party_id,
    paymentDate: row.payment_date,
    amount: Number(row.amount ?? 0),
    paymentType: row.payment_type,
    paymentMethod: row.payment_method ?? "",
    reference: text(row.reference),
    notes: text(row.notes),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toWriteRow(userId: string, draft: OwnerPaymentDraft): Partial<OwnerPaymentRow> {
  return {
    user_id: userId,
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
  async listOwnerPayments(userId, billingPartyId) {
    let query = getSupabaseClient()
      .from("owner_payments")
      .select("*")
      .eq("user_id", userId)
      .order("payment_date", { ascending: false });

    if (billingPartyId) query = query.eq("billing_party_id", billingPartyId);

    const { data, error } = await query;

    if (error) {
      logDevError("Supabase owner payment list failed", error);
      throw error;
    }
    return ((data ?? []) as OwnerPaymentRow[]).map(toOwnerPayment);
  },

  async saveOwnerPayment(_userId, draft, requestId) {
    const { data, error } = await getSupabaseClient()
      .rpc("create_owner_payment", toCreateRpcParams(draft, requestId))
      .single();

    if (error) {
      logDevError("Supabase owner payment save failed", error);
      throw error;
    }
    return toOwnerPayment(data as OwnerPaymentRow);
  },

  async updateOwnerPayment(userId, payment) {
    const { data, error } = await getSupabaseClient()
      .from("owner_payments")
      .update(toWriteRow(userId, payment))
      .eq("id", payment.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase owner payment update failed", error);
      throw error;
    }
    return toOwnerPayment(data as OwnerPaymentRow);
  },

  async deleteOwnerPayment(userId, id) {
    const { error } = await getSupabaseClient()
      .from("owner_payments")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      logDevError("Supabase owner payment delete failed", error);
      throw error;
    }
  }
};
