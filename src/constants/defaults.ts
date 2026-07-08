import type { BillDraft } from "../types/bill";
import type { AppSettings } from "../types/settings";

export const DEFAULT_SETTINGS: AppSettings = {
  timeFormat: "24h",
  currencySymbol: "₹",
  defaultBasePackage: "8 Hours / 80 KM",
  defaultBaseHours: 8,
  defaultBaseKm: 80,
  defaultBaseAmount: 2800,
  defaultExtraHourRate: 200,
  defaultExtraKmRate: 0,
  businessName: "Your Business Name"
};

export function todayInputDate(date = new Date()): string {
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

export function createEmptyBillDraft(settings: AppSettings = DEFAULT_SETTINGS): BillDraft {
  const today = todayInputDate();

  return {
    companyId: undefined,
    userId: undefined,
    driverId: undefined,
    vehicleId: undefined,
    guestId: undefined,
    driverName: "",
    vehicleName: "",
    vehicleNumber: "",
    guestSalutation: "Mr.",
    guestName: "",
    reportingPlace: "",
    tripDate: today,
    reportingTime: "",
    garageTime: "",
    closingDate: today,
    closingTime: "",
    basePackage: settings.defaultBasePackage,
    baseHours: settings.defaultBaseHours,
    baseKm: settings.defaultBaseKm,
    baseAmount: settings.defaultBaseAmount,
    totalKm: 0,
    extraKm: 0,
    extraKmRate: settings.defaultExtraKmRate,
    extraKmAmount: 0,
    totalHours: 0,
    extraHours: 0,
    extraHourRate: settings.defaultExtraHourRate,
    extraHourAmount: 0,
    airportParking: 0,
    fastag: 0,
    roadParking: 0,
    advanceAmount: 0,
    pendingAmount: 0,
    totalAmount: settings.defaultBaseAmount,
    notes: "",
    whatsappNumber: ""
  };
}
