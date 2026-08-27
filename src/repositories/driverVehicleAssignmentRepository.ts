import type { OrganizationScope } from "../types/organization";
import type { DriverVehicleAssignment } from "../types/driverVehicleAssignment";

export interface DriverVehicleAssignmentRepository {
  listAssignments(scope: OrganizationScope): Promise<DriverVehicleAssignment[]>;
  assignDriver(scope: OrganizationScope, vehicleId: string, driverId: string): Promise<DriverVehicleAssignment>;
  endAssignment(scope: OrganizationScope, vehicleId: string): Promise<DriverVehicleAssignment>;
}
