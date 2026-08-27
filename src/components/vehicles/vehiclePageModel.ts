import type { Vehicle } from "../../types/vehicle";

export function filterVehicles(vehicles: Vehicle[], search: string): Vehicle[] {
  const needle = search.trim().toLowerCase();
  return vehicles.filter((vehicle) => !needle || `${vehicle.registrationNumber} ${vehicle.displayName} ${vehicle.makeModel} ${vehicle.year ?? ""} ${vehicle.status}`.toLowerCase().includes(needle));
}
