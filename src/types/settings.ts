export type TimeFormat = "24h" | "ampm";

export interface AppSettings {
  timeFormat: TimeFormat;
  currencySymbol: string;
  defaultBasePackage: string;
  defaultBaseHours: number;
  defaultBaseKm: number;
  defaultBaseAmount: number;
  defaultExtraHourRate: number;
  defaultExtraKmRate: number;
  defaultDriverName: string;
  defaultVehicleModel: string;
  defaultVehicleNumber: string;
  businessName: string;
}
