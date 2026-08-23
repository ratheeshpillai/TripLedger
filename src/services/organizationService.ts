import type { OrganizationRepository } from "../repositories/organizationRepository";

export interface OrganizationService {
  getDefaultOrganization(userId: string): ReturnType<OrganizationRepository["getDefaultOrganization"]>;
}

export function createOrganizationService(repository: OrganizationRepository): OrganizationService {
  return {
    getDefaultOrganization(userId) {
      return repository.getDefaultOrganization(userId);
    }
  };
}
