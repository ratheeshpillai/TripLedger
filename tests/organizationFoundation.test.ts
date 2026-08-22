import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createOrganizationService } from "../src/services/organizationService";

const migration = readFileSync(
  new URL("../supabase/migrations/20260821182032_organization_membership_foundation.sql", import.meta.url),
  "utf8"
);

test("organization resolution remains behind a repository boundary", async () => {
  const expected = { id: "org-1", name: "My Organization", createdAt: "created", updatedAt: "updated" };
  const service = createOrganizationService({ async getDefaultOrganization() { return expected; } });
  assert.equal(await service.getDefaultOrganization(), expected);
});

test("existing records are backfilled before organization ownership becomes mandatory", () => {
  const backfill = migration.indexOf("update public.bills\nset organization_id");
  const validation = migration.indexOf("Organization backfill left orphaned operational records");
  const notNull = migration.indexOf("alter column organization_id set not null");
  assert.ok(backfill > 0 && validation > backfill && notNull > validation);
});

test("organization membership cannot be managed through client table grants", () => {
  assert.match(migration, /revoke all on table public\.organization_members from public, anon, authenticated;/);
  assert.match(migration, /grant select on table public\.organization_members to authenticated;/);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete).*organization_members.*authenticated/);
});

test("operational policies retain MFA and membership checks", () => {
  for (const table of ["bills", "billing_parties", "owner_payments"]) {
    const policySection = migration.slice(migration.indexOf(`on public.${table} for select`));
    assert.match(policySection.slice(0, 300), /private\.is_organization_member\(organization_id\)/);
    assert.match(policySection.slice(0, 300), /public\.is_mfa_requirement_satisfied\(\)/);
  }
});
