import assert from "node:assert/strict";
import test from "node:test";
import type { DashboardRepository } from "../src/repositories/dashboardRepository.ts";
import { createDashboardService } from "../src/services/dashboardService.ts";
import type { DashboardData, DashboardQuery } from "../src/types/dashboard.ts";
import type { OrganizationScope } from "../src/types/organization.ts";

const scope: OrganizationScope = { organizationId: "org-1", userId: "user-1", businessType: "individual_driver", role: "owner" };
const query: DashboardQuery = {
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  firstTrendMonth: "2026-03-01",
  currentMonthStart: "2026-08-01",
  recentLimit: 5,
  topOwnerLimit: 3
};
const data: DashboardData = {
  billingTotal: 100,
  tripsBilled: 1,
  paymentsReceived: 0,
  currentOutstanding: 100,
  outstandingOwners: 1,
  advanceOwners: 0,
  totalAdvance: 0,
  recentActivity: [],
  topOwnersThisMonth: [],
  monthlyTrend: []
};

test("dashboard service preserves the organization-scoped query contract", async () => {
  let received: [OrganizationScope, DashboardQuery] | undefined;
  const repository: DashboardRepository = {
    async getDashboard(nextScope, nextQuery) {
      received = [nextScope, nextQuery];
      return data;
    }
  };

  assert.equal(await createDashboardService(repository).getDashboard(scope, query), data);
  assert.deepEqual(received, [scope, query]);
});
