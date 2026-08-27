import type { DriverVehicleAssignment } from "../types/driverVehicleAssignment";
import type { Vehicle } from "../types/vehicle";

export function assignedVehiclesForDriver(
  driverId: string | undefined,
  vehicles: Vehicle[],
  assignments: DriverVehicleAssignment[]
): Vehicle[] {
  if (!driverId) return [];
  const assignedIds = new Set(assignments
    .filter((assignment) => assignment.status === "active" && assignment.driverId === driverId)
    .map((assignment) => assignment.vehicleId));
  return vehicles.filter((vehicle) => vehicle.status === "active" && assignedIds.has(vehicle.id));
}

export function fleetVehicleName(vehicle: Vehicle): string {
  return vehicle.displayName || vehicle.makeModel || "Vehicle";
}
