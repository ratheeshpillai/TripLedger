import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterVehicles } from "../src/components/vehicles/vehiclePageModel";
import type { VehicleRepository } from "../src/repositories/vehicleRepository";
import { toVehicle } from "../src/repositories/supabase/supabaseVehicleRepository";
import { createVehicleService } from "../src/services/vehicleService";
import type { OrganizationScope } from "../src/types/organization";
import type { Vehicle, VehicleDraft } from "../src/types/vehicle";
import { AppError } from "../src/utils/errors";

const scope: OrganizationScope = { organizationId: "org-1", userId: "user-1", businessType: "vendor", role: "owner" };
const now = "2026-08-25T00:00:00Z";

function vehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "vehicle-1",
    organizationId: "org-1",
    registrationNumber: "MH03 CV 4312",
    displayName: "Airport Innova",
    makeModel: "Toyota Innova Crysta",
    year: 2024,
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

test("Supabase rows map into provider-independent Vehicle values", () => {
  assert.deepEqual(toVehicle({
    id: "vehicle-1",
    organization_id: "org-1",
    registration_number: "MH03 CV 4312",
    registration_number_normalized: "MH03CV4312",
    display_name: null,
    make_model: null,
    year: null,
    status: "inactive",
    created_at: now,
    updated_at: now
  }), vehicle({ displayName: "", makeModel: "", year: null, status: "inactive" }));
});

test("vehicle service normalizes input and propagates organization scope", async () => {
  const calls: Array<{ action: string; scope: OrganizationScope; draft?: VehicleDraft; id?: string }> = [];
  const repository: VehicleRepository = {
    async listVehicles(receivedScope) { calls.push({ action: "list", scope: receivedScope }); return [vehicle()]; },
    async createVehicle(receivedScope, draft) { calls.push({ action: "create", scope: receivedScope, draft }); return vehicle({ ...draft }); },
    async updateVehicle(receivedScope, id, draft) { calls.push({ action: "update", scope: receivedScope, id, draft }); return vehicle({ id, ...draft }); }
  };
  const service = createVehicleService(repository);

  assert.equal((await service.listVehicles(scope))[0]?.registrationNumber, "MH03 CV 4312");
  const saved = await service.createVehicle(scope, {
    registrationNumber: "  mh03   cv 4312  ",
    displayName: "  Airport Innova  ",
    makeModel: "  Toyota Innova Crysta  ",
    year: 2024,
    status: "active"
  });
  assert.equal(saved.registrationNumber, "MH03 CV 4312");
  assert.deepEqual(calls[1]?.draft, {
    registrationNumber: "MH03 CV 4312",
    displayName: "Airport Innova",
    makeModel: "Toyota Innova Crysta",
    year: 2024,
    status: "active"
  });
  assert.deepEqual(calls.map((call) => call.scope), [scope, scope]);
});

test("vehicle service rejects invalid input before persistence", () => {
  const repository: VehicleRepository = {
    async listVehicles() { return []; },
    async createVehicle() { throw new Error("should not run"); },
    async updateVehicle() { throw new Error("should not run"); }
  };
  const service = createVehicleService(repository);
  const valid: VehicleDraft = { registrationNumber: "MH03CV4312", displayName: "", makeModel: "", year: null, status: "active" };

  assert.throws(() => service.createVehicle(scope, { ...valid, registrationNumber: " " }), AppError);
  assert.throws(() => service.createVehicle(scope, { ...valid, registrationNumber: "M" }), AppError);
  assert.throws(() => service.createVehicle(scope, { ...valid, registrationNumber: "MH03CV431234567890123" }), AppError);
  assert.throws(() => service.createVehicle(scope, { ...valid, year: 1800 }), AppError);
  assert.throws(() => service.updateVehicle(scope, "", valid), AppError);
});

test("vehicle search includes registration, name, make, year and status", () => {
  const vehicles = [vehicle(), vehicle({ id: "vehicle-2", registrationNumber: "MH04AB1234", displayName: "", makeModel: "Maruti Dzire", year: null, status: "inactive" })];
  assert.deepEqual(filterVehicles(vehicles, "innova").map((item) => item.id), ["vehicle-1"]);
  assert.deepEqual(filterVehicles(vehicles, "mh04").map((item) => item.id), ["vehicle-2"]);
  assert.deepEqual(filterVehicles(vehicles, "inactive").map((item) => item.id), ["vehicle-2"]);
});

test("Phase 6B.1 vehicle foundation stays additive and outside bills and assignments", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260825193630_vehicle_management_foundation.sql", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/layout/AppShell.tsx", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../src/components/settings/SettingsPage.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../src/components/auth/AuthPage.tsx", import.meta.url), "utf8");

  assert.match(migration, /create table public\.vehicles/);
  assert.match(migration, /vehicles_organization_registration_uidx/);
  assert.match(migration, /private\.can_manage_vehicles\(organization_id\)/);
  assert.match(migration, /public\.is_mfa_requirement_satisfied\(\)/);
  assert.doesNotMatch(migration, /alter table public\.bills|driver_id|vehicle_id|delete policy/);
  assert.match(app, /page === "drivers" \|\| page === "vehicles"/);
  assert.match(app, /page === "vehicles" && canManageFleetResources/);
  assert.match(shell, /item\.id !== "vehicles" \|\| canManageVehicles/);
  assert.match(settings, /onOpenVehicles && <Button/);
  assert.match(auth, /<option value="vendor">Fleet Owner<\/option>/);
  assert.doesNotMatch(auth, /Transport Business/);
});
