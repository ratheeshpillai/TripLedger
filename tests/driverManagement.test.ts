import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canManageDrivers, filterDrivers } from "../src/components/drivers/driverPageModel";
import type { DriverRepository } from "../src/repositories/driverRepository";
import { toDriver } from "../src/repositories/supabase/supabaseDriverRepository";
import { createDriverService } from "../src/services/driverService";
import type { Driver, DriverDraft } from "../src/types/driver";
import type { OrganizationScope } from "../src/types/organization";
import { AppError } from "../src/utils/errors";

const scope: OrganizationScope = { organizationId: "org-1", userId: "user-1", businessType: "vendor", role: "owner" };
const now = "2026-08-23T00:00:00Z";

function driver(overrides: Partial<Driver> = {}): Driver {
  return { id: "driver-1", organizationId: "org-1", userId: null, name: "Ramesh", phone: "9000000000", status: "active", createdAt: now, updatedAt: now, ...overrides };
}

test("Supabase rows map into provider-independent Driver values", () => {
  assert.deepEqual(toDriver({ id: "driver-1", organization_id: "org-1", user_id: null, name: "Ramesh", phone: null, status: "inactive", created_at: now, updated_at: now }), driver({ phone: "", status: "inactive" }));
});

test("driver service normalizes drafts and propagates organization scope", async () => {
  const calls: Array<{ action: string; scope: OrganizationScope; draft?: DriverDraft; id?: string }> = [];
  const repository: DriverRepository = {
    async listDrivers(receivedScope) { calls.push({ action: "list", scope: receivedScope }); return [driver()]; },
    async createDriver(receivedScope, draft) { calls.push({ action: "create", scope: receivedScope, draft }); return driver({ name: draft.name, phone: draft.phone, status: draft.status }); },
    async updateDriver(receivedScope, id, draft) { calls.push({ action: "update", scope: receivedScope, id, draft }); return driver({ id, name: draft.name, phone: draft.phone, status: draft.status }); }
  };
  const service = createDriverService(repository);

  assert.equal((await service.listDrivers(scope))[0]?.name, "Ramesh");
  assert.equal((await service.createDriver(scope, { name: "  Suresh  ", phone: "  911  ", status: "active" })).name, "Suresh");
  assert.equal((await service.updateDriver(scope, "driver-1", { name: "Ramesh", phone: "", status: "inactive" })).status, "inactive");
  assert.deepEqual(calls.map((call) => call.scope), [scope, scope, scope]);
  assert.deepEqual(calls[1]?.draft, { name: "Suresh", phone: "911", status: "active" });
});

test("driver service rejects invalid input before persistence", () => {
  const repository: DriverRepository = {
    async listDrivers() { return []; },
    async createDriver() { throw new Error("should not run"); },
    async updateDriver() { throw new Error("should not run"); }
  };
  const service = createDriverService(repository);
  assert.throws(() => service.createDriver(scope, { name: " ", phone: "", status: "active" }), AppError);
  assert.throws(() => service.updateDriver(scope, "", { name: "Ramesh", phone: "", status: "active" }), AppError);
});

test("Driver Management search, status and role state stay focused", () => {
  const drivers = [driver(), driver({ id: "driver-2", name: "Suresh", phone: "", status: "inactive" })];
  assert.deepEqual(filterDrivers(drivers, "inactive").map((item) => item.id), ["driver-2"]);
  assert.deepEqual(filterDrivers(drivers, "9000").map((item) => item.id), ["driver-1"]);
  assert.equal(canManageDrivers("individual_driver", "owner"), false);
  assert.equal(canManageDrivers("individual_driver", "admin"), false);
  assert.equal(canManageDrivers("vendor", "owner"), true);
  assert.equal(canManageDrivers("vendor", "admin"), true);
  assert.equal(canManageDrivers("vendor", "member"), false);
});

test("Phase 6A migration is additive and does not connect drivers to bills", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260823130935_driver_management_foundation.sql", import.meta.url), "utf8");
  assert.match(migration, /create table public\.drivers/);
  assert.match(migration, /user_id uuid references auth\.users\(id\) on delete set null/);
  assert.match(migration, /drivers_organization_user_id_uidx/);
  assert.match(migration, /private\.can_write_organization_data\(organization_id\)/);
  assert.match(migration, /public\.is_mfa_requirement_satisfied\(\)/);
  assert.doesNotMatch(migration, /alter table public\.bills/);
  assert.doesNotMatch(migration, /driver_id/);
});

test("Phase 6A.1 gates Driver Management by the active organization role", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260824145921_restrict_driver_management_by_organization_role.sql", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../src/components/layout/AppShell.tsx", import.meta.url), "utf8");
  const settings = readFileSync(new URL("../src/components/settings/SettingsPage.tsx", import.meta.url), "utf8");

  assert.match(migration, /om\.role in \('owner', 'admin'\)/);
  assert.match(migration, /private\.can_manage_drivers\(organization_id\)/);
  assert.match(migration, /public\.is_mfa_requirement_satisfied\(\)/);
  assert.doesNotMatch(migration, /alter table public\.(bills|vehicles)/);
  assert.match(app, /page === "drivers" && organization\.scope && !canManageActiveDrivers/);
  assert.match(app, /page === "drivers" && canManageActiveDrivers/);
  assert.match(shell, /item\.id !== "drivers" \|\| canManageDrivers/);
  assert.match(settings, /onOpenDrivers && <Button/);
});

test("Phase 6A.2 requires a vendor workspace and owner or admin membership", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260824190340_workspace_business_type_foundation.sql", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");

  assert.match(migration, /organization_business_type as enum \('individual_driver', 'vendor'\)/);
  assert.match(migration, /business_type public\.organization_business_type not null default 'individual_driver'/);
  assert.match(migration, /o\.business_type = 'vendor'/);
  assert.match(app, /canManageDrivers\(organization\.scope\.businessType, organization\.scope\.role\)/);
});
