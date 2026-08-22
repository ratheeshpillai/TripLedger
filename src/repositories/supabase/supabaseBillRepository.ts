import type { Bill } from "../../types/bill";
import type { OrganizationScope } from "../../types/organization";
import { sameBillFingerprint } from "../../utils/billFingerprint";
import { AppError, DuplicateBillError, logDevError } from "../../utils/errors";
import type { BillRepository } from "../billRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type BillRow = Database["public"]["Tables"]["bills"]["Row"] & {
  billing_parties?: {
    name: string | null;
    company_name: string | null;
  } | null;
};
// Generated RPC args do not retain PostgreSQL parameter nullability.
type CreateBillArgs = Extract<Database["public"]["Functions"]["create_bill"], { Args: { p_client_request_id: string } }>["Args"];
type UpdateBillArgs = Database["public"]["Functions"]["update_bill"]["Args"];
type QueryBillRow = Database["public"]["Functions"]["query_bills"]["Returns"][number];

function text(value: string | null | undefined): string {
  return value ?? "";
}

function number(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function dateOrNull(value: string | null | undefined): string | null {
  return value || null;
}

function salutationOrNull(value: Bill["guestSalutation"] | null | undefined): "Mr." | "Mrs." | "Miss." | null {
  if (value === "Miss") return "Miss.";
  return value ?? null;
}

function toGuestSalutation(value: string | null | undefined): Bill["guestSalutation"] | undefined {
  if (value === "Mr." || value === "Mrs." || value === "Miss." || value === "Miss") return value;
  return undefined;
}

function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    companyId: row.company_id ?? undefined,
    billingPartyId: row.billing_party_id ?? undefined,
    billingPartyName: row.billing_parties?.name ?? undefined,
    billingPartyCompanyName: row.billing_parties?.company_name ?? undefined,
    organizationId: row.organization_id,
    userId: row.user_id,
    driverId: row.driver_id ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    guestId: row.guest_id ?? undefined,
    driverName: text(row.driver_name),
    vehicleName: text(row.vehicle_name),
    vehicleNumber: text(row.vehicle_number),
    guestSalutation: toGuestSalutation(row.guest_salutation ?? row.title_prefix),
    guestName: text(row.guest_name ?? row.customer_name ?? row.passenger_name),
    reportingPlace: text(row.reporting_place ?? row.start_location),
    tripDate: text(row.trip_date ?? row.date),
    reportingTime: text(row.reporting_time),
    garageTime: text(row.garage_time),
    closingDate: text(row.closing_date),
    closingTime: text(row.closing_time),
    basePackage: text(row.base_package),
    baseHours: number(row.base_hours),
    baseKm: number(row.base_km),
    baseAmount: number(row.base_amount),
    totalKm: number(row.total_km ?? row.total_kilometers),
    extraKm: number(row.extra_km),
    extraKmRate: number(row.extra_km_rate ?? row.rate_per_kilometer),
    extraKmAmount: number(row.extra_km_amount ?? row.kilometer_amount),
    totalHours: number(row.total_hours),
    extraHours: number(row.extra_hours),
    extraHourRate: number(row.extra_hour_rate),
    extraHourAmount: number(row.extra_hour_amount),
    airportParking: number(row.airport_parking),
    fastag: number(row.fastag ?? row.toll_charges),
    roadParking: number(row.road_parking),
    advanceAmount: number(row.advance_amount),
    pendingAmount: number(row.pending_amount ?? row.balance_amount),
    totalAmount: number(row.total_amount),
    notes: text(row.notes ?? row.remarks),
    whatsappNumber: text(row.whatsapp_number),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toBillRpcParams(bill: Bill) {
  return {
    p_company_id: bill.companyId ?? null,
    p_billing_party_id: bill.billingPartyId ?? null,
    p_driver_id: bill.driverId ?? null,
    p_vehicle_id: bill.vehicleId ?? null,
    p_guest_id: bill.guestId ?? null,
    p_driver_name: bill.driverName,
    p_vehicle_name: bill.vehicleName,
    p_vehicle_number: bill.vehicleNumber,
    p_guest_salutation: salutationOrNull(bill.guestSalutation),
    p_guest_name: bill.guestName,
    p_reporting_place: bill.reportingPlace,
    p_trip_date: dateOrNull(bill.tripDate),
    p_reporting_time: bill.reportingTime,
    p_garage_time: bill.garageTime,
    p_closing_date: dateOrNull(bill.closingDate),
    p_closing_time: bill.closingTime,
    p_base_package: bill.basePackage,
    p_base_hours: bill.baseHours,
    p_base_km: bill.baseKm,
    p_base_amount: bill.baseAmount,
    p_opening_kilometer: null,
    p_closing_kilometer: null,
    p_total_km: bill.totalKm,
    p_extra_km_rate: bill.extraKmRate,
    p_total_hours: bill.totalHours,
    p_extra_hour_rate: bill.extraHourRate,
    p_airport_parking: bill.airportParking,
    p_fastag: bill.fastag,
    p_road_parking: bill.roadParking,
    p_advance_amount: bill.advanceAmount,
    p_pending_amount: bill.pendingAmount,
    p_notes: bill.notes,
    p_whatsapp_number: bill.whatsappNumber
  };
}

async function findDuplicateBill(scope: OrganizationScope, bill: Bill): Promise<Bill | undefined> {
  let query = getSupabaseClient()
    .from("bills")
    .select("*, billing_parties(name, company_name)")
    .eq("organization_id", scope.organizationId)
    .eq("billing_party_id", bill.billingPartyId ?? "")
    .eq("reporting_time", bill.reportingTime)
    .eq("closing_time", bill.closingTime)
    .limit(20);

  query = bill.tripDate ? query.eq("trip_date", bill.tripDate) : query.is("trip_date", null);
  query = bill.closingDate ? query.eq("closing_date", bill.closingDate) : query.is("closing_date", null);
  const { data, error } = await query;

  if (error) {
    logDevError("Supabase duplicate bill lookup failed", error);
    return undefined;
  }

  return (data ?? []).map(toBill).find((candidate) => sameBillFingerprint(candidate, bill));
}

export const supabaseBillRepository: BillRepository = {
  async queryBills(scope, query) {
    const { data, error } = await getSupabaseClient().rpc("query_bills", {
      p_organization_id: scope.organizationId,
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search: query.search?.trim() || undefined,
      p_date_from: query.dateFrom || undefined,
      p_date_to: query.dateTo || undefined,
      p_billing_party_id: query.billingPartyId || undefined,
      p_sort: query.sort
    });

    if (error) {
      logDevError("Supabase bill query failed", error);
      throw mapSupabaseError(error);
    }
    const rows = (data ?? []) as QueryBillRow[];
    return {
      items: rows.map((row) => toBill({
        ...(row.bill as unknown as Database["public"]["Tables"]["bills"]["Row"]),
        billing_parties: {
          name: row.billing_party_name,
          company_name: row.billing_party_company_name
        }
      })),
      totalCount: Number(rows[0]?.result_count ?? 0),
      totalAmount: Number(rows[0]?.result_total ?? 0)
    };
  },

  async getBill(scope, id) {
    const { data, error } = await getSupabaseClient()
      .from("bills")
      .select("*, billing_parties(name, company_name)")
      .eq("organization_id", scope.organizationId)
      .eq("id", id)
      .single();

    if (error) {
      logDevError("Supabase bill load failed", error);
      throw mapSupabaseError(error);
    }
    return toBill(data);
  },

  async saveBill(scope, bill, requestId) {
    const { data, error } = await getSupabaseClient()
      .rpc("create_bill", {
        p_client_request_id: requestId,
        ...toBillRpcParams(bill)
      } as unknown as CreateBillArgs)
      .single();

    if (error) {
      if (error.code === "23505" || error.code === "23514") {
        const duplicate = await findDuplicateBill(scope, bill);
        if (duplicate) throw new DuplicateBillError(duplicate);
      }
      logDevError("Supabase bill save failed", error);
      throw mapSupabaseError(error);
    }
    return toBill(data);
  },

  async updateBill(scope, bill) {
    const { data, error } = await getSupabaseClient()
      .rpc("update_bill", {
        p_bill_id: bill.id,
        ...toBillRpcParams(bill)
      } as unknown as UpdateBillArgs)
      .single();

    if (error) {
      if (error.code === "23505") {
        const duplicate = await findDuplicateBill(scope, bill);
        if (duplicate && duplicate.id !== bill.id) throw new DuplicateBillError(duplicate);
      }
      logDevError("Supabase bill update failed", error);
      throw mapSupabaseError(error);
    }
    return toBill(data);
  },

  async deleteBill(scope, id) {
    const { error } = await getSupabaseClient()
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("organization_id", scope.organizationId);

    if (error) {
      logDevError("Supabase bill delete failed", error);
      throw mapSupabaseError(error);
    }
  },

  async deleteBills(scope, ids) {
    const uniqueIds = [...new Set(ids)].filter(Boolean);
    if (uniqueIds.length === 0) return;

    const { data: ownedRows, error: ownershipError } = await getSupabaseClient()
      .from("bills")
      .select("id")
      .eq("organization_id", scope.organizationId)
      .in("id", uniqueIds);

    if (ownershipError) {
      logDevError("Supabase bill bulk delete ownership check failed", ownershipError);
      throw mapSupabaseError(ownershipError);
    }

    const ownedIds = new Set((ownedRows ?? []).map((row) => row.id));
    if (ownedIds.size !== uniqueIds.length || uniqueIds.some((id) => !ownedIds.has(id))) {
      const ownershipMismatchError = new AppError("FORBIDDEN");
      logDevError("Supabase bill bulk delete ownership mismatch", ownershipMismatchError);
      throw ownershipMismatchError;
    }

    const { error } = await getSupabaseClient()
      .from("bills")
      .delete()
      .eq("organization_id", scope.organizationId)
      .in("id", uniqueIds);

    if (error) {
      logDevError("Supabase bill bulk delete failed", error);
      throw mapSupabaseError(error);
    }
  }
};
