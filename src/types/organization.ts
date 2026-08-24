export type OrganizationRole = "owner" | "admin" | "member";
export type OrganizationBusinessType = "individual_driver" | "vendor";

export interface Organization {
  id: string;
  name: string;
  businessType: OrganizationBusinessType;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationScope {
  organizationId: string;
  userId: string;
  businessType: OrganizationBusinessType;
  role: OrganizationRole;
}
