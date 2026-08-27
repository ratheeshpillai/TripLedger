export type VehicleStatus = "active" | "inactive";

export interface Vehicle {
  id: string;
  organizationId: string;
  registrationNumber: string;
  displayName: string;
  makeModel: string;
  year: number | null;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export type VehicleDraft = Pick<Vehicle, "registrationNumber" | "displayName" | "makeModel" | "year" | "status">;
