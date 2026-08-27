import type { DriverVehicleAssignmentRepository } from "../repositories/driverVehicleAssignmentRepository";
import type { OrganizationScope } from "../types/organization";
import { AppError } from "../utils/errors";

export interface DriverVehicleAssignmentService {
  listAssignments(scope: OrganizationScope): ReturnType<DriverVehicleAssignmentRepository["listAssignments"]>;
  assignDriver(scope: OrganizationScope, vehicleId: string, driverId: string): ReturnType<DriverVehicleAssignmentRepository["assignDriver"]>;
  endAssignment(scope: OrganizationScope, vehicleId: string): ReturnType<DriverVehicleAssignmentRepository["endAssignment"]>;
}

function requireId(value: string, message: string): string {
  if (!value) throw new AppError("VALIDATION", message);
  return value;
}

export function createDriverVehicleAssignmentService(repository: DriverVehicleAssignmentRepository): DriverVehicleAssignmentService {
  return {
    listAssignments(scope) {
      return repository.listAssignments(scope);
    },
    assignDriver(scope, vehicleId, driverId) {
      return repository.assignDriver(scope, requireId(vehicleId, "Select a vehicle."), requireId(driverId, "Select an active driver."));
    },
    endAssignment(scope, vehicleId) {
      return repository.endAssignment(scope, requireId(vehicleId, "Select a vehicle."));
    }
  };
}
