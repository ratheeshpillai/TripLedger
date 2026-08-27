import type { VehicleRepository } from "../repositories/vehicleRepository";
import type { OrganizationScope } from "../types/organization";
import type { Vehicle, VehicleDraft } from "../types/vehicle";
import { AppError } from "../utils/errors";

export interface VehicleService {
  listVehicles(scope: OrganizationScope): Promise<Vehicle[]>;
  createVehicle(scope: OrganizationScope, draft: VehicleDraft): Promise<Vehicle>;
  updateVehicle(scope: OrganizationScope, id: string, draft: VehicleDraft): Promise<Vehicle>;
}

function normalizedDraft(draft: VehicleDraft): VehicleDraft {
  const registrationNumber = draft.registrationNumber.trim().replace(/\s+/g, " ").toUpperCase();
  const registrationKey = registrationNumber.replace(/[^A-Z0-9]/g, "");
  const displayName = draft.displayName.trim();
  const makeModel = draft.makeModel.trim();
  const maxYear = new Date().getFullYear() + 1;

  if (!registrationNumber) throw new AppError("VALIDATION", "Registration number is required.");
  if (registrationKey.length < 2) throw new AppError("VALIDATION", "Enter a valid registration number.");
  if (registrationKey.length > 20) throw new AppError("VALIDATION", "Registration number must contain 20 letters or digits or fewer.");
  if (registrationNumber.length > 32) throw new AppError("VALIDATION", "Registration number must be 32 characters or fewer.");
  if (displayName.length > 120) throw new AppError("VALIDATION", "Vehicle name must be 120 characters or fewer.");
  if (makeModel.length > 120) throw new AppError("VALIDATION", "Make / model must be 120 characters or fewer.");
  if (draft.year !== null && (!Number.isInteger(draft.year) || draft.year < 1886 || draft.year > maxYear)) {
    throw new AppError("VALIDATION", `Year must be between 1886 and ${maxYear}.`);
  }

  return { registrationNumber, displayName, makeModel, year: draft.year, status: draft.status };
}

export function createVehicleService(repository: VehicleRepository): VehicleService {
  return {
    listVehicles(scope) {
      return repository.listVehicles(scope);
    },
    createVehicle(scope, draft) {
      return repository.createVehicle(scope, normalizedDraft(draft));
    },
    updateVehicle(scope, id, draft) {
      if (!id) throw new AppError("VALIDATION", "Select a vehicle to update.");
      return repository.updateVehicle(scope, id, normalizedDraft(draft));
    }
  };
}
