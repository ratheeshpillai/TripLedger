import type { DriverRepository } from "../repositories/driverRepository";
import type { Driver, DriverDraft } from "../types/driver";
import type { OrganizationScope } from "../types/organization";
import { AppError } from "../utils/errors";

export interface DriverService {
  listDrivers(scope: OrganizationScope): Promise<Driver[]>;
  createDriver(scope: OrganizationScope, draft: DriverDraft): Promise<Driver>;
  updateDriver(scope: OrganizationScope, id: string, draft: DriverDraft): Promise<Driver>;
}

function normalizedDraft(draft: DriverDraft): DriverDraft {
  const name = draft.name.trim();
  const phone = draft.phone.trim();
  if (!name) throw new AppError("VALIDATION", "Driver name is required.");
  if (name.length > 120) throw new AppError("VALIDATION", "Driver name must be 120 characters or fewer.");
  if (phone.length > 32) throw new AppError("VALIDATION", "Phone must be 32 characters or fewer.");
  return { name, phone, status: draft.status };
}

export function createDriverService(repository: DriverRepository): DriverService {
  return {
    listDrivers(scope) {
      return repository.listDrivers(scope);
    },
    createDriver(scope, draft) {
      return repository.createDriver(scope, normalizedDraft(draft));
    },
    updateDriver(scope, id, draft) {
      if (!id) throw new AppError("VALIDATION", "Select a driver to update.");
      return repository.updateDriver(scope, id, normalizedDraft(draft));
    }
  };
}
