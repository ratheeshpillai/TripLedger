import type { Organization } from "../types/organization";

export interface OrganizationRepository {
  getDefaultOrganization(): Promise<Organization>;
}
