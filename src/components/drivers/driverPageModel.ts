import type { Driver } from "../../types/driver";
import type { OrganizationRole } from "../../types/organization";

export function canManageDrivers(role: OrganizationRole): boolean {
  return role === "owner" || role === "admin";
}

export function filterDrivers(drivers: Driver[], search: string): Driver[] {
  const needle = search.trim().toLowerCase();
  return drivers.filter((driver) => !needle || `${driver.name} ${driver.phone} ${driver.status}`.toLowerCase().includes(needle));
}
