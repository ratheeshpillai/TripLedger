import type { OrganizationScope } from "../../types/organization";
import type { Vehicle, VehicleDraft, VehicleStatus } from "../../types/vehicle";
import { logDevError } from "../../utils/errors";
import type { VehicleRepository } from "../vehicleRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

function vehicleStatus(value: string): VehicleStatus {
  if (value === "active" || value === "inactive") return value;
  throw new Error("Unsupported vehicle status.");
}

export function toVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    organizationId: row.organization_id,
    registrationNumber: row.registration_number,
    displayName: row.display_name ?? "",
    makeModel: row.make_model ?? "",
    year: row.year,
    status: vehicleStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toInsert(scope: OrganizationScope, draft: VehicleDraft): VehicleInsert {
  return {
    organization_id: scope.organizationId,
    registration_number: draft.registrationNumber,
    display_name: draft.displayName || null,
    make_model: draft.makeModel || null,
    year: draft.year,
    status: draft.status
  };
}

function toUpdate(draft: VehicleDraft): VehicleUpdate {
  return {
    registration_number: draft.registrationNumber,
    display_name: draft.displayName || null,
    make_model: draft.makeModel || null,
    year: draft.year,
    status: draft.status
  };
}

export const supabaseVehicleRepository: VehicleRepository = {
  async listVehicles(scope) {
    const { data, error } = await getSupabaseClient()
      .from("vehicles")
      .select("*")
      .eq("organization_id", scope.organizationId)
      .order("status", { ascending: true })
      .order("registration_number", { ascending: true });

    if (error) {
      logDevError("Supabase vehicle list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toVehicle);
  },

  async createVehicle(scope, draft) {
    const { data, error } = await getSupabaseClient()
      .from("vehicles")
      .insert(toInsert(scope, draft))
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase vehicle create failed", error);
      throw mapSupabaseError(error);
    }
    return toVehicle(data);
  },

  async updateVehicle(scope, id, draft) {
    const { data, error } = await getSupabaseClient()
      .from("vehicles")
      .update(toUpdate(draft))
      .eq("id", id)
      .eq("organization_id", scope.organizationId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase vehicle update failed", error);
      throw mapSupabaseError(error);
    }
    return toVehicle(data);
  }
};
