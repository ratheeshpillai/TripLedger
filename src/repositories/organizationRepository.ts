import type { Organization } from "../types/organization";

export interface OrganizationRepository {
  getDefaultOrganization(userId: string): Promise<Organization>;
}
