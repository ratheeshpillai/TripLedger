export type DriverVehicleAssignmentStatus = "active" | "inactive";

export interface DriverVehicleAssignment {
  id: string;
  organizationId: string;
  driverId: string;
  vehicleId: string;
  status: DriverVehicleAssignmentStatus;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
