import type { BillDraft } from "../types/bill";
import { calculateBillDraft } from "./calculations";
import { normalizeTimeInput, parseTimeToMinutes } from "./timeUtils";

export type BillField = keyof BillDraft;
export type BillValidationErrors = Partial<Record<BillField, string>>;

export const BILL_FIELD_STEPS: Partial<Record<BillField, number>> = {
  billingPartyId: 0,
  guestName: 0,
  reportingPlace: 0,
  driverName: 1,
  vehicleName: 1,
  vehicleNumber: 1,
  tripDate: 2,
  reportingTime: 2,
  garageTime: 2,
  closingDate: 2,
  closingTime: 2,
  totalHours: 2,
  extraHours: 2,
  basePackage: 3,
  baseHours: 3,
  baseKm: 3,
  baseAmount: 3,
  totalKm: 3,
  extraKm: 3,
  extraKmRate: 4,
  extraKmAmount: 4,
  extraHourRate: 4,
  extraHourAmount: 4,
  airportParking: 4,
  fastag: 4,
  roadParking: 4,
  notes: 5
};

export const BILL_FIELD_ORDER = Object.keys(BILL_FIELD_STEPS) as BillField[];

type ValidationOptions = {
  validBillingPartyIds?: ReadonlySet<string>;
};

const textLimits: Partial<Record<BillField, number>> = {
  driverName: 120,
  vehicleName: 120,
  vehicleNumber: 32,
  guestName: 120,
  reportingPlace: 255,
  basePackage: 80,
  notes: 2000
};

const numericLimits: Partial<Record<BillField, number>> = {
  baseHours: 10_000,
  totalHours: 10_000,
  extraHours: 10_000,
  baseKm: 1_000_000,
  totalKm: 1_000_000,
  extraKm: 1_000_000,
  baseAmount: 1_000_000,
  extraKmRate: 1_000_000,
  extraKmAmount: 1_000_000,
  extraHourRate: 1_000_000,
  extraHourAmount: 1_000_000,
  airportParking: 1_000_000,
  fastag: 1_000_000,
  roadParking: 1_000_000
};

const moneyFields = new Set<BillField>([
  "baseAmount",
  "extraKmRate",
  "extraKmAmount",
  "extraHourRate",
  "extraHourAmount",
  "airportParking",
  "fastag",
  "roadParking"
]);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function localDateTime(date: string, time: string): number | null {
  if (!validDate(date)) return null;
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 0, minutes, 0, 0).getTime();
}

function validateNumber(field: BillField, value: unknown, errors: BillValidationErrors) {
  const kind = moneyFields.has(field) ? "amount" : field.toLowerCase().includes("hours") ? "hour value" : "distance";
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors[field] = `Enter a valid ${kind}.`;
    return;
  }
  if (value < 0) {
    errors[field] = `${kind[0].toUpperCase()}${kind.slice(1)} cannot be negative.`;
    return;
  }
  const cents = value * 100;
  if (moneyFields.has(field) && Math.abs(Math.round(cents) - cents) > 1e-8) {
    errors[field] = "Use no more than two decimal places.";
    return;
  }
  const maximum = numericLimits[field];
  if (maximum !== undefined && value > maximum) errors[field] = `Enter a value of ${maximum.toLocaleString("en-IN")} or less.`;
}

export function validateBillDraft(draft: BillDraft, options: ValidationOptions = {}): BillValidationErrors {
  const errors: BillValidationErrors = {};
  const ownerId = draft.billingPartyId?.trim();
  if (!ownerId || (options.validBillingPartyIds && !options.validBillingPartyIds.has(ownerId))) {
    errors.billingPartyId = "Select or add an owner/company.";
  }

  for (const [field, maximum] of Object.entries(textLimits) as Array<[BillField, number]>) {
    const value = String(draft[field] ?? "").trim();
    if (value.length > maximum) errors[field] = `Use ${maximum.toLocaleString("en-IN")} characters or fewer.`;
  }

  if (!validDate(draft.tripDate)) errors.tripDate = "Select the trip date.";
  if (parseTimeToMinutes(draft.reportingTime) === null) errors.reportingTime = "Enter the reporting time.";
  if (parseTimeToMinutes(draft.garageTime) === null) errors.garageTime = "Enter the garage time.";
  if (!validDate(draft.closingDate)) errors.closingDate = "Select the closing date.";
  if (parseTimeToMinutes(draft.closingTime) === null) errors.closingTime = "Enter the closing time.";

  const reporting = localDateTime(draft.tripDate, draft.reportingTime);
  const closing = localDateTime(draft.closingDate, draft.closingTime);
  if (reporting !== null && closing !== null && closing <= reporting) {
    errors.closingTime = "Closing date and time must be after reporting date and time.";
  }

  for (const field of Object.keys(numericLimits) as BillField[]) validateNumber(field, draft[field], errors);
  return errors;
}

export function validateBillStep(step: number, draft: BillDraft, options: ValidationOptions = {}): BillValidationErrors {
  const errors = validateBillDraft(draft, options);
  return Object.fromEntries(Object.entries(errors).filter(([field]) => BILL_FIELD_STEPS[field as BillField] === step)) as BillValidationErrors;
}

export function firstInvalidBillField(errors: BillValidationErrors): BillField | undefined {
  return BILL_FIELD_ORDER.find((field) => errors[field]);
}

export function normalizeBillDraft(draft: BillDraft): BillDraft {
  return calculateBillDraft({
    ...draft,
    billingPartyId: draft.billingPartyId?.trim() || undefined,
    driverName: draft.driverName.trim(),
    vehicleName: draft.vehicleName.trim(),
    vehicleNumber: draft.vehicleNumber.trim(),
    guestName: draft.guestName.trim(),
    reportingPlace: draft.reportingPlace.trim(),
    reportingTime: normalizeTimeInput(draft.reportingTime),
    garageTime: normalizeTimeInput(draft.garageTime),
    closingTime: normalizeTimeInput(draft.closingTime),
    basePackage: draft.basePackage.trim(),
    notes: draft.notes.trim(),
    whatsappNumber: draft.whatsappNumber.trim()
  });
}

export class BillValidationError extends Error {
  readonly errors: BillValidationErrors;

  constructor(errors: BillValidationErrors) {
    super("Complete the required bill details before saving.");
    this.name = "BillValidationError";
    this.errors = errors;
  }
}
