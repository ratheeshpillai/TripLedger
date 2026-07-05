export interface RateCard {
  id: string;
  companyId?: string;
  name: string;
  baseHours: number;
  baseKm: number;
  baseAmount: number;
  extraHourRate: number;
  extraKmRate: number;
  createdAt: string;
  updatedAt: string;
}
