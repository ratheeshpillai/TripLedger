import type { DashboardData, DashboardQuery } from "../types/dashboard";
import type { OrganizationScope } from "../types/organization";

export interface DashboardRepository {
  getDashboard(scope: OrganizationScope, query: DashboardQuery): Promise<DashboardData>;
}
