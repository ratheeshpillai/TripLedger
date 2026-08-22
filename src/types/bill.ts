export interface Bill {
  id: string;
  companyId?: string;
  billingPartyId?: string;
  billingPartyName?: string;
  billingPartyCompanyName?: string;
  organizationId?: string;
  userId?: string;
  driverId?: string;
  vehicleId?: string;
  guestId?: string;
  driverName: string;
  vehicleName: string;
  vehicleNumber: string;
  guestSalutation?: "Mr." | "Mrs." | "Miss." | "Miss";
  guestName: string;
  reportingPlace: string;
  tripDate: string;
  reportingTime: string;
  garageTime: string;
  closingDate: string;
  closingTime: string;
  basePackage: string;
  baseHours: number;
  baseKm: number;
  baseAmount: number;
  totalKm: number;
  extraKm: number;
  extraKmRate: number;
  extraKmAmount: number;
  totalHours: number;
  extraHours: number;
  extraHourRate: number;
  extraHourAmount: number;
  airportParking: number;
  fastag: number;
  roadParking: number;
  advanceAmount: number;
  pendingAmount: number;
  totalAmount: number;
  notes: string;
  whatsappNumber: string;
  createdAt: string;
  updatedAt: string;
}

export type BillDraft = Omit<Bill, "id" | "createdAt" | "updatedAt">;

export type BillSort = "newest" | "oldest" | "highest" | "lowest" | "customer" | "owner";

export interface BillQuery {
  page: number;
  pageSize: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  billingPartyId?: string;
  sort: BillSort;
}

export interface PagedBills {
  items: Bill[];
  totalCount: number;
  totalAmount: number;
}

export interface BillSummaryTotals {
  selectedBillsCount: number;
  totalKm: number;
  totalHours: number;
  totalBaseAmount: number;
  totalExtraKmAmount: number;
  totalExtraHourAmount: number;
  totalAirportParking: number;
  totalFastag: number;
  totalRoadParking: number;
  totalPendingAmount: number;
  grandTotal: number;
}
