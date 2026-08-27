import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { DriverVehicleAssignmentRepository } from "../src/repositories/driverVehicleAssignmentRepository";
import { toDriverVehicleAssignment } from "../src/repositories/supabase/supabaseDriverVehicleAssignmentRepository";
import { mapSupabaseError } from "../src/repositories/supabase/supabaseError";
import { createDriverVehicleAssignmentService } from "../src/services/driverVehicleAssignmentService";
import type { DriverVehicleAssignment } from "../src/types/driverVehicleAssignment";
import type { OrganizationScope } from "../src/types/organization";
import { AppError } from "../src/utils/errors";

const scope: OrganizationScope = { organizationId: "org-1", userId: "user-1", businessType: "vendor", role: "owner" };
const now = "2026-08-27T00:00:00Z";
const assignment: DriverVehicleAssignment = {
  id: "assignment-1",
  organizationId: "org-1",
  driverId: "driver-1",
  vehicleId: "vehicle-1",
  status: "active",
  endedAt: null,
  createdAt: now,
  updatedAt: now
};

test("Supabase assignment rows map into provider-independent values", () => {
  assert.deepEqual(toDriverVehicleAssignment({
    id: "assignment-1",
    organization_id: "org-1",
    driver_id: "driver-1",
    vehicle_id: "vehicle-1",
    status: "active",
    ended_at: null,
    created_at: now,
    updated_at: now
  }), assignment);
});

test("assignment service preserves organization scope and validates identifiers", async () => {
  const calls: string[] = [];
  const repository: DriverVehicleAssignmentRepository = {
    async listAssignments(receivedScope) { calls.push(`list:${receivedScope.organizationId}`); return [assignment]; },
    async assignDriver(receivedScope, vehicleId, driverId) { calls.push(`assign:${receivedScope.organizationId}:${vehicleId}:${driverId}`); return assignment; },
    async endAssignment(receivedScope, vehicleId) { calls.push(`end:${receivedScope.organizationId}:${vehicleId}`); return { ...assignment, status: "inactive", endedAt: now }; }
  };
  const service = createDriverVehicleAssignmentService(repository);

  await service.listAssignments(scope);
  await service.assignDriver(scope, "vehicle-1", "driver-1");
  await service.endAssignment(scope, "vehicle-1");
  assert.deepEqual(calls, ["list:org-1", "assign:org-1:vehicle-1:driver-1", "end:org-1:vehicle-1"]);
  assert.throws(() => service.assignDriver(scope, "", "driver-1"), AppError);
  assert.throws(() => service.assignDriver(scope, "vehicle-1", ""), AppError);
});

test("assignment database errors map to safe workflow messages", () => {
  assert.equal(mapSupabaseError({ code: "22023", message: "Driver must be active in this Fleet Owner workspace." }).userMessage, "Select an active driver from this Fleet Owner workspace.");
  assert.equal(mapSupabaseError({ code: "22023", message: "Vehicle must be active in this Fleet Owner workspace." }).userMessage, "Activate this vehicle before assigning a driver.");
  assert.equal(mapSupabaseError({ code: "40001", message: "This vehicle assignment has already changed." }).code, "CONFLICT");
});

test("Phase 6B.2 uses transactional RPCs and keeps assignment controls Fleet Owner-only", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260827155650_driver_vehicle_assignment_foundation.sql", import.meta.url), "utf8");
  const repository = readFileSync(new URL("../src/repositories/supabase/supabaseDriverVehicleAssignmentRepository.ts", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const vehicles = readFileSync(new URL("../src/components/vehicles/VehiclesPage.tsx", import.meta.url), "utf8");

  assert.match(migration, /create table public\.driver_vehicle_assignments/);
  assert.match(migration, /driver_vehicle_assignments_one_active_vehicle_uidx/);
  assert.match(migration, /foreign key \(driver_id, organization_id\)/);
  assert.match(migration, /foreign key \(vehicle_id, organization_id\)/);
  assert.match(migration, /create function public\.assign_driver_to_vehicle/);
  assert.match(migration, /create function public\.end_driver_vehicle_assignment/);
  assert.doesNotMatch(migration, /alter table public\.bills|delete from public\.driver_vehicle_assignments/);
  assert.match(repository, /\.rpc\("assign_driver_to_vehicle"/);
  assert.match(repository, /\.rpc\("end_driver_vehicle_assignment"/);
  assert.match(app, /page === "vehicles" && canManageFleetResources/);
  assert.match(vehicles, /activeDrivers/);
  assert.match(vehicles, /Assign Driver/);
  assert.match(vehicles, /Change Driver/);
  assert.match(vehicles, /End Assignment/);
});
