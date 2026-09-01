import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { DriverInvitationRepository } from "../src/repositories/driverInvitationRepository";
import { toDriverInvitation } from "../src/repositories/supabase/supabaseDriverInvitationRepository";
import { createDriverInvitationService } from "../src/services/driverInvitationService";
import type { DriverInvitation } from "../src/types/driverInvitation";
import type { OrganizationScope } from "../src/types/organization";
import { AppError } from "../src/utils/errors";

const scope: OrganizationScope = { organizationId: "org-1", userId: "owner-1", businessType: "vendor", role: "owner" };
const now = "2026-09-01T00:00:00Z";

function invitation(overrides: Partial<DriverInvitation> = {}): DriverInvitation {
  return {
    id: "invite-1",
    organizationId: "org-1",
    driverId: "driver-1",
    invitedEmail: "driver@example.test",
    status: "pending",
    expiresAt: "2099-09-08T00:00:00Z",
    invitedBy: "owner-1",
    acceptedBy: null,
    acceptedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

test("Supabase invitation rows map to provider-independent values and compute expiry", () => {
  const row = {
    id: "invite-1",
    organization_id: "org-1",
    driver_id: "driver-1",
    invited_email: "driver@example.test",
    status: "pending",
    expires_at: "2020-01-01T00:00:00Z",
    invited_by: "owner-1",
    accepted_by: null,
    accepted_at: null,
    cancelled_at: null,
    created_at: now,
    updated_at: now
  };
  assert.equal(toDriverInvitation(row).status, "expired");
});

test("invitation service normalizes email and preserves repository boundaries", async () => {
  const calls: unknown[][] = [];
  const repository: DriverInvitationRepository = {
    async listInvitations(receivedScope) { calls.push(["list", receivedScope]); return []; },
    async createInvitation(receivedScope, driverId, email) { calls.push(["create", receivedScope, driverId, email]); return { ...invitation(), token: "token" }; },
    async cancelInvitation(receivedScope, invitationId) { calls.push(["cancel", receivedScope, invitationId]); return invitation({ status: "cancelled" }); },
    async getInvitation(token) { calls.push(["get", token]); return { id: "invite-1", organizationName: "Fleet", driverName: "Ravi", invitedEmail: "driver@example.test", status: "pending", expiresAt: now }; },
    async acceptInvitation(token) { calls.push(["accept", token]); return { id: "invite-1", organizationName: "Fleet", driverName: "Ravi", acceptedAt: now }; }
  };
  const service = createDriverInvitationService(repository);

  await service.listInvitations(scope);
  await service.createInvitation(scope, "driver-1", "  DRIVER@Example.Test ");
  await service.cancelInvitation(scope, "invite-1");
  await service.getInvitation("token");
  await service.acceptInvitation("token");

  assert.deepEqual(calls[1], ["create", scope, "driver-1", "driver@example.test"]);
  assert.throws(() => service.createInvitation(scope, "", "bad"), AppError);
  assert.throws(() => service.acceptInvitation(" "), AppError);
});

test("Phase 6C.1 uses hashed tokens, transactional linking, safe grants and auth return paths", () => {
  const migration = readFileSync(new URL("../supabase/migrations/20260901090610_driver_invitation_account_linking_foundation.sql", import.meta.url), "utf8");
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  const driversPage = readFileSync(new URL("../src/components/drivers/DriversPage.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../src/hooks/useAuth.ts", import.meta.url), "utf8");

  assert.match(migration, /token_hash bytea not null unique/);
  assert.match(migration, /extensions\.gen_random_bytes\(32\)/);
  assert.match(migration, /extensions\.digest/);
  assert.match(migration, /insert into public\.organization_members[\s\S]*update public\.drivers[\s\S]*update public\.driver_invitations/);
  assert.match(migration, /email_confirmed_at/);
  assert.match(migration, /private\.can_manage_drivers/);
  assert.match(migration, /public\.is_mfa_requirement_satisfied\(\)/);
  assert.match(migration, /revoke all on function public\.accept_driver_invitation\(text\) from public, anon, authenticated, service_role/);
  assert.doesNotMatch(migration, /grant (insert|update|delete) on table public\.driver_invitations to authenticated/);
  assert.match(app, /currentPath !== "\/driver-invitation"/);
  assert.match(auth, /emailVerificationRedirect\(returnPath\)/);
  assert.match(driversPage, /Invitation pending/);
  assert.match(driversPage, /Cancel Invite/);
  assert.match(driversPage, /Copy Link/);
});

test("Individual Driver UI cannot reach invitation management", () => {
  const app = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
  assert.match(app, /page === "drivers" && canManageFleetResources/);
  assert.match(app, /useDriverInvitations\(organization\.scope, page === "drivers" && canManageFleetResources\)/);
});
