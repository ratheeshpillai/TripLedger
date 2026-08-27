import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assignedVehiclesForDriver, fleetVehicleName } from "../src/utils/fleetBillSelection.ts";
import type { DriverVehicleAssignment } from "../src/types/driverVehicleAssignment.ts";
import type { Vehicle } from "../src/types/vehicle.ts";

const vehicle = (id: string, status: Vehicle["status"] = "active", displayName = "") => ({
  id,
  organizationId: "org-1",
  registrationNumber: id.toUpperCase(),
  displayName,
  makeModel: "Toyota Innova",
  year: 2024,
  status,
  createdAt: "",
  updatedAt: ""
}) satisfies Vehicle;

const assignment = (driverId: string, vehicleId: string, status: DriverVehicleAssignment["status"] = "active") => ({
  id: `${driverId}-${vehicleId}`,
  organizationId: "org-1",
  driverId,
  vehicleId,
  status,
  endedAt: status === "active" ? null : "2026-08-28T00:00:00Z",
  createdAt: "",
  updatedAt: ""
}) satisfies DriverVehicleAssignment;

test("Fleet Owner vehicle choices contain only active vehicles assigned to the selected driver", () => {
  const vehicles = [vehicle("vehicle-x", "active", "Airport Innova"), vehicle("vehicle-y"), vehicle("vehicle-z", "inactive")];
  const assignments = [assignment("driver-a", "vehicle-x"), assignment("driver-b", "vehicle-y"), assignment("driver-a", "vehicle-z")];

  assert.deepEqual(assignedVehiclesForDriver("driver-a", vehicles, assignments).map(({ id }) => id), ["vehicle-x"]);
  assert.deepEqual(assignedVehiclesForDriver("driver-b", vehicles, assignments).map(({ id }) => id), ["vehicle-y"]);
  assert.deepEqual(assignedVehiclesForDriver(undefined, vehicles, assignments), []);
  assert.equal(fleetVehicleName(vehicles[0]), "Airport Innova");
});

test("Phase 6B.3 validates writes at the bill table boundary and preserves snapshots", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260828113000_bill_driver_vehicle_integration.sql", import.meta.url), "utf8");
  assert.match(migration, /before insert or update on public\.bills/i);
  assert.match(migration, /for share/i);
  assert.match(migration, /driver_vehicle_assignments/i);
  assert.match(migration, /new\.organization_id is distinct from old\.organization_id/i);
  assert.match(migration, /new\.driver_name = old\.driver_name/i);
  assert.match(migration, /new\.vehicle_number = old\.vehicle_number/i);
  assert.match(migration, /revoke all on function public\.validate_bill_driver_vehicle\(\)/i);
});

test("Logger uses assignment-aware selectors only for Fleet Owner workspaces", () => {
  const logger = readFileSync(new URL("../src/components/logger/LoggerPage.tsx", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const form = readFileSync(new URL("../src/hooks/useBillForm.ts", import.meta.url), "utf8");
  assert.match(logger, /isFleetOwner \? \(/);
  assert.match(logger, /No active vehicle is assigned to this driver/);
  assert.match(app, /fleetBillEnabled/);
  assert.match(form, /clearManagedFleetResources/);
});
