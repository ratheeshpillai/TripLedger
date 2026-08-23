export type DriverStatus = "active" | "inactive";

export interface Driver {
  id: string;
  organizationId: string;
  userId: string | null;
  name: string;
  phone: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export type DriverDraft = Pick<Driver, "name" | "phone" | "status">;
