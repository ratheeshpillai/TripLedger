import type { OrganizationScope } from "../types/organization";
import type { Vehicle, VehicleDraft } from "../types/vehicle";

export interface VehicleRepository {
  listVehicles(scope: OrganizationScope): Promise<Vehicle[]>;
  createVehicle(scope: OrganizationScope, draft: VehicleDraft): Promise<Vehicle>;
  updateVehicle(scope: OrganizationScope, id: string, draft: VehicleDraft): Promise<Vehicle>;
}
