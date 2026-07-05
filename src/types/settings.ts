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
  businessName: string;
}
