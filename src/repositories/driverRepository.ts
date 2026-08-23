import type { Driver, DriverDraft } from "../types/driver";
import type { OrganizationScope } from "../types/organization";

export interface DriverRepository {
  listDrivers(scope: OrganizationScope): Promise<Driver[]>;
  createDriver(scope: OrganizationScope, draft: DriverDraft): Promise<Driver>;
  updateDriver(scope: OrganizationScope, id: string, draft: DriverDraft): Promise<Driver>;
}
