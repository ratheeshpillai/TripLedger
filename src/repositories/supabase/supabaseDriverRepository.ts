import type { Driver, DriverDraft, DriverStatus } from "../../types/driver";
import type { OrganizationScope } from "../../types/organization";
import { logDevError } from "../../utils/errors";
import type { DriverRepository } from "../driverRepository";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type DriverInsert = Database["public"]["Tables"]["drivers"]["Insert"];
type DriverUpdate = Database["public"]["Tables"]["drivers"]["Update"];

function driverStatus(value: string): DriverStatus {
  if (value === "active" || value === "inactive") return value;
  throw new Error("Unsupported driver status.");
}

export function toDriver(row: DriverRow): Driver {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone ?? "",
    status: driverStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toInsert(scope: OrganizationScope, draft: DriverDraft): DriverInsert {
  return {
    organization_id: scope.organizationId,
    name: draft.name,
    phone: draft.phone || null,
    status: draft.status
  };
}

function toUpdate(draft: DriverDraft): DriverUpdate {
  return {
    name: draft.name,
    phone: draft.phone || null,
    status: draft.status
  };
}

export const supabaseDriverRepository: DriverRepository = {
  async listDrivers(scope) {
    const { data, error } = await getSupabaseClient()
      .from("drivers")
      .select("*")
      .eq("organization_id", scope.organizationId)
      .order("status", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      logDevError("Supabase driver list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toDriver);
  },

  async createDriver(scope, draft) {
    const { data, error } = await getSupabaseClient()
      .from("drivers")
      .insert(toInsert(scope, draft))
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase driver create failed", error);
      throw mapSupabaseError(error);
    }
    return toDriver(data);
  },

  async updateDriver(scope, id, draft) {
    const { data, error } = await getSupabaseClient()
      .from("drivers")
      .update(toUpdate(draft))
      .eq("id", id)
      .eq("organization_id", scope.organizationId)
      .select("*")
      .single();

    if (error) {
      logDevError("Supabase driver update failed", error);
      throw mapSupabaseError(error);
    }
    return toDriver(data);
  }
};
