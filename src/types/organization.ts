export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationScope {
  organizationId: string;
  userId: string;
}
