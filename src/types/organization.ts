export type OrganizationRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationScope {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}
