import type { DriverVehicleAssignmentRepository } from "../driverVehicleAssignmentRepository";
import type { DriverVehicleAssignment, DriverVehicleAssignmentStatus } from "../../types/driverVehicleAssignment";
import { logDevError } from "../../utils/errors";
import type { Database } from "./database.types";
import { getSupabaseClient } from "./supabaseClient";
import { mapSupabaseError } from "./supabaseError";

type AssignmentRow = Database["public"]["Tables"]["driver_vehicle_assignments"]["Row"];

function assignmentStatus(value: string): DriverVehicleAssignmentStatus {
  if (value === "active" || value === "inactive") return value;
  throw new Error("Unsupported assignment status.");
}

export function toDriverVehicleAssignment(row: AssignmentRow): DriverVehicleAssignment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    status: assignmentStatus(row.status),
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const supabaseDriverVehicleAssignmentRepository: DriverVehicleAssignmentRepository = {
  async listAssignments(scope) {
    const { data, error } = await getSupabaseClient()
      .from("driver_vehicle_assignments")
      .select("*")
      .eq("organization_id", scope.organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      logDevError("Supabase driver vehicle assignment list failed", error);
      throw mapSupabaseError(error);
    }
    return (data ?? []).map(toDriverVehicleAssignment);
  },

  async assignDriver(scope, vehicleId, driverId) {
    const { data, error } = await getSupabaseClient().rpc("assign_driver_to_vehicle", {
      p_organization_id: scope.organizationId,
      p_vehicle_id: vehicleId,
      p_driver_id: driverId
    });

    if (error) {
      logDevError("Supabase driver vehicle assignment failed", error);
      throw mapSupabaseError(error);
    }
    return toDriverVehicleAssignment(data);
  },

  async endAssignment(scope, vehicleId) {
    const { data, error } = await getSupabaseClient().rpc("end_driver_vehicle_assignment", {
      p_organization_id: scope.organizationId,
      p_vehicle_id: vehicleId
    });

    if (error) {
      logDevError("Supabase driver vehicle assignment end failed", error);
      throw mapSupabaseError(error);
    }
    return toDriverVehicleAssignment(data);
  }
};
