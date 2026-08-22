import type { OrganizationRepository } from "../repositories/organizationRepository";

export interface OrganizationService {
  getDefaultOrganization(): ReturnType<OrganizationRepository["getDefaultOrganization"]>;
}

export function createOrganizationService(repository: OrganizationRepository): OrganizationService {
  return {
    getDefaultOrganization() {
      return repository.getDefaultOrganization();
    }
  };
}
