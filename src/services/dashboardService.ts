import type { DashboardRepository } from "../repositories/dashboardRepository";
import type { DashboardQuery } from "../types/dashboard";
import type { OrganizationScope } from "../types/organization";

export interface DashboardService {
  getDashboard(scope: OrganizationScope, query: DashboardQuery): ReturnType<DashboardRepository["getDashboard"]>;
}

export function createDashboardService(repository: DashboardRepository): DashboardService {
  return {
    getDashboard(scope: OrganizationScope, query: DashboardQuery) {
      return repository.getDashboard(scope, query);
    }
  };
}
