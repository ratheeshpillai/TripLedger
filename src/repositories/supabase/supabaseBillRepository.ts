import type { Bill } from "../../types/bill";
import { logDevError } from "../../utils/errors";
import type { BillRepository } from "../billRepository";
import { getSupabaseClient } from "./supabaseClient";

type BillRow = {
  id: string;
  user_id: string;
  company_id: string | null;
  driver_id: string | null;
  vehicle_id: string | null;
  guest_id: string | null;
  driver_name: string | null;
  vehicle_name: string | null;
  vehicle_number: string | null;
  guest_salutation: Bill["guestSalutation"] | null;
  guest_name: string | null;
  customer_name: string | null;
  passenger_name: string | null;
  title_prefix: string | null;
  reporting_place: string | null;
  start_location: string | null;
  end_location: string | null;
  trip_date: string | null;
  date: string | null;
  reporting_time: string | null;
  garage_time: string | null;
  closing_date: string | null;
  closing_time: string | null;
  base_package: string | null;
  base_hours: number | null;
  base_km: number | null;
  base_amount: number | null;
  opening_kilometer: number | null;
  closing_kilometer: number | null;
  total_km: number | null;
  total_kilometers: number | null;
  extra_km: number | null;
  extra_km_rate: number | null;
  rate_per_kilometer: number | null;
  extra_km_amount: number | null;
  kilometer_amount: number | null;
  total_hours: number | null;
  extra_hours: number | null;
  extra_hour_rate: number | null;
  extra_hour_amount: number | null;
  night_charges: number | null;
  toll_charges: number | null;
  airport_parking: number | null;
  parking_charges: number | null;
  fastag: number | null;
  road_parking: number | null;
  permit_charges: number | null;
  other_charges: number | null;
  advance_amount: number | null;
  pending_amount: number | null;
  balance_amount: number | null;
  total_amount: number | null;
  notes: string | null;
  remarks: string | null;
  whatsapp_number: string | null;
  created_at: string;
  updated_at: string;
};

function text(value: string | null | undefined): string {
  return value ?? "";
}

function number(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function dateOrNull(value: string): string | null {
  return value || null;
}

function toBill(row: BillRow): Bill {
  return {
    id: row.id,
    companyId: row.company_id ?? undefined,
    userId: row.user_id,
    driverId: row.driver_id ?? undefined,
    vehicleId: row.vehicle_id ?? undefined,
    guestId: row.guest_id ?? undefined,
    driverName: text(row.driver_name),
    vehicleName: text(row.vehicle_name),
    vehicleNumber: text(row.vehicle_number),
    guestSalutation: row.guest_salutation ?? row.title_prefix as Bill["guestSalutation"] | undefined,
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

function toRow(userId: string, bill: Bill): Partial<BillRow> {
  return {
    id: bill.id,
    user_id: userId,
    company_id: bill.companyId ?? null,
    driver_id: bill.driverId ?? null,
    vehicle_id: bill.vehicleId ?? null,
    guest_id: bill.guestId ?? null,
    driver_name: bill.driverName,
    vehicle_name: bill.vehicleName,
    vehicle_number: bill.vehicleNumber,
    guest_salutation: bill.guestSalutation ?? null,
    guest_name: bill.guestName,
    customer_name: bill.guestName,
    passenger_name: bill.guestName,
    title_prefix: bill.guestSalutation ?? null,
    reporting_place: bill.reportingPlace,
    start_location: bill.reportingPlace,
    end_location: null,
    trip_date: dateOrNull(bill.tripDate),
    date: dateOrNull(bill.tripDate),
    reporting_time: bill.reportingTime,
    garage_time: bill.garageTime,
    closing_date: dateOrNull(bill.closingDate),
    closing_time: bill.closingTime,
    base_package: bill.basePackage,
    base_hours: bill.baseHours,
    base_km: bill.baseKm,
    base_amount: bill.baseAmount,
    opening_kilometer: null,
    closing_kilometer: null,
    total_km: bill.totalKm,
    total_kilometers: bill.totalKm,
    extra_km: bill.extraKm,
    extra_km_rate: bill.extraKmRate,
    rate_per_kilometer: bill.extraKmRate,
    extra_km_amount: bill.extraKmAmount,
    kilometer_amount: bill.extraKmAmount,
    total_hours: bill.totalHours,
    extra_hours: bill.extraHours,
    extra_hour_rate: bill.extraHourRate,
    extra_hour_amount: bill.extraHourAmount,
    night_charges: 0,
    toll_charges: bill.fastag,
    airport_parking: bill.airportParking,
    parking_charges: bill.airportParking + bill.roadParking,
    fastag: bill.fastag,
    road_parking: bill.roadParking,
    permit_charges: 0,
    other_charges: 0,
    advance_amount: bill.advanceAmount,
    pending_amount: bill.pendingAmount,
    balance_amount: bill.pendingAmount,
    total_amount: bill.totalAmount,
    notes: bill.notes,
    remarks: bill.notes,
    whatsapp_number: bill.whatsappNumber,
    created_at: bill.createdAt,
    updated_at: bill.updatedAt
  };
}

export const supabaseBillRepository: BillRepository = {
  async listBills(userId) {
    const { data, error } = await getSupabaseClient()
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logDevError("Supabase bill list failed", error);
      throw error;
    }
    return ((data ?? []) as BillRow[]).map(toBill);
  },

  async saveBill(userId, bill) {
    const { data, error } = await getSupabaseClient()
      .from("bills")
      .insert(toRow(userId, bill))
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase bill save failed", error);
      throw error;
    }
    return toBill(data as BillRow);
  },

  async updateBill(userId, bill) {
    const { data, error } = await getSupabaseClient()
      .from("bills")
      .update(toRow(userId, bill))
      .eq("id", bill.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase bill update failed", error);
      throw error;
    }
    return toBill(data as BillRow);
  },

  async deleteBill(userId, id) {
    const { error } = await getSupabaseClient()
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      logDevError("Supabase bill delete failed", error);
      throw error;
    }
  }
};
